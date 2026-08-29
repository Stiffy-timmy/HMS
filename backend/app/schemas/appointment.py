from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.appointment import AppointmentStatus

class AppointmentRecommendationRequest(BaseModel):
    patient_city: str
    illness_description: str
    speciality_requested: Optional[str] = None

class RecommendedBranchOption(BaseModel):
    hospital_id: int
    hospital_name: str
    branch_code: str
    city: str
    address: str
    distance_badge: str              # e.g. "Nearest Branch (0 km)", "Alternative Branch (580 km)"
    is_primary_match: bool
    doctor_id: int
    doctor_name: str
    doctor_qualification: str
    doctor_speciality: str
    consultation_fee: float
    duty_status: str
    room_number: str
    shift_timings: str
    available_slots: List[str]       # e.g. ["10:30 AM", "11:30 AM", "02:00 PM", "04:30 PM"]
    recommendation_reason: str

class AppointmentBookingRequest(BaseModel):
    hospital_id: int
    doctor_id: int
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    patient_age: int = 30
    patient_gender: str = "Male"
    patient_city: str
    illness_description: str
    speciality_requested: str
    appointment_date: datetime
    time_slot: str = "11:30 AM"

class AppointmentResponse(BaseModel):
    id: int
    appointment_token: str
    hospital_id: int
    hospital_name: Optional[str] = None
    hospital_city: Optional[str] = None
    hospital_address: Optional[str] = None
    doctor_id: int
    doctor_name: Optional[str] = None
    doctor_qualification: Optional[str] = None
    doctor_speciality: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    patient_age: int
    patient_gender: str
    patient_city: str
    illness_description: str
    speciality_requested: str
    appointment_date: datetime
    time_slot: str
    status: AppointmentStatus
    created_at: datetime

    class Config:
        from_attributes = True
