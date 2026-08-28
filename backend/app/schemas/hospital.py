from datetime import datetime
from pydantic import BaseModel

class HospitalResponse(BaseModel):
    id: int
    name: str
    address: str
    state: str
    created_at: datetime

    class Config:
        from_attributes = True
