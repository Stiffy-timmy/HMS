from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.sensor import SensorType

class SensorReadingCreate(BaseModel):
    bed_id: int
    sensor_type: SensorType = SensorType.PRESSURE
    value: Optional[float] = None
    pressure_value_kpa: Optional[float] = None
    unit: Optional[str] = "kPa"
    threshold_breached: Optional[bool] = None
    raw_payload: Optional[dict] = None

class SensorReadingResponse(BaseModel):
    id: int
    hospital_id: int
    bed_id: int
    sensor_type: SensorType
    value: float
    unit: str
    threshold_breached: bool
    recorded_at: datetime

    class Config:
        from_attributes = True
