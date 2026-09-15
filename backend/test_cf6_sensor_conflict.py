import asyncio
import os
import sys
from datetime import datetime, timezone
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.bed import Bed, BedStatus, RoomType
from app.models.hospital import Hospital
from app.models.conflict import ConflictLog, ConflictType, ConflictStatus
from app.models.sensor import SensorReading, SensorType
from app.schemas.sensor import SensorReadingCreate
from app.schemas.conflict import ConflictResolveRequest
from app.routes.sensors import record_sensor_reading, get_sensor_readings
from app.routes.conflicts import resolve_conflict_endpoint, get_conflicts
from app.services.conflict_service import check_cf6_sensor_presence_mismatch, resolve_conflict_manually

async def test_cf6_sensor_pipeline_and_resolution():
    db: Session = SessionLocal()
    try:
        # 1. Setup test hospital and admin user
        hospital = db.query(Hospital).first()
        if not hospital:
            hospital = Hospital(
                name="Medicover Test Center",
                branch_code="MC-TST",
                city="Hyderabad",
                address="HiTech City",
                state="Telangana"
            )
            db.add(hospital)
            db.commit()
            db.refresh(hospital)

        admin = db.query(User).filter(User.hospital_id == hospital.id, User.role == UserRole.ADMIN).first()
        if not admin:
            admin = User(
                hospital_id=hospital.id,
                email="test_admin@medicover.com",
                password_hash="fakehash",
                full_name="Dr. Test Admin",
                role=UserRole.ADMIN
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # 2. Create a clean test available bed
        test_bed = Bed(
            hospital_id=hospital.id,
            ward="ICU Ward CF6",
            department="Cardiology",
            room_type=RoomType.ICU,
            price_per_day=25000.0,
            current_status=BedStatus.AVAILABLE
        )
        db.add(test_bed)
        db.commit()
        db.refresh(test_bed)

        print(f"\n[TEST 1] Created available bed #{test_bed.id} in {test_bed.ward}")

        # 3. Simulate Pressure Signal (Physical Presence Detected: 18.5 kPa)
        reading_payload = SensorReadingCreate(
            bed_id=test_bed.id,
            sensor_type=SensorType.PRESSURE,
            value=18.5,
            unit="kPa"
        )
        reading_resp = await record_sensor_reading(payload=reading_payload, db=db, current_user=admin)
        assert reading_resp.threshold_breached == True
        assert reading_resp.value == 18.5
        print(f"[TEST 2] Sensor reading logged: {reading_resp.value}{reading_resp.unit} (threshold_breached={reading_resp.threshold_breached})")

        # 4. Verify CF-6 conflict is created
        conflict = db.query(ConflictLog).filter(
            ConflictLog.hospital_id == hospital.id,
            ConflictLog.related_bed_id == test_bed.id,
            ConflictLog.conflict_type == ConflictType.SENSOR_PRESENCE_MISMATCH,
            ConflictLog.status == ConflictStatus.OPEN
        ).first()

        assert conflict is not None, "CF-6 conflict should be generated when available bed has breached sensor load"
        assert "physical occupancy suspected" in conflict.description.lower()
        print(f"[TEST 3] CF-6 Conflict created successfully: CF-{conflict.id} ({conflict.description})")

        # 5. Test Auto-Resolution when bed clears (load drops below threshold, e.g. 0.2 kPa)
        clear_payload = SensorReadingCreate(
            bed_id=test_bed.id,
            sensor_type=SensorType.PRESSURE,
            value=0.2,
            unit="kPa"
        )
        clear_resp = await record_sensor_reading(payload=clear_payload, db=db, current_user=admin)
        assert clear_resp.threshold_breached == False

        # Verify conflict is now auto-resolved
        db.refresh(conflict)
        assert conflict.status == ConflictStatus.RESOLVED, f"Conflict should be auto-resolved, got {conflict.status}"
        print(f"[TEST 4] CF-6 Conflict auto-resolved upon normal sensor signal (status={conflict.status.value})")

        # 6. Test Manual Resolution: 'confirmed_occupied'
        # Re-trigger pressure signal
        await record_sensor_reading(payload=reading_payload, db=db, current_user=admin)
        new_conflict = db.query(ConflictLog).filter(
            ConflictLog.hospital_id == hospital.id,
            ConflictLog.related_bed_id == test_bed.id,
            ConflictLog.conflict_type == ConflictType.SENSOR_PRESENCE_MISMATCH,
            ConflictLog.status == ConflictStatus.OPEN
        ).first()
        assert new_conflict is not None

        # Resolve with 'confirmed_occupied'
        resolve_req = ConflictResolveRequest(
            resolution_action="confirmed_occupied",
            resolution_notes="Dispatched physical nurse check. Confirmed inpatient admitted in bed."
        )
        resolved_resp = await resolve_conflict_endpoint(
            conflict_id=new_conflict.id,
            payload=resolve_req,
            db=db,
            current_user=admin
        )
        assert resolved_resp.status == ConflictStatus.RESOLVED

        db.refresh(test_bed)
        assert test_bed.current_status == BedStatus.OCCUPIED, f"Bed status should be OCCUPIED, got {test_bed.current_status}"
        print(f"[TEST 5] Manual resolve 'confirmed_occupied' set bed #{test_bed.id} to OCCUPIED and resolved CF-{new_conflict.id}")

        # 7. Reset bed to AVAILABLE and test Manual Resolution: 'false_alarm'
        test_bed.current_status = BedStatus.AVAILABLE
        db.commit()

        await record_sensor_reading(payload=reading_payload, db=db, current_user=admin)
        new_conflict2 = db.query(ConflictLog).filter(
            ConflictLog.hospital_id == hospital.id,
            ConflictLog.related_bed_id == test_bed.id,
            ConflictLog.conflict_type == ConflictType.SENSOR_PRESENCE_MISMATCH,
            ConflictLog.status == ConflictStatus.OPEN
        ).first()
        assert new_conflict2 is not None

        resolve_req_fa = ConflictResolveRequest(
            resolution_action="false_alarm",
            resolution_notes="Physical check performed. Heavy equipment was placed on mattress, bed is empty."
        )
        resolved_resp2 = await resolve_conflict_endpoint(
            conflict_id=new_conflict2.id,
            payload=resolve_req_fa,
            db=db,
            current_user=admin
        )
        assert resolved_resp2.status == ConflictStatus.RESOLVED

        db.refresh(test_bed)
        assert test_bed.current_status == BedStatus.AVAILABLE, f"Bed status should remain AVAILABLE on false alarm, got {test_bed.current_status}"
        print(f"[TEST 6] Manual resolve 'false_alarm' kept bed #{test_bed.id} as AVAILABLE and resolved CF-{new_conflict2.id}")

        # 8. Test Bed Status transition: Bed marked clean while breached reading exists triggers CF-6
        test_bed.current_status = BedStatus.CLEANING_PENDING
        db.commit()
        # Log breached sensor reading
        await record_sensor_reading(payload=reading_payload, db=db, current_user=admin)
        from app.routes.beds import mark_bed_clean
        await mark_bed_clean(bed_id=test_bed.id, db=db, current_user=admin)
        db.refresh(test_bed)
        assert test_bed.current_status == BedStatus.AVAILABLE

        new_conflict3 = db.query(ConflictLog).filter(
            ConflictLog.hospital_id == hospital.id,
            ConflictLog.related_bed_id == test_bed.id,
            ConflictLog.conflict_type == ConflictType.SENSOR_PRESENCE_MISMATCH,
            ConflictLog.status == ConflictStatus.OPEN
        ).first()
        assert new_conflict3 is not None
        print(f"[TEST 7] Bed marked clean with active pressure load successfully triggered CF-{new_conflict3.id}")

        # Cleanup test bed
        db.delete(test_bed)
        db.commit()
        print("\nAll CF-6 Sensor Conflict & Resolution tests passed 100%!")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_cf6_sensor_pipeline_and_resolution())
