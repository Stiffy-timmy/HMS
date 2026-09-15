from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models.ambulance import AmbulanceTrip, TripStatus, TripEvent
from app.models.conflict import ConflictLog, ConflictType, ConflictStatus
from app.models.user import User
from app.services.websocket_manager import ws_manager
from app.services.activity_service import log_activity


async def check_cf7_no_ambulance_available(
    db: Session,
    hospital_id: int,
    trip_id: int,
    trigger_user_id: Optional[int] = None,
) -> Optional[ConflictLog]:
    """
    CF-7 (No Ambulance Available):
    Raised when an AmbulanceTrip is created/scheduled but no idle ambulance
    exists at the requested branch. Severity: critical.

    Auto-resolves when the trip gets an ambulance_id assigned (manually or
    automatically) or when the trip is cancelled.
    """
    trip = db.query(AmbulanceTrip).filter(
        AmbulanceTrip.id == trip_id,
        AmbulanceTrip.hospital_id == hospital_id,
    ).first()
    if not trip:
        return None

    open_conflict = db.query(ConflictLog).filter(
        ConflictLog.hospital_id == hospital_id,
        ConflictLog.related_trip_id == trip.id,
        ConflictLog.conflict_type == ConflictType.NO_AMBULANCE_AVAILABLE,
        ConflictLog.status.in_([ConflictStatus.OPEN, ConflictStatus.UNDER_REVIEW]),
    ).first()

    act_user_id = trigger_user_id
    if not act_user_id:
        admin_user = db.query(User).filter(User.hospital_id == hospital_id, User.role == "admin").first()
        act_user_id = admin_user.id if admin_user else 1

    # Conflict condition: trip is not cancelled AND has no ambulance assigned
    has_no_ambulance = trip.ambulance_id is None
    is_active = trip.status not in [TripStatus.CANCELLED, TripStatus.COMPLETED]

    if has_no_ambulance and is_active:
        if not open_conflict:
            desc = (
                f"Ambulance Trip #{trip.id} scheduled for {trip.pickup_address} "
                f"at {trip.requested_pickup_time.strftime('%Y-%m-%d %H:%M UTC')} "
                f"has no idle ambulance available at this branch"
            )
            new_conflict = ConflictLog(
                hospital_id=hospital_id,
                conflict_type=ConflictType.NO_AMBULANCE_AVAILABLE,
                related_trip_id=trip.id,
                related_stay_id=None,
                related_bed_id=None,
                description=desc,
                detected_at=datetime.now(timezone.utc),
                status=ConflictStatus.OPEN,
                assigned_to=None,
            )
            db.add(new_conflict)
            db.commit()
            db.refresh(new_conflict)

            await log_activity(
                db=db,
                hospital_id=hospital_id,
                user_id=act_user_id,
                action_description=f"System detected cross-department conflict CF-{new_conflict.id}: {desc}",
                department="Ambulance Dispatch",
            )
            await ws_manager.broadcast_change(
                table="ConflictLog",
                action="create",
                id=new_conflict.id,
                hospital_id=hospital_id,
                department="Ambulance Dispatch",
                details={
                    "conflict_id": new_conflict.id,
                    "conflict_type": new_conflict.conflict_type.value,
                    "status": new_conflict.status.value,
                    "related_trip_id": trip.id,
                    "description": desc,
                },
            )
            return new_conflict
        return open_conflict

    # Auto-resolve: ambulance was assigned OR trip was cancelled/completed
    elif open_conflict:
        open_conflict.status = ConflictStatus.RESOLVED
        db.commit()
        db.refresh(open_conflict)
        await log_activity(
            db=db,
            hospital_id=hospital_id,
            user_id=act_user_id,
            action_description=(
                f"System auto-resolved conflict CF-{open_conflict.id}: "
                f"Ambulance Trip #{trip.id} now has an ambulance assigned (or was closed)"
            ),
            department="Ambulance Dispatch",
        )
        await ws_manager.broadcast_change(
            table="ConflictLog",
            action="update",
            id=open_conflict.id,
            hospital_id=hospital_id,
            department="Ambulance Dispatch",
            details={
                "conflict_id": open_conflict.id,
                "status": "resolved",
                "related_trip_id": trip.id,
            },
        )
        return open_conflict

    return None


async def check_cf8_dispatch_delay(
    db: Session,
    hospital_id: int,
    trip_id: int,
    grace_minutes: int = 3,
    trigger_user_id: Optional[int] = None,
) -> Optional[ConflictLog]:
    """
    CF-8 (Dispatch Delay):
    Raised when a trip's calculated_departure_time has passed by more than
    `grace_minutes` but the trip is still in `dispatched` state (driver hasn't
    started moving). Severity escalates from warning (over grace) to critical
    (over 2x grace). Auto-resolves when status advances past `dispatched`.
    """
    trip = db.query(AmbulanceTrip).filter(
        AmbulanceTrip.id == trip_id,
        AmbulanceTrip.hospital_id == hospital_id,
    ).first()
    if not trip:
        return None

    open_conflict = db.query(ConflictLog).filter(
        ConflictLog.hospital_id == hospital_id,
        ConflictLog.related_trip_id == trip.id,
        ConflictLog.conflict_type == ConflictType.DISPATCH_DELAY,
        ConflictLog.status.in_([ConflictStatus.OPEN, ConflictStatus.UNDER_REVIEW]),
    ).first()

    act_user_id = trigger_user_id
    if not act_user_id:
        admin_user = db.query(User).filter(User.hospital_id == hospital_id, User.role == "admin").first()
        act_user_id = admin_user.id if admin_user else 1

    # Conflict condition: trip is in `dispatched` and departure time is overdue
    is_overdue = trip.status == TripStatus.DISPATCHED
    overdue_long = False
    minutes_late = 0.0
    if is_overdue:
        dep = trip.calculated_departure_time
        if dep.tzinfo is None:
            dep = dep.replace(tzinfo=timezone.utc)
        delta = (datetime.now(timezone.utc) - dep).total_seconds() / 60.0
        minutes_late = delta
        is_overdue = delta > grace_minutes
        overdue_long = delta > (grace_minutes * 2)

    if is_overdue:
        if not open_conflict:
            severity_label = "CRITICAL" if overdue_long else "WARNING"
            desc = (
                f"Ambulance Trip #{trip.id} was scheduled to depart at "
                f"{trip.calculated_departure_time.strftime('%Y-%m-%d %H:%M UTC')} "
                f"but is still in 'dispatched' state {int(minutes_late)} minutes late [{severity_label}]"
            )
            new_conflict = ConflictLog(
                hospital_id=hospital_id,
                conflict_type=ConflictType.DISPATCH_DELAY,
                related_trip_id=trip.id,
                related_stay_id=None,
                related_bed_id=None,
                description=desc,
                detected_at=datetime.now(timezone.utc),
                status=ConflictStatus.OPEN,
                assigned_to=None,
            )
            db.add(new_conflict)
            db.commit()
            db.refresh(new_conflict)
            await log_activity(
                db=db,
                hospital_id=hospital_id,
                user_id=act_user_id,
                action_description=f"System detected CF-{new_conflict.id}: {desc}",
                department="Ambulance Dispatch",
            )
            await ws_manager.broadcast_change(
                table="ConflictLog",
                action="create",
                id=new_conflict.id,
                hospital_id=hospital_id,
                department="Ambulance Dispatch",
                details={
                    "conflict_id": new_conflict.id,
                    "conflict_type": new_conflict.conflict_type.value,
                    "status": new_conflict.status.value,
                    "related_trip_id": trip.id,
                    "description": desc,
                    "minutes_late": int(minutes_late),
                    "severity": severity_label.lower(),
                },
            )
            return new_conflict
        # Escalation: if existing conflict is warning but now over 2x grace, keep raising
        return open_conflict

    # Auto-resolve: trip has advanced past `dispatched` (driver is moving)
    elif open_conflict and trip.status != TripStatus.DISPATCHED:
        open_conflict.status = ConflictStatus.RESOLVED
        db.commit()
        db.refresh(open_conflict)
        await log_activity(
            db=db,
            hospital_id=hospital_id,
            user_id=act_user_id,
            action_description=(
                f"System auto-resolved conflict CF-{open_conflict.id}: "
                f"Ambulance Trip #{trip.id} has begun movement"
            ),
            department="Ambulance Dispatch",
        )
        await ws_manager.broadcast_change(
            table="ConflictLog",
            action="update",
            id=open_conflict.id,
            hospital_id=hospital_id,
            department="Ambulance Dispatch",
            details={
                "conflict_id": open_conflict.id,
                "status": "resolved",
                "related_trip_id": trip.id,
            },
        )
        return open_conflict

    return None


async def check_cf9_unusual_stop_duration(
    db: Session,
    hospital_id: int,
    trip_id: int,
    threshold_minutes: int = 8,
    trigger_user_id: Optional[int] = None,
) -> Optional[ConflictLog]:
    """
    CF-9 (Unusual Stop Duration):
    Raised if a `stopped` TripEvent has persisted (no `resumed` event) for
    more than `threshold_minutes` during an active trip. Could indicate
    breakdown, traffic incident, or wrong turn. Severity: warning.
    Auto-resolves when a `resumed` event is logged.
    """
    trip = db.query(AmbulanceTrip).filter(
        AmbulanceTrip.id == trip_id,
        AmbulanceTrip.hospital_id == hospital_id,
    ).first()
    if not trip:
        return None

    # Find latest event. The events relationship is order_by timestamp desc.
    latest_event = db.query(TripEvent).filter(
        TripEvent.trip_id == trip.id,
    ).order_by(TripEvent.timestamp.desc(), TripEvent.id.desc()).first()

    # Trip must be active (not terminal)
    is_active_trip = trip.status not in [TripStatus.COMPLETED, TripStatus.CANCELLED]

    open_conflict = db.query(ConflictLog).filter(
        ConflictLog.hospital_id == hospital_id,
        ConflictLog.related_trip_id == trip.id,
        ConflictLog.conflict_type == ConflictType.UNUSUAL_STOP_DURATION,
        ConflictLog.status.in_([ConflictStatus.OPEN, ConflictStatus.UNDER_REVIEW]),
    ).first()

    act_user_id = trigger_user_id
    if not act_user_id:
        admin_user = db.query(User).filter(User.hospital_id == hospital_id, User.role == "admin").first()
        act_user_id = admin_user.id if admin_user else 1

    stop_long_enough = False
    minutes_stopped = 0.0
    if latest_event and latest_event.event_type.value == "stopped" and is_active_trip:
        ts = latest_event.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        minutes_stopped = (datetime.now(timezone.utc) - ts).total_seconds() / 60.0
        stop_long_enough = minutes_stopped > threshold_minutes

    if stop_long_enough:
        if not open_conflict:
            desc = (
                f"Ambulance Trip #{trip.id} has been stationary for "
                f"{int(minutes_stopped)} minutes without resuming. "
                f"Possible breakdown, traffic incident, or wrong turn."
            )
            new_conflict = ConflictLog(
                hospital_id=hospital_id,
                conflict_type=ConflictType.UNUSUAL_STOP_DURATION,
                related_trip_id=trip.id,
                related_stay_id=None,
                related_bed_id=None,
                description=desc,
                detected_at=datetime.now(timezone.utc),
                status=ConflictStatus.OPEN,
                assigned_to=None,
            )
            db.add(new_conflict)
            db.commit()
            db.refresh(new_conflict)
            await log_activity(
                db=db,
                hospital_id=hospital_id,
                user_id=act_user_id,
                action_description=f"System detected CF-{new_conflict.id}: {desc}",
                department="Ambulance Dispatch",
            )
            await ws_manager.broadcast_change(
                table="ConflictLog",
                action="create",
                id=new_conflict.id,
                hospital_id=hospital_id,
                department="Ambulance Dispatch",
                details={
                    "conflict_id": new_conflict.id,
                    "conflict_type": new_conflict.conflict_type.value,
                    "status": new_conflict.status.value,
                    "related_trip_id": trip.id,
                    "description": desc,
                    "minutes_stopped": int(minutes_stopped),
                },
            )
            return new_conflict
        return open_conflict

    # Auto-resolve: a `resumed` event is now the latest, or trip is terminal
    elif open_conflict and (
        (latest_event and latest_event.event_type.value == "resumed")
        or not is_active_trip
    ):
        open_conflict.status = ConflictStatus.RESOLVED
        db.commit()
        db.refresh(open_conflict)
        await log_activity(
            db=db,
            hospital_id=hospital_id,
            user_id=act_user_id,
            action_description=(
                f"System auto-resolved conflict CF-{open_conflict.id}: "
                f"Ambulance Trip #{trip.id} resumed movement"
            ),
            department="Ambulance Dispatch",
        )
        await ws_manager.broadcast_change(
            table="ConflictLog",
            action="update",
            id=open_conflict.id,
            hospital_id=hospital_id,
            department="Ambulance Dispatch",
            details={
                "conflict_id": open_conflict.id,
                "status": "resolved",
                "related_trip_id": trip.id,
            },
        )
        return open_conflict

    return None
