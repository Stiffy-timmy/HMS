from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.billing import Billing
from app.schemas.billing import BillingResponse

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
