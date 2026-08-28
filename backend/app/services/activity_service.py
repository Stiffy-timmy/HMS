from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.activity import ActivityLog
from app.services.websocket_manager import ws_manager

async def log_activity(
    db: Session,
    hospital_id: int,
    user_id: int,
    action_description: str,
    department: str = None
) -> ActivityLog:
    log_entry = ActivityLog(
        hospital_id=hospital_id,
        user_id=user_id,
        action_description=action_description,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    
    # Broadcast activity change
    try:
        await ws_manager.broadcast_change(
            table="ActivityLog",
            action="create",
            id=log_entry.id,
            hospital_id=hospital_id,
            department=department,
            details={"description": action_description}
        )
    except Exception:
        pass
        
    return log_entry
