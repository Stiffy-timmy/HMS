from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.conflict import ConflictType, ConflictStatus

class ConflictLogResponse(BaseModel):
    id: int
    hospital_id: int
    conflict_type: ConflictType
    related_stay_id: Optional[int] = None
    related_bed_id: Optional[int] = None
    bed_id: Optional[int] = None
    bed_ward: Optional[str] = None
    bed_department: Optional[str] = None
    bed_price_per_day: Optional[float] = None
    patient_name: Optional[str] = None
    description: str
    detected_at: datetime
    status: ConflictStatus
    assigned_to: Optional[int] = None
    assigned_to_name: Optional[str] = None
    revenue_at_risk: Optional[float] = None
    days_at_risk: Optional[int] = None

    class Config:
        from_attributes = True

class ConflictResolveRequest(BaseModel):
    resolution_notes: Optional[str] = "Resolved via single reconciled executive action."

