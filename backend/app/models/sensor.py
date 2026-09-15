import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class SensorType(str, enum.Enum):
    PRESSURE = "pressure"
    TEMPERATURE = "temperature"
    OXYGEN_FLOW = "oxygen_flow"

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    bed_id = Column(Integer, ForeignKey("beds.id"), nullable=False, index=True)
    sensor_type = Column(Enum(SensorType), default=SensorType.PRESSURE, nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(20), default="kPa", nullable=False)
    threshold_breached = Column(Boolean, default=False, nullable=False)
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    hospital = relationship("Hospital", back_populates="sensor_readings")
    bed = relationship("Bed", back_populates="sensor_readings")
