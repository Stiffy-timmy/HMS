from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.requisition import RequisitionOrder, RequisitionType, RequisitionStatus, RequisitionUrgency
from app.schemas.requisition import RequisitionCreate, RequisitionStatusUpdate, RequisitionResponse
from app.services.activity_service import log_activity
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/requisitions", tags=["Supply Requisitions"])

@router.get("", response_model=List[RequisitionResponse])
def get_requisitions(
    status: Optional[RequisitionStatus] = None,
    item_type: Optional[RequisitionType] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(RequisitionOrder).filter(RequisitionOrder.hospital_id == current_user.hospital_id)
    if status:
        query = query.filter(RequisitionOrder.status == status)
    if item_type:
        query = query.filter(RequisitionOrder.item_type == item_type)
    if department:
        query = query.filter(RequisitionOrder.department.ilike(f"%{department.strip()}%"))

    orders = query.order_by(RequisitionOrder.created_at.desc()).all()
    result = []
    for r in orders:
        result.append(RequisitionResponse(
            id=r.id,
            hospital_id=r.hospital_id,
            requested_by_id=r.requested_by_id,
            requested_by_name=r.requested_by.full_name if r.requested_by else None,
            item_type=r.item_type,
            item_name=r.item_name,
            category=r.category,
            quantity=r.quantity,
            unit=r.unit,
            urgency=r.urgency,
            department=r.department,
            estimated_cost=r.estimated_cost,
            reason=r.reason,
            status=r.status,
            admin_notes=r.admin_notes,
            reviewed_by_id=r.reviewed_by_id,
            reviewed_by_name=r.reviewed_by.full_name if r.reviewed_by else None,
            reviewed_at=r.reviewed_at,
            created_at=r.created_at
        ))
    return result

@router.post("", response_model=RequisitionResponse, status_code=status.HTTP_201_CREATED)
async def create_requisition(
    payload: RequisitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = RequisitionOrder(
        hospital_id=current_user.hospital_id,
        requested_by_id=current_user.id,
        item_type=payload.item_type,
        item_name=payload.item_name.strip(),
        category=payload.category.strip() if payload.category else None,
        quantity=payload.quantity,
        unit=payload.unit.strip(),
        urgency=payload.urgency,
        department=payload.department.strip(),
        estimated_cost=payload.estimated_cost,
        reason=payload.reason.strip() if payload.reason else None,
        status=RequisitionStatus.PENDING,
        created_at=datetime.now(timezone.utc)
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Activity Log
    user_role_label = current_user.role.value.upper()
    act_desc = f"{current_user.full_name} ({user_role_label}) requested {order.quantity} {order.unit} of '{order.item_name}' ({order.item_type.value.upper()}) for {order.department} [Urgency: {order.urgency.value.upper()}]"
    await log_activity(
        db=db,
        hospital_id=current_user.hospital_id,
        user_id=current_user.id,
        action_description=act_desc,
        department=order.department
    )

    # WebSocket Broadcast
    await ws_manager.broadcast_change(
        table="RequisitionOrder",
        action="create",
        id=order.id,
        hospital_id=current_user.hospital_id,
        department=order.department,
        details={
            "requisition_id": order.id,
            "item_name": order.item_name,
            "item_type": order.item_type.value,
            "quantity": order.quantity,
            "unit": order.unit,
            "urgency": order.urgency.value,
            "status": order.status.value,
            "department": order.department,
            "estimated_cost": order.estimated_cost,
            "requested_by_name": current_user.full_name
        }
    )

    return RequisitionResponse(
        id=order.id,
        hospital_id=order.hospital_id,
        requested_by_id=order.requested_by_id,
        requested_by_name=current_user.full_name,
        item_type=order.item_type,
        item_name=order.item_name,
        category=order.category,
        quantity=order.quantity,
        unit=order.unit,
        urgency=order.urgency,
        department=order.department,
        estimated_cost=order.estimated_cost,
        reason=order.reason,
        status=order.status,
        admin_notes=order.admin_notes,
        reviewed_by_id=order.reviewed_by_id,
        reviewed_by_name=None,
        reviewed_at=order.reviewed_at,
        created_at=order.created_at
    )

@router.patch("/{req_id}/status", response_model=RequisitionResponse)
async def update_requisition_status(
    req_id: int,
    payload: RequisitionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    order = db.query(RequisitionOrder).filter(
        RequisitionOrder.id == req_id,
        RequisitionOrder.hospital_id == current_user.hospital_id
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requisition order not found")

    old_status = order.status.value
    order.status = payload.status
    order.admin_notes = payload.admin_notes.strip() if payload.admin_notes else order.admin_notes
    order.reviewed_by_id = current_user.id
    order.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)

    # Activity Log
    status_label = payload.status.value.upper()
    act_desc = f"{current_user.full_name} (ADMIN) {status_label} requisition #{order.id} ('{order.item_name}', {order.quantity} {order.unit} for {order.department})"
    await log_activity(
        db=db,
        hospital_id=current_user.hospital_id,
        user_id=current_user.id,
        action_description=act_desc,
        department=order.department
    )

    # WebSocket Broadcast
    await ws_manager.broadcast_change(
        table="RequisitionOrder",
        action="update",
        id=order.id,
        hospital_id=current_user.hospital_id,
        department=order.department,
        details={
            "requisition_id": order.id,
            "item_name": order.item_name,
            "old_status": old_status,
            "new_status": order.status.value,
            "department": order.department,
            "reviewed_by_name": current_user.full_name,
            "admin_notes": order.admin_notes
        }
    )

    return RequisitionResponse(
        id=order.id,
        hospital_id=order.hospital_id,
        requested_by_id=order.requested_by_id,
        requested_by_name=order.requested_by.full_name if order.requested_by else None,
        item_type=order.item_type,
        item_name=order.item_name,
        category=order.category,
        quantity=order.quantity,
        unit=order.unit,
        urgency=order.urgency,
        department=order.department,
        estimated_cost=order.estimated_cost,
        reason=order.reason,
        status=order.status,
        admin_notes=order.admin_notes,
        reviewed_by_id=order.reviewed_by_id,
        reviewed_by_name=current_user.full_name,
        reviewed_at=order.reviewed_at,
        created_at=order.created_at
    )
