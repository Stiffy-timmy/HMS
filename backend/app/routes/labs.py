from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.lab_order import LabOrder, LabStatus
from app.models.patient_stay import PatientStay
from app.models.bed import Bed
from app.schemas.lab_order import LabOrderResponse, LabOrderUpdateStatus
from app.services.websocket_manager import ws_manager
from app.services.activity_service import log_activity

router = APIRouter(prefix="/labs", tags=["Lab Orders"])



@router.get("", response_model=List[LabOrderResponse])
def get_lab_orders(
    department: Optional[str] = None,
    status: Optional[LabStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(LabOrder).join(PatientStay, LabOrder.stay_id == PatientStay.id).join(Bed, PatientStay.bed_id == Bed.id).filter(
        LabOrder.hospital_id == current_user.hospital_id
    )

    if department:
        query = query.filter(Bed.department.ilike(f"%{department.strip()}%"))
    if status:
        query = query.filter(LabOrder.status == status)

    labs = query.order_by(LabOrder.ordered_at.desc()).all()

    result = []
    for l in labs:
        result.append(LabOrderResponse(
            id=l.id,
            hospital_id=l.hospital_id,
            stay_id=l.stay_id,
            patient_name=l.stay.patient_name if l.stay else None,
            patient_ref_id=l.stay.patient_ref_id if l.stay else None,
            department=l.stay.bed.department if (l.stay and l.stay.bed) else None,
            ward=l.stay.bed.ward if (l.stay and l.stay.bed) else None,
            test_name=l.test_name,
            ordered_at=l.ordered_at,
            sample_collected_at=l.sample_collected_at,
            result_at=l.result_at,
            status=l.status,
            billed=l.billed
        ))
    return result

@router.patch("/{lab_id}/status", response_model=LabOrderResponse)
async def update_lab_order_status(
    lab_id: int,
    payload: LabOrderUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lab = db.query(LabOrder).filter(
        LabOrder.id == lab_id,
        LabOrder.hospital_id == current_user.hospital_id
    ).first()
    if not lab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab order not found")

    old_status = lab.status.value
    new_status = payload.status.value
    now = datetime.now(timezone.utc)

    lab.status = payload.status
    if payload.status == LabStatus.IN_PROGRESS and not lab.sample_collected_at:
        lab.sample_collected_at = now
    elif payload.status == LabStatus.COMPLETED:
        if not lab.sample_collected_at:
            lab.sample_collected_at = now
        if not lab.result_at:
            lab.result_at = now

    db.commit()
    db.refresh(lab)

    dept = lab.stay.bed.department if (lab.stay and lab.stay.bed) else None
    patient_name = lab.stay.patient_name if lab.stay else "Patient"

    # Log activity
    action_desc = f"{current_user.full_name} updated Lab Test '{lab.test_name}' for {patient_name} from '{old_status}' to '{new_status}'"
    await log_activity(
        db=db,
        hospital_id=lab.hospital_id,
        user_id=current_user.id,
        action_description=action_desc,
        department=dept
    )

    # Broadcast WebSocket notification
    await ws_manager.broadcast_change(
        table="LabOrder",
        action="update",
        id=lab.id,
        hospital_id=lab.hospital_id,
        department=dept,
        details={
            "lab_id": lab.id,
            "test_name": lab.test_name,
            "old_status": old_status,
            "new_status": new_status,
            "patient_name": patient_name
        }
    )

    return LabOrderResponse(
        id=lab.id,
        hospital_id=lab.hospital_id,
        stay_id=lab.stay_id,
        patient_name=patient_name,
        patient_ref_id=lab.stay.patient_ref_id if lab.stay else None,
        department=dept,
        ward=lab.stay.bed.ward if (lab.stay and lab.stay.bed) else None,
        test_name=lab.test_name,
        ordered_at=lab.ordered_at,
        sample_collected_at=lab.sample_collected_at,
        result_at=lab.result_at,
        status=lab.status,
        billed=lab.billed
    )

@router.post("/{lab_id}/bill", response_model=LabOrderResponse)
async def mark_lab_order_billed(
    lab_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lab = db.query(LabOrder).filter(
        LabOrder.id == lab_id,
        LabOrder.hospital_id == current_user.hospital_id
    ).first()
    if not lab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab order not found")

    lab.billed = True
    db.commit()
    db.refresh(lab)

    dept = lab.stay.bed.department if (lab.stay and lab.stay.bed) else None
    patient_name = lab.stay.patient_name if lab.stay else "Patient"

    act_desc = f"{current_user.full_name} attached & billed completed Lab Test '{lab.test_name}' for {patient_name} to Billing account"
    await log_activity(
        db=db,
        hospital_id=lab.hospital_id,
        user_id=current_user.id,
        action_description=act_desc,
        department="Billing"
    )

    await ws_manager.broadcast_change(
        table="LabOrder",
        action="update",
        id=lab.id,
        hospital_id=lab.hospital_id,
        department=dept,
        details={
            "lab_id": lab.id,
            "test_name": lab.test_name,
            "billed": True,
            "patient_name": patient_name
        }
    )

    return LabOrderResponse(

        id=lab.id,
        hospital_id=lab.hospital_id,
        stay_id=lab.stay_id,
        patient_name=patient_name,
        patient_ref_id=lab.stay.patient_ref_id if lab.stay else None,
        department=dept,
        ward=lab.stay.bed.ward if (lab.stay and lab.stay.bed) else None,
        test_name=lab.test_name,
        ordered_at=lab.ordered_at,
        sample_collected_at=lab.sample_collected_at,
        result_at=lab.result_at,
        status=lab.status,
        billed=lab.billed
    )

