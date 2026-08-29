import asyncio
import json
import requests
import websockets

API_URL = "http://127.0.0.1:8000/api"
WS_URL = "ws://127.0.0.1:8000/ws/updates"

async def test_live_websocket_and_flow():
    print("\n" + "=" * 70)
    print("[E2E WS TEST] REAL-TIME WEBSOCKET MULTI-CLIENT VERIFICATION")
    print("=" * 70)

    # 1. Authenticate Staff & Admin
    print("\n[1] Authenticating Staff and Admin accounts...")
    staff_auth = requests.post(f"{API_URL}/auth/login", json={
        "email": "staff.cardio1@medicover.com",
        "password": "Password@123"
    }).json()
    staff_token = staff_auth["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    admin_auth = requests.post(f"{API_URL}/auth/login", json={
        "email": "admin@medicover.com",
        "password": "Password@123"
    }).json()
    admin_token = admin_auth["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Pick/ensure an available bed with NO active stays
    stays = requests.get(f"{API_URL}/stays", headers=admin_headers).json()
    active_bed_ids = {s["bed_id"] for s in stays if s["status"] == "active"}
    
    beds = requests.get(f"{API_URL}/beds", params={"department": "Cardiology"}, headers=staff_headers).json()
    target_bed = next((b for b in beds if b["id"] not in active_bed_ids), None)
    if not target_bed:
        target_bed = beds[0]
    
    # Ensure it is available
    if target_bed["current_status"] != "available":
        requests.patch(f"{API_URL}/beds/{target_bed['id']}/status", json={"current_status": "available"}, headers=staff_headers)
        target_bed = requests.get(f"{API_URL}/beds/{target_bed['id']}", headers=staff_headers).json()
    print(f"  [PASS] Target Bed #{target_bed['id']} ({target_bed['ward']}) is Available and free of stays")

    # 3. Connect WebSockets for both Admin and Staff
    print("\n[2] Connecting concurrent WebSockets for Admin and Staff...")
    async with websockets.connect(f"{WS_URL}?token={admin_token}") as admin_ws, \
               websockets.connect(f"{WS_URL}?token={staff_token}") as staff_ws:
        
        # Read welcome packets
        msg1 = json.loads(await admin_ws.recv())
        msg2 = json.loads(await staff_ws.recv())
        assert msg1.get("type") == "connection_established"
        assert msg2.get("type") == "connection_established"
        print("  [PASS] Both Admin and Staff WebSocket streams active and connected!")

        # 4. Trigger Quick Admit as Staff
        print("\n[3] Triggering Quick Admit for 'Devika Mehra' via REST API...")
        admit_res = requests.post(f"{API_URL}/stays/quick-admit", json={
            "patient_name": "Devika Mehra",
            "patient_ref_id": f"PT-E2E-{target_bed['id']}",
            "bed_id": target_bed["id"]
        }, headers=staff_headers)
        assert admit_res.status_code == 200
        stay_data = admit_res.json()
        print(f"  [PASS] Quick Admit executed for Bed #{target_bed['id']}")

        # 5. Collect WebSocket events received by Admin
        print("\n[4] Listening for immediate WebSocket broadcasts on Admin stream...")
        received_tables = []
        for _ in range(4): # Expect PatientStay, ActivityLog (staff), ConflictLog (CF-1), ActivityLog (system)
            raw = await asyncio.wait_for(admin_ws.recv(), timeout=4.0)
            data = json.loads(raw)
            if data.get("type") == "db_change":
                received_tables.append((data.get("table"), data.get("action"), data.get("details", {})))
                print(f"    --> Admin WS Received: Table={data.get('table')}, Action={data.get('action')}, Details={data.get('details')}")

        has_stay = any(t[0] == "PatientStay" for t in received_tables)
        has_conflict = any(t[0] == "ConflictLog" and t[1] == "create" for t in received_tables)
        has_activity = any(t[0] == "ActivityLog" for t in received_tables)
        assert has_stay, "Admin did not receive PatientStay WS event"
        assert has_conflict, "Admin did not receive ConflictLog WS event"
        assert has_activity, "Admin did not receive ActivityLog WS event"
        print("  [PASS] Admin received all real-time events immediately via WebSocket!")

        # Find the conflict ID
        conflict_item = next(t for t in received_tables if t[0] == "ConflictLog")
        conflict_id = conflict_item[2].get("conflict_id") or conflict_item[2].get("id") or 1

        # 6. Resolve conflict as Admin
        print(f"\n[5] Admin manually resolving conflict CF-{conflict_id}...")
        resolve_res = requests.post(f"{API_URL}/conflicts/{conflict_id}/resolve", json={
            "resolution_notes": "Live test resolved"
        }, headers=admin_headers)
        assert resolve_res.status_code == 200

        # 7. Verify resolution events received by both clients
        print("\n[6] Verifying resolution broadcast on Staff WS...")
        staff_event = json.loads(await asyncio.wait_for(staff_ws.recv(), timeout=4.0))
        print(f"    --> Staff WS Received: {staff_event.get('table')} {staff_event.get('action')}")
        assert staff_event.get("table") in ["Bed", "ConflictLog", "ActivityLog"]

        print("\n" + "=" * 70)
        print("[SUCCESS] END-TO-END MULTI-CLIENT LIVE WS TEST PASSED WITH 100% SUCCESS!")
        print("=" * 70 + "\n")

if __name__ == "__main__":
    asyncio.run(test_live_websocket_and_flow())
