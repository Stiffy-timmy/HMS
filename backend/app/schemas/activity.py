from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class ActivityLogResponse(BaseModel):
    id: int
    hospital_id: int
    user_id: int
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    user_department: Optional[str] = None
    action_description: str
    timestamp: datetime

    class Config:
        from_attributes = True
