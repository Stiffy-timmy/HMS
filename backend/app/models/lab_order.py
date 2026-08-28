import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class LabStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class LabOrder(Base):
    __tablename__ = "lab_orders"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    stay_id = Column(Integer, ForeignKey("patient_stays.id"), nullable=False, index=True)
    test_name = Column(String(255), nullable=False)
    ordered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    sample_collected_at = Column(DateTime, nullable=True)
    result_at = Column(DateTime, nullable=True)
    status = Column(Enum(LabStatus), default=LabStatus.PENDING, nullable=False)
    billed = Column(Boolean, default=False, nullable=False)

    # Relationships
    hospital = relationship("Hospital", back_populates="lab_orders")
    stay = relationship("PatientStay", back_populates="lab_orders")
