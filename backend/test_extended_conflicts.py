import requests
import json
import time

API_URL = "http://127.0.0.1:8000/api"

def print_step(step_num, title):
    print(f"\n[STEP {step_num}] {title}")

def print_pass(msg):
    print(f"  \033[92m[PASS]\033[0m {msg}")

def print_fail(msg):
    print(f"  \033[91m[FAIL]\033[0m {msg}")

def main():
    print("=" * 70)
    print("[TEST SUITE] TESTING EXTENDED CONFLICT LOGGING & DISCHARGE FLOW")
    print("=" * 70)

    # Step 1: Staff & Admin Login
    print_step(1, "Authenticating Staff and Admin accounts...")
    r_staff = requests.post(f"{API_URL}/auth/login", json={"email": "staff.cardio1@medicover.com", "password": "Password@123"})
    assert r_staff.status_code == 200, f"Staff login failed: {r_staff.text}"
    staff_token = r_staff.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    print_pass("Staff logged in: Nurse Priya Patel")

    r_admin = requests.post(f"{API_URL}/auth/login", json={"email": "admin@medicover.com", "password": "Password@123"})
    assert r_admin.status_code == 200, f"Admin login failed: {r_admin.text}"
    admin_token = r_admin.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print_pass("Admin logged in: Dr. Rajesh Sharma")

    # Step 2: Ensure Bed #8 is set to 'available' for CF-1 test
    print_step(2, "Setting Bed #8 to 'available' in Ward Bed Operations...")
    r_bed = requests.patch(f"{API_URL}/beds/8/status", json={"current_status": "available"}, headers=staff_headers)
    assert r_bed.status_code == 200
    print_pass("Bed #8 status set to 'available'")

    # Step 3: Quick Admit to Bed #8 (Available Bed)
    print_step(3, "Submitting Quick Admit for 'Aanya Singhania' to Bed #8...")
    quick_admit_payload = {
        "patient_name": "Aanya Singhania",
        "patient_ref_id": f"PT-EXT-{int(time.time())}",
        "bed_id": 8,
        "admitted_at": "2026-08-29T09:00:00Z",
        "expected_discharge_at": "2026-09-01T09:00:00Z"
    }
    r_admit = requests.post(f"{API_URL}/stays/quick-admit", json=quick_admit_payload, headers=staff_headers)
    assert r_admit.status_code == 200, f"Quick admit failed: {r_admit.text}"
    stay_id_8 = r_admit.json()["id"]
    print_pass(f"Quick admit created: Stay ID #{stay_id_8} for Aanya Singhania")

    # Step 4: Verify CF-1 Conflict is logged for Bed #8
    print_step(4, "Verifying CF-1 Conflict is logged for Bed #8...")
    r_conflicts = requests.get(f"{API_URL}/conflicts", headers=admin_headers)
    assert r_conflicts.status_code == 200
    conflicts = r_conflicts.json()
    cf1_bed8 = [c for c in conflicts if c.get("related_bed_id") == 8 and c.get("conflict_type") == "bed_status_mismatch" and c.get("status") == "open"]
    assert len(cf1_bed8) > 0, "No open CF-1 conflict logged for Bed #8"
    print_pass(f"CF-1 Conflict detected & logged: CF-{cf1_bed8[0]['id']} -> '{cf1_bed8[0]['description']}'")

    # Step 5: Quick Admit 2 patients to Bed #9 (Occupied Bed) to test Double Booking
    print_step(5, "Submitting Quick Admit for 2 patients ('Rohan Kapoor' and 'Sunil Gavaskar') to Bed #9...")
    r_bed9 = requests.patch(f"{API_URL}/beds/9/status", json={"current_status": "occupied"}, headers=staff_headers)
    assert r_bed9.status_code == 200

    r_admit9_1 = requests.post(f"{API_URL}/stays/quick-admit", json={
        "patient_name": "Rohan Kapoor",
        "patient_ref_id": f"PT-DBL1-{int(time.time())}",
        "bed_id": 9,
        "admitted_at": "2026-08-29T09:00:00Z",
        "expected_discharge_at": "2026-09-01T09:00:00Z"
    }, headers=staff_headers)
    assert r_admit9_1.status_code == 200

    r_admit9_2 = requests.post(f"{API_URL}/stays/quick-admit", json={
        "patient_name": "Sunil Gavaskar",
        "patient_ref_id": f"PT-DBL2-{int(time.time())}",
        "bed_id": 9,
        "admitted_at": "2026-08-29T09:00:00Z",
        "expected_discharge_at": "2026-09-01T09:00:00Z"
    }, headers=staff_headers)
    assert r_admit9_2.status_code == 200
    print_pass("Quick admitted 2 patients to Bed #9")

    # Step 6: Verify Double Booking conflict is logged for Bed #9
    print_step(6, "Verifying Double Booking conflict is logged for Bed #9...")
    r_conflicts = requests.get(f"{API_URL}/conflicts", headers=admin_headers)
    conflicts = r_conflicts.json()
    cf_bed9 = [c for c in conflicts if c.get("related_bed_id") == 9 and c.get("status") == "open"]
    assert len(cf_bed9) > 0, "No open conflict logged for Bed #9"
    print_pass(f"Conflict logged for Bed #9: CF-{cf_bed9[0]['id']} -> '{cf_bed9[0]['description']}'")

    # Step 7: Discharge all active stays from Bed #9 via staff endpoint
    print_step(7, "Discharging active patients from Bed #9 via Staff Discharge action...")
    r_stays = requests.get(f"{API_URL}/stays", headers=staff_headers)
    active_stays_bed9 = [s for s in r_stays.json() if s.get("bed_id") == 9 and s.get("status") == "active"]
    for s in active_stays_bed9:
        r_dis = requests.post(f"{API_URL}/stays/{s['id']}/discharge", headers=staff_headers)
        assert r_dis.status_code == 200
        print_pass(f"Discharged patient '{s['patient_name']}' (Stay #{s['id']})")

    # Step 8: Verify Discharge Bed Mismatch conflict is logged
    print_step(8, "Verifying Discharge Bed Mismatch conflict logged (Bed #9 still marked Occupied)...")
    r_conflicts = requests.get(f"{API_URL}/conflicts", headers=admin_headers)
    conflicts = r_conflicts.json()
    cf_dis = [c for c in conflicts if c.get("related_bed_id") == 9 and c.get("conflict_type") == "discharge_bed_mismatch" and c.get("status") == "open"]
    assert len(cf_dis) > 0, "No discharge_bed_mismatch conflict logged for Bed #9"
    print_pass(f"Discharge Mismatch logged: CF-{cf_dis[0]['id']} -> '{cf_dis[0]['description']}'")

    # Step 9: Admin resolves discharge mismatch conflict CF
    print_step(9, f"Admin resolving discharge mismatch conflict CF-{cf_dis[0]['id']}...")
    r_res = requests.post(f"{API_URL}/conflicts/{cf_dis[0]['id']}/resolve", json={
        "resolution_notes": "Synchronized Bed #9 to Available following discharge."
    }, headers=admin_headers)
    assert r_res.status_code == 200
    print_pass(f"Conflict CF-{cf_dis[0]['id']} resolved successfully")

    # Step 10: Verify Bed #9 status was updated to 'available'
    print_step(10, "Verifying Bed #9 status was synchronized to 'available'...")
    r_check_bed = requests.get(f"{API_URL}/beds/9", headers=staff_headers)
    assert r_check_bed.status_code == 200
    assert r_check_bed.json()["current_status"] == "available"
    print_pass("Bed #9 current_status is now 'available'!")

    # Step 11: Discharge extra duplicate patients on Bed #8 until only 1 remains, then sync to occupied
    print_step(11, "Discharging duplicate test patients on Bed #8 leaving exactly 1 active patient...")
    r_stays_8 = requests.get(f"{API_URL}/stays", headers=staff_headers)
    active_stays_bed8 = [s for s in r_stays_8.json() if s.get("bed_id") == 8 and s.get("status") == "active"]
    # Leave only the latest one
    for s in active_stays_bed8[1:]:
        requests.post(f"{API_URL}/stays/{s['id']}/discharge", headers=staff_headers)

    print_pass("Duplicate patients on Bed #8 discharged (1 patient remaining)")

    # Step 12: Sync Bed #8 status to 'occupied' -> CF-1 conflict auto-resolves
    print_step(12, "Staff setting Bed #8 status to 'occupied' in Ward Bed Operations...")
    r_bed8_sync = requests.patch(f"{API_URL}/beds/8/status", json={"current_status": "occupied"}, headers=staff_headers)
    assert r_bed8_sync.status_code == 200
    
    r_conflicts_final = requests.get(f"{API_URL}/conflicts", headers=admin_headers)
    cf1_bed8_check = [c for c in r_conflicts_final.json() if c.get("id") == cf1_bed8[0]["id"]]
    assert cf1_bed8_check[0]["status"] == "resolved", f"Expected CF-{cf1_bed8[0]['id']} to be resolved, got {cf1_bed8_check[0]['status']}"
    print_pass(f"CF-1 Conflict CF-{cf1_bed8[0]['id']} was automatically resolved upon single-patient bed status sync!")

    print("\n" + "=" * 70)
    print("\033[92m[SUCCESS] ALL EXTENDED CONFLICT & DISCHARGE TESTS PASSED WITH 100% SUCCESS!\033[0m")
    print("=" * 70)

if __name__ == "__main__":
    main()
