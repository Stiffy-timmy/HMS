from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.lab_order import LabStatus

class LabOrderResponse(BaseModel):
    id: int
    hospital_id: int
    stay_id: int
    patient_name: Optional[str] = None
    patient_ref_id: Optional[str] = None
    department: Optional[str] = None
    ward: Optional[str] = None
    test_name: str
    ordered_at: datetime
    sample_collected_at: Optional[datetime] = None
    result_at: Optional[datetime] = None
    status: LabStatus
    billed: bool

    class Config:
        from_attributes = True

class LabOrderUpdateStatus(BaseModel):
    status: LabStatus
