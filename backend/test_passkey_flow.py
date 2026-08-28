import requests

BASE_URL = "http://127.0.0.1:8000"

def test_passkey_workflow():
    print("=== STARTING PASSKEY & GMAIL REGISTRATION FLOW TEST ===")

    # 1. Login as Admin
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@medicover.com",
        "password": "Password@123"
    })
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] 1. Admin authenticated successfully.")

    # 2. Test Non-Gmail rejection during signup
    bad_signup = requests.post(f"{BASE_URL}/api/auth/signup", json={
        "hospital_id": 1,
        "full_name": "Test User",
        "email": "testuser@hospital.com",
        "password": "Password@123",
        "role": "staff",
        "department": "Cardiology",
        "invite_code": "STAFF-OP-2026"
    })
    assert bad_signup.status_code == 400 or bad_signup.status_code == 422, f"Should reject non-gmail: {bad_signup.status_code}"
    print(f"[PASS] 2. Non-@gmail.com email correctly rejected: {bad_signup.json()['detail']}")

    # 3. Admin generates a new custom passkey in DB
    import time
    timestamp = int(time.time())
    custom_passkey = f"STAFF-TEST-{timestamp}"
    create_pk_res = requests.post(
        f"{BASE_URL}/api/auth/passkeys",
        headers=admin_headers,
        json={
            "role": "staff",
            "code": custom_passkey,
            "department": "Cardiology"
        }
    )
    assert create_pk_res.status_code == 201, f"Failed to create passkey: {create_pk_res.text}"
    created_pk_data = create_pk_res.json()
    assert created_pk_data["code"] == custom_passkey
    assert created_pk_data["role"] == "staff"
    print(f"[PASS] 3. Admin successfully created and stored passkey '{custom_passkey}' in database.")

    # 4. Admin lists stored passkeys
    list_pk_res = requests.get(f"{BASE_URL}/api/auth/passkeys", headers=admin_headers)
    assert list_pk_res.status_code == 200
    passkeys = list_pk_res.json()
    found_pk = any(p["code"] == custom_passkey for p in passkeys)
    assert found_pk, "Newly created passkey not found in list."
    print(f"[PASS] 4. Passkey confirmed in database registry (Total stored passkeys: {len(passkeys)}).")

    # 5. New Staff user uses this passkey + @gmail.com to register
    import time
    timestamp = int(time.time())
    new_gmail = f"clinical.nurse.{timestamp}@gmail.com"

    signup_res = requests.post(f"{BASE_URL}/api/auth/signup", json={
        "hospital_id": 1,
        "full_name": "Nurse Shreya Gupta",
        "email": new_gmail,
        "password": "Password@123",
        "role": "staff",
        "department": "Cardiology",
        "invite_code": custom_passkey
    })
    assert signup_res.status_code == 201, f"Signup failed with passkey: {signup_res.text}"
    signup_data = signup_res.json()
    new_user = signup_data["user"]
    assert new_user["email"] == new_gmail
    assert new_user["registered_passkey"] == custom_passkey
    print(f"[PASS] 5. Registered new user '{new_user['full_name']}' ({new_user['email']}) with passkey '{new_user['registered_passkey']}'.")

    # 6. Verify Admin can see registered user and their passkey in Users list
    admin_dash = requests.get(f"{BASE_URL}/api/dashboard/users", headers=admin_headers)
    assert admin_dash.status_code == 200
    all_users = admin_dash.json()
    registered_in_db = next((u for u in all_users if u["email"] == new_gmail), None)
    assert registered_in_db is not None, "Registered user not found in admin directory"
    assert registered_in_db["registered_passkey"] == custom_passkey
    print(f"[PASS] 6. Verified user credentials & registered passkey stored in users database: {registered_in_db['registered_passkey']}")

    print("\n=== ALL PASSKEY & GMAIL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    test_passkey_workflow()
