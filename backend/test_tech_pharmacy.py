from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.equipment import MedicalEquipment, EquipmentStatus
from app.models.requisition import RequisitionOrder, RequisitionType, RequisitionStatus, RequisitionUrgency
from app.seed.seed_data import seed_database

client = TestClient(app)

def test_tech_pharmacist_full_workflow():
    print("\n" + "="*70)
    print("RUNNING TECHNICIAN CUM PHARMACIST WORKFLOW AUTOMATED TEST SUITE")
    print("="*70)

    # Step 1: Reseed clean database
    print("\n[Step 1] Initializing fresh database...")
    seed_database()
    print("  [PASS] Database seeded with Tech/Pharm role and demo records.")

    # Step 2: Authenticate Tech-Pharmacist & Admin
    print("\n[Step 2] Testing Authentication...")
    tech_login = client.post("/api/auth/login", json={"email": "tech.pharmacist@medicover.com", "password": "Password@123"})
    assert tech_login.status_code == 200, f"Tech login failed: {tech_login.text}"
    tech_token = tech_login.json()["access_token"]
    tech_headers = {"Authorization": f"Bearer {tech_token}"}
    assert tech_login.json()["user"]["role"] == "technician_pharmacist"
    print(f"  [PASS] Logged in as {tech_login.json()['user']['full_name']} (Role: technician_pharmacist)")

    admin_login = client.post("/api/auth/login", json={"email": "admin@medicover.com", "password": "Password@123"})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("  [PASS] Logged in as Admin")

    # Step 3: Fetch Equipment Inventory
    print("\n[Step 3] Fetching Medical Equipment Inventory...")
    eq_resp = client.get("/api/equipments", headers=tech_headers)
    assert eq_resp.status_code == 200
    equipments = eq_resp.json()
    assert len(equipments) >= 8
    print(f"  [PASS] Retrieved {len(equipments)} medical equipments across wards.")

    # Step 4: Technician updates equipment status
    target_eq = next(eq for eq in equipments if eq["asset_tag"] == "EQ-ICU-001")
    print(f"\n[Step 4] Technician placing '{target_eq['equipment_name']}' into Maintenance...")
    upd_resp = client.patch(
        f"/api/equipments/{target_eq['id']}/status",
        headers=tech_headers,
        json={
            "status": "maintenance",
            "maintenance_notes": "O2 blending valve recalibration in progress by Biomed team.",
            "location_room": "Biomedical Workshop"
        }
    )
    assert upd_resp.status_code == 200
    assert upd_resp.json()["status"] == "maintenance"
    assert upd_resp.json()["location_room"] == "Biomedical Workshop"
    print("  [PASS] Equipment status successfully updated to 'maintenance' and moved to Biomedical Workshop.")

    # Restore to operational
    print("\n[Step 5] Technician returning equipment to Operational status...")
    upd_resp2 = client.patch(
        f"/api/equipments/{target_eq['id']}/status",
        headers=tech_headers,
        json={
            "status": "operational",
            "maintenance_notes": "Recalibration complete. Pressure test passed. Returned to Cardiac ICU.",
            "location_room": "Cardiac ICU Room 1"
        }
    )
    assert upd_resp2.status_code == 200
    assert upd_resp2.json()["status"] == "operational"
    print("  [PASS] Equipment returned to 'operational' (Running Fine) in Cardiac ICU Room 1.")

    # Step 6: Technician submits new equipment and medicine requisitions
    print("\n[Step 6] Submitting new equipment and medicine requisitions...")
    req1_payload = {
        "item_type": "equipment",
        "item_name": "Mindray BeneHeart D3 Lithium-Ion Battery Pack",
        "category": "Defibrillator Spares",
        "quantity": 4,
        "unit": "Packs",
        "urgency": "urgent",
        "department": "Cardiology",
        "estimated_cost": 48000.0,
        "reason": "Backup batteries for Cardiac ICU crash carts"
    }
    req1_resp = client.post("/api/requisitions", headers=tech_headers, json=req1_payload)
    assert req1_resp.status_code == 201, f"Failed to create req: {req1_resp.text}"
    req1_id = req1_resp.json()["id"]
    assert req1_resp.json()["status"] == "pending"
    print(f"  [PASS] Created Equipment Requisition #{req1_id} for '{req1_payload['item_name']}'")

    req2_payload = {
        "item_type": "medicine",
        "item_name": "Inj. Meropenem 1g IV Infusion Vials",
        "category": "Critical Care Antibiotics",
        "quantity": 150,
        "unit": "Vials",
        "urgency": "emergency",
        "department": "Cardiology",
        "estimated_cost": 97500.0,
        "reason": "ICU reserve stock depleted due to high surgical census"
    }
    req2_resp = client.post("/api/requisitions", headers=tech_headers, json=req2_payload)
    assert req2_resp.status_code == 201
    req2_id = req2_resp.json()["id"]
    print(f"  [PASS] Created Medicine Requisition #{req2_id} for '{req2_payload['item_name']}'")

    # Step 7: Security check - Non-admin cannot approve requisitions
    print("\n[Step 7] Security Verification: Non-admin cannot approve requisitions...")
    sec_resp = client.patch(
        f"/api/requisitions/{req1_id}/status",
        headers=tech_headers,
        json={"status": "approved", "admin_notes": "Attempted bypass"}
    )
    assert sec_resp.status_code in [401, 403], "Unauthorized role was able to update requisition status!"
    print("  [PASS] Non-admin rejected with 403 Forbidden.")

    # Step 8: Admin approves the requisition
    print("\n[Step 8] Admin approving requisition #{}...".format(req1_id))
    admin_upd = client.patch(
        f"/api/requisitions/{req1_id}/status",
        headers=admin_headers,
        json={
            "status": "approved",
            "admin_notes": "Approved for direct biomedical vendor PO generation."
        }
    )
    assert admin_upd.status_code == 200
    assert admin_upd.json()["status"] == "approved"
    assert admin_upd.json()["reviewed_by_name"] == "Dr. Rajesh Sharma"
    print(f"  [PASS] Requisition #{req1_id} approved by Admin with notes.")

    print("\n" + "="*70)
    print("ALL TECHNICIAN CUM PHARMACIST TESTS PASSED 100% SUCCESSFULLY!")
    print("="*70)

if __name__ == "__main__":
    test_tech_pharmacist_full_workflow()
