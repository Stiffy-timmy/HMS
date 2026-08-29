from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.equipment import MedicalEquipment, EquipmentStatus
from app.schemas.equipment import EquipmentCreate, EquipmentStatusUpdate, EquipmentResponse
from app.services.activity_service import log_activity
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/equipments", tags=["Medical Equipments"])

@router.get("", response_model=List[EquipmentResponse])
def get_equipments(
    department: Optional[str] = None,
    status: Optional[EquipmentStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MedicalEquipment).filter(MedicalEquipment.hospital_id == current_user.hospital_id)
    if department:
        query = query.filter(MedicalEquipment.department.ilike(f"%{department.strip()}%"))
    if status:
        query = query.filter(MedicalEquipment.status == status)

    equipments = query.order_by(MedicalEquipment.department, MedicalEquipment.equipment_name).all()
    result = []
    for eq in equipments:
        result.append(EquipmentResponse(
            id=eq.id,
            hospital_id=eq.hospital_id,
            equipment_name=eq.equipment_name,
            asset_tag=eq.asset_tag,
            category=eq.category,
            department=eq.department,
            location_room=eq.location_room,
            status=eq.status,
            last_inspected_at=eq.last_inspected_at,
            last_inspected_by_id=eq.last_inspected_by_id,
            last_inspected_by_name=eq.last_inspected_by.full_name if eq.last_inspected_by else None,
            maintenance_notes=eq.maintenance_notes,
            created_at=eq.created_at
        ))
    return result

@router.post("", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_equipment(
    payload: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(MedicalEquipment).filter(
        MedicalEquipment.hospital_id == current_user.hospital_id,
        MedicalEquipment.asset_tag == payload.asset_tag.strip().upper()
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Equipment with asset tag '{payload.asset_tag}' already exists."
        )

    eq = MedicalEquipment(
        hospital_id=current_user.hospital_id,
        equipment_name=payload.equipment_name.strip(),
        asset_tag=payload.asset_tag.strip().upper(),
        category=payload.category.strip() if payload.category else None,
        department=payload.department.strip(),
        location_room=payload.location_room.strip(),
        status=payload.status,
        last_inspected_at=datetime.now(timezone.utc),
        last_inspected_by_id=current_user.id,
        maintenance_notes=payload.maintenance_notes.strip() if payload.maintenance_notes else None,
        created_at=datetime.now(timezone.utc)
    )
    db.add(eq)
    db.commit()
    db.refresh(eq)

    user_role_label = current_user.role.value.upper()
    act_desc = f"{current_user.full_name} ({user_role_label}) registered new equipment '{eq.equipment_name}' [Tag: {eq.asset_tag}] in {eq.department} ({eq.location_room})"
    await log_activity(
        db=db,
        hospital_id=current_user.hospital_id,
        user_id=current_user.id,
        action_description=act_desc,
        department=eq.department
    )

    await ws_manager.broadcast_change(
        table="MedicalEquipment",
        action="create",
        id=eq.id,
        hospital_id=current_user.hospital_id,
        department=eq.department,
        details={
            "equipment_id": eq.id,
            "equipment_name": eq.equipment_name,
            "asset_tag": eq.asset_tag,
            "status": eq.status.value,
            "department": eq.department,
            "location_room": eq.location_room
        }
    )

    return EquipmentResponse(
        id=eq.id,
        hospital_id=eq.hospital_id,
        equipment_name=eq.equipment_name,
        asset_tag=eq.asset_tag,
        category=eq.category,
        department=eq.department,
        location_room=eq.location_room,
        status=eq.status,
        last_inspected_at=eq.last_inspected_at,
        last_inspected_by_id=eq.last_inspected_by_id,
        last_inspected_by_name=current_user.full_name,
        maintenance_notes=eq.maintenance_notes,
        created_at=eq.created_at
    )

@router.patch("/{eq_id}/status", response_model=EquipmentResponse)
async def update_equipment_status(
    eq_id: int,
    payload: EquipmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    eq = db.query(MedicalEquipment).filter(
        MedicalEquipment.id == eq_id,
        MedicalEquipment.hospital_id == current_user.hospital_id
    ).first()
    if not eq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical equipment not found")

    old_status = eq.status.value
    eq.status = payload.status
    if payload.maintenance_notes is not None:
        eq.maintenance_notes = payload.maintenance_notes.strip()
    if payload.location_room:
        eq.location_room = payload.location_room.strip()
    eq.last_inspected_at = datetime.now(timezone.utc)
    eq.last_inspected_by_id = current_user.id

    db.commit()
    db.refresh(eq)

    status_tag = payload.status.value.replace("_", " ").title()
    user_role_label = current_user.role.value.upper()
    act_desc = f"{current_user.full_name} ({user_role_label}) updated Biomedical Equipment '{eq.equipment_name}' [{eq.asset_tag}] status from '{old_status}' to '{status_tag}' in {eq.department} ({eq.location_room})"
    await log_activity(
        db=db,
        hospital_id=current_user.hospital_id,
        user_id=current_user.id,
        action_description=act_desc,
        department=eq.department
    )

    await ws_manager.broadcast_change(
        table="MedicalEquipment",
        action="update",
        id=eq.id,
        hospital_id=current_user.hospital_id,
        department=eq.department,
        details={
            "equipment_id": eq.id,
            "equipment_name": eq.equipment_name,
            "asset_tag": eq.asset_tag,
            "old_status": old_status,
            "new_status": eq.status.value,
            "department": eq.department,
            "location_room": eq.location_room,
            "technician_name": current_user.full_name,
            "maintenance_notes": eq.maintenance_notes
        }
    )

    return EquipmentResponse(
        id=eq.id,
        hospital_id=eq.hospital_id,
        equipment_name=eq.equipment_name,
        asset_tag=eq.asset_tag,
        category=eq.category,
        department=eq.department,
        location_room=eq.location_room,
        status=eq.status,
        last_inspected_at=eq.last_inspected_at,
        last_inspected_by_id=eq.last_inspected_by_id,
        last_inspected_by_name=current_user.full_name,
        maintenance_notes=eq.maintenance_notes,
        created_at=eq.created_at
    )
