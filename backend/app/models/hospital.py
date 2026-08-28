from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=False)
    state = Column(String(100), nullable=False)
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
