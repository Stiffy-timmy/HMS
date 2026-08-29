import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class EquipmentStatus(str, enum.Enum):
    OPERATIONAL = "operational"          # Running Fine
    MAINTENANCE = "maintenance"          # Under Maintenance
    CALIBRATING = "calibrating"          # Calibration Due
    DECOMMISSIONED = "decommissioned"    # Out of Order

class MedicalEquipment(Base):
    __tablename__ = "medical_equipments"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    equipment_name = Column(String(255), nullable=False)
    asset_tag = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(100), nullable=True)
    department = Column(String(100), nullable=False)
    location_room = Column(String(100), nullable=False)
    status = Column(Enum(EquipmentStatus), default=EquipmentStatus.OPERATIONAL, nullable=False)
    last_inspected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_inspected_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    maintenance_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    hospital = relationship("Hospital", back_populates="equipments")
    last_inspected_by = relationship("User", foreign_keys=[last_inspected_by_id])
