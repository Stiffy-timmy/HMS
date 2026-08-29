from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.conflict import ConflictLog, ConflictStatus
from app.models.bed import Bed
from app.models.patient_stay import PatientStay
from app.schemas.conflict import ConflictLogResponse, ConflictResolveRequest
from app.services.conflict_service import resolve_conflict_manually, calculate_conflict_revenue_risk

router = APIRouter(prefix="/conflicts", tags=["Conflicts"])


@router.get("", response_model=List[ConflictLogResponse])
def get_conflicts(
    department: Optional[str] = None,
    status: Optional[ConflictStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return []


@router.get("/{conflict_id}", response_model=ConflictLogResponse)
def get_conflict(
    conflict_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conflict = db.query(ConflictLog).filter(
        ConflictLog.id == conflict_id,
        ConflictLog.hospital_id == current_user.hospital_id
    ).first()
    if not conflict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found")

    bed_obj = conflict.bed or (conflict.stay.bed if (conflict.stay and conflict.stay.bed) else None)
    risk_val = calculate_conflict_revenue_risk(conflict, db)

    return ConflictLogResponse(
        id=conflict.id,
        hospital_id=conflict.hospital_id,
        conflict_type=conflict.conflict_type,
        related_stay_id=conflict.related_stay_id,
        related_bed_id=conflict.related_bed_id,
        bed_id=conflict.related_bed_id or (bed_obj.id if bed_obj else None),
        bed_ward=bed_obj.ward if bed_obj else None,
        bed_department=bed_obj.department if bed_obj else None,
        bed_price_per_day=bed_obj.price_per_day if bed_obj else None,
        patient_name=conflict.stay.patient_name if conflict.stay else None,
        description=conflict.description,
        detected_at=conflict.detected_at,
        status=conflict.status,
        assigned_to=conflict.assigned_to,
        assigned_to_name=conflict.assigned_user.full_name if conflict.assigned_user else None,
        revenue_at_risk=risk_val
    )

@router.post("/{conflict_id}/resolve", response_model=ConflictLogResponse)
async def resolve_conflict_endpoint(
    conflict_id: int,
    payload: ConflictResolveRequest = ConflictResolveRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resolved = await resolve_conflict_manually(
        db=db,
        conflict_id=conflict_id,
        user=current_user,
        resolution_notes=payload.resolution_notes
    )
    if not resolved:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found or cannot be resolved")

    bed_obj = resolved.bed or (resolved.stay.bed if (resolved.stay and resolved.stay.bed) else None)
    return ConflictLogResponse(
        id=resolved.id,
        hospital_id=resolved.hospital_id,
        conflict_type=resolved.conflict_type,
        related_stay_id=resolved.related_stay_id,
        related_bed_id=resolved.related_bed_id,
        bed_id=resolved.related_bed_id or (bed_obj.id if bed_obj else None),
        bed_ward=bed_obj.ward if bed_obj else None,
        bed_department=bed_obj.department if bed_obj else None,
        bed_price_per_day=bed_obj.price_per_day if bed_obj else None,
        patient_name=resolved.stay.patient_name if resolved.stay else None,
        description=resolved.description,
        detected_at=resolved.detected_at,
        status=resolved.status,
        assigned_to=resolved.assigned_to,
        assigned_to_name=current_user.full_name
    )

