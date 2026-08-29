import os
import sys
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

# Ensure app imports properly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.main import app
from app.seed.seed_data import seed_database

client = TestClient(app)

def run_tests():
    print("\n" + "=" * 70)
    print("RUNNING MULTI-BRANCH NETWORK & PATIENT APPOINTMENT TEST SUITE")
    print("=" * 70)

    # Step 1: Reseed Database
    print("\n[Step 1] Initializing fresh multi-branch database...")
    seed_database()
    print("  [PASS] Database seeded with 4 branches, doctors, and assignments.")

    # Step 2: Test GET /api/hospitals
    print("\n[Step 2] Testing GET /api/hospitals (Public Multi-Branch Listing)...")
    res = client.get("/api/hospitals")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    branches = res.json()
    assert len(branches) == 4, f"Expected 4 branches, got {len(branches)}"
    print(f"  [PASS] Retrieved {len(branches)} hospital branches:")
    for b in branches:
        print(f"         - {b['name']} ({b['city']}) | Available Beds: {b['available_beds_count']} | On-Duty Doctors: {b['on_duty_doctors_count']}")

    # Step 3: Test GET /api/doctors
    print("\n[Step 3] Testing GET /api/doctors...")
    res = client.get("/api/doctors")
    assert res.status_code == 200
    doctors = res.json()
    assert len(doctors) == 7, f"Expected 7 doctors, got {len(doctors)}"
    print(f"  [PASS] Retrieved {len(doctors)} shared specialist doctors.")

    # Step 4: Test HOD Doctor Duty Status Toggle
    print("\n[Step 4] Testing HOD Doctor Duty Toggle (Dr. Ananya Rao toggled to 'on_leave' then back to 'on_duty')...")
    # Login as HOD Cardio
    login_res = client.post("/api/auth/login", json={"email": "hod.cardio@medicover.com", "password": "Password@123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch assignment for Dr. Ananya in Hitech City
    assign_res = client.get("/api/doctors/assignments?hospital_id=1&department=Cardiology")
    assert assign_res.status_code == 200
    assignments = assign_res.json()
    assert len(assignments) > 0
    ananya_assign = assignments[0]
    assign_id = ananya_assign["id"]

    # Toggle to ON_LEAVE
    patch_res = client.patch(
        f"/api/doctors/assignments/{assign_id}/duty-status",
        headers=headers,
        json={"duty_status": "on_leave", "room_number": "OPD Suite 101 (Leave Covered)", "shift_timings": "On Leave"}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["duty_status"] == "on_leave"
    print(f"  [PASS] Updated Dr. Ananya assignment #{assign_id} to 'on_leave'")

    # Toggle back to ON_DUTY
    patch_res2 = client.patch(
        f"/api/doctors/assignments/{assign_id}/duty-status",
        headers=headers,
        json={"duty_status": "on_duty", "room_number": "OPD Suite 101", "shift_timings": "09:00 AM - 02:00 PM"}
    )
    assert patch_res2.status_code == 200
    assert patch_res2.json()["duty_status"] == "on_duty"
    print(f"  [PASS] Returned Dr. Ananya assignment #{assign_id} to 'on_duty'")

    # Step 5: Test Public Nearest Branch Recommendation Engine
    print("\n[Step 5] Testing Public Patient Nearest Branch Recommendation Engine...")
    # Patient in Hyderabad with chest tightness
    rec_payload = {
        "patient_city": "Hyderabad",
        "illness_description": "Severe chest pain radiating to left arm and heavy sweating",
        "speciality_requested": "Cardiology"
    }
    rec_res = client.post("/api/appointments/recommend", json=rec_payload)
    assert rec_res.status_code == 200
    recs = rec_res.json()
    assert len(recs) > 0
    top_rec = recs[0]
    print(f"  [PASS] Recommendation received! Top Recommended Branch:")
    print(f"         - Hospital: {top_rec['hospital_name']}")
    print(f"         - City: {top_rec['city']}")
    print(f"         - Specialist: {top_rec['doctor_name']} ({top_rec['doctor_speciality']})")
    print(f"         - Status: {top_rec['duty_status'].upper()}")
    print(f"         - Badge: {top_rec['distance_badge']}")
    print(f"         - Slots: {top_rec['available_slots'][:3]}")
    assert top_rec["city"] == "Hyderabad"
    assert top_rec["duty_status"] == "on_duty"

    # Step 6: Test Public Patient Booking (Zero Authentication)
    print("\n[Step 6] Testing Public Patient Appointment Booking (Zero Auth Required)...")
    book_payload = {
        "hospital_id": top_rec["hospital_id"],
        "doctor_id": top_rec["doctor_id"],
        "patient_name": "Suresh Reddy",
        "patient_phone": "9848011223",
        "patient_email": "suresh.reddy@gmail.com",
        "patient_age": 52,
        "patient_gender": "Male",
        "patient_city": "Hyderabad",
        "illness_description": "Severe chest pain radiating to left arm and heavy sweating",
        "speciality_requested": "Cardiology",
        "appointment_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "time_slot": "11:30 AM"
    }
    book_res = client.post("/api/appointments/book", json=book_payload)
    assert book_res.status_code == 201, f"Booking failed: {book_res.text}"
    booking = book_res.json()
    print(f"  [PASS] Appointment Booked Successfully!")
    print(f"         - Token: {booking['appointment_token']}")
    print(f"         - Patient: {booking['patient_name']} (Age: {booking['patient_age']})")
    print(f"         - Branch: {booking['hospital_name']}")
    print(f"         - Doctor: {booking['doctor_name']}")
    print(f"         - Time Slot: {booking['time_slot']}")
    print(f"         - Status: {booking['status']}")

    # Step 7: Test GET /api/appointments listing
    print("\n[Step 7] Testing GET /api/appointments listing...")
    apt_list_res = client.get("/api/appointments?hospital_id=1")
    assert apt_list_res.status_code == 200
    apts = apt_list_res.json()
    assert any(a["appointment_token"] == booking["appointment_token"] for a in apts)
    print(f"  [PASS] Verified booking {booking['appointment_token']} in hospital appointments registry.")

    print("\n" + "=" * 70)
    print("ALL MULTI-BRANCH & APPOINTMENT TESTS PASSED 100% SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
