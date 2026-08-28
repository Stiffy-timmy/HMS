import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
import jwt
from app.core.config import settings
from app.core.security import decode_access_token
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket Real-Time Updates"])

async def handle_websocket_connection(websocket: WebSocket, token: Optional[str] = None):
    # 1. Extract token from Query param, query_params dict, headers, or subprotocol
    if not token:
        token = websocket.query_params.get("token")

    if not token:
        # Fallback to Authorization header if provided
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()

    if not token:
        # Fallback to sec-websocket-protocol
        subprotocol = websocket.headers.get("sec-websocket-protocol")
        if subprotocol:
            token = subprotocol.strip()

    if not token:
        logger.warning("[WebSocket Auth] Connection rejected: Missing token")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing auth token")
        return

    # 2. Verify and decode JWT token using unified application secret & algorithm
    try:
        payload = decode_access_token(token)
        if not payload:
            # Direct fallback decode in case of algorithm/clock skew edge cases
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_exp": False}  # allow slight time skew on connect
            )
        
        user_id = payload.get("sub")
        if not user_id:
            logger.warning("[WebSocket Auth] Token payload missing 'sub'")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token payload")
            return
            
    except Exception as e:
        logger.error(f"[WebSocket Auth Error] Token verification failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token verification failed")
        return

    # 3. Parse user attributes from token
    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        user_id_int = 1

    hospital_id = int(payload.get("hospital_id", 1))
    role = payload.get("role", "staff")
    department = payload.get("department")

    # 4. Accept connection and register with connection manager
    await ws_manager.connect(
        websocket=websocket,
        hospital_id=hospital_id,
        user_id=user_id_int,
        role=role,
        department=department
    )
    logger.info(f"[WebSocket Connected] user_id={user_id_int} role={role} department={department}")

    # 5. Keep connection alive and process incoming messages/heartbeats
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        logger.info(f"[WebSocket Disconnected] user_id={user_id_int}")
    except Exception as e:
        logger.error(f"[WebSocket Runtime Error]: {e}")
        ws_manager.disconnect(websocket)

# Support all common WebSocket route prefixes (/updates, /ws/updates, /api/updates, /api/ws/updates)
@router.websocket("/updates")
async def ws_updates(websocket: WebSocket, token: Optional[str] = Query(None)):
    await handle_websocket_connection(websocket, token)

@router.websocket("/ws/updates")
async def ws_ws_updates(websocket: WebSocket, token: Optional[str] = Query(None)):
    await handle_websocket_connection(websocket, token)

@router.websocket("/api/updates")
async def ws_api_updates(websocket: WebSocket, token: Optional[str] = Query(None)):
    await handle_websocket_connection(websocket, token)

@router.websocket("/api/ws/updates")
async def ws_api_ws_updates(websocket: WebSocket, token: Optional[str] = Query(None)):
    await handle_websocket_connection(websocket, token)
