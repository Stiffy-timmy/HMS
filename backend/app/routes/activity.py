from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.activity import ActivityLog
from app.schemas.activity import ActivityLogResponse

router = APIRouter(prefix="/activity", tags=["Activity Logs"])

@router.get("", response_model=List[ActivityLogResponse])
def get_activity_logs(
    department: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ActivityLog).outerjoin(User, ActivityLog.user_id == User.id).filter(
        ActivityLog.hospital_id == current_user.hospital_id
    )

    if department:
        # User department matches or log action mentions the department
        query = query.filter(
            (User.department.ilike(f"%{department.strip()}%")) |
            (ActivityLog.action_description.ilike(f"%{department.strip()}%"))
        )

    logs = query.order_by(ActivityLog.timestamp.desc()).limit(limit).all()

    result = []
    for l in logs:
        result.append(ActivityLogResponse(
            id=l.id,
            hospital_id=l.hospital_id,
            user_id=l.user_id,
            user_name=l.user.full_name if l.user else "System",
            user_role=l.user.role.value if l.user else None,
            user_department=l.user.department if l.user else None,
            action_description=l.action_description,
            timestamp=l.timestamp
        ))
    return result
