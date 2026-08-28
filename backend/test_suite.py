import os
import sys
import asyncio
import requests
import json
import websockets
from datetime import datetime

API_URL = "http://127.0.0.1:8000/api"
WS_URL = "ws://127.0.0.1:8000/ws/updates"

def run_tests():
    print("\n" + "=" * 60)
    print("[TEST SUITE] STARTING AUTOMATED TEST SUITE FOR HMS PHASE 1")
    print("=" * 60)

    # 1. Test Admin Login
    print("\n[TEST 1] Testing Admin Login...")
    admin_login_res = requests.post(f"{API_URL}/auth/login", json={
        "email": "admin@medicover.com",
        "password": "Password@123"
    })
    assert admin_login_res.status_code == 200, f"Failed admin login: {admin_login_res.text}"
    admin_data = admin_login_res.json()
    admin_token = admin_data["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(f"  [PASS] Admin logged in successfully (User: {admin_data['user']['full_name']}, Role: {admin_data['user']['role']})")

    # 2. Test HOD Login
    print("\n[TEST 2] Testing HOD Login...")
    hod_login_res = requests.post(f"{API_URL}/auth/login", json={
        "email": "hod.cardio@medicover.com",
        "password": "Password@123"
    })
    assert hod_login_res.status_code == 200, f"Failed HOD login: {hod_login_res.text}"
    hod_data = hod_login_res.json()
    hod_token = hod_data["access_token"]
    hod_headers = {"Authorization": f"Bearer {hod_token}"}
    print(f"  [PASS] HOD logged in successfully (User: {hod_data['user']['full_name']}, Dept: {hod_data['user']['department']})")

    # 3. Test Staff Login
    print("\n[TEST 3] Testing Staff Login...")
    staff_login_res = requests.post(f"{API_URL}/auth/login", json={
        "email": "staff.cardio1@medicover.com",
        "password": "Password@123"
    })
    assert staff_login_res.status_code == 200, f"Failed staff login: {staff_login_res.text}"
    staff_data = staff_login_res.json()
    staff_token = staff_data["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    print(f"  [PASS] Staff logged in successfully (User: {staff_data['user']['full_name']}, Dept: {staff_data['user']['department']})")

    # 4. Test Role Invite Code Verification during Signup
    print("\n[TEST 4] Testing Role Invite Code Validation on Signup...")
    # 4a. Invalid invite code should be rejected
    invalid_signup_res = requests.post(f"{API_URL}/auth/signup", json={
        "hospital_id": 1,
        "full_name": "Test Imposter",
        "email": "imposter@gmail.com",
        "password": "Password@123",
        "role": "admin",
        "invite_code": "WRONG-KEY"
    })
    assert invalid_signup_res.status_code == 400, "Should have rejected wrong invite code"
    print(f"  [PASS] Correctly rejected invalid invite code: {invalid_signup_res.json()['detail']}")

    # 4b. Valid invite code should be accepted
    test_staff_email = f"test.nurse_{int(datetime.now().timestamp())}@gmail.com"
    valid_signup_res = requests.post(f"{API_URL}/auth/signup", json={
        "hospital_id": 1,
        "full_name": "Nurse Maya Sharma",
        "email": test_staff_email,
        "password": "Password@123",
        "role": "staff",
        "department": "Cardiology",
        "invite_code": "STAFF-OP-2026"
    })
    assert valid_signup_res.status_code == 201, f"Failed valid signup: {valid_signup_res.text}"
    print(f"  [PASS] Correctly registered new user with valid role invite code: {valid_signup_res.json()['user']['email']}")

    # 5. Test Password Reset Flow
    print("\n[TEST 5] Testing Password Reset Flow...")
    forgot_res = requests.post(f"{API_URL}/auth/forgot-password", json={
        "email": test_staff_email
    })
    assert forgot_res.status_code == 200
    reset_token = forgot_res.json().get("reset_token")
    assert reset_token is not None, "Reset token should be returned"
    print(f"  [PASS] Password reset token generated: {reset_token[:15]}...")

    reset_res = requests.post(f"{API_URL}/auth/reset-password", json={
        "token": reset_token,
        "new_password": "NewSecretPassword@456"
    })
    assert reset_res.status_code == 200
    print("  [PASS] Password reset successfully applied.")

    # Verify new password login
    new_login_res = requests.post(f"{API_URL}/auth/login", json={
        "email": test_staff_email,
        "password": "NewSecretPassword@456"
    })
    assert new_login_res.status_code == 200
    print("  [PASS] Successfully logged in with updated password!")

    # 6. Test Role-Based Authorization Guards
    print("\n[TEST 6] Testing Role-Based Route Protection...")
    # Staff attempting to hit Admin Dashboard should get 403
    staff_admin_attempt = requests.get(f"{API_URL}/dashboard/admin", headers=staff_headers)
    assert staff_admin_attempt.status_code == 403, f"Staff should be blocked from admin dashboard: {staff_admin_attempt.status_code}"
    print(f"  [PASS] Staff blocked from admin dashboard (HTTP 403: {staff_admin_attempt.json()['detail']})")

    # Staff attempting to view hospital users list
    staff_users_attempt = requests.get(f"{API_URL}/dashboard/users", headers=staff_headers)
    assert staff_users_attempt.status_code == 403, f"Staff should be blocked from users list: {staff_users_attempt.status_code}"
    print("  [PASS] Staff blocked from hospital account directory")

    # Admin accessing Admin Dashboard
    admin_dash_res = requests.get(f"{API_URL}/dashboard/admin", headers=admin_headers)
    assert admin_dash_res.status_code == 200
    admin_stats = admin_dash_res.json()
    print(f"  [PASS] Admin Dashboard Stats loaded: {admin_stats['total_beds']} total beds, {admin_stats['occupied_beds']} occupied, Revenue at risk: Rs.{admin_stats['revenue_at_risk_per_day']}")

    # 7. Test Bed Listing & Real-Time Status Update
    print("\n[TEST 7] Testing Bed Status Update & Activity Trail...")
    beds_res = requests.get(f"{API_URL}/beds", headers=staff_headers)
    assert beds_res.status_code == 200
    beds = beds_res.json()
    assert len(beds) >= 20, f"Expected at least 20 beds, found {len(beds)}"
    
    target_bed = beds[0]
    new_status = "occupied" if target_bed["current_status"] == "available" else "available"
    update_res = requests.patch(f"{API_URL}/beds/{target_bed['id']}/status", json={
        "current_status": new_status
    }, headers=staff_headers)
    assert update_res.status_code == 200
    updated_bed = update_res.json()
    assert updated_bed["current_status"] == new_status
    print(f"  [PASS] Updated Bed #{target_bed['id']} ({target_bed['ward']}) to '{new_status}'")

    # Check that Activity Log was created
    activity_res = requests.get(f"{API_URL}/activity", headers=admin_headers)
    assert activity_res.status_code == 200
    recent_act = activity_res.json()[0]
    print(f"  [PASS] Activity audit trail logged: '{recent_act['action_description']}'")

    # 8. Test Lab Orders Workflow
    print("\n[TEST 8] Testing Lab Orders Workflow...")
    labs_res = requests.get(f"{API_URL}/labs", headers=staff_headers)
    assert labs_res.status_code == 200
    labs = labs_res.json()
    assert len(labs) > 0
    target_lab = next((l for l in labs if l["status"] == "pending"), labs[0])
    
    lab_update_res = requests.patch(f"{API_URL}/labs/{target_lab['id']}/status", json={
        "status": "in_progress"
    }, headers=staff_headers)
    assert lab_update_res.status_code == 200
    assert lab_update_res.json()["status"] == "in_progress"
    assert lab_update_res.json()["sample_collected_at"] is not None
    print(f"  [PASS] Lab Order #{target_lab['id']} ({target_lab['test_name']}) transitioned to 'in_progress' with timestamp")

    # 9. Test Data Conflicts Panel
    print("\n[TEST 9] Testing Conflicts Retrieval...")
    conflicts_res = requests.get(f"{API_URL}/conflicts", headers=admin_headers)
    assert conflicts_res.status_code == 200
    conflicts = conflicts_res.json()
    assert len(conflicts) >= 3
    print(f"  [PASS] Retrieved {len(conflicts)} data conflict records")

    print("\n" + "=" * 60)
    print("[SUCCESS] ALL 9 TEST SUITES PASSED SUCCESSFULLY!")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    run_tests()
