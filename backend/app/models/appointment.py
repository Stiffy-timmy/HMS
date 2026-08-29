import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class AppointmentStatus(str, enum.Enum):
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PatientAppointment(Base):
    __tablename__ = "patient_appointments"

    id = Column(Integer, primary_key=True, index=True)
    appointment_token = Column(String(50), unique=True, index=True, nullable=False) # e.g. APT-HTC-8492
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    patient_name = Column(String(255), nullable=False)
    patient_phone = Column(String(50), nullable=False)
    patient_email = Column(String(255), nullable=True)
    patient_age = Column(Integer, nullable=False, default=30)
    patient_gender = Column(String(20), nullable=False, default="Male")
    patient_city = Column(String(100), nullable=False)
    illness_description = Column(Text, nullable=False)
    speciality_requested = Column(String(100), nullable=False)
    appointment_date = Column(DateTime, nullable=False)
    time_slot = Column(String(50), nullable=False, default="11:30 AM")
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.CONFIRMED, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    hospital = relationship("Hospital", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
