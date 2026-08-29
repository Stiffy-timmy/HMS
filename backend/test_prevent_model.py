import os
import sys
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.seed.seed_data import seed_database
from app.models.user import User, UserRole
from app.models.bed import Bed, BedStatus
from app.models.patient_stay import PatientStay, StayStatus
from app.models.billing import Billing, BillingStatus
from app.models.lab_order import LabOrder, LabStatus

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("RUNNING PREVENT MODEL AUTOMATED VERIFICATION SUITE")
    print("=" * 70)

    # Step 1: Reseed Database
    print("\n[Step 1] Seeding clean database without conflict logs...")
    seed_database()
    db = SessionLocal()

    # Verify credentials
    staff_user = db.query(User).filter(User.email == "staff.cardio1@medicover.com").first()
    admin_user = db.query(User).filter(User.email == "admin@medicover.com").first()
    hk_user = db.query(User).filter(User.email == "staff.housekeeping@medicover.com").first()
    assert staff_user is not None
    assert admin_user is not None
    assert hk_user is not None
    print("  [PASS] Clean database seeded. Entities verified.")

    # Get Auth Tokens
    login_resp = client.post("/api/auth/login", json={"email": "staff.cardio1@medicover.com", "password": "Password@123"})
    assert login_resp.status_code == 200, f"Staff login failed: {login_resp.text}"
    staff_token = login_resp.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    admin_login = client.post("/api/auth/login", json={"email": "admin@medicover.com", "password": "Password@123"})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    hk_login = client.post("/api/auth/login", json={"email": "staff.housekeeping@medicover.com", "password": "Password@123"})
    assert hk_login.status_code == 200, f"HK login failed: {hk_login.text}"
    hk_token = hk_login.json()["access_token"]
    hk_headers = {"Authorization": f"Bearer {hk_token}"}


    # Step 2: Quick Admit to Available Bed #4
    print("\n[Step 2] Testing Quick Admit to Available Bed #4...")
    bed4 = db.query(Bed).filter(Bed.id == 4).first()
    assert bed4.current_status == BedStatus.AVAILABLE

    admit_resp = client.post(
        "/api/stays/quick-admit",
        headers=staff_headers,
        json={
            "patient_name": "Test Rahul Sharma",
            "patient_ref_id": "PAT-TEST-001",
            "bed_id": 4
        }
    )
    assert admit_resp.status_code == 200, f"Admit failed: {admit_resp.text}"
    stay_id = admit_resp.json()["id"]

    db.expire_all()
    bed4_after = db.query(Bed).filter(Bed.id == 4).first()
    assert bed4_after.current_status == BedStatus.OCCUPIED
    billing_rec = db.query(Billing).filter(Billing.stay_id == stay_id).first()
    assert billing_rec is not None
    assert billing_rec.status == BillingStatus.NOT_STARTED
    print(f"  [PASS] Bed #4 atomically set to OCCUPIED on Quick Admit (Stay ID: {stay_id})")

    # Step 3: Prevent duplicate admit into occupied Bed #4
    print("\n[Step 3] Verifying double admission prevention on occupied bed...")
    dup_resp = client.post(
        "/api/stays/quick-admit",
        headers=staff_headers,
        json={
            "patient_name": "Second Patient",
            "patient_ref_id": "PAT-TEST-002",
            "bed_id": 4
        }
    )
    assert dup_resp.status_code == 400
    print(f"  [PASS] Double admit blocked structurally: {dup_resp.json()['detail']}")

    # Step 4: Verify manual status locks on occupied bed
    print("\n[Step 4] Verifying Bed Manual Status Locks...")
    patch_resp = client.patch(
        "/api/beds/4/status",
        headers=staff_headers,
        json={"current_status": "available"}
    )
    assert patch_resp.status_code == 400
    print(f"  [PASS] Manual toggle on occupied bed blocked structurally: {patch_resp.json()['detail']}")

    # Step 5: Patient Discharge transitions Bed to CLEANING_PENDING
    print("\n[Step 5] Testing Patient Discharge to CLEANING_PENDING...")
    dis_resp = client.post(f"/api/stays/{stay_id}/discharge", headers=staff_headers)
    assert dis_resp.status_code == 200

    db.expire_all()
    bed4_dis = db.query(Bed).filter(Bed.id == 4).first()
    assert bed4_dis.current_status == BedStatus.CLEANING_PENDING
    print(f"  [PASS] Stay #{stay_id} discharged and Bed #4 transitioned to CLEANING_PENDING")

    # Step 6: Quick admit into cleaning_pending bed is structurally blocked
    print("\n[Step 6] Testing Quick Admit into cleaning_pending bed is blocked...")
    cl_resp = client.post(
        "/api/stays/quick-admit",
        headers=staff_headers,
        json={
            "patient_name": "Third Patient",
            "patient_ref_id": "PAT-TEST-003",
            "bed_id": 4
        }
    )
    assert cl_resp.status_code == 400
    print(f"  [PASS] Quick admit into cleaning_pending bed blocked: {cl_resp.json()['detail']}")

    # Step 7: Housekeeping Sanitizes Bed #4 back to AVAILABLE
    print("\n[Step 7] Testing Housekeeping Mark Clean Action...")
    clean_resp = client.post("/api/beds/4/mark-clean", headers=hk_headers)
    assert clean_resp.status_code == 200

    db.expire_all()
    bed4_clean = db.query(Bed).filter(Bed.id == 4).first()
    assert bed4_clean.current_status == BedStatus.AVAILABLE
    print("  [PASS] Bed #4 marked AVAILABLE by Housekeeping")

    # Step 8: Admitting new patient to newly sanitized Bed #4
    print("\n[Step 8] Admitting new patient to sanitized Bed #4...")
    new_admit = client.post(
        "/api/stays/quick-admit",
        headers=staff_headers,
        json={
            "patient_name": "Suresh Patel",
            "patient_ref_id": "PAT-TEST-004",
            "bed_id": 4
        }
    )
    assert new_admit.status_code == 200
    print(f"  [PASS] Sanitized Bed #4 successfully assigned to new admission #{new_admit.json()['id']}")

    # Step 9: Verify Admin Dashboard Stats (Daily Inpatient Revenue & Zero Conflicts)
    print("\n[Step 9] Verifying Admin Dashboard Stats & Daily Inpatient Revenue...")
    dash_resp = client.get("/api/dashboard/admin", headers=admin_headers)
    assert dash_resp.status_code == 200
    stats = dash_resp.json()
    assert stats["daily_inpatient_revenue"] > 0
    assert stats["open_conflicts_count"] == 0
    assert stats["revenue_at_risk_per_day"] == 0.0
    print(f"  [PASS] Admin Dashboard Stats: Daily Revenue Rs {stats['daily_inpatient_revenue']:,.2f}, Open Conflicts: {stats['open_conflicts_count']}")

    print("\n" + "=" * 70)
    print("ALL PREVENT MODEL TESTS PASSED 100% SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
