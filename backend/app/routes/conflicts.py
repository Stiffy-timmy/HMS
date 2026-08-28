from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.conflict import ConflictLog, ConflictStatus
from app.models.bed import Bed
from app.models.patient_stay import PatientStay
from app.schemas.conflict import ConflictLogResponse

router = APIRouter(prefix="/conflicts", tags=["Conflicts"])

@router.get("", response_model=List[ConflictLogResponse])
def get_conflicts(
    department: Optional[str] = None,
    status: Optional[ConflictStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ConflictLog).filter(ConflictLog.hospital_id == current_user.hospital_id)

    if status:
        query = query.filter(ConflictLog.status == status)

    conflicts = query.order_by(ConflictLog.detected_at.desc()).all()

    result = []
    for c in conflicts:
        # Check if matches department filter if supplied
        bed_dept = c.bed.department if c.bed else (c.stay.bed.department if (c.stay and c.stay.bed) else None)
        
        if department and bed_dept and department.lower() not in bed_dept.lower():
            continue

        result.append(ConflictLogResponse(
            id=c.id,
            hospital_id=c.hospital_id,
            conflict_type=c.conflict_type,
            related_stay_id=c.related_stay_id,
            related_bed_id=c.related_bed_id,
            bed_ward=c.bed.ward if c.bed else (c.stay.bed.ward if (c.stay and c.stay.bed) else None),
            bed_department=bed_dept,
            bed_price_per_day=c.bed.price_per_day if c.bed else (c.stay.bed.price_per_day if (c.stay and c.stay.bed) else None),
            patient_name=c.stay.patient_name if c.stay else None,
            description=c.description,
            detected_at=c.detected_at,
            status=c.status,
            assigned_to=c.assigned_to,
            assigned_to_name=c.assigned_user.full_name if c.assigned_user else None
        ))
    return result
