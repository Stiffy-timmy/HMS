from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.patient_stay import StayStatus

class PatientStayResponse(BaseModel):
    id: int
    hospital_id: int
    patient_name: str
    patient_ref_id: str
    bed_id: int
    ward: Optional[str] = None
    department: Optional[str] = None
    admitted_at: datetime
    expected_discharge_at: datetime
    actual_discharge_at: Optional[datetime] = None
    status: StayStatus
    admitted_by: int
    admitted_by_name: Optional[str] = None

    class Config:
        from_attributes = True

class PatientStayCreate(BaseModel):
    hospital_id: int = 1
    patient_name: str
    patient_ref_id: str
    bed_id: int
    admitted_at: datetime
    expected_discharge_at: datetime
    status: StayStatus = StayStatus.ACTIVE

class QuickAdmitRequest(BaseModel):
    patient_name: str
    patient_ref_id: str
    bed_id: int
    admitted_at: Optional[datetime] = None
    expected_discharge_at: Optional[datetime] = None

