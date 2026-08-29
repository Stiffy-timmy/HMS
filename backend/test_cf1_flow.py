import sys
import requests
import json

API_URL = "http://127.0.0.1:8000/api"

def run_cf1_test():
    print("\n" + "=" * 65)
    print("[TEST SUITE] TESTING QUICK ADMIT & CF-1 CONFLICT DETECTION ENGINE")
    print("=" * 65)

    # 1. Staff Login
    print("\n[STEP 1] Logging in as Staff (Nurse)...")
    staff_res = requests.post(f"{API_URL}/auth/login", json={
        "email": "staff.cardio1@medicover.com",
        "password": "Password@123"
    })
    assert staff_res.status_code == 200, f"Staff login failed: {staff_res.text}"
    staff_token = staff_res.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    staff_user = staff_res.json()["user"]
    print(f"  [PASS] Staff logged in: {staff_user['full_name']} (Dept: {staff_user['department']})")

    # 2. Admin Login
    print("\n[STEP 2] Logging in as Admin...")
    admin_res = requests.post(f"{API_URL}/auth/login", json={
        "email": "admin@medicover.com",
        "password": "Password@123"
    })
    assert admin_res.status_code == 200, f"Admin login failed: {admin_res.text}"
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("  [PASS] Admin logged in successfully")

    # 3. Find an available bed in staff's department
    print("\n[STEP 3] Finding an available bed in Cardiology...")
    beds_res = requests.get(f"{API_URL}/beds", params={"department": "Cardiology"}, headers=staff_headers)
    assert beds_res.status_code == 200
    dept_beds = beds_res.json()
    
    # Pick bed or set one to available
    avail_bed = next((b for b in dept_beds if b["current_status"] == "available"), None)
    if not avail_bed:
        target = dept_beds[0]
        requests.patch(f"{API_URL}/beds/{target['id']}/status", json={"current_status": "available"}, headers=staff_headers)
        avail_bed = requests.get(f"{API_URL}/beds/{target['id']}", headers=staff_headers).json()

    print(f"  [PASS] Selected target Bed #{avail_bed['id']} (Ward: {avail_bed['ward']}, Status: {avail_bed['current_status']})")

    # 4. Perform Quick Admit as Staff
    print("\n[STEP 4] Submitting Quick Admit request...")
    patient_name = "Vikram Aditya"
    patient_ref = f"PT-TEST-{avail_bed['id']}"
    admit_res = requests.post(f"{API_URL}/stays/quick-admit", json={
        "patient_name": patient_name,
        "patient_ref_id": patient_ref,
        "bed_id": avail_bed["id"]
    }, headers=staff_headers)
    assert admit_res.status_code == 200, f"Quick admit failed: {admit_res.text}"
    stay_data = admit_res.json()
    print(f"  [PASS] Stay created: ID #{stay_data['id']}, Patient: {stay_data['patient_name']}, Status: {stay_data['status']}")

    # 5. Verify Bed.current_status is STILL 'available' (deliberate staleness)
    print("\n[STEP 5] Verifying bed status remains stale ('available')...")
    bed_check = requests.get(f"{API_URL}/beds/{avail_bed['id']}", headers=staff_headers).json()
    assert bed_check["current_status"] == "available", f"Expected bed status 'available', got '{bed_check['current_status']}'"
    print(f"  [PASS] Bed #{avail_bed['id']} current_status is '{bed_check['current_status']}' (Stale state preserved!)")

    # 6. Verify CF-1 ConflictLog is created and OPEN
    print("\n[STEP 6] Verifying CF-1 Conflict Detection in Conflicts log...")
    conflicts_res = requests.get(f"{API_URL}/conflicts", headers=admin_headers)
    assert conflicts_res.status_code == 200
    conflicts = conflicts_res.json()
    
    cf1_conflict = next((c for c in conflicts if c.get("bed_id") == avail_bed["id"] and c["status"] == "open"), None)
    assert cf1_conflict is not None, f"CF-1 conflict not found for bed #{avail_bed['id']}. All conflicts: {conflicts}"
    print(f"  [PASS] CF-1 Conflict Detected: ID CF-{cf1_conflict['id']}, Type: '{cf1_conflict['conflict_type']}', Status: '{cf1_conflict['status']}'")
    print(f"         Description: \"{cf1_conflict['description']}\"")

    # 7. Verify Activity Logs contain both Quick Admit and System Conflict logs
    print("\n[STEP 7] Verifying Activity Log audit trail entries...")
    activity_res = requests.get(f"{API_URL}/activity", headers=admin_headers)
    assert activity_res.status_code == 200
    acts = activity_res.json()
    
    staff_act = next((a for a in acts if "quick-admitted patient" in a["action_description"] and patient_name in a["action_description"]), None)
    assert staff_act is not None, "Staff quick-admit activity entry not found"
    print(f"  [PASS] Staff Activity Log: \"{staff_act['action_description']}\"")

    system_act = next((a for a in acts if "System detected conflict" in a["action_description"] and f"Bed #{avail_bed['id']}" in a["action_description"]), None)
    assert system_act is not None, "System conflict activity entry not found"
    print(f"  [PASS] System Conflict Activity Log: \"{system_act['action_description']}\"")

    # 8. Test Admin Resolving the Conflict
    print(f"\n[STEP 8] Admin resolving Conflict CF-{cf1_conflict['id']}...")
    resolve_res = requests.post(f"{API_URL}/conflicts/{cf1_conflict['id']}/resolve", json={
        "resolution_notes": "Emergency quick-admit acknowledged; updating ward bed system to occupied."
    }, headers=admin_headers)
    assert resolve_res.status_code == 200, f"Failed to resolve conflict: {resolve_res.text}"
    resolved_data = resolve_res.json()
    assert resolved_data["status"] == "resolved"
    print(f"  [PASS] Conflict CF-{cf1_conflict['id']} status updated to '{resolved_data['status']}'")

    # 9. Verify Bed status is now synchronized to 'occupied'
    print("\n[STEP 9] Verifying Bed status was synchronized to 'occupied'...")
    synced_bed = requests.get(f"{API_URL}/beds/{avail_bed['id']}", headers=admin_headers).json()
    assert synced_bed["current_status"] == "occupied", f"Expected bed status 'occupied', got '{synced_bed['current_status']}'"
    print(f"  [PASS] Bed #{avail_bed['id']} status is now '{synced_bed['current_status']}'")

    # 10. Verify Resolution Activity Log entry
    print("\n[STEP 10] Verifying resolution audit trail entry in ActivityLog...")
    act_after = requests.get(f"{API_URL}/activity", headers=admin_headers).json()
    resolve_act = next((a for a in act_after if f"Resolved CF-{cf1_conflict['id']}" in a["action_description"]), None)
    assert resolve_act is not None, "Resolution activity log entry not found"
    print(f"  [PASS] Resolution Activity Log: \"{resolve_act['action_description']}\"")

    print("\n" + "=" * 65)
    print("[SUCCESS] ALL 10 TESTS FOR QUICK ADMIT & CF-1 PASSED PERFECTLY!")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    run_cf1_test()
