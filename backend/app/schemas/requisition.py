from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.requisition import RequisitionType, RequisitionStatus, RequisitionUrgency

class RequisitionCreate(BaseModel):
    item_type: RequisitionType
    item_name: str
    category: Optional[str] = None
    quantity: int = 1
    unit: str = "Units"
    urgency: RequisitionUrgency = RequisitionUrgency.ROUTINE
    department: str
    estimated_cost: float = 0.0
    reason: Optional[str] = None

class RequisitionStatusUpdate(BaseModel):
    status: RequisitionStatus
    admin_notes: Optional[str] = None

class RequisitionResponse(BaseModel):
    id: int
    hospital_id: int
    requested_by_id: int
    requested_by_name: Optional[str] = None
    item_type: RequisitionType
    item_name: str
    category: Optional[str] = None
    quantity: int
    unit: str
    urgency: RequisitionUrgency
    department: str
    estimated_cost: float
    reason: Optional[str] = None
    status: RequisitionStatus
    admin_notes: Optional[str] = None
    reviewed_by_id: Optional[int] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
