from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.billing import BillingStatus

class BillingResponse(BaseModel):
    id: int
    hospital_id: int
    stay_id: int
    patient_name: Optional[str] = None
    patient_ref_id: Optional[str] = None
    status: BillingStatus
    total_amount: float
    last_updated_at: datetime

    class Config:
        from_attributes = True

class BillingStatusUpdate(BaseModel):
    status: BillingStatus

