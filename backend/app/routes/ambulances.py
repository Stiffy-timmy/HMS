from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User, UserRole
from app.models.ambulance import Ambulance, AmbulanceStatus, AmbulanceTrip, LocationPing, TripEvent, TripEventType
from app.schemas.ambulance import (
    AmbulanceCreate, AmbulanceStatusUpdate, AmbulanceResponse,
    LocationPingCreate, LocationPingResponse,
)
from app.services.websocket_manager import ws_manager
from app.services.activity_service import log_activity
from app.services.ambulance_scheduler import check_stop_and_arrival

router = APIRouter(prefix="/ambulances", tags=["Ambulance Fleet Management"])


def _ambulance_response(amb: Ambulance, db: Session) -> AmbulanceResponse:
    driver_name = None
    if amb.driver_user_id:
        driver = db.query(User).filter(User.id == amb.driver_user_id).first()
        driver_name = driver.full_name if driver else None

    # Find current active trip for this ambulance
    active_trip = db.query(AmbulanceTrip).filter(
        AmbulanceTrip.ambulance_id == amb.id,
        AmbulanceTrip.status.notin_(["completed", "cancelled"]),
    ).order_by(AmbulanceTrip.created_at.desc()).first()

    return AmbulanceResponse(
        id=amb.id,
        hospital_id=amb.hospital_id,
        hospital_name=amb.hospital.name if amb.hospital else None,
        vehicle_number=amb.vehicle_number,
        vehicle_type=amb.vehicle_type,
        status=amb.status,
        driver_user_id=amb.driver_user_id,
        driver_name=driver_name,
        current_lat=amb.current_lat,
        current_lng=amb.current_lng,
        last_ping_at=amb.last_ping_at,
        current_trip_id=active_trip.id if active_trip else None,
        created_at=amb.created_at,
    )


@router.get("", response_model=List[AmbulanceResponse])
def list_ambulances(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all ambulances for the current hospital branch."""
    amb_list = db.query(Ambulance).filter(
        Ambulance.hospital_id == current_user.hospital_id
    ).order_by(Ambulance.id).all()
    return [_ambulance_response(a, db) for a in amb_list]


@router.post("", response_model=AmbulanceResponse, status_code=status.HTTP_201_CREATED)
async def create_ambulance(
    payload: AmbulanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new ambulance vehicle. Admin only."""
    hospital_id = payload.hospital_id or current_user.hospital_id

    existing = db.query(Ambulance).filter(
        Ambulance.vehicle_number == payload.vehicle_number.strip()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle number already registered.")

    amb = Ambulance(
        hospital_id=hospital_id,
        vehicle_number=payload.vehicle_number.strip().upper(),
        vehicle_type=payload.vehicle_type,
        status=payload.status,
        driver_user_id=payload.driver_user_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(amb)
    db.commit()
    db.refresh(amb)

    await log_activity(
        db=db,
        hospital_id=hospital_id,
        user_id=current_user.id,
        action_description=f"Admin {current_user.full_name} registered new ambulance {amb.vehicle_number} ({amb.vehicle_type.value})",
        department="Ambulance Dispatch",
    )
    return _ambulance_response(amb, db)


@router.get("/{ambulance_id}", response_model=AmbulanceResponse)
def get_ambulance(
    ambulance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    amb = db.query(Ambulance).filter(
        Ambulance.id == ambulance_id,
        Ambulance.hospital_id == current_user.hospital_id,
    ).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found.")
    return _ambulance_response(amb, db)


@router.patch("/{ambulance_id}", response_model=AmbulanceResponse)
async def update_ambulance(
    ambulance_id: int,
    payload: AmbulanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    amb = db.query(Ambulance).filter(
        Ambulance.id == ambulance_id,
        Ambulance.hospital_id == current_user.hospital_id,
    ).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found.")

    if payload.vehicle_number:
        amb.vehicle_number = payload.vehicle_number.strip().upper()
    if payload.vehicle_type:
        amb.vehicle_type = payload.vehicle_type
    if payload.driver_user_id is not None:
        amb.driver_user_id = payload.driver_user_id

    db.commit()
    db.refresh(amb)
    return _ambulance_response(amb, db)


@router.patch("/{ambulance_id}/status", response_model=AmbulanceResponse)
async def update_ambulance_status(
    ambulance_id: int,
    payload: AmbulanceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update ambulance status and optionally reassign driver."""
    amb = db.query(Ambulance).filter(
        Ambulance.id == ambulance_id,
        Ambulance.hospital_id == current_user.hospital_id,
    ).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found.")

    old_status = amb.status
    amb.status = payload.status
    if payload.driver_user_id is not None:
        amb.driver_user_id = payload.driver_user_id

    db.commit()
    db.refresh(amb)

    await ws_manager.broadcast_change(
        table="Ambulance",
        action="update",
        id=amb.id,
        hospital_id=amb.hospital_id,
        department="Ambulance Dispatch",
        details={
            "ambulance_id": amb.id,
            "vehicle_number": amb.vehicle_number,
            "old_status": old_status.value,
            "new_status": amb.status.value,
            "driver_name": _ambulance_response(amb, db).driver_name,
        },
    )
    return _ambulance_response(amb, db)


# -----------------------------------------------------------------------
# Location ping — POST /api/ambulance/ping
# -----------------------------------------------------------------------
@router.post("/ping", response_model=LocationPingResponse, status_code=status.HTTP_201_CREATED)
async def record_location_ping(
    payload: LocationPingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record a GPS ping from the ambulance driver's device.
    Updates ambulance position and triggers auto-arrival / stop-detection logic.
    """
    amb = db.query(Ambulance).filter(Ambulance.id == payload.ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found.")

    hospital_id = amb.hospital_id

    # Write the ping
    ping = LocationPing(
        trip_id=payload.trip_id,
        ambulance_id=payload.ambulance_id,
        lat=payload.lat,
        lng=payload.lng,
        speed=payload.speed,
        recorded_at=datetime.now(timezone.utc),
    )
    db.add(ping)

    # Update ambulance's last known position
    amb.current_lat = payload.lat
    amb.current_lng = payload.lng
    amb.last_ping_at = ping.recorded_at

    db.commit()
    db.refresh(ping)

    # Broadcast ping to all dashboards (including Admin map)
    await ws_manager.broadcast_change(
        table="AmbulancePing",
        action="create",
        id=ping.id,
        hospital_id=hospital_id,
        department="Ambulance Dispatch",
        details={
            "ambulance_id": amb.id,
            "vehicle_number": amb.vehicle_number,
            "lat": ping.lat,
            "lng": ping.lng,
            "speed": ping.speed,
            "trip_id": payload.trip_id,
            "recorded_at": ping.recorded_at.isoformat(),
        },
    )

    # Run stop-detection / geofence-arrival checks (uses recent pings in DB)
    try:
        await check_stop_and_arrival(
            db=db,
            ambulance_id=amb.id,
            lat=ping.lat,
            lng=ping.lng,
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"check_stop_and_arrival failed: {e}")

    return ping


@router.get("/{ambulance_id}/pings", response_model=List[LocationPingResponse])
def get_ambulance_pings(
    ambulance_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve recent GPS pings for an ambulance."""
    amb = db.query(Ambulance).filter(
        Ambulance.id == ambulance_id,
        Ambulance.hospital_id == current_user.hospital_id,
    ).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found.")

    pings = db.query(LocationPing).filter(
        LocationPing.ambulance_id == ambulance_id,
    ).order_by(LocationPing.recorded_at.desc()).limit(limit).all()
    return pings


@router.get("/{ambulance_id}/route")
def get_ambulance_route(
    ambulance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return route metadata for the ambulance's current active trip.
    Returns origin (hospital or last known), destination, polyline, and ETA.
    """
    amb = db.query(Ambulance).filter(
        Ambulance.id == ambulance_id,
        Ambulance.hospital_id == current_user.hospital_id,
    ).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found.")

    trip = db.query(AmbulanceTrip).filter(
        AmbulanceTrip.ambulance_id == ambulance_id,
        AmbulanceTrip.status.notin_(["completed", "cancelled", "scheduled"]),
    ).order_by(AmbulanceTrip.created_at.desc()).first()

    if not trip:
        return {"ambulance_id": ambulance_id, "trip_id": None, "route": None}

    hospital = amb.hospital

    if trip.status.value in ("dispatched", "en_route_pickup", "arrived_pickup"):
        origin_lat, origin_lng = hospital.latitude, hospital.longitude
        dest_lat, dest_lng = trip.pickup_lat, trip.pickup_lng
        polyline = trip.route_polyline
    elif trip.status.value in ("patient_onboard", "en_route_hospital", "at_hospital"):
        origin_lat, origin_lng = trip.pickup_lat, trip.pickup_lng
        dest_lat, dest_lng = hospital.latitude, hospital.longitude
        polyline = trip.return_polyline
    else:
        origin_lat, origin_lng = amb.current_lat, amb.current_lng
        dest_lat, dest_lng = trip.pickup_lat, trip.pickup_lng
        polyline = None

    return {
        "ambulance_id": ambulance_id,
        "trip_id": trip.id,
        "status": trip.status.value,
        "origin": {"lat": origin_lat, "lng": origin_lng},
        "destination": {"lat": dest_lat, "lng": dest_lng},
        "pickup": {"lat": trip.pickup_lat, "lng": trip.pickup_lng, "address": trip.pickup_address},
        "hospital": {"lat": hospital.latitude, "lng": hospital.longitude, "name": hospital.name},
        "polyline": polyline,
        "ambulance_position": {"lat": amb.current_lat, "lng": amb.current_lng},
        "estimated_duration_seconds": trip.estimated_duration_seconds,
    }
