import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class RequisitionType(str, enum.Enum):
    EQUIPMENT = "equipment"
    MEDICINE = "medicine"
    CONSUMABLE = "consumable"

class RequisitionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DELIVERED = "delivered"

class RequisitionUrgency(str, enum.Enum):
    ROUTINE = "routine"
    URGENT = "urgent"
    EMERGENCY = "emergency"

class RequisitionOrder(Base):
    __tablename__ = "requisition_orders"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    item_type = Column(Enum(RequisitionType), nullable=False)
    item_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit = Column(String(50), default="Units", nullable=False)
    urgency = Column(Enum(RequisitionUrgency), default=RequisitionUrgency.ROUTINE, nullable=False)
    department = Column(String(100), nullable=False)
    estimated_cost = Column(Float, default=0.0, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(Enum(RequisitionStatus), default=RequisitionStatus.PENDING, nullable=False)
    admin_notes = Column(Text, nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    hospital = relationship("Hospital", back_populates="requisitions")
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
