from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.bed import RoomType, BedStatus

class BedResponse(BaseModel):
    id: int
    hospital_id: int
    ward: str
    department: str
    room_type: RoomType
    price_per_day: float
    current_status: BedStatus
    last_updated_by: Optional[int] = None
    last_updated_at: datetime
    updater_name: Optional[str] = None

    class Config:
        from_attributes = True

class BedStatusUpdate(BaseModel):
    current_status: BedStatus

class BedCreate(BaseModel):
    hospital_id: int = 1
    ward: str
    department: str
    room_type: RoomType
    price_per_day: float
    current_status: BedStatus = BedStatus.AVAILABLE
