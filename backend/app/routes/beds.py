from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.bed import Bed, BedStatus
from app.schemas.bed import BedResponse, BedStatusUpdate, BedCreate
from app.services.websocket_manager import ws_manager
from app.services.activity_service import log_activity

router = APIRouter(prefix="/beds", tags=["Beds"])

@router.get("", response_model=List[BedResponse])
def get_beds(
    department: Optional[str] = None,
    ward: Optional[str] = None,
    current_status: Optional[BedStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Bed).filter(Bed.hospital_id == current_user.hospital_id)
    
    # If staff/HOD and department param is passed, or role-based filtering
    if department:
        query = query.filter(Bed.department.ilike(f"%{department.strip()}%"))
    if ward:
        query = query.filter(Bed.ward.ilike(f"%{ward.strip()}%"))
    if current_status:
        query = query.filter(Bed.current_status == current_status)
        
    beds = query.order_by(Bed.department, Bed.ward, Bed.id).all()
    
    result = []
    for b in beds:
        item = BedResponse(
            id=b.id,
            hospital_id=b.hospital_id,
            ward=b.ward,
            department=b.department,
            room_type=b.room_type,
            price_per_day=b.price_per_day,
            current_status=b.current_status,
            last_updated_by=b.last_updated_by,
            last_updated_at=b.last_updated_at,
            updater_name=b.updater.full_name if b.updater else None
        )
        result.append(item)
    return result

@router.get("/{bed_id}", response_model=BedResponse)
def get_bed(
    bed_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bed = db.query(Bed).filter(Bed.id == bed_id, Bed.hospital_id == current_user.hospital_id).first()
    if not bed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bed not found")
        
    return BedResponse(
        id=bed.id,
        hospital_id=bed.hospital_id,
        ward=bed.ward,
        department=bed.department,
        room_type=bed.room_type,
        price_per_day=bed.price_per_day,
        current_status=bed.current_status,
        last_updated_by=bed.last_updated_by,
        last_updated_at=bed.last_updated_at,
        updater_name=bed.updater.full_name if bed.updater else None
    )

@router.patch("/{bed_id}/status", response_model=BedResponse)
async def update_bed_status(
    bed_id: int,
    payload: BedStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bed = db.query(Bed).filter(Bed.id == bed_id, Bed.hospital_id == current_user.hospital_id).first()
    if not bed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bed not found")

    old_status = bed.current_status.value
    new_status = payload.current_status.value

    # Update bed
    bed.current_status = payload.current_status
    bed.last_updated_by = current_user.id
    bed.last_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(bed)

    # Log activity
    action_desc = f"{current_user.full_name} ({current_user.role.value.upper()}) changed Bed #{bed.id} ({bed.ward} - {bed.department}) status from '{old_status}' to '{new_status}'"
    await log_activity(
        db=db,
        hospital_id=bed.hospital_id,
        user_id=current_user.id,
        action_description=action_desc,
        department=bed.department
    )

    # Broadcast WebSocket notification
    await ws_manager.broadcast_change(
        table="Bed",
        action="update",
        id=bed.id,
        hospital_id=bed.hospital_id,
        department=bed.department,
        details={
            "bed_id": bed.id,
            "old_status": old_status,
            "new_status": new_status,
            "department": bed.department,
            "ward": bed.ward
        }
    )

    return BedResponse(
        id=bed.id,
        hospital_id=bed.hospital_id,
        ward=bed.ward,
        department=bed.department,
        room_type=bed.room_type,
        price_per_day=bed.price_per_day,
        current_status=bed.current_status,
        last_updated_by=bed.last_updated_by,
        last_updated_at=bed.last_updated_at,
        updater_name=current_user.full_name
    )
