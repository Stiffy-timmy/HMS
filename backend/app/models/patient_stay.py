import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class StayStatus(str, enum.Enum):
    ACTIVE = "active"
    DISCHARGED = "discharged"

class PatientStay(Base):
    __tablename__ = "patient_stays"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    patient_name = Column(String(255), nullable=False)
    patient_ref_id = Column(String(100), nullable=False, index=True)
    bed_id = Column(Integer, ForeignKey("beds.id"), nullable=False, index=True)
    admitted_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    expected_discharge_at = Column(DateTime, nullable=False)
    actual_discharge_at = Column(DateTime, nullable=True)
    status = Column(Enum(StayStatus), default=StayStatus.ACTIVE, nullable=False)
    admitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    hospital = relationship("Hospital", back_populates="patient_stays")
    bed = relationship("Bed", back_populates="stays")
    admitting_user = relationship("User", foreign_keys=[admitted_by], back_populates="admitted_stays")
    billing = relationship("Billing", uselist=False, back_populates="stay", cascade="all, delete-orphan")
    lab_orders = relationship("LabOrder", back_populates="stay", cascade="all, delete-orphan")
    conflicts = relationship("ConflictLog", back_populates="stay")
