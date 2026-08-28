import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from app.core.security import decode_access_token
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket Real-Time Updates"])

@router.websocket("/ws/updates")
async def websocket_updates(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing auth token")
        return

    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token")
        return

    user_id = int(payload.get("sub", 0))
    hospital_id = int(payload.get("hospital_id", 1))
    role = payload.get("role", "staff")
    department = payload.get("department")

    await ws_manager.connect(
        websocket=websocket,
        hospital_id=hospital_id,
        user_id=user_id,
        role=role,
        department=department
    )

    try:
        while True:
            # Keep connection alive and accept client pings
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)
