import os
import sys
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.core.security import create_access_token
import app.models as models
from app.models.bed import BedStatus
from app.models.conflict import ConflictType, ConflictStatus

def run_e2e_api_test():
    client = TestClient(app)
    db = SessionLocal()
    
    print("==================================================")
    print("STARTING E2E API VERIFICATION FOR CF-6 SENSOR CONFLICT")
    print("==================================================")

    # Get admin user and auth header
    admin = db.query(models.User).filter(models.User.role == models.UserRole.ADMIN).first()
    if not admin:
        hospital = db.query(models.Hospital).first()
        if not hospital:
            hospital = models.Hospital(name="Medicover General Hospital", address="Main City", contact_number="1234567890")
            db.add(hospital)
            db.commit()
            db.refresh(hospital)
        admin = models.User(
            email="admin_e2e@hospital.com",
            full_name="E2E Administrator",
            role=models.UserRole.ADMIN,
            is_active=True,
            hospital_id=hospital.id,
            password_hash="testpass"
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    token = create_access_token(subject=admin.id, role=admin.role.value, hospital_id=admin.hospital_id)
    auth_headers = {"Authorization": f"Bearer {token}"}
    print(f"[AUTH] Authenticated as Admin ID {admin.id} ({admin.email})")

    # Find or prepare a test bed
    bed = db.query(models.Bed).filter(models.Bed.current_status == BedStatus.AVAILABLE).first()
    if not bed:
        bed = models.Bed(
            hospital_id=admin.hospital_id,
            bed_number="E2E-TEST-01",
            ward="E2E Ward",
            department="Cardiology",
            price_per_day=5000.0,
            current_status=BedStatus.AVAILABLE
        )
        db.add(bed)
        db.commit()
        db.refresh(bed)
    else:
        bed.price_per_day = 5000.0
        db.commit()

    bed_id = bed.id
    print(f"[TEST 1] Using Available Bed ID: {bed_id} (Price: {bed.price_per_day})")

    # Step 1: Send breached sensor reading via POST /api/sensors/reading
    res = client.post("/api/sensors/reading", json={
        "bed_id": bed_id,
        "value": 18.5,
        "pressure_value_kpa": 18.5,
        "threshold_breached": True,
        "raw_payload": {"test": "e2e_breach"}
    }, headers=auth_headers)
    assert res.status_code == 201 or res.status_code == 200, f"Failed sensor reading post: {res.text}"
    data = res.json()
    print(f"[TEST 2] Sensor reading created. Response: reading_id={data.get('id')}, value={data.get('value')} kPa, threshold_breached={data.get('threshold_breached')}")

    # Step 2: Fetch conflicts via GET /api/conflicts
    res = client.get("/api/conflicts", headers=auth_headers)
    assert res.status_code == 200, f"Failed conflicts get: {res.text}"
    conflicts = res.json()
    cf6_conflicts = [c for c in conflicts if c["related_bed_id"] == bed_id and c["conflict_type"] == "sensor_presence_mismatch" and c["status"] == "open"]
    assert len(cf6_conflicts) > 0, "Expected open CF-6 conflict not found in GET /api/conflicts"
    conflict = cf6_conflicts[0]
    conflict_id = conflict["id"]
    print(f"[TEST 3] CF-6 Conflict verified in GET /api/conflicts: id={conflict_id}, type={conflict['conflict_type']}, revenue_at_risk={conflict['revenue_at_risk']}")
    assert conflict["revenue_at_risk"] == 5000.0, f"Expected 5000.0 revenue risk, got {conflict['revenue_at_risk']}"

    # Step 3: Check Dashboard Stats
    res = client.get("/api/dashboard/stats/admin", headers=auth_headers)
    assert res.status_code == 200, f"Failed admin stats get: {res.text}"
    stats = res.json()
    assert stats["open_conflicts_count"] > 0, "open_conflicts_count should be > 0"
    print(f"[TEST 4] Dashboard admin stats: open_conflicts_count={stats['open_conflicts_count']}, revenue_at_risk_per_day={stats['revenue_at_risk_per_day']}")

    # Step 4: Resolve conflict with 'confirmed_occupied'
    res = client.post(f"/api/conflicts/{conflict_id}/resolve", json={
        "resolution_notes": "E2E Nurse verified patient is in bed.",
        "resolution_action": "confirmed_occupied"
    }, headers=auth_headers)
    assert res.status_code == 200, f"Failed to resolve conflict: {res.text}"
    resolved = res.json()
    assert resolved["status"] == "resolved"
    print(f"[TEST 5] Conflict {conflict_id} resolved with 'confirmed_occupied'. Status: {resolved['status']}")

    # Verify bed status is now OCCUPIED
    db.expire_all()
    bed = db.query(models.Bed).filter(models.Bed.id == bed_id).first()
    assert bed.current_status == BedStatus.OCCUPIED, f"Bed should be OCCUPIED, got {bed.current_status}"
    print(f"[TEST 6] Bed status synchronized to {bed.current_status}")

    # Step 5: Reset bed to AVAILABLE and test 'false_alarm' resolution
    bed.current_status = BedStatus.AVAILABLE
    db.commit()

    res = client.post("/api/sensors/reading", json={
        "bed_id": bed_id,
        "value": 20.1,
        "pressure_value_kpa": 20.1,
        "threshold_breached": True
    }, headers=auth_headers)
    assert res.status_code == 201 or res.status_code == 200

    res = client.get("/api/conflicts", headers=auth_headers)
    cf6_conflicts = [c for c in res.json() if c["related_bed_id"] == bed_id and c["conflict_type"] == "sensor_presence_mismatch" and c["status"] == "open"]
    assert len(cf6_conflicts) > 0
    conflict2_id = cf6_conflicts[0]["id"]

    res = client.post(f"/api/conflicts/{conflict2_id}/resolve", json={
        "resolution_notes": "False alarm - equipment baggage was on mattress.",
        "resolution_action": "false_alarm"
    }, headers=auth_headers)
    assert res.status_code == 200

    db.expire_all()
    bed = db.query(models.Bed).filter(models.Bed.id == bed_id).first()
    assert bed.current_status == BedStatus.AVAILABLE, f"Bed should remain AVAILABLE, got {bed.current_status}"
    print(f"[TEST 7] Conflict resolved with 'false_alarm'. Bed remains {bed.current_status}")

    # Step 6: Test Auto-Resolve when normal weight reading is received
    res = client.post("/api/sensors/reading", json={
        "bed_id": bed_id,
        "value": 19.5,
        "pressure_value_kpa": 19.5,
        "threshold_breached": True
    }, headers=auth_headers)
    assert res.status_code == 201 or res.status_code == 200
    res = client.get("/api/conflicts", headers=auth_headers)
    cf6_conflicts = [c for c in res.json() if c["related_bed_id"] == bed_id and c["conflict_type"] == "sensor_presence_mismatch" and c["status"] == "open"]
    assert len(cf6_conflicts) > 0
    auto_conflict_id = cf6_conflicts[0]["id"]
    print(f"[TEST 8] Created conflict {auto_conflict_id} for auto-resolve testing")

    # Send clear reading (< 2.0 kPa)
    res = client.post("/api/sensors/reading", json={
        "bed_id": bed_id,
        "value": 0.2,
        "pressure_value_kpa": 0.2,
        "threshold_breached": False
    }, headers=auth_headers)
    assert res.status_code == 201 or res.status_code == 200

    # Verify conflict auto-resolved
    res = client.get("/api/conflicts", headers=auth_headers)
    open_cf = [c for c in res.json() if c["id"] == auto_conflict_id and c["status"] == "open"]
    assert len(open_cf) == 0, "Conflict should have auto-resolved upon normal pressure reading"
    print(f"[TEST 9] Auto-resolve verified! Conflict {auto_conflict_id} is no longer open.")

    print("\n==================================================")
    print("ALL E2E INTEGRATION TESTS PASSED SUCCESSFULLY (100%)")
    print("==================================================")

if __name__ == "__main__":
    run_e2e_api_test()
