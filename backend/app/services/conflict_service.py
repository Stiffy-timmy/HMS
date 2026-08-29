import math
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.bed import Bed, BedStatus
from app.models.patient_stay import PatientStay, StayStatus
from app.models.billing import Billing, BillingStatus
from app.models.lab_order import LabOrder, LabStatus
from app.models.conflict import ConflictLog, ConflictType, ConflictStatus
from app.models.activity import ActivityLog
from app.models.user import User
from app.services.websocket_manager import ws_manager
from app.services.activity_service import log_activity

async def check_cf3_occupied_no_billing(
    db: Session,
    hospital_id: int,
    stay_id: int,
    trigger_user_id: Optional[int] = None
) -> Optional[ConflictLog]:
    """
    CF-3 (Ward vs. Billing):
    Active PatientStay occupying a bed whose linked Billing encounter is status = 'not_started'.
    """
    stay = db.query(PatientStay).filter(
        PatientStay.id == stay_id,
        PatientStay.hospital_id == hospital_id
    ).first()
    if not stay:
        return None

    billing = stay.billing or db.query(Billing).filter(Billing.stay_id == stay.id).first()
    bed = stay.bed or (db.query(Bed).filter(Bed.id == stay.bed_id).first() if stay.bed_id else None)

    open_conflict = db.query(ConflictLog).filter(
        ConflictLog.hospital_id == hospital_id,
        ConflictLog.related_stay_id == stay.id,
        ConflictLog.conflict_type == ConflictType.OCCUPIED_NO_BILLING,
        ConflictLog.status.in_([ConflictStatus.OPEN, ConflictStatus.UNDER_REVIEW])
    ).first()

    act_user_id = trigger_user_id
    if not act_user_id:
        admin_user = db.query(User).filter(User.hospital_id == hospital_id, User.role == "admin").first()
        act_user_id = admin_user.id if admin_user else 1

    # Conflict Condition: Active Stay + Billing NOT_STARTED
    if stay.status == StayStatus.ACTIVE and (not billing or billing.status == BillingStatus.NOT_STARTED):
        if not open_conflict:
            desc = f"Patient {stay.patient_name} occupying {bed.ward if bed else 'Ward'} Bed #{stay.bed_id} with Billing status 'not_started'"
            new_conflict = ConflictLog(
                hospital_id=hospital_id,
                conflict_type=ConflictType.OCCUPIED_NO_BILLING,
                related_stay_id=stay.id,
                related_bed_id=stay.bed_id,
                description=desc,
                detected_at=datetime.now(timezone.utc),
                status=ConflictStatus.OPEN,
                assigned_to=None
            )
            db.add(new_conflict)
            db.commit()
            db.refresh(new_conflict)

            # Log system activity
            act_desc = f"System detected cross-department conflict CF-{new_conflict.id}: {desc}"
            await log_activity(
                db=db,
                hospital_id=hospital_id,
                user_id=act_user_id,
                action_description=act_desc,
                department=bed.department if bed else "Billing"
            )

            # Broadcast WebSocket
            await ws_manager.broadcast_change(
                table="ConflictLog",
                action="create",
                id=new_conflict.id,
                hospital_id=hospital_id,
                department=bed.department if bed else None,
                details={
                    "conflict_id": new_conflict.id,
                    "conflict_type": new_conflict.conflict_type.value,
                    "status": new_conflict.status.value,
                    "bed_id": stay.bed_id,
                    "ward": bed.ward if bed else None,
                    "department": bed.department if bed else None,
                    "patient_name": stay.patient_name,
                    "description": desc
                }
            )
            return new_conflict
        return open_conflict

    # Auto-resolve Condition: Billing is ACTIVE/CLOSED or Stay Discharged
    elif open_conflict:
        open_conflict.status = ConflictStatus.RESOLVED
        db.commit()
        db.refresh(open_conflict)

        act_desc = f"System auto-resolved conflict CF-{open_conflict.id}: Billing encounter activated for stay #{stay.id} ({stay.patient_name})"
        await log_activity(
            db=db,
            hospital_id=hospital_id,
            user_id=act_user_id,
            action_description=act_desc,
            department=bed.department if bed else None
        )

        await ws_manager.broadcast_change(
            table="ConflictLog",
            action="update",
            id=open_conflict.id,
            hospital_id=hospital_id,
            department=bed.department if bed else None,
            details={
                "conflict_id": open_conflict.id,
                "status": "resolved",
                "bed_id": stay.bed_id
            }
        )
        return open_conflict

    return None

async def check_cf2_lab_unbilled(
    db: Session,
    hospital_id: int,
    lab_id: int,
    trigger_user_id: Optional[int] = None
) -> Optional[ConflictLog]:
    """
    CF-2 (Lab vs. Billing):
    Completed diagnostic lab order unbilled to patient billing account.
    """
    lab = db.query(LabOrder).filter(
        LabOrder.id == lab_id,
        LabOrder.hospital_id == hospital_id
    ).first()
    if not lab:
        return None

    stay = lab.stay or db.query(PatientStay).filter(PatientStay.id == lab.stay_id).first()
    bed = stay.bed if stay else None

    open_conflict = db.query(ConflictLog).filter(
        ConflictLog.hospital_id == hospital_id,
        ConflictLog.related_stay_id == lab.stay_id,
        ConflictLog.conflict_type == ConflictType.LAB_UNBILLED,
        ConflictLog.status.in_([ConflictStatus.OPEN, ConflictStatus.UNDER_REVIEW])
    ).first()

    act_user_id = trigger_user_id
    if not act_user_id:
        admin_user = db.query(User).filter(User.hospital_id == hospital_id, User.role == "admin").first()
        act_user_id = admin_user.id if admin_user else 1

    # Conflict Condition: Lab completed but unbilled
    if lab.status == LabStatus.COMPLETED and not lab.billed:
        if not open_conflict:
            patient_name = stay.patient_name if stay else "Inpatient"
            desc = f"Lab Order #{lab.id} ({lab.test_name}) completed for patient {patient_name} but unbilled in Billing Department"
            new_conflict = ConflictLog(
                hospital_id=hospital_id,
                conflict_type=ConflictType.LAB_UNBILLED,
                related_stay_id=lab.stay_id,
                related_bed_id=stay.bed_id if stay else None,
                description=desc,
                detected_at=datetime.now(timezone.utc),
                status=ConflictStatus.OPEN,
                assigned_to=None
            )
            db.add(new_conflict)
            db.commit()
            db.refresh(new_conflict)

            act_desc = f"System detected cross-department conflict CF-{new_conflict.id}: {desc}"
            await log_activity(
                db=db,
                hospital_id=hospital_id,
                user_id=act_user_id,
                action_description=act_desc,
                department="Laboratory"
            )

            await ws_manager.broadcast_change(
                table="ConflictLog",
                action="create",
                id=new_conflict.id,
                hospital_id=hospital_id,
                department="Laboratory",
                details={
                    "conflict_id": new_conflict.id,
                    "conflict_type": new_conflict.conflict_type.value,
                    "status": new_conflict.status.value,
                    "bed_id": stay.bed_id if stay else None,
                    "patient_name": patient_name,
                    "description": desc
                }
            )
            return new_conflict
        return open_conflict

    # Auto-resolve Condition: Lab is marked billed
    elif open_conflict and lab.billed:
        open_conflict.status = ConflictStatus.RESOLVED
        db.commit()
        db.refresh(open_conflict)

        act_desc = f"System auto-resolved conflict CF-{open_conflict.id}: Lab Order #{lab.id} ({lab.test_name}) billed to patient account"
        await log_activity(
            db=db,
            hospital_id=hospital_id,
            user_id=act_user_id,
            action_description=act_desc,
            department="Laboratory"
        )

        await ws_manager.broadcast_change(
            table="ConflictLog",
            action="update",
            id=open_conflict.id,
            hospital_id=hospital_id,
            department="Laboratory",
            details={
                "conflict_id": open_conflict.id,
                "status": "resolved"
            }
        )
        return open_conflict

    return None

async def check_cf4_housekeeping_delay(
    db: Session,
    hospital_id: int,
    bed_id: int,
    trigger_user_id: Optional[int] = None
) -> Optional[ConflictLog]:
    """
    CF-4 (Clinical vs. Housekeeping):
    Bed sitting in 'cleaning_pending' status awaiting Housekeeping sanitation.
    """
    bed = db.query(Bed).filter(
        Bed.id == bed_id,
        Bed.hospital_id == hospital_id
    ).first()
    if not bed:
        return None

    open_conflict = db.query(ConflictLog).filter(
        ConflictLog.hospital_id == hospital_id,
        ConflictLog.related_bed_id == bed.id,
        ConflictLog.conflict_type == ConflictType.HOUSEKEEPING_DELAY,
        ConflictLog.status.in_([ConflictStatus.OPEN, ConflictStatus.UNDER_REVIEW])
    ).first()

    act_user_id = trigger_user_id
    if not act_user_id:
        admin_user = db.query(User).filter(User.hospital_id == hospital_id, User.role == "admin").first()
        act_user_id = admin_user.id if admin_user else 1

    # Conflict Condition: Bed is in CLEANING_PENDING
    if bed.current_status == BedStatus.CLEANING_PENDING:
        if not open_conflict:
            desc = f"Bed #{bed.id} ({bed.ward} - {bed.department}) in Cleaning Pending status awaiting Housekeeping sanitation"
            new_conflict = ConflictLog(
                hospital_id=hospital_id,
                conflict_type=ConflictType.HOUSEKEEPING_DELAY,
                related_stay_id=None,
                related_bed_id=bed.id,
                description=desc,
                detected_at=datetime.now(timezone.utc),
                status=ConflictStatus.OPEN,
                assigned_to=None
            )
            db.add(new_conflict)
            db.commit()
            db.refresh(new_conflict)

            act_desc = f"System detected cross-department conflict CF-{new_conflict.id}: {desc}"
            await log_activity(
                db=db,
                hospital_id=hospital_id,
                user_id=act_user_id,
                action_description=act_desc,
                department="Housekeeping"
            )

            await ws_manager.broadcast_change(
                table="ConflictLog",
                action="create",
                id=new_conflict.id,
                hospital_id=hospital_id,
                department="Housekeeping",
                details={
                    "conflict_id": new_conflict.id,
                    "conflict_type": new_conflict.conflict_type.value,
                    "status": new_conflict.status.value,
                    "bed_id": bed.id,
                    "ward": bed.ward,
                    "department": bed.department,
                    "description": desc
                }
            )
            return new_conflict
        return open_conflict

    # Auto-resolve Condition: Bed is AVAILABLE
    elif open_conflict and bed.current_status == BedStatus.AVAILABLE:
        open_conflict.status = ConflictStatus.RESOLVED
        db.commit()
        db.refresh(open_conflict)

        act_desc = f"System auto-resolved conflict CF-{open_conflict.id}: Bed #{bed.id} ({bed.ward}) sanitized and marked Available"
        await log_activity(
            db=db,
            hospital_id=hospital_id,
            user_id=act_user_id,
            action_description=act_desc,
            department="Housekeeping"
        )

        await ws_manager.broadcast_change(
            table="ConflictLog",
            action="update",
            id=open_conflict.id,
            hospital_id=hospital_id,
            department="Housekeeping",
            details={
                "conflict_id": open_conflict.id,
                "status": "resolved",
                "bed_id": bed.id
            }
        )
        return open_conflict

    return None

async def check_cf5_discharge_billing_mismatch(
    db: Session,
    hospital_id: int,
    stay_id: int,
    trigger_user_id: Optional[int] = None
) -> Optional[ConflictLog]:
    """
    CF-5 (Cashier vs. Ward ADT):
    Billing status is CLOSED or finalized, but clinical stay is still ACTIVE in Ward ADT.
    """
    stay = db.query(PatientStay).filter(
        PatientStay.id == stay_id,
        PatientStay.hospital_id == hospital_id
    ).first()
    if not stay:
        return None

    billing = stay.billing or db.query(Billing).filter(Billing.stay_id == stay.id).first()
    bed = stay.bed

    open_conflict = db.query(ConflictLog).filter(
        ConflictLog.hospital_id == hospital_id,
        ConflictLog.related_stay_id == stay.id,
        ConflictLog.conflict_type == ConflictType.DISCHARGE_BILLING_MISMATCH,
        ConflictLog.status.in_([ConflictStatus.OPEN, ConflictStatus.UNDER_REVIEW])
    ).first()

    act_user_id = trigger_user_id
    if not act_user_id:
        admin_user = db.query(User).filter(User.hospital_id == hospital_id, User.role == "admin").first()
        act_user_id = admin_user.id if admin_user else 1

    # Conflict Condition: Stay is ACTIVE but Billing is CLOSED
    if stay.status == StayStatus.ACTIVE and billing and billing.status == BillingStatus.CLOSED:
        if not open_conflict:
            desc = f"Billing account for stay #{stay.id} ({stay.patient_name}) is CLOSED at Cashier, but clinical stay is still ACTIVE in Ward ADT"
            new_conflict = ConflictLog(
                hospital_id=hospital_id,
                conflict_type=ConflictType.DISCHARGE_BILLING_MISMATCH,
                related_stay_id=stay.id,
                related_bed_id=stay.bed_id,
                description=desc,
                detected_at=datetime.now(timezone.utc),
                status=ConflictStatus.OPEN,
                assigned_to=None
            )
            db.add(new_conflict)
            db.commit()
            db.refresh(new_conflict)

            act_desc = f"System detected cross-department conflict CF-{new_conflict.id}: {desc}"
            await log_activity(
                db=db,
                hospital_id=hospital_id,
                user_id=act_user_id,
                action_description=act_desc,
                department=bed.department if bed else "ADT"
            )

            await ws_manager.broadcast_change(
                table="ConflictLog",
                action="create",
                id=new_conflict.id,
                hospital_id=hospital_id,
                department=bed.department if bed else None,
                details={
                    "conflict_id": new_conflict.id,
                    "conflict_type": new_conflict.conflict_type.value,
                    "status": new_conflict.status.value,
                    "patient_name": stay.patient_name,
                    "description": desc
                }
            )
            return new_conflict
        return open_conflict

    # Auto-resolve Condition: Stay is DISCHARGED
    elif open_conflict and stay.status == StayStatus.DISCHARGED:
        open_conflict.status = ConflictStatus.RESOLVED
        db.commit()
        db.refresh(open_conflict)

        act_desc = f"System auto-resolved conflict CF-{open_conflict.id}: Clinical discharge recorded in ADT for stay #{stay.id} ({stay.patient_name})"
        await log_activity(
            db=db,
            hospital_id=hospital_id,
            user_id=act_user_id,
            action_description=act_desc,
            department=bed.department if bed else None
        )

        await ws_manager.broadcast_change(
            table="ConflictLog",
            action="update",
            id=open_conflict.id,
            hospital_id=hospital_id,
            department=bed.department if bed else None,
            details={
                "conflict_id": open_conflict.id,
                "status": "resolved"
            }
        )
        return open_conflict

    return None

async def resolve_conflict_manually(
    db: Session,
    conflict_id: int,
    user: User,
    resolution_notes: Optional[str] = None
) -> Optional[ConflictLog]:
    """
    Executive/Admin manual resolution path for real cross-department conflicts.
    """
    conflict = db.query(ConflictLog).filter(
        ConflictLog.id == conflict_id,
        ConflictLog.hospital_id == user.hospital_id
    ).first()
    if not conflict:
        return None

    conflict.status = ConflictStatus.RESOLVED
    conflict.assigned_to = user.id

    act_desc = f"{user.full_name} ({user.role.value.upper()}) resolved conflict CF-{conflict.id}: {conflict.description[:60]}..."

    # Conflict-specific side effects
    if conflict.conflict_type == ConflictType.HOUSEKEEPING_DELAY:
        if conflict.related_bed_id:
            bed = db.query(Bed).filter(Bed.id == conflict.related_bed_id).first()
            if bed and bed.current_status == BedStatus.CLEANING_PENDING:
                bed.current_status = BedStatus.AVAILABLE
                bed.last_updated_by = user.id
                bed.last_updated_at = datetime.now(timezone.utc)
                act_desc = f"{user.full_name} ({user.role.value.upper()}) verified bed sanitation and marked Bed #{bed.id} ({bed.ward}) Available (Resolved CF-{conflict.id})"
                await ws_manager.broadcast_change(
                    table="Bed",
                    action="update",
                    id=bed.id,
                    hospital_id=bed.hospital_id,
                    department=bed.department,
                    details={"bed_id": bed.id, "new_status": "available"}
                )

    elif conflict.conflict_type == ConflictType.OCCUPIED_NO_BILLING:
        if conflict.related_stay_id:
            billing = db.query(Billing).filter(Billing.stay_id == conflict.related_stay_id).first()
            if billing and billing.status == BillingStatus.NOT_STARTED:
                billing.status = BillingStatus.ACTIVE
                billing.last_updated_at = datetime.now(timezone.utc)
                act_desc = f"{user.full_name} ({user.role.value.upper()}) activated billing account for stay #{conflict.related_stay_id} (Resolved CF-{conflict.id})"

    elif conflict.conflict_type == ConflictType.LAB_UNBILLED:
        if conflict.related_stay_id:
            unbilled_labs = db.query(LabOrder).filter(
                LabOrder.stay_id == conflict.related_stay_id,
                LabOrder.billed == False
            ).all()
            for l in unbilled_labs:
                l.billed = True
            act_desc = f"{user.full_name} ({user.role.value.upper()}) attached unbilled lab orders to patient account (Resolved CF-{conflict.id})"

    elif conflict.conflict_type == ConflictType.DISCHARGE_BILLING_MISMATCH:
        if conflict.related_stay_id:
            stay = db.query(PatientStay).filter(PatientStay.id == conflict.related_stay_id).first()
            if stay and stay.status == StayStatus.ACTIVE:
                stay.status = StayStatus.DISCHARGED
                stay.actual_discharge_at = datetime.now(timezone.utc)
                if stay.bed:
                    stay.bed.current_status = BedStatus.CLEANING_PENDING
                    stay.bed.last_updated_by = user.id
                act_desc = f"{user.full_name} ({user.role.value.upper()}) recorded ADT discharge for stay #{stay.id} (Resolved CF-{conflict.id})"

    db.commit()
    db.refresh(conflict)

    await log_activity(
        db=db,
        hospital_id=user.hospital_id,
        user_id=user.id,
        action_description=act_desc,
        department=None
    )

    await ws_manager.broadcast_change(
        table="ConflictLog",
        action="update",
        id=conflict.id,
        hospital_id=conflict.hospital_id,
        department=None,
        details={
            "conflict_id": conflict.id,
            "status": "resolved",
            "resolved_by_name": user.full_name
        }
    )

    return conflict

def calculate_conflict_revenue_risk(conflict: ConflictLog, db: Session) -> float:
    """
    Calculates dynamic revenue at risk for real cross-department conflicts:
    - CF-3 (Occupied Bed without Billing): Bed price per day * days till expected discharge.
    - CF-2 (Unbilled Lab): Rs.2,500 unbilled diagnostic lab fee.
    - CF-4 (Housekeeping Delay): Bed price per day (daily bed turnover loss).
    - CF-5 (Discharge / Billing Mismatch): Bed price per day * 1.
    """
    bed = conflict.bed
    if not bed and conflict.related_bed_id:
        bed = db.query(Bed).filter(Bed.id == conflict.related_bed_id).first()

    bed_price = bed.price_per_day if bed else 20000.0

    if conflict.conflict_type == ConflictType.OCCUPIED_NO_BILLING:
        stay = conflict.stay
        if not stay and conflict.related_stay_id:
            stay = db.query(PatientStay).filter(PatientStay.id == conflict.related_stay_id).first()
        days = 1
        if stay and stay.expected_discharge_at and conflict.detected_at:
            det_at = conflict.detected_at.replace(tzinfo=None) if conflict.detected_at.tzinfo else conflict.detected_at
            exp_at = stay.expected_discharge_at.replace(tzinfo=None) if stay.expected_discharge_at.tzinfo else stay.expected_discharge_at
            delta_seconds = (exp_at - det_at).total_seconds()
            days = max(1, math.ceil(delta_seconds / 86400.0))
        return float(bed_price * days)

    elif conflict.conflict_type == ConflictType.LAB_UNBILLED:
        return 2500.0

    elif conflict.conflict_type == ConflictType.HOUSEKEEPING_DELAY:
        return float(bed_price * 1.0)

    elif conflict.conflict_type == ConflictType.DISCHARGE_BILLING_MISMATCH:
        return float(bed_price * 1.0)

    elif conflict.conflict_type in [ConflictType.BED_STATUS_MISMATCH, ConflictType.DISCHARGE_BED_MISMATCH]:
        return float(bed_price * 1.0)

    return float(bed_price if bed_price > 0 else 10000.0)
