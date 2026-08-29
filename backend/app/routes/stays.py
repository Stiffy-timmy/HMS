from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.patient_stay import PatientStay, StayStatus
from app.models.bed import Bed, BedStatus
from app.models.billing import Billing, BillingStatus
from app.schemas.patient_stay import PatientStayResponse, QuickAdmitRequest
from app.services.activity_service import log_activity
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/stays", tags=["Patient Stays"])


@router.post("/quick-admit", response_model=PatientStayResponse)
async def quick_admit_patient(
    payload: QuickAdmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify bed exists in user's hospital
    bed = db.query(Bed).filter(
        Bed.id == payload.bed_id,
        Bed.hospital_id == current_user.hospital_id
    ).first()
    if not bed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bed not found")

    # Hard prevention rule: Quick Admit only allows selecting an AVAILABLE bed
    if bed.current_status != BedStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bed #{bed.id} ({bed.ward}) is not available for admission (current status: '{bed.current_status.value}'). Only available beds can be assigned."
        )

    # Ensure no leftover active stays on this available bed
    stale_active_stays = db.query(PatientStay).filter(
        PatientStay.bed_id == bed.id,
        PatientStay.status == StayStatus.ACTIVE
    ).all()
    for s in stale_active_stays:
        s.status = StayStatus.DISCHARGED
        s.actual_discharge_at = datetime.now(timezone.utc)

    admitted_at = payload.admitted_at or datetime.now(timezone.utc)
    expected_discharge = payload.expected_discharge_at or (admitted_at + timedelta(days=3))

    # 1. Create new PatientStay row (status = active)
    stay = PatientStay(
        hospital_id=current_user.hospital_id,
        patient_name=payload.patient_name.strip(),
        patient_ref_id=payload.patient_ref_id.strip(),
        bed_id=bed.id,
        admitted_at=admitted_at,
        expected_discharge_at=expected_discharge,
        status=StayStatus.ACTIVE,
        admitted_by=current_user.id
    )
    db.add(stay)
    db.flush()

    # 2. Create corresponding Billing row with status = not_started
    billing = Billing(
        hospital_id=current_user.hospital_id,
        stay_id=stay.id,
        status=BillingStatus.NOT_STARTED,
        total_amount=0.0,
        last_updated_at=datetime.now(timezone.utc)
    )
    db.add(billing)

    # 3. ATOMIC WRITE: Set Bed.current_status = occupied
    old_bed_status = bed.current_status.value
    bed.current_status = BedStatus.OCCUPIED
    bed.last_updated_by = current_user.id
    bed.last_updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(stay)
    db.refresh(bed)

    # 4. Write ActivityLog entry
    user_role_label = current_user.role.value.upper()
    act_desc = f"{current_user.full_name} ({user_role_label}) quick-admitted patient {stay.patient_name} to Bed #{bed.id} ({bed.ward} - {bed.department})"
    await log_activity(
        db=db,
        hospital_id=current_user.hospital_id,
        user_id=current_user.id,
        action_description=act_desc,
        department=bed.department
    )

    # 5. Broadcast WebSocket event for PatientStay creation
    await ws_manager.broadcast_change(
        table="PatientStay",
        action="create",
        id=stay.id,
        hospital_id=current_user.hospital_id,
        department=bed.department,
        details={
            "stay_id": stay.id,
            "patient_name": stay.patient_name,
            "patient_ref_id": stay.patient_ref_id,
            "bed_id": bed.id,
            "ward": bed.ward,
            "department": bed.department,
            "admitted_by_name": current_user.full_name
        }
    )

    # 6. Broadcast WebSocket event for Bed occupancy update
    await ws_manager.broadcast_change(
        table="Bed",
        action="update",
        id=bed.id,
        hospital_id=bed.hospital_id,
        department=bed.department,
        details={
            "bed_id": bed.id,
            "old_status": old_bed_status,
            "new_status": "occupied",
            "department": bed.department,
            "ward": bed.ward
        }
    )

    return PatientStayResponse(

        id=stay.id,
        hospital_id=stay.hospital_id,
        patient_name=stay.patient_name,
        patient_ref_id=stay.patient_ref_id,
        bed_id=stay.bed_id,
        ward=bed.ward,
        department=bed.department,
        admitted_at=stay.admitted_at,
        expected_discharge_at=stay.expected_discharge_at,
        actual_discharge_at=stay.actual_discharge_at,
        status=stay.status,
        admitted_by=stay.admitted_by,
        admitted_by_name=current_user.full_name
    )

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

@router.post("/{stay_id}/discharge", response_model=PatientStayResponse)
async def discharge_patient(
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

    if stay.status == StayStatus.DISCHARGED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Patient is already discharged")

    bed = stay.bed

    # 1. Update stay status to discharged
    stay.status = StayStatus.DISCHARGED
    stay.actual_discharge_at = datetime.now(timezone.utc)
    
    # 2. Transition Bed to CLEANING_PENDING (deliberate permanent intermediate state)
    old_bed_status = bed.current_status.value if bed else "occupied"
    if bed:
        bed.current_status = BedStatus.CLEANING_PENDING
        bed.last_updated_by = current_user.id
        bed.last_updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(stay)
    if bed:
        db.refresh(bed)

    # 3. Log staff discharge action in ActivityLog
    user_role_label = current_user.role.value.upper()
    act_desc = f"{current_user.full_name} ({user_role_label}) discharged patient {stay.patient_name} from Bed #{stay.bed_id} ({bed.ward if bed else 'Ward'} - {bed.department if bed else 'Dept'}); Bed moved to Cleaning Pending"
    await log_activity(
        db=db,
        hospital_id=current_user.hospital_id,
        user_id=current_user.id,
        action_description=act_desc,
        department=bed.department if bed else None
    )

    # 4. Broadcast WebSocket event for stay discharge
    await ws_manager.broadcast_change(
        table="PatientStay",
        action="update",
        id=stay.id,
        hospital_id=current_user.hospital_id,
        department=bed.department if bed else None,
        details={
            "stay_id": stay.id,
            "patient_name": stay.patient_name,
            "bed_id": stay.bed_id,
            "status": "discharged",
            "ward": bed.ward if bed else None
        }
    )

    # 5. Broadcast WebSocket event for Bed transition to cleaning_pending
    if bed:
        await ws_manager.broadcast_change(
            table="Bed",
            action="update",
            id=bed.id,
            hospital_id=bed.hospital_id,
            department=bed.department,
            details={
                "bed_id": bed.id,
                "old_status": old_bed_status,
                "new_status": "cleaning_pending",
                "department": bed.department,
                "ward": bed.ward
            }
        )

    return PatientStayResponse(

        id=stay.id,
        hospital_id=stay.hospital_id,
        patient_name=stay.patient_name,
        patient_ref_id=stay.patient_ref_id,
        bed_id=stay.bed_id,
        ward=bed.ward if bed else None,
        department=bed.department if bed else None,
        admitted_at=stay.admitted_at,
        expected_discharge_at=stay.expected_discharge_at,
        actual_discharge_at=stay.actual_discharge_at,
        status=stay.status,
        admitted_by=stay.admitted_by,
        admitted_by_name=stay.admitting_user.full_name if stay.admitting_user else current_user.full_name
    )



