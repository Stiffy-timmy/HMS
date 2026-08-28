from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.patient_stay import PatientStay, StayStatus
from app.models.bed import Bed
from app.schemas.patient_stay import PatientStayResponse

router = APIRouter(prefix="/stays", tags=["Patient Stays"])

@router.get("", response_model=List[PatientStayResponse])
def get_patient_stays(
    department: Optional[str] = None,
    status: Optional[StayStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(PatientStay).join(Bed, PatientStay.bed_id == Bed.id).filter(
        PatientStay.hospital_id == current_user.hospital_id
    )

    if department:
        query = query.filter(Bed.department.ilike(f"%{department.strip()}%"))
    if status:
        query = query.filter(PatientStay.status == status)

    stays = query.order_by(PatientStay.admitted_at.desc()).all()

    result = []
    for s in stays:
        result.append(PatientStayResponse(
            id=s.id,
            hospital_id=s.hospital_id,
            patient_name=s.patient_name,
            patient_ref_id=s.patient_ref_id,
            bed_id=s.bed_id,
            ward=s.bed.ward if s.bed else None,
            department=s.bed.department if s.bed else None,
            admitted_at=s.admitted_at,
            expected_discharge_at=s.expected_discharge_at,
            actual_discharge_at=s.actual_discharge_at,
            status=s.status,
            admitted_by=s.admitted_by,
            admitted_by_name=s.admitting_user.full_name if s.admitting_user else None
        ))
    return result

@router.get("/{stay_id}", response_model=PatientStayResponse)
def get_patient_stay(
    stay_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stay = db.query(PatientStay).filter(
        PatientStay.id == stay_id,
        PatientStay.hospital_id == current_user.hospital_id
    ).first()
    if not stay:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient stay not found")

    return PatientStayResponse(
        id=stay.id,
        hospital_id=stay.hospital_id,
        patient_name=stay.patient_name,
        patient_ref_id=stay.patient_ref_id,
        bed_id=stay.bed_id,
        ward=stay.bed.ward if stay.bed else None,
        department=stay.bed.department if stay.bed else None,
        admitted_at=stay.admitted_at,
        expected_discharge_at=stay.expected_discharge_at,
        actual_discharge_at=stay.actual_discharge_at,
        status=stay.status,
        admitted_by=stay.admitted_by,
        admitted_by_name=stay.admitting_user.full_name if stay.admitting_user else None
    )
