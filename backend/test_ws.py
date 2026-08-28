import asyncio
import json
import requests
import websockets

API_URL = "http://127.0.0.1:8000/api"
WS_URL = "ws://127.0.0.1:8000/ws/updates"

async def test_websocket_push():
    print("\n[WS TEST] Testing WebSocket real-time push events...")
    
    # 1. Login as staff to obtain token
    login_res = requests.post(f"{API_URL}/auth/login", json={
        "email": "staff.cardio1@medicover.com",
        "password": "Password@123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Connect WebSocket
    uri = f"{WS_URL}?token={token}"
    async with websockets.connect(uri) as ws:
        # Receive welcome connection payload
        welcome = await ws.recv()
        welcome_data = json.loads(welcome)
        assert welcome_data.get("type") == "connection_established"
        print(f"  [PASS] WebSocket connected successfully: {welcome_data['message']}")

        # 3. Trigger a bed update via REST API in background
        print("  [ACTION] Triggering bed update via REST API...")
        update_res = requests.patch(f"{API_URL}/beds/1/status", json={
            "current_status": "occupied"
        }, headers=headers)
        assert update_res.status_code == 200

        # 4. Await WebSocket broadcast message
        event_raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
        event_data = json.loads(event_raw)
        print(f"  [PASS] WebSocket received real-time event:")
        print(f"         Table: {event_data.get('table')}, Action: {event_data.get('action')}, ID: {event_data.get('id')}")
        assert event_data.get("table") in ["ActivityLog", "Bed"]

        print("  [SUCCESS] Real-time WebSocket push verification passed!\n")

if __name__ == "__main__":
    asyncio.run(test_websocket_push())
