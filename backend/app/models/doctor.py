import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class DoctorDutyStatus(str, enum.Enum):
    ON_DUTY = "on_duty"
    ON_LEAVE = "on_leave"
    EMERGENCY_ON_CALL = "emergency_on_call"

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    qualification = Column(String(255), nullable=False)
    speciality = Column(String(100), nullable=False, index=True) # e.g. Cardiology, Orthopedics, Neurology, General Medicine, Pulmonology
    experience_years = Column(Integer, default=5, nullable=False)
    consultation_fee = Column(Float, default=800.0, nullable=False)
    bio = Column(Text, nullable=True)
    contact_email = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    branch_assignments = relationship("DoctorBranchAssignment", back_populates="doctor", cascade="all, delete-orphan")
    appointments = relationship("PatientAppointment", back_populates="doctor", cascade="all, delete-orphan")

class DoctorBranchAssignment(Base):
    __tablename__ = "doctor_branch_assignments"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    department = Column(String(100), nullable=False, index=True)
    duty_status = Column(Enum(DoctorDutyStatus), default=DoctorDutyStatus.ON_DUTY, nullable=False)
    room_number = Column(String(100), nullable=False, default="OPD Room 101")
    shift_timings = Column(String(100), nullable=False, default="09:00 AM - 02:00 PM")
    days_available = Column(String(100), nullable=False, default="Mon, Tue, Wed, Thu, Fri, Sat")
    last_updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    doctor = relationship("Doctor", back_populates="branch_assignments")
    hospital = relationship("Hospital", back_populates="doctor_assignments")
    updated_by = relationship("User", foreign_keys=[updated_by_id])
