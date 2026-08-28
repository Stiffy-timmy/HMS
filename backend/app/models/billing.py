import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class BillingStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    ACTIVE = "active"
    CLOSED = "closed"

class Billing(Base):
    __tablename__ = "billings"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    stay_id = Column(Integer, ForeignKey("patient_stays.id"), nullable=False, unique=True, index=True)
    status = Column(Enum(BillingStatus), default=BillingStatus.ACTIVE, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)
    last_updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    hospital = relationship("Hospital", back_populates="billings")
    stay = relationship("PatientStay", back_populates="billing")
