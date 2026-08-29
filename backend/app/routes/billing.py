from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.billing import Billing, BillingStatus
from app.schemas.billing import BillingResponse, BillingStatusUpdate
from app.services.websocket_manager import ws_manager
from app.services.activity_service import log_activity

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.get("", response_model=List[BillingResponse])
def get_billings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    billings = db.query(Billing).filter(Billing.hospital_id == current_user.hospital_id).all()
    result = []
    for b in billings:
        result.append(BillingResponse(
            id=b.id,
            hospital_id=b.hospital_id,
            stay_id=b.stay_id,
            patient_name=b.stay.patient_name if b.stay else None,
            patient_ref_id=b.stay.patient_ref_id if b.stay else None,
            status=b.status,
            total_amount=b.total_amount,
            last_updated_at=b.last_updated_at
        ))
    return result

@router.patch("/{billing_id}/status", response_model=BillingResponse)
async def update_billing_status(
    billing_id: int,
    payload: BillingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    billing = db.query(Billing).filter(
        Billing.id == billing_id,
        Billing.hospital_id == current_user.hospital_id
    ).first()
    if not billing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Billing record not found")

    old_status = billing.status.value
    billing.status = payload.status
    billing.last_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(billing)

    patient_name = billing.stay.patient_name if billing.stay else "Patient"

    # Log activity
    user_role_label = current_user.role.value.upper()
    act_desc = f"{current_user.full_name} ({user_role_label}) updated Billing account for {patient_name} from '{old_status}' to '{payload.status.value}'"
    await log_activity(
        db=db,
        hospital_id=billing.hospital_id,
        user_id=current_user.id,
        action_description=act_desc,
        department="Billing"
    )

    # Broadcast WebSocket notification
    await ws_manager.broadcast_change(
        table="Billing",
        action="update",
        id=billing.id,
        hospital_id=billing.hospital_id,
        department="Billing",
        details={
            "billing_id": billing.id,
            "stay_id": billing.stay_id,
            "old_status": old_status,
            "new_status": payload.status.value,
            "patient_name": patient_name
        }
    )

    return BillingResponse(
        id=billing.id,
        hospital_id=billing.hospital_id,
        stay_id=billing.stay_id,
        patient_name=patient_name,
        patient_ref_id=billing.stay.patient_ref_id if billing.stay else None,
        status=billing.status,
        total_amount=billing.total_amount,
        last_updated_at=billing.last_updated_at
    )


