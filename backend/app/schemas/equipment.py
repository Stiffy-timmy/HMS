from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.equipment import EquipmentStatus

class EquipmentCreate(BaseModel):
    equipment_name: str
    asset_tag: str
    category: Optional[str] = None
    department: str
    location_room: str
    status: EquipmentStatus = EquipmentStatus.OPERATIONAL
    maintenance_notes: Optional[str] = None

class EquipmentStatusUpdate(BaseModel):
    status: EquipmentStatus
    maintenance_notes: Optional[str] = None
    location_room: Optional[str] = None

class EquipmentResponse(BaseModel):
    id: int
    hospital_id: int
    equipment_name: str
    asset_tag: str
    category: Optional[str] = None
    department: str
    location_room: str
    status: EquipmentStatus
    last_inspected_at: datetime
    last_inspected_by_id: Optional[int] = None
    last_inspected_by_name: Optional[str] = None
    maintenance_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
