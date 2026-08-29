from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    branch_code = Column(String(50), unique=True, index=True, nullable=True) # e.g. MC-HTC, MC-BLR, MC-VZP, MC-MUM
    city = Column(String(100), nullable=True)                               # e.g. Hyderabad, Bengaluru, Visakhapatnam, Mumbai
    address = Column(String(500), nullable=False)
    state = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    phone = Column(String(50), nullable=True)
    emergency_contact = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    users = relationship("User", back_populates="hospital", cascade="all, delete-orphan")
    beds = relationship("Bed", back_populates="hospital", cascade="all, delete-orphan")
    patient_stays = relationship("PatientStay", back_populates="hospital", cascade="all, delete-orphan")
    billings = relationship("Billing", back_populates="hospital", cascade="all, delete-orphan")
    lab_orders = relationship("LabOrder", back_populates="hospital", cascade="all, delete-orphan")
    conflict_logs = relationship("ConflictLog", back_populates="hospital", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="hospital", cascade="all, delete-orphan")
    invite_codes = relationship("RoleInviteCode", back_populates="hospital", cascade="all, delete-orphan")
    requisitions = relationship("RequisitionOrder", back_populates="hospital", cascade="all, delete-orphan")
    equipments = relationship("MedicalEquipment", back_populates="hospital", cascade="all, delete-orphan")
    doctor_assignments = relationship("DoctorBranchAssignment", back_populates="hospital", cascade="all, delete-orphan")
    appointments = relationship("PatientAppointment", back_populates="hospital", cascade="all, delete-orphan")
