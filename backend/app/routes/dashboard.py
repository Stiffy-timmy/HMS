from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.deps import get_current_user, require_admin, require_hod
from app.models.user import User, UserRole, RoleInviteCode, PasswordResetToken
from app.models.bed import Bed, BedStatus, RoomType
from app.models.patient_stay import PatientStay, StayStatus
from app.models.lab_order import LabOrder, LabStatus
from app.models.activity import ActivityLog
from app.schemas.dashboard import AdminDashboardStats, HODDashboardStats, StaffDashboardStats, RoomTypeStats
from app.schemas.auth import UserResponse
from app.services.activity_service import log_activity
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/dashboard", tags=["Dashboards"])


def compute_room_type_stats(beds: List[Bed]) -> List[RoomTypeStats]:
    # Group beds by room type
    type_map = {
        RoomType.SINGLE: {"price": 20000.0, "total": 0, "available": 0, "occupied": 0, "reserved": 0, "maintenance": 0, "cleaning_pending": 0},
        RoomType.DOUBLE: {"price": 12000.0, "total": 0, "available": 0, "occupied": 0, "reserved": 0, "maintenance": 0, "cleaning_pending": 0},
        RoomType.TRIPLE: {"price": 8000.0, "total": 0, "available": 0, "occupied": 0, "reserved": 0, "maintenance": 0, "cleaning_pending": 0},
        RoomType.ICU: {"price": 35000.0, "total": 0, "available": 0, "occupied": 0, "reserved": 0, "maintenance": 0, "cleaning_pending": 0},
    }
    
    for b in beds:
        rt = b.room_type
        if rt not in type_map:
            type_map[rt] = {"price": b.price_per_day, "total": 0, "available": 0, "occupied": 0, "reserved": 0, "maintenance": 0, "cleaning_pending": 0}
        type_map[rt]["price"] = b.price_per_day  # use realistic seed price
        type_map[rt]["total"] += 1
        if b.current_status == BedStatus.AVAILABLE:
            type_map[rt]["available"] += 1
        elif b.current_status == BedStatus.OCCUPIED:
            type_map[rt]["occupied"] += 1
        elif b.current_status == BedStatus.RESERVED:
            type_map[rt]["reserved"] += 1
        elif b.current_status == BedStatus.MAINTENANCE:
            type_map[rt]["maintenance"] += 1
        elif b.current_status == BedStatus.CLEANING_PENDING:
            type_map[rt]["cleaning_pending"] += 1

    return [
        RoomTypeStats(
            room_type=rt.value.upper(),
            price_per_day=data["price"],
            total=data["total"],
            available=data["available"],
            occupied=data["occupied"],
            reserved=data["reserved"],
            maintenance=data["maintenance"],
            cleaning_pending=data.get("cleaning_pending", 0)
        )
        for rt, data in type_map.items()
        if data["total"] > 0 or rt in [RoomType.SINGLE, RoomType.DOUBLE, RoomType.TRIPLE, RoomType.ICU]
    ]

@router.get("/admin", response_model=AdminDashboardStats)
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    hospital_id = current_user.hospital_id

    # 1. Beds & Room types
    beds = db.query(Bed).filter(Bed.hospital_id == hospital_id).all()
    total_beds = len(beds)
    available_beds = sum(1 for b in beds if b.current_status == BedStatus.AVAILABLE)
    occupied_beds = sum(1 for b in beds if b.current_status == BedStatus.OCCUPIED)
    reserved_beds = sum(1 for b in beds if b.current_status == BedStatus.RESERVED)
    maintenance_beds = sum(1 for b in beds if b.current_status == BedStatus.MAINTENANCE)
    cleaning_pending_beds = sum(1 for b in beds if b.current_status == BedStatus.CLEANING_PENDING)
    room_type_breakdown = compute_room_type_stats(beds)

    # 2. Patient Admissions & Discharges
    current_admissions_count = db.query(PatientStay).filter(
        PatientStay.hospital_id == hospital_id,
        PatientStay.status == StayStatus.ACTIVE
    ).count()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    discharges_today_count = db.query(PatientStay).filter(
        PatientStay.hospital_id == hospital_id,
        PatientStay.actual_discharge_at >= today_start
    ).count()

    # 3. Lab turnaround time & pending count
    pending_labs_count = db.query(LabOrder).filter(
        LabOrder.hospital_id == hospital_id,
        LabOrder.status.in_([LabStatus.PENDING, LabStatus.IN_PROGRESS])
    ).count()

    completed_labs = db.query(LabOrder).filter(
        LabOrder.hospital_id == hospital_id,
        LabOrder.status == LabStatus.COMPLETED,
        LabOrder.sample_collected_at.isnot(None),
        LabOrder.result_at.isnot(None)
    ).all()

    turnaround_deltas = []
    for l in completed_labs:
        if l.result_at and l.sample_collected_at and l.result_at >= l.sample_collected_at:
            delta_mins = (l.result_at - l.sample_collected_at).total_seconds() / 60.0
            turnaround_deltas.append(delta_mins)
            
    avg_turnaround = round(sum(turnaround_deltas) / len(turnaround_deltas), 1) if turnaround_deltas else None

    # 4. Daily inpatient revenue calculated from occupied bed rates
    daily_inpatient_revenue = sum(b.price_per_day for b in beds if b.current_status == BedStatus.OCCUPIED)

    return AdminDashboardStats(
        total_beds=total_beds,
        available_beds=available_beds,
        occupied_beds=occupied_beds,
        reserved_beds=reserved_beds,
        maintenance_beds=maintenance_beds,
        cleaning_pending_beds=cleaning_pending_beds,
        room_type_breakdown=room_type_breakdown,
        current_admissions_count=current_admissions_count,
        discharges_today_count=discharges_today_count,
        pending_labs_count=pending_labs_count,
        avg_lab_turnaround_minutes=avg_turnaround,
        daily_inpatient_revenue=float(daily_inpatient_revenue),
        open_conflicts_count=0,
        revenue_at_risk_per_day=0.0
    )


@router.get("/hod", response_model=HODDashboardStats)
def get_hod_dashboard(
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod)
):
    hospital_id = current_user.hospital_id
    dept = department or current_user.department or "Cardiology"

    beds = db.query(Bed).filter(
        Bed.hospital_id == hospital_id,
        Bed.department.ilike(f"%{dept.strip()}%")
    ).all()

    total_beds = len(beds)
    available_beds = sum(1 for b in beds if b.current_status == BedStatus.AVAILABLE)
    occupied_beds = sum(1 for b in beds if b.current_status == BedStatus.OCCUPIED)
    reserved_beds = sum(1 for b in beds if b.current_status == BedStatus.RESERVED)
    maintenance_beds = sum(1 for b in beds if b.current_status == BedStatus.MAINTENANCE)
    cleaning_pending_beds = sum(1 for b in beds if b.current_status == BedStatus.CLEANING_PENDING)
    room_type_breakdown = compute_room_type_stats(beds)

    active_stays_count = db.query(PatientStay).join(Bed, PatientStay.bed_id == Bed.id).filter(
        PatientStay.hospital_id == hospital_id,
        Bed.department.ilike(f"%{dept.strip()}%"),
        PatientStay.status == StayStatus.ACTIVE
    ).count()

    pending_labs_count = db.query(LabOrder).join(PatientStay, LabOrder.stay_id == PatientStay.id).join(Bed, PatientStay.bed_id == Bed.id).filter(
        LabOrder.hospital_id == hospital_id,
        Bed.department.ilike(f"%{dept.strip()}%"),
        LabOrder.status.in_([LabStatus.PENDING, LabStatus.IN_PROGRESS])
    ).count()

    return HODDashboardStats(
        department=dept,
        total_beds=total_beds,
        available_beds=available_beds,
        occupied_beds=occupied_beds,
        reserved_beds=reserved_beds,
        maintenance_beds=maintenance_beds,
        cleaning_pending_beds=cleaning_pending_beds,
        room_type_breakdown=room_type_breakdown,
        active_stays_count=active_stays_count,
        pending_labs_count=pending_labs_count,
        open_conflicts_count=0
    )


@router.get("/staff", response_model=StaffDashboardStats)
def get_staff_dashboard(
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    hospital_id = current_user.hospital_id
    dept = department or current_user.department or "Cardiology"

    beds = db.query(Bed).filter(
        Bed.hospital_id == hospital_id,
        Bed.department.ilike(f"%{dept.strip()}%")
    ).all()

    total_beds = len(beds)
    available_beds = sum(1 for b in beds if b.current_status == BedStatus.AVAILABLE)
    occupied_beds = sum(1 for b in beds if b.current_status == BedStatus.OCCUPIED)
    reserved_beds = sum(1 for b in beds if b.current_status == BedStatus.RESERVED)
    maintenance_beds = sum(1 for b in beds if b.current_status == BedStatus.MAINTENANCE)
    cleaning_pending_beds = sum(1 for b in beds if b.current_status == BedStatus.CLEANING_PENDING)

    active_stays_count = db.query(PatientStay).join(Bed, PatientStay.bed_id == Bed.id).filter(
        PatientStay.hospital_id == hospital_id,
        Bed.department.ilike(f"%{dept.strip()}%"),
        PatientStay.status == StayStatus.ACTIVE
    ).count()

    pending_labs_count = db.query(LabOrder).join(PatientStay, LabOrder.stay_id == PatientStay.id).join(Bed, PatientStay.bed_id == Bed.id).filter(
        LabOrder.hospital_id == hospital_id,
        Bed.department.ilike(f"%{dept.strip()}%"),
        LabOrder.status.in_([LabStatus.PENDING, LabStatus.IN_PROGRESS])
    ).count()

    return StaffDashboardStats(
        department=dept,
        total_beds=total_beds,
        available_beds=available_beds,
        occupied_beds=occupied_beds,
        reserved_beds=reserved_beds,
        maintenance_beds=maintenance_beds,
        cleaning_pending_beds=cleaning_pending_beds,
        active_stays_count=active_stays_count,
        pending_labs_count=pending_labs_count
    )


@router.get("/users", response_model=List[UserResponse])
def get_hospital_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    users = db.query(User).filter(User.hospital_id == current_user.hospital_id).order_by(User.role, User.full_name).all()
    return [UserResponse.model_validate(u) for u in users]

@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_hospital_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own active administrator account."
        )

    user = db.query(User).filter(
        User.id == user_id,
        User.hospital_id == current_user.hospital_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant user not found."
        )

    user_name = user.full_name
    user_email = user.email
    user_role = user.role.value

    # Safe foreign-key disassociations
    # 1. Invite codes created by this user
    db.query(RoleInviteCode).filter(RoleInviteCode.created_by == user_id).update({"created_by": None})
    # 2. Beds updated by this user
    db.query(Bed).filter(Bed.last_updated_by == user_id).update({"last_updated_by": None})

    # 4. Patient stays admitted by this user - reassign to current admin
    db.query(PatientStay).filter(PatientStay.admitted_by == user_id).update({"admitted_by": current_user.id})
    # 5. Password reset tokens
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete()
    # 6. Activity logs for this user
    db.query(ActivityLog).filter(ActivityLog.user_id == user_id).delete()

    # Delete user record
    db.delete(user)
    db.commit()

    # Log deletion in activity trail
    desc = f"{current_user.full_name} (ADMIN) deleted participant {user_name} ({user_email}, role: {user_role}) from the system."
    await log_activity(
        db=db,
        hospital_id=current_user.hospital_id,
        user_id=current_user.id,
        action_description=desc,
        department=None
    )

    # Broadcast WebSocket push update so all dashboards reflect immediately
    await ws_manager.broadcast_change(
        table="User",
        action="delete",
        id=user_id,
        hospital_id=current_user.hospital_id,
        details={"deleted_user_id": user_id, "name": user_name, "email": user_email}
    )

    return {
        "message": f"Participant '{user_name}' ({user_email}) has been permanently deleted from the database.",
        "deleted_user_id": user_id
    }
