import enum
import secrets
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base


class AmbulanceStatus(str, enum.Enum):
    IDLE = "idle"
    DISPATCHED = "dispatched"
    EN_ROUTE_PICKUP = "en_route_pickup"
    AT_PICKUP = "at_pickup"
    EN_ROUTE_HOSPITAL = "en_route_hospital"
    AT_HOSPITAL = "at_hospital"
    MAINTENANCE = "maintenance"


class VehicleType(str, enum.Enum):
    BLS = "BLS"  # Basic Life Support
    ALS = "ALS"  # Advanced Life Support


class TripStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    DISPATCHED = "dispatched"
    EN_ROUTE_PICKUP = "en_route_pickup"
    ARRIVED_PICKUP = "arrived_pickup"
    PATIENT_ONBOARD = "patient_onboard"
    EN_ROUTE_HOSPITAL = "en_route_hospital"
    ARRIVED_HOSPITAL = "arrived_hospital"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TripEventType(str, enum.Enum):
    DISPATCHED = "dispatched"
    DEPARTED_BASE = "departed_base"
    STOPPED = "stopped"
    RESUMED = "resumed"
    ARRIVED_PICKUP = "arrived_pickup"
    PATIENT_ONBOARD = "patient_onboard"
    DEPARTED_PICKUP = "departed_pickup"
    ARRIVED_HOSPITAL = "arrived_hospital"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    vehicle_number = Column(String(50), unique=True, nullable=False, index=True)
    vehicle_type = Column(Enum(VehicleType), default=VehicleType.BLS, nullable=False)
    status = Column(Enum(AmbulanceStatus), default=AmbulanceStatus.IDLE, nullable=False, index=True)
    driver_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    last_ping_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    hospital = relationship("Hospital", back_populates="ambulances")
    driver = relationship("User", foreign_keys=[driver_user_id])
    trips = relationship("AmbulanceTrip", back_populates="ambulance", cascade="all, delete-orphan")
    location_pings = relationship("LocationPing", back_populates="ambulance", cascade="all, delete-orphan")


class AmbulanceTrip(Base):
    __tablename__ = "ambulance_trips"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True, index=True)
    patient_appointment_id = Column(Integer, ForeignKey("patient_appointments.id"), nullable=True, index=True)
    pickup_address = Column(String(500), nullable=False)
    pickup_lat = Column(Float, nullable=False)
    pickup_lng = Column(Float, nullable=False)
    requested_pickup_time = Column(DateTime, nullable=False)
    calculated_departure_time = Column(DateTime, nullable=False)
    estimated_duration_seconds = Column(Integer, nullable=True)
    status = Column(Enum(TripStatus), default=TripStatus.SCHEDULED, nullable=False, index=True)
    # Public token that patients can use to track without authentication
    trip_token = Column(String(64), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(24), index=True)
    # Route polyline (encoded from Google Directions) for the initial leg
    route_polyline = Column(String(4000), nullable=True)
    # Return leg polyline (pickup -> hospital) cached on the trip
    return_polyline = Column(String(4000), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    hospital = relationship("Hospital", back_populates="ambulance_trips")
    ambulance = relationship("Ambulance", back_populates="trips")
    appointment = relationship("PatientAppointment", foreign_keys=[patient_appointment_id])
    events = relationship("TripEvent", back_populates="trip", cascade="all, delete-orphan", order_by="TripEvent.timestamp.desc()")
    location_pings = relationship("LocationPing", back_populates="trip", cascade="all, delete-orphan")
    conflicts = relationship("ConflictLog", back_populates="trip", cascade="all, delete-orphan")


class TripEvent(Base):
    __tablename__ = "trip_events"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("ambulance_trips.id"), nullable=False, index=True)
    event_type = Column(Enum(TripEventType), nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    notes = Column(String(500), nullable=True)

    # Relationships
    trip = relationship("AmbulanceTrip", back_populates="events")


class LocationPing(Base):
    __tablename__ = "location_pings"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("ambulance_trips.id"), nullable=True, index=True)
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=False, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    speed = Column(Float, nullable=True)
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    trip = relationship("AmbulanceTrip", back_populates="location_pings")
    ambulance = relationship("Ambulance", back_populates="location_pings")
