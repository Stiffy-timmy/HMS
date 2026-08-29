from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class HospitalResponse(BaseModel):
    id: int
    name: str
    branch_code: Optional[str] = None
    city: Optional[str] = None
    address: str
    state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    available_beds_count: Optional[int] = 0
    on_duty_doctors_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True
