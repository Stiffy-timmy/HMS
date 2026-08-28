import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class ConflictType(str, enum.Enum):
    BED_STATUS_MISMATCH = "bed_status_mismatch"
    DISCHARGE_BED_MISMATCH = "discharge_bed_mismatch"
    LAB_UNBILLED = "lab_unbilled"
    SERVICE_UNBILLED = "service_unbilled"
    OCCUPIED_NO_BILLING = "occupied_no_billing"

class ConflictStatus(str, enum.Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"

class ConflictLog(Base):
    __tablename__ = "conflict_logs"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    conflict_type = Column(Enum(ConflictType), nullable=False)
    related_stay_id = Column(Integer, ForeignKey("patient_stays.id"), nullable=True, index=True)
    related_bed_id = Column(Integer, ForeignKey("beds.id"), nullable=True, index=True)
    description = Column(String(500), nullable=False)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(Enum(ConflictStatus), default=ConflictStatus.OPEN, nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    hospital = relationship("Hospital", back_populates="conflict_logs")
    stay = relationship("PatientStay", back_populates="conflicts")
    bed = relationship("Bed", back_populates="conflicts")
    assigned_user = relationship("User", foreign_keys=[assigned_to])
