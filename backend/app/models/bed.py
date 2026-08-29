import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class RoomType(str, enum.Enum):
    SINGLE = "single"
    DOUBLE = "double"
    TRIPLE = "triple"
    ICU = "icu"

class BedStatus(str, enum.Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    MAINTENANCE = "maintenance"
    CLEANING_PENDING = "cleaning_pending"

class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    ward = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False, index=True)
    room_type = Column(Enum(RoomType), nullable=False)
    price_per_day = Column(Float, nullable=False)
    current_status = Column(Enum(BedStatus), default=BedStatus.AVAILABLE, nullable=False)
    last_updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    last_updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    hospital = relationship("Hospital", back_populates="beds")
    updater = relationship("User", foreign_keys=[last_updated_by])
    stays = relationship("PatientStay", back_populates="bed")
    conflicts = relationship("ConflictLog", back_populates="bed")
