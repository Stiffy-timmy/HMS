from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.bed import Bed
from app.models.sensor import SensorReading, SensorType
from app.schemas.sensor import SensorReadingCreate, SensorReadingResponse
from app.services.conflict_service import check_cf6_sensor_presence_mismatch
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/sensors", tags=["Sensors"])

# Configurable occupancy threshold for pressure sensors in kPa
PRESSURE_OCCUPANCY_THRESHOLD_KPA = 5.0

@router.post("/reading", response_model=SensorReadingResponse, status_code=status.HTTP_201_CREATED)
async def record_sensor_reading(
    payload: SensorReadingCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Ingests an IoT sensor telemetry reading from a hardware device or simulator.
    Computes threshold breach on write and triggers CF-6 conflict detection immediately.
    """
    bed = db.query(Bed).filter(Bed.id == payload.bed_id).first()
    if not bed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bed #{payload.bed_id} not found."
        )

    hospital_id = bed.hospital_id

    # Resolve sensor value from value or pressure_value_kpa
    sensor_val = payload.value
    if sensor_val is None and payload.pressure_value_kpa is not None:
        sensor_val = payload.pressure_value_kpa
    if sensor_val is None:
        sensor_val = 0.0

    # Compute threshold breach at write time
    if payload.threshold_breached is not None:
        is_breached = payload.threshold_breached
    elif payload.sensor_type == SensorType.PRESSURE:
        is_breached = sensor_val >= PRESSURE_OCCUPANCY_THRESHOLD_KPA
    else:
        is_breached = False

    reading = SensorReading(
        hospital_id=hospital_id,
        bed_id=bed.id,
        sensor_type=payload.sensor_type,
        value=round(float(sensor_val), 2),
        unit=payload.unit or "kPa",
        threshold_breached=is_breached,
        recorded_at=datetime.now(timezone.utc)
    )

    db.add(reading)
    db.commit()
    db.refresh(reading)

    # Trigger CF-6 conflict checker immediately on write (hardware matters)
    trigger_user_id = current_user.id if current_user else None
    await check_cf6_sensor_presence_mismatch(
        db=db,
        hospital_id=hospital_id,
        bed_id=bed.id,
        trigger_user_id=trigger_user_id
    )

    # Broadcast real-time sensor telemetry update
    await ws_manager.broadcast_change(
        table="SensorReading",
        action="create",
        id=reading.id,
        hospital_id=hospital_id,
        department=bed.department,
        details={
            "reading_id": reading.id,
            "bed_id": reading.bed_id,
            "sensor_type": reading.sensor_type.value,
            "value": reading.value,
            "unit": reading.unit,
            "threshold_breached": reading.threshold_breached,
            "recorded_at": reading.recorded_at.isoformat()
        }
    )

    return reading

@router.get("/readings", response_model=List[SensorReadingResponse])
def get_sensor_readings(
    bed_id: Optional[int] = None,
    sensor_type: Optional[SensorType] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Retrieves recent sensor telemetry readings for a bed or hospital.
    """
    query = db.query(SensorReading)
    if current_user and current_user.hospital_id:
        query = query.filter(SensorReading.hospital_id == current_user.hospital_id)

    if bed_id:
        query = query.filter(SensorReading.bed_id == bed_id)
    if sensor_type:
        query = query.filter(SensorReading.sensor_type == sensor_type)

    readings = query.order_by(SensorReading.recorded_at.desc()).limit(limit).all()
    return readings

