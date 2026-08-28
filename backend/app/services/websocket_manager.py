import json
import logging
from typing import Dict, List, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Active connections mapped by WebSocket
        self.active_connections: List[WebSocket] = []
        # Store metadata for each connection
        self.connection_meta: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, hospital_id: int, user_id: int, role: str, department: Optional[str] = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_meta[websocket] = {
            "hospital_id": hospital_id,
            "user_id": user_id,
            "role": role,
            "department": department
        }
        logger.info(f"WebSocket connected: user={user_id}, role={role}, hospital={hospital_id}, dept={department}")
        
        # Send initial connection acknowledgment
        try:
            await websocket.send_text(json.dumps({
                "type": "connection_established",
                "message": "Connected to real-time hospital operations stream",
                "user_id": user_id,
                "hospital_id": hospital_id,
                "department": department
            }))
        except Exception as e:
            logger.warning(f"Failed to send welcome message: {e}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.connection_meta:
            del self.connection_meta[websocket]
        logger.info("WebSocket disconnected")

    async def broadcast_change(
        self,
        table: str,
        action: str,
        id: int,
        hospital_id: int,
        department: Optional[str] = None,
        details: Optional[dict] = None
    ):
        """
        Broadcast a simple database event payload to relevant connected clients.
        Payload format: { "table": "Bed", "action": "update", "id": 12, ... }
        """
        payload = {
            "type": "db_change",
            "table": table,
            "action": action,
            "id": id,
            "hospital_id": hospital_id,
            "department": department,
            "details": details or {}
        }
        message = json.dumps(payload)
        
        disconnected = []
        for connection in self.active_connections:
            meta = self.connection_meta.get(connection, {})
            # Must match hospital_id
            if meta.get("hospital_id") != hospital_id:
                continue
            
            # If the user is admin, they receive all hospital updates
            # If the user has a department and the event is department-specific, match or receive general updates
            user_role = meta.get("role")
            user_dept = meta.get("department")
            
            # Send to admin unconditionally within hospital
            # For HOD/Staff, send if event department is None OR event department == user department OR it's a conflict/bed update
            should_send = (
                user_role == "admin" or
                department is None or
                user_dept is None or
                user_dept.lower() == department.lower()
            )
            
            if should_send:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.warning(f"Error sending to websocket client: {e}")
                    disconnected.append(connection)
                    
        for conn in disconnected:
            self.disconnect(conn)

ws_manager = ConnectionManager()
