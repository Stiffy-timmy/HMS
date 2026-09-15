"""
Ambulance trip booking + lifecycle routes.

- POST /api/trips/ambulance-booking    Public — patient books pickup (no login)
- GET  /api/trips                       Authenticated — list trips
- GET  /api/trips/{id}                  Authenticated — full trip details
- GET  /api/trips/{id}/events           Authenticated — chronological events
- GET  /api/trips/{id}/live             Authenticated — current ambulance pos + route
- POST /api/trips/{id}/start            Driver — dispatched -> en_route_pickup
- POST /api/trips/{id}/patient-onboard  Driver — at_pickup -> patient_onboard
- POST /api/trips/{id}/complete         Driver — at_hospital -> completed
- POST /api/trips/{id}/cancel           Admin/Driver — cancel
- GET  /api/trips/public/{token}/live   Public — patient live tracking
"""
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin, require_ambulance
from app.models.user import User, UserRole
from app.models.ambulance import (
    Ambulance, AmbulanceStatus,
    AmbulanceTrip, TripStatus, TripEvent, TripEventType,
)
from app.models.hospital import Hospital
from app.models.activity import ActivityLog
from app.models.appointment import PatientAppointment

from app.schemas.ambulance import (
    TripBookingRequest, TripResponse, TripLiveResponse, TripEventResponse, TripStatusUpdate,
)
from app.services.websocket_manager import ws_manager
from app.services.activity_service import log_activity
from app.services.google_maps_service import (
    geocode_address, get_directions, haversine_distance,
)
from app.services.ambulance_conflict_service import (
    check_cf7_no_ambulance_available,
    check_cf8_dispatch_delay,
    check_cf9_unusual_stop_duration,
)

router = APIRouter(prefix="/trips", tags=["Ambulance Trips"])


# -- helpers --

def _trip_response(trip: AmbulanceTrip, db: Session) -> TripResponse:
    amb = trip.ambulance
    driver = amb.driver if (amb and amb.driver_user_id) else None
    patient_name = None
    patient_phone = None
    if trip.appointment:
        patient_name = trip.appointment.patient_name
        patient_phone = trip.appointment.patient_phone
    return TripResponse(
        id=trip.id,
        hospital_id=trip.hospital_id,
        hospital_name=trip.hospital.name if trip.hospital else None,
        ambulance_id=trip.ambulance_id,
        ambulance_vehicle_number=amb.vehicle_number if amb else None,
        ambulance_vehicle_type=amb.vehicle_type if amb else None,
        driver_user_id=amb.driver_user_id if amb else None,
        driver_name=driver.full_name if driver else None,
        patient_appointment_id=trip.patient_appointment_id,
        patient_name=patient_name,
        patient_phone=patient_phone,
        pickup_address=trip.pickup_address,
        pickup_lat=trip.pickup_lat,
        pickup_lng=trip.pickup_lng,
        requested_pickup_time=trip.requested_pickup_time,
        calculated_departure_time=trip.calculated_departure_time,
        estimated_duration_seconds=trip.estimated_duration_seconds,
        status=trip.status,
        trip_token=trip.trip_token,
        route_polyline=trip.route_polyline,
        return_polyline=trip.return_polyline,
        created_at=trip.created_at,
        current_lat=amb.current_lat if amb else None,
        current_lng=amb.current_lng if amb else None,
        last_ping_at=amb.last_ping_at if amb else None,
    )


# -- booking --

@router.post("/ambulance-booking", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def book_ambulance_trip(
    payload: TripBookingRequest,
    db: Session = Depends(get_db),
):
    """Public booking: patient requests ambulance pickup (no auth)."""
    # Validate hospital
    hospital = db.query(Hospital).filter(Hospital.id == payload.hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital branch not found.")
    if hospital.latitude is None or hospital.longitude is None:
        raise HTTPException(status_code=400, detail="Hospital has no coordinates for routing.")

    # Validate appointment
    appointment = db.query(PatientAppointment).filter(
        PatientAppointment.id == payload.patient_appointment_id
    ).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Patient appointment not found.")

    # Get directions (or fallback estimate)
    directions = get_directions(
        hospital.latitude, hospital.longitude,
        payload.pickup_lat, payload.pickup_lng,
    )
    duration_seconds = directions.get("duration_seconds", 600) if directions else 600
    polyline = directions.get("polyline") if directions else None

    # 5-minute buffer
    buffer_seconds = 300
    departure_time = payload.requested_pickup_time - timedelta(seconds=duration_seconds + buffer_seconds)

    # Find an idle ambulance at the branch
    ambulance = db.query(Ambulance).filter(
        Ambulance.hospital_id == hospital.id,
        Ambulance.status == AmbulanceStatus.IDLE,
    ).order_by(Ambulance.id).first()

    trip = AmbulanceTrip(
        hospital_id=hospital.id,
        ambulance_id=ambulance.id if ambulance else None,
        patient_appointment_id=payload.patient_appointment_id,
        pickup_address=payload.pickup_address,
        pickup_lat=payload.pickup_lat,
        pickup_lng=payload.pickup_lng,
        requested_pickup_time=payload.requested_pickup_time,
        calculated_departure_time=departure_time,
        estimated_duration_seconds=duration_seconds,
        status=TripStatus.SCHEDULED,
        route_polyline=polyline,
        created_at=datetime.now(timezone.utc),
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # If an ambulance is assigned, immediately transition it to dispatched state
    if ambulance:
        ambulance.status = AmbulanceStatus.DISPATCHED
        db.commit()

    # CF-7: If no ambulance was assigned, raise conflict
    if not ambulance:
        await check_cf7_no_ambulance_available(
            db=db,
            hospital_id=hospital.id,
            trip_id=trip.id,
        )

    # Log activity
    desc = (
        f"Patient {appointment.patient_name} booked ambulance pickup at {payload.pickup_address} "
        f"for {payload.requested_pickup_time.strftime('%Y-%m-%d %H:%M UTC')} "
        f"({'assigned' if ambulance else 'NO AMBULANCE AVAILABLE'})"
    )
    await log_activity(
        db=db,
        hospital_id=hospital.id,
        user_id=None,
        action_description=desc,
        department="Ambulance Dispatch",
    )

    # Broadcast WebSocket
    await ws_manager.broadcast_change(
        table="AmbulanceTrip",
        action="create",
        id=trip.id,
        hospital_id=hospital.id,
        department="Ambulance Dispatch",
        details={
            "trip_id": trip.id,
            "patient_name": appointment.patient_name,
            "pickup_address": payload.pickup_address,
            "requested_pickup_time": payload.requested_pickup_time.isoformat(),
            "ambulance_id": trip.ambulance_id,
            "vehicle_number": ambulance.vehicle_number if ambulance else None,
            "status": trip.status.value,
            "has_no_ambulance": ambulance is None,
        },
    )

    return _trip_response(trip, db)


# -- list / get --

@router.get("", response_model=List[TripResponse])
def list_trips(
    status: Optional[TripStatus] = None,
    hospital_id: Optional[int] = None,
    driver_user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List trips, filtered to the current user's hospital/role."""
    query = db.query(AmbulanceTrip)

    # Multi-tenancy: regular users see only their hospital
    if current_user.role != UserRole.ADMIN or hospital_id:
        h_id = hospital_id or current_user.hospital_id
        query = query.filter(AmbulanceTrip.hospital_id == h_id)

    if status:
        query = query.filter(AmbulanceTrip.status == status)
    if driver_user_id is not None:
        # If driver requests their own list, only show their trips
        query = query.join(Ambulance, AmbulanceTrip.ambulance_id == Ambulance.id)
        query = query.filter(Ambulance.driver_user_id == driver_user_id)

    trips = query.order_by(AmbulanceTrip.created_at.desc()).limit(100).all()
    return [_trip_response(t, db) for t in trips]


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = db.query(AmbulanceTrip).filter(AmbulanceTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if current_user.role != UserRole.ADMIN and trip.hospital_id != current_user.hospital_id:
        raise HTTPException(status_code=403, detail="Access denied to this trip.")
    return _trip_response(trip, db)


@router.get("/{trip_id}/events", response_model=List[TripEventResponse])
def get_trip_events(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = db.query(AmbulanceTrip).filter(AmbulanceTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if current_user.role != UserRole.ADMIN and trip.hospital_id != current_user.hospital_id:
        raise HTTPException(status_code=403, detail="Access denied to this trip.")

    events = db.query(TripEvent).filter(
        TripEvent.trip_id == trip.id,
    ).order_by(TripEvent.timestamp.asc()).all()
    return events


@router.get("/{trip_id}/live", response_model=TripLiveResponse)
def get_trip_live(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = db.query(AmbulanceTrip).filter(AmbulanceTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if current_user.role != UserRole.ADMIN and trip.hospital_id != current_user.hospital_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    hospital = trip.hospital
    amb = trip.ambulance

    events = db.query(TripEvent).filter(
        TripEvent.trip_id == trip.id,
    ).order_by(TripEvent.timestamp.asc()).all()

    return TripLiveResponse(
        trip_id=trip.id,
        status=trip.status,
        pickup_address=trip.pickup_address,
        pickup_lat=trip.pickup_lat,
        pickup_lng=trip.pickup_lng,
        hospital_lat=hospital.latitude,
        hospital_lng=hospital.longitude,
        ambulance_vehicle_number=amb.vehicle_number if amb else None,
        current_lat=amb.current_lat if amb else None,
        current_lng=amb.current_lng if amb else None,
        last_ping_at=amb.last_ping_at if amb else None,
        route_polyline=trip.route_polyline,
        return_polyline=trip.return_polyline,
        estimated_duration_seconds=trip.estimated_duration_seconds,
        calculated_departure_time=trip.calculated_departure_time,
        requested_pickup_time=trip.requested_pickup_time,
        events=events,
    )


# -- public live tracking (no auth, uses trip_token) --

@router.get("/public/{trip_token}/live", response_model=TripLiveResponse)
def get_trip_live_public(
    trip_token: str,
    db: Session = Depends(get_db),
):
    """Public live tracking endpoint, identified by a secure trip token (returned at booking)."""
    trip = db.query(AmbulanceTrip).filter(AmbulanceTrip.trip_token == trip_token).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")

    hospital = trip.hospital
    amb = trip.ambulance

    events = db.query(TripEvent).filter(
        TripEvent.trip_id == trip.id,
    ).order_by(TripEvent.timestamp.asc()).all()

    return TripLiveResponse(
        trip_id=trip.id,
        status=trip.status,
        pickup_address=trip.pickup_address,
        pickup_lat=trip.pickup_lat,
        pickup_lng=trip.pickup_lng,
        hospital_lat=hospital.latitude,
        hospital_lng=hospital.longitude,
        ambulance_vehicle_number=amb.vehicle_number if amb else None,
        current_lat=amb.current_lat if amb else None,
        current_lng=amb.current_lng if amb else None,
        last_ping_at=amb.last_ping_at if amb else None,
        route_polyline=trip.route_polyline,
        return_polyline=trip.return_polyline,
        estimated_duration_seconds=trip.estimated_duration_seconds,
        calculated_departure_time=trip.calculated_departure_time,
        requested_pickup_time=trip.requested_pickup_time,
        events=events,
    )


# -- lifecycle transitions --

async def _add_event(
    db: Session,
    trip: AmbulanceTrip,
    event_type: TripEventType,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    notes: Optional[str] = None,
) -> TripEvent:
    event = TripEvent(
        trip_id=trip.id,
        event_type=event_type,
        lat=lat,
        lng=lng,
        timestamp=datetime.now(timezone.utc),
        notes=notes,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


async def _broadcast_trip(trip: AmbulanceTrip, db: Session, extra: Optional[dict] = None):
    await ws_manager.broadcast_change(
        table="AmbulanceTrip",
        action="update",
        id=trip.id,
        hospital_id=trip.hospital_id,
        department="Ambulance Dispatch",
        details={
            "trip_id": trip.id,
            "status": trip.status.value,
            "ambulance_id": trip.ambulance_id,
            **(extra or {}),
        },
    )


@router.post("/{trip_id}/start", response_model=TripResponse)
async def start_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_ambulance),
):
    """Driver: dispatched -> en_route_pickup (the vehicle has started moving)."""
    trip = db.query(AmbulanceTrip).filter(AmbulanceTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.status != TripStatus.DISPATCHED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot start trip in {trip.status.value} state (expected 'dispatched')",
        )

    trip.status = TripStatus.EN_ROUTE_PICKUP
    if trip.ambulance:
        trip.ambulance.status = AmbulanceStatus.EN_ROUTE_PICKUP
    db.commit()

    # Resolve CF-8 since the driver is now moving
    await check_cf8_dispatch_delay(db=db, hospital_id=trip.hospital_id, trip_id=trip.id)

    await _add_event(db, trip, TripEventType.DEPARTED_BASE,
                     lat=trip.hospital.latitude, lng=trip.hospital.longitude)
    await _broadcast_trip(trip, db, {"action": "started"})
    return _trip_response(trip, db)


@router.post("/{trip_id}/patient-onboard", response_model=TripResponse)
async def mark_patient_onboard(
    trip_id: int,
    payload: TripStatusUpdate = TripStatusUpdate(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_ambulance),
):
    """Driver: at_pickup -> patient_onboard (manual confirmation only — patient is in vehicle)."""
    trip = db.query(AmbulanceTrip).filter(AmbulanceTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.status not in (TripStatus.AT_PICKUP, TripStatus.ARRIVED_PICKUP):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot mark patient onboard from {trip.status.value} state (expected at_pickup)",
        )

    trip.status = TripStatus.PATIENT_ONBOARD
    if trip.ambulance:
        trip.ambulance.status = AmbulanceStatus.EN_ROUTE_HOSPITAL

    # Compute return-leg polyline (pickup -> hospital) if not already cached
    if not trip.return_polyline:
        directions = get_directions(
            trip.pickup_lat, trip.pickup_lng,
            trip.hospital.latitude, trip.hospital.longitude,
        )
        if directions and directions.get("polyline"):
            trip.return_polyline = directions["polyline"]

    db.commit()

    await _add_event(db, trip, TripEventType.PATIENT_ONBOARD,
                     lat=trip.pickup_lat, lng=trip.pickup_lng, notes=payload.notes)
    await _broadcast_trip(trip, db, {"action": "patient_onboard"})
    return _trip_response(trip, db)


@router.post("/{trip_id}/complete", response_model=TripResponse)
async def complete_trip(
    trip_id: int,
    payload: TripStatusUpdate = TripStatusUpdate(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_ambulance),
):
    """Driver: at_hospital -> completed."""
    trip = db.query(AmbulanceTrip).filter(AmbulanceTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.status not in (TripStatus.AT_HOSPITAL, TripStatus.ARRIVED_HOSPITAL):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot complete trip from {trip.status.value} state (expected at_hospital)",
        )

    trip.status = TripStatus.COMPLETED
    if trip.ambulance:
        trip.ambulance.status = AmbulanceStatus.IDLE

    db.commit()

    await _add_event(db, trip, TripEventType.COMPLETED,
                     lat=trip.hospital.latitude, lng=trip.hospital.longitude,
                     notes=payload.notes)
    await _broadcast_trip(trip, db, {"action": "completed"})
    return _trip_response(trip, db)


@router.post("/{trip_id}/cancel", response_model=TripResponse)
async def cancel_trip(
    trip_id: int,
    payload: TripStatusUpdate = TripStatusUpdate(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin/Driver: cancel a trip. Frees up the assigned ambulance."""
    trip = db.query(AmbulanceTrip).filter(AmbulanceTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")

    # Only admin or the assigned driver can cancel
    is_assigned_driver = (
        trip.ambulance and trip.ambulance.driver_user_id == current_user.id
    )
    if current_user.role != UserRole.ADMIN and not is_assigned_driver:
        raise HTTPException(status_code=403, detail="Only Admin or the assigned driver can cancel.")

    if trip.status in (TripStatus.COMPLETED, TripStatus.CANCELLED):
        raise HTTPException(status_code=400, detail=f"Trip is already {trip.status.value}.")

    trip.status = TripStatus.CANCELLED
    if trip.ambulance and trip.ambulance.status != AmbulanceStatus.MAINTENANCE:
        trip.ambulance.status = AmbulanceStatus.IDLE
    db.commit()

    await _add_event(db, trip, TripEventType.CANCELLED, notes=payload.notes or "Cancelled")

    # CF-7 auto-resolves since trip is now terminal
    await check_cf7_no_ambulance_available(db=db, hospital_id=trip.hospital_id, trip_id=trip.id)
    await _broadcast_trip(trip, db, {"action": "cancelled"})
    return _trip_response(trip, db)
