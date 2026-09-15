"""
Ambulance dispatch scheduler.

Two background jobs (run on an AsyncIO loop):

1) dispatch_ready_trips (every 30s)
   - Find trips in 'scheduled' state whose calculated_departure_time has passed
   - Transition to 'dispatched', log TripEvent, broadcast WebSocket
   - Trigger CF-8 check

2) check_active_trip_health (every 60s)
   - Check CF-8 (dispatch delay) for all trips in 'dispatched'
   - Check CF-9 (unusual stop) for all active trips with a recent 'stopped' event

3) recompute_long_horizon_trips (every 10 minutes)
   - Re-run Directions API for trips still 'scheduled' and > 30 minutes out,
     in case traffic conditions shifted. Update estimated_duration_seconds
     and calculated_departure_time.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import List
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.ambulance import AmbulanceTrip, TripStatus, TripEvent, TripEventType, Ambulance, AmbulanceStatus
from app.models.conflict import ConflictLog
from app.services.websocket_manager import ws_manager
from app.services.activity_service import log_activity
from app.services.google_maps_service import get_directions
from app.services.ambulance_conflict_service import (
    check_cf8_dispatch_delay,
    check_cf9_unusual_stop_duration,
)

logger = logging.getLogger(__name__)


async def dispatch_ready_trips():
    """Find scheduled trips whose departure time has arrived and dispatch them."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        ready = db.query(AmbulanceTrip).filter(
            AmbulanceTrip.status == TripStatus.SCHEDULED,
            AmbulanceTrip.calculated_departure_time <= now,
        ).all()

        if not ready:
            return

        for trip in ready:
            try:
                # Transition to dispatched
                trip.status = TripStatus.DISPATCHED
                if trip.ambulance:
                    trip.ambulance.status = AmbulanceStatus.DISPATCHED

                # Log dispatched event
                event = TripEvent(
                    trip_id=trip.id,
                    event_type=TripEventType.DISPATCHED,
                    lat=trip.hospital.latitude if trip.hospital else None,
                    lng=trip.hospital.longitude if trip.hospital else None,
                    timestamp=now,
                    notes="Auto-dispatched by scheduler (calculated_departure_time reached)",
                )
                db.add(event)
                db.commit()
                db.refresh(event)
                db.refresh(trip)

                logger.info(f"[SCHEDULER] Dispatched trip #{trip.id} (ambulance={trip.ambulance_id})")

                # CF-8: Check dispatch delay (will raise conflict if grace exceeded)
                await check_cf8_dispatch_delay(
                    db=db, hospital_id=trip.hospital_id, trip_id=trip.id
                )

                # Broadcast
                await ws_manager.broadcast_change(
                    table="AmbulanceTrip",
                    action="update",
                    id=trip.id,
                    hospital_id=trip.hospital_id,
                    department="Ambulance Dispatch",
                    details={
                        "trip_id": trip.id,
                        "status": trip.status.value,
                        "action": "auto_dispatched",
                        "ambulance_id": trip.ambulance_id,
                    },
                )

                await log_activity(
                    db=db,
                    hospital_id=trip.hospital_id,
                    user_id=None,
                    action_description=(
                        f"System auto-dispatched ambulance trip #{trip.id} for {trip.pickup_address}"
                    ),
                    department="Ambulance Dispatch",
                )
            except Exception as e:
                logger.error(f"[SCHEDULER] Failed to dispatch trip #{trip.id}: {e}")
                db.rollback()
    finally:
        db.close()


async def check_active_trip_health():
    """Periodically check all active trips for CF-8 / CF-9 conflicts."""
    db = SessionLocal()
    try:
        # CF-8: dispatched but overdue
        dispatched = db.query(AmbulanceTrip).filter(
            AmbulanceTrip.status == TripStatus.DISPATCHED,
        ).all()
        for trip in dispatched:
            try:
                await check_cf8_dispatch_delay(
                    db=db, hospital_id=trip.hospital_id, trip_id=trip.id
                )
            except Exception as e:
                logger.warning(f"[SCHEDULER] CF-8 check failed for trip #{trip.id}: {e}")

        # CF-9: any active trip
        active_statuses = [
            TripStatus.DISPATCHED,
            TripStatus.EN_ROUTE_PICKUP,
            TripStatus.AT_PICKUP,
            TripStatus.PATIENT_ONBOARD,
            TripStatus.EN_ROUTE_HOSPITAL,
            TripStatus.AT_HOSPITAL,
        ]
        active = db.query(AmbulanceTrip).filter(
            AmbulanceTrip.status.in_(active_statuses),
        ).all()
        for trip in active:
            try:
                await check_cf9_unusual_stop_duration(
                    db=db, hospital_id=trip.hospital_id, trip_id=trip.id
                )
            except Exception as e:
                logger.warning(f"[SCHEDULER] CF-9 check failed for trip #{trip.id}: {e}")
    finally:
        db.close()


async def recompute_long_horizon_trips():
    """Re-run Directions API for trips still scheduled > 30 minutes out."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        horizon = now + timedelta(minutes=30)
        upcoming = db.query(AmbulanceTrip).filter(
            AmbulanceTrip.status == TripStatus.SCHEDULED,
            AmbulanceTrip.calculated_departure_time > horizon,
        ).all()

        for trip in upcoming:
            try:
                if not trip.hospital:
                    continue
                directions = get_directions(
                    trip.hospital.latitude, trip.hospital.longitude,
                    trip.pickup_lat, trip.pickup_lng,
                )
                if directions and directions.get("duration_seconds"):
                    new_duration = directions["duration_seconds"]
                    if abs(new_duration - (trip.estimated_duration_seconds or 0)) > 60:
                        # Only update if duration changed by more than a minute
                        trip.estimated_duration_seconds = new_duration
                        trip.calculated_departure_time = (
                            trip.requested_pickup_time
                            - timedelta(seconds=new_duration + 300)
                        )
                        if directions.get("polyline"):
                            trip.route_polyline = directions["polyline"]
                        db.commit()
                        logger.info(
                            f"[SCHEDULER] Recomputed trip #{trip.id} duration {trip.estimated_duration_seconds}s"
                        )
            except Exception as e:
                logger.warning(f"[SCHEDULER] Recompute failed for trip #{trip.id}: {e}")
                db.rollback()
    finally:
        db.close()


# -----------------------------------------------------------------------
# Geofence + stop detection helpers (called from routes/ambulances.py POST /ping)
# -----------------------------------------------------------------------

GEOFENCE_PICKUP_METERS = 100
GEOFENCE_HOSPITAL_METERS = 100
STOP_DETECTION_DISTANCE_METERS = 20
STOP_DETECTION_DURATION_MINUTES = 2


async def check_stop_and_arrival(
    db: Session,
    ambulance_id: int,
    lat: float,
    lng: float,
):
    """
    After a location ping, check whether the ambulance has:
    - Stopped (small movement for >2 min): log stopped/resumed events
    - Arrived at the pickup (within 100m): auto-transition trip
    - Arrived at the hospital (within 100m): auto-transition trip
    """
    from app.services.google_maps_service import haversine_distance

    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        return

    # Find active trip
    trip = db.query(AmbulanceTrip).filter(
        AmbulanceTrip.ambulance_id == ambulance_id,
        AmbulanceTrip.status.in_([
            TripStatus.DISPATCHED,
            TripStatus.EN_ROUTE_PICKUP,
            TripStatus.AT_PICKUP,
            TripStatus.PATIENT_ONBOARD,
            TripStatus.EN_ROUTE_HOSPITAL,
        ]),
    ).order_by(AmbulanceTrip.created_at.desc()).first()

    if not trip:
        return

    now = datetime.now(timezone.utc)
    latest_event = db.query(TripEvent).filter(
        TripEvent.trip_id == trip.id,
    ).order_by(TripEvent.timestamp.desc(), TripEvent.id.desc()).first()

    # --- Stop detection (en route phases only) ---
    if trip.status in (TripStatus.EN_ROUTE_PICKUP, TripStatus.EN_ROUTE_HOSPITAL):
        # Look at the last 5 minutes of pings
        cutoff = now - timedelta(minutes=5)
        recent_pings = db.query(AmbulanceTrip).first()  # placeholder
        from app.models.ambulance import LocationPing
        recent_pings = db.query(LocationPing).filter(
            LocationPing.trip_id == trip.id,
            LocationPing.recorded_at >= cutoff,
        ).order_by(LocationPing.recorded_at.asc()).all()

        if recent_pings and len(recent_pings) >= 2:
            max_dist = 0
            ref = recent_pings[0]
            for p in recent_pings[1:]:
                d = haversine_distance(ref.lat, ref.lng, p.lat, p.lng)
                if d > max_dist:
                    max_dist = d
            time_span_min = (recent_pings[-1].recorded_at - recent_pings[0].recorded_at).total_seconds() / 60.0

            if max_dist < STOP_DETECTION_DISTANCE_METERS and time_span_min >= STOP_DETECTION_DURATION_MINUTES:
                # Log stopped event if not already the latest
                if not latest_event or latest_event.event_type != TripEventType.STOPPED:
                    await _add_event(
                        db, trip, TripEventType.STOPPED,
                        lat=lat, lng=lng,
                        notes=f"Auto-detected stationary for {int(time_span_min)}min (max movement {int(max_dist)}m)",
                    )
                    await ws_manager.broadcast_change(
                        table="TripEvent",
                        action="create",
                        id=trip.id,
                        hospital_id=trip.hospital_id,
                        department="Ambulance Dispatch",
                        details={"trip_id": trip.id, "event_type": "stopped"},
                    )
                    # CF-9: check unusual stop duration
                    await check_cf9_unusual_stop_duration(
                        db=db, hospital_id=trip.hospital_id, trip_id=trip.id
                    )
            elif max_dist > STOP_DETECTION_DISTANCE_METERS * 2 and latest_event and latest_event.event_type == TripEventType.STOPPED:
                # Resumed movement
                await _add_event(
                    db, trip, TripEventType.RESUMED,
                    lat=lat, lng=lng,
                    notes=f"Movement detected after stop (max movement {int(max_dist)}m)",
                )
                await ws_manager.broadcast_change(
                    table="TripEvent",
                    action="create",
                    id=trip.id,
                    hospital_id=trip.hospital_id,
                    department="Ambulance Dispatch",
                    details={"trip_id": trip.id, "event_type": "resumed"},
                )

    # --- Arrival detection (geofence) ---
    if trip.status == TripStatus.EN_ROUTE_PICKUP:
        distance = haversine_distance(lat, lng, trip.pickup_lat, trip.pickup_lng)
        if distance <= GEOFENCE_PICKUP_METERS:
            trip.status = TripStatus.AT_PICKUP
            if amb:
                amb.status = AmbulanceStatus.AT_PICKUP
            db.commit()
            db.refresh(trip)
            await _add_event(
                db, trip, TripEventType.ARRIVED_PICKUP,
                lat=lat, lng=lng,
                notes=f"Auto-detected arrival at pickup ({int(distance)}m away)",
            )
            await ws_manager.broadcast_change(
                table="AmbulanceTrip",
                action="update",
                id=trip.id,
                hospital_id=trip.hospital_id,
                department="Ambulance Dispatch",
                details={"trip_id": trip.id, "status": trip.status.value, "action": "arrived_pickup"},
            )

    elif trip.status == TripStatus.EN_ROUTE_HOSPITAL and trip.hospital:
        distance = haversine_distance(lat, lng, trip.hospital.latitude, trip.hospital.longitude)
        if distance <= GEOFENCE_HOSPITAL_METERS:
            trip.status = TripStatus.AT_HOSPITAL
            if amb:
                amb.status = AmbulanceStatus.AT_HOSPITAL
            db.commit()
            db.refresh(trip)
            await _add_event(
                db, trip, TripEventType.ARRIVED_HOSPITAL,
                lat=lat, lng=lng,
                notes=f"Auto-detected arrival at hospital ({int(distance)}m away)",
            )
            await ws_manager.broadcast_change(
                table="AmbulanceTrip",
                action="update",
                id=trip.id,
                hospital_id=trip.hospital_id,
                department="Ambulance Dispatch",
                details={"trip_id": trip.id, "status": trip.status.value, "action": "arrived_hospital"},
            )


async def _add_event(
    db: Session,
    trip: AmbulanceTrip,
    event_type: TripEventType,
    lat: float = None,
    lng: float = None,
    notes: str = None,
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
