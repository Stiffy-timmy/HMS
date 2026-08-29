from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.doctor import DoctorDutyStatus

class DoctorResponse(BaseModel):
    id: int
    full_name: str
    qualification: str
    speciality: str
    experience_years: int
    consultation_fee: float
    bio: Optional[str] = None
    contact_email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DoctorAssignmentResponse(BaseModel):
    id: int
    doctor_id: int
    hospital_id: int
    hospital_name: Optional[str] = None
    hospital_city: Optional[str] = None
    branch_code: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_qualification: Optional[str] = None
    doctor_speciality: Optional[str] = None
    consultation_fee: Optional[float] = 800.0
    department: str
    duty_status: DoctorDutyStatus
    room_number: str
    shift_timings: str
    days_available: str
    last_updated_at: datetime
    updated_by_name: Optional[str] = None

    class Config:
        from_attributes = True

class DoctorDutyStatusUpdate(BaseModel):
    duty_status: DoctorDutyStatus
    room_number: Optional[str] = None
    shift_timings: Optional[str] = None
    department: Optional[str] = None
