import requests
import time

BASE_URL = "http://127.0.0.1:8000"

def test_delete_participant():
    print("=== TESTING PARTICIPANT DELETION WORKFLOW ===")

    # 1. Login as Admin
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@medicover.com",
        "password": "Password@123"
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_id = admin_login.json()["user"]["id"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] 1. Admin authenticated.")

    # 2. Register a temporary participant
    ts = int(time.time())
    temp_email = f"temp.delete.nurse.{ts}@gmail.com"
    signup_res = requests.post(f"{BASE_URL}/api/auth/signup", json={
        "hospital_id": 1,
        "full_name": "Temporary Test Nurse",
        "email": temp_email,
        "password": "Password@123",
        "role": "staff",
        "department": "Cardiology",
        "invite_code": "STAFF-OP-2026"
    })
    assert signup_res.status_code == 201, f"Signup failed: {signup_res.text}"
    user_data = signup_res.json()["user"]
    temp_user_id = user_data["id"]
    staff_token = signup_res.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    print(f"[PASS] 2. Created temporary participant '{user_data['full_name']}' (ID: {temp_user_id}).")

    # 3. Verify user appears in admin directory
    users_res = requests.get(f"{BASE_URL}/api/dashboard/users", headers=admin_headers)
    assert users_res.status_code == 200
    all_users = users_res.json()
    assert any(u["id"] == temp_user_id for u in all_users), "New user not in list"
    print(f"[PASS] 3. Participant visible in Admin directory (Total: {len(all_users)}).")

    # 4. Test non-admin cannot delete
    forbidden_delete = requests.delete(f"{BASE_URL}/api/dashboard/users/{temp_user_id}", headers=staff_headers)
    assert forbidden_delete.status_code == 403, f"Expected 403, got {forbidden_delete.status_code}"
    print("[PASS] 4. Non-admin forbidden from deleting participants (RBAC enforced).")

    # 5. Test Admin cannot delete own account
    self_delete = requests.delete(f"{BASE_URL}/api/dashboard/users/{admin_id}", headers=admin_headers)
    assert self_delete.status_code == 400, f"Expected 400, got {self_delete.status_code}"
    print(f"[PASS] 5. Self-deletion safely blocked: {self_delete.json()['detail']}")

    # 6. Admin deletes the temporary participant
    delete_res = requests.delete(f"{BASE_URL}/api/dashboard/users/{temp_user_id}", headers=admin_headers)
    assert delete_res.status_code == 200, f"Delete failed: {delete_res.text}"
    print(f"[PASS] 6. Admin successfully deleted participant: {delete_res.json()['message']}")

    # 7. Verify user is permanently removed from database
    users_after = requests.get(f"{BASE_URL}/api/dashboard/users", headers=admin_headers).json()
    assert not any(u["id"] == temp_user_id for u in users_after), "User still in database!"
    print(f"[PASS] 7. Verified participant is completely removed from database. Total remaining: {len(users_after)}.")

    print("\n=== PARTICIPANT DELETION TESTS PASSED 100%! ===")

if __name__ == "__main__":
    test_delete_participant()
