from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.ambulance import (
    AmbulanceStatus,
    VehicleType,
    TripStatus,
    TripEventType,
)


# --- Ambulance schemas ---

class AmbulanceCreate(BaseModel):
    hospital_id: Optional[int] = None  # defaults to admin's hospital
    vehicle_number: str
    vehicle_type: VehicleType = VehicleType.BLS
    driver_user_id: Optional[int] = None
    status: AmbulanceStatus = AmbulanceStatus.IDLE


class AmbulanceStatusUpdate(BaseModel):
    status: AmbulanceStatus
    driver_user_id: Optional[int] = None


class AmbulanceResponse(BaseModel):
    id: int
    hospital_id: int
    hospital_name: Optional[str] = None
    vehicle_number: str
    vehicle_type: VehicleType
    status: AmbulanceStatus
    driver_user_id: Optional[int] = None
    driver_name: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    last_ping_at: Optional[datetime] = None
    current_trip_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Location ping schemas ---

class LocationPingCreate(BaseModel):
    ambulance_id: int
    trip_id: Optional[int] = None
    lat: float
    lng: float
    speed: Optional[float] = None


class LocationPingResponse(BaseModel):
    id: int
    trip_id: Optional[int] = None
    ambulance_id: int
    lat: float
    lng: float
    speed: Optional[float] = None
    recorded_at: datetime

    class Config:
        from_attributes = True


# --- Trip event schemas ---

class TripEventResponse(BaseModel):
    id: int
    trip_id: int
    event_type: TripEventType
    lat: Optional[float] = None
    lng: Optional[float] = None
    timestamp: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# --- Trip schemas ---

class TripBookingRequest(BaseModel):
    """Public-facing: patient requests ambulance pickup (no login required)."""
    patient_appointment_id: int
    hospital_id: int
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    requested_pickup_time: datetime


class TripResponse(BaseModel):
    id: int
    hospital_id: int
    hospital_name: Optional[str] = None
    ambulance_id: Optional[int] = None
    ambulance_vehicle_number: Optional[str] = None
    ambulance_vehicle_type: Optional[VehicleType] = None
    driver_user_id: Optional[int] = None
    driver_name: Optional[str] = None
    patient_appointment_id: Optional[int] = None
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    requested_pickup_time: datetime
    calculated_departure_time: datetime
    estimated_duration_seconds: Optional[int] = None
    status: TripStatus
    trip_token: str
    route_polyline: Optional[str] = None
    return_polyline: Optional[str] = None
    created_at: datetime
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    last_ping_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TripLiveResponse(BaseModel):
    """Lightweight public-facing live status payload."""
    trip_id: int
    status: TripStatus
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    hospital_lat: float
    hospital_lng: float
    ambulance_vehicle_number: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    last_ping_at: Optional[datetime] = None
    route_polyline: Optional[str] = None
    return_polyline: Optional[str] = None
    estimated_duration_seconds: Optional[int] = None
    calculated_departure_time: datetime
    requested_pickup_time: datetime
    events: List[TripEventResponse] = []


class TripStatusUpdate(BaseModel):
    notes: Optional[str] = None
