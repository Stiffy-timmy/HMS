import os
import sys
import asyncio
from datetime import datetime, timezone, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.seed.seed_data import seed_database
from app.models.user import User
from app.models.bed import Bed, BedStatus
from app.models.patient_stay import PatientStay, StayStatus
from app.models.billing import Billing, BillingStatus
from app.models.lab_order import LabOrder, LabStatus
from app.models.conflict import ConflictLog, ConflictType, ConflictStatus
from app.services.conflict_service import (
    check_cf3_occupied_no_billing,
    check_cf2_lab_unbilled,
    check_cf4_housekeeping_delay,
    check_cf5_discharge_billing_mismatch,
    resolve_conflict_manually
)
from app.schemas.patient_stay import QuickAdmitRequest
from app.routes.stays import quick_admit_patient, discharge_patient
from app.routes.beds import update_bed_status, mark_bed_clean
from app.routes.billing import update_billing_status
from app.routes.labs import update_lab_order_status, mark_lab_order_billed
from app.schemas.bed import BedStatusUpdate
from app.schemas.billing import BillingStatusUpdate
from app.schemas.lab_order import LabOrderUpdateStatus
from fastapi import HTTPException

async def run_tests():
    print("=" * 70)
    print("RUNNING PREVENT-VS-DETECT COMPREHENSIVE AUTOMATED VERIFICATION SUITE")
    print("=" * 70)

    # 1. Reset and reseed database
    print("\n[Step 1] Seeding fresh test database...")
    seed_database()
    db = SessionLocal()

    try:
        admin_user = db.query(User).filter(User.email == "admin@medicover.com").first()
        staff_user = db.query(User).filter(User.email == "staff.cardio1@medicover.com").first()
        hk_user = db.query(User).filter(User.email == "staff.housekeeping@medicover.com").first()

        assert admin_user is not None, "Admin user missing"
        assert staff_user is not None, "Staff user missing"
        assert hk_user is not None, "Housekeeping user missing"
        print("  [PASS] Authenticated entities verified: Admin, Staff, Housekeeping Lead")

        # 2. Test Step 2: Atomic Quick Admit
        print("\n[Step 2] Testing Atomic Quick Admit...")
        # Find an available Cardiology bed
        avail_bed = db.query(Bed).filter(
            Bed.department == "Cardiology",
            Bed.current_status == BedStatus.AVAILABLE
        ).first()
        assert avail_bed is not None, "No available bed found in seed"
        target_bed_id = avail_bed.id

        admit_payload = QuickAdmitRequest(
            patient_name="Rajesh Tester",
            patient_ref_id="PT-TEST-001",
            bed_id=target_bed_id,
            admitted_at=datetime.now(timezone.utc),
            expected_discharge_at=datetime.now(timezone.utc) + timedelta(days=3)
        )

        stay_res = await quick_admit_patient(payload=admit_payload, db=db, current_user=staff_user)
        stay_id = stay_res.id

        # Verify bed is occupied
        db.refresh(avail_bed)
        assert avail_bed.current_status == BedStatus.OCCUPIED, f"Bed {target_bed_id} should be OCCUPIED, got {avail_bed.current_status}"
        print(f"  [PASS] Bed #{target_bed_id} atomically set to OCCUPIED on Quick Admit")

        # Verify billing is NOT_STARTED
        billing_record = db.query(Billing).filter(Billing.stay_id == stay_id).first()
        assert billing_record is not None, "Billing record was not created"
        assert billing_record.status == BillingStatus.NOT_STARTED, f"Billing should be NOT_STARTED, got {billing_record.status}"
        print(f"  [PASS] Billing record #{billing_record.id} created with status NOT_STARTED")

        # Verify CF-3 (occupied_no_billing) was detected
        cf3 = db.query(ConflictLog).filter(
            ConflictLog.related_stay_id == stay_id,
            ConflictLog.conflict_type == ConflictType.OCCUPIED_NO_BILLING,
            ConflictLog.status == ConflictStatus.OPEN
        ).first()
        assert cf3 is not None, "CF-3 conflict was not created for occupied bed with unstarted billing"
        print(f"  [PASS] Genuine cross-department conflict CF-3 detected (Conflict ID: {cf3.id})")

        # Test double admit prevention
        print("\n[Step 2b] Verifying double admission prevention on occupied bed...")
        try:
            duplicate_payload = QuickAdmitRequest(
                patient_name="Double Booking",
                patient_ref_id="PT-TEST-DUP",
                bed_id=target_bed_id
            )
            await quick_admit_patient(payload=duplicate_payload, db=db, current_user=staff_user)
            assert False, "Should have failed with HTTP 400"
        except HTTPException as e:
            assert e.status_code == 400
            print(f"  [PASS] Double admit blocked structurally with 400: {e.detail}")

        # 3. Test Step 3: Bed Manual Status Lock
        print("\n[Step 3] Verifying Bed Manual Status Locks...")
        # Attempt to toggle occupied bed
        try:
            await update_bed_status(
                bed_id=target_bed_id,
                payload=BedStatusUpdate(current_status=BedStatus.AVAILABLE),
                db=db,
                current_user=staff_user
            )
            assert False, "Should have failed to toggle occupied bed manually"
        except HTTPException as e:
            assert e.status_code == 400
            print(f"  [PASS] Manual toggle on occupied bed blocked structurally: {e.detail}")

        # Attempt to manually set an empty bed to occupied
        empty_bed = db.query(Bed).filter(
            Bed.department == "Cardiology",
            Bed.current_status == BedStatus.AVAILABLE
        ).first()
        if empty_bed:
            try:
                await update_bed_status(
                    bed_id=empty_bed.id,
                    payload=BedStatusUpdate(current_status=BedStatus.OCCUPIED),
                    db=db,
                    current_user=staff_user
                )
                assert False, "Should have failed to manually set bed to occupied"
            except HTTPException as e:
                assert e.status_code == 400
                print(f"  [PASS] Manual set to occupied blocked structurally: {e.detail}")

        # 4. Test Step 4: Billing Activation & Auto-resolve CF-3
        print("\n[Step 4] Testing Billing Activation & CF-3 Auto-Resolution...")
        await update_billing_status(
            billing_id=billing_record.id,
            payload=BillingStatusUpdate(status=BillingStatus.ACTIVE),
            db=db,
            current_user=admin_user
        )
        db.refresh(cf3)
        assert cf3.status == ConflictStatus.RESOLVED, f"CF-3 should be RESOLVED, got {cf3.status}"
        print(f"  [PASS] CF-3 automatically resolved upon Billing activation (Status: {cf3.status.value})")

        # 5. Test Step 5: Lab Completion & CF-2 Detection / Auto-Resolution
        print("\n[Step 5] Testing Lab Completion & CF-2 Detection/Resolution...")
        # Create a lab order for this stay
        lab = LabOrder(
            hospital_id=admin_user.hospital_id,
            stay_id=stay_id,
            test_name="Serum Electrolytes",
            status=LabStatus.PENDING,
            billed=False,
            ordered_at=datetime.now(timezone.utc)
        )

        db.add(lab)
        db.commit()
        db.refresh(lab)

        # Complete the lab
        await update_lab_order_status(
            lab_id=lab.id,
            payload=LabOrderUpdateStatus(status=LabStatus.COMPLETED),
            db=db,
            current_user=staff_user
        )

        # Verify CF-2 (lab_unbilled) detected
        cf2 = db.query(ConflictLog).filter(
            ConflictLog.related_stay_id == stay_id,
            ConflictLog.conflict_type == ConflictType.LAB_UNBILLED,
            ConflictLog.status == ConflictStatus.OPEN
        ).first()
        assert cf2 is not None, "CF-2 conflict was not created for unbilled completed lab"
        print(f"  [PASS] Genuine CF-2 conflict detected upon lab completion (Conflict ID: {cf2.id})")

        # Post lab charge to bill
        await mark_lab_order_billed(lab_id=lab.id, db=db, current_user=admin_user)
        db.refresh(cf2)
        assert cf2.status == ConflictStatus.RESOLVED, f"CF-2 should be RESOLVED, got {cf2.status}"
        print(f"  [PASS] CF-2 automatically resolved upon posting lab bill (Status: {cf2.status.value})")

        # 6. Test Step 6: Patient Discharge -> cleaning_pending & CF-4 Detection
        print("\n[Step 6] Testing Patient Discharge & CF-4 Housekeeping Delay Detection...")
        await discharge_patient(stay_id=stay_id, db=db, current_user=staff_user)

        stay_obj = db.query(PatientStay).filter(PatientStay.id == stay_id).first()
        assert stay_obj.status == StayStatus.DISCHARGED, f"Stay should be DISCHARGED, got {stay_obj.status}"
        db.refresh(avail_bed)
        assert avail_bed.current_status == BedStatus.CLEANING_PENDING, f"Bed should be CLEANING_PENDING, got {avail_bed.current_status}"
        print(f"  [PASS] Stay #{stay_id} discharged and Bed #{target_bed_id} transitioned to CLEANING_PENDING")

        # Verify CF-4 conflict detected
        cf4 = db.query(ConflictLog).filter(
            ConflictLog.related_bed_id == target_bed_id,
            ConflictLog.conflict_type == ConflictType.HOUSEKEEPING_DELAY,
            ConflictLog.status == ConflictStatus.OPEN
        ).first()
        assert cf4 is not None, "CF-4 conflict was not created for cleaning_pending bed"
        print(f"  [PASS] Genuine CF-4 conflict detected for cleaning pending bed (Conflict ID: {cf4.id})")

        # Verify Quick Admit cannot assign cleaning_pending bed
        try:
            admit_hk_payload = QuickAdmitRequest(
                patient_name="Cannot Admit",
                patient_ref_id="PT-FAIL-01",
                bed_id=target_bed_id
            )
            await quick_admit_patient(payload=admit_hk_payload, db=db, current_user=staff_user)
            assert False, "Should have failed to admit into cleaning_pending bed"
        except HTTPException as e:
            assert e.status_code == 400
            print(f"  [PASS] Quick admit into cleaning_pending bed blocked with 400: {e.detail}")

        # 7. Test Step 7: Housekeeping Mark Clean & CF-4 Auto-Resolution
        print("\n[Step 7] Testing Housekeeping Mark Clean Action & CF-4 Auto-Resolution...")
        await mark_bed_clean(bed_id=target_bed_id, db=db, current_user=hk_user)

        db.refresh(avail_bed)
        assert avail_bed.current_status == BedStatus.AVAILABLE, f"Bed should be AVAILABLE, got {avail_bed.current_status}"
        db.refresh(cf4)
        assert cf4.status == ConflictStatus.RESOLVED, f"CF-4 should be RESOLVED, got {cf4.status}"
        print(f"  [PASS] Bed #{target_bed_id} marked AVAILABLE and CF-4 automatically resolved (Status: {cf4.status.value})")

        # Now bed can be assigned again!
        new_stay = await quick_admit_patient(
            payload=QuickAdmitRequest(
                patient_name="Subsequent Patient",
                patient_ref_id="PT-SUCCESS-02",
                bed_id=target_bed_id
            ),
            db=db,
            current_user=staff_user
        )
        assert new_stay.id is not None
        print(f"  [PASS] Sanitized Bed #{target_bed_id} successfully assigned to new admission #{new_stay.id}")

        # 8. Test Step 8: CF-5 Early Billing Closure Detection & Resolution
        print("\n[Step 8] Testing CF-5 (Discharge / Billing Timing Mismatch)...")
        # Activate then Close billing while stay is still active
        new_billing = db.query(Billing).filter(Billing.stay_id == new_stay.id).first()
        await update_billing_status(
            billing_id=new_billing.id,
            payload=BillingStatusUpdate(status=BillingStatus.CLOSED),
            db=db,
            current_user=admin_user
        )

        cf5 = db.query(ConflictLog).filter(
            ConflictLog.related_stay_id == new_stay.id,
            ConflictLog.conflict_type == ConflictType.DISCHARGE_BILLING_MISMATCH,
            ConflictLog.status == ConflictStatus.OPEN
        ).first()
        assert cf5 is not None, "CF-5 should be detected when billing is closed before discharge"
        print(f"  [PASS] Genuine CF-5 conflict detected when billing closed before discharge (Conflict ID: {cf5.id})")

        # Discharging the patient resolves CF-5
        await discharge_patient(stay_id=new_stay.id, db=db, current_user=staff_user)
        db.refresh(cf5)
        assert cf5.status == ConflictStatus.RESOLVED, f"CF-5 should be RESOLVED, got {cf5.status}"
        print(f"  [PASS] CF-5 automatically resolved upon ADT discharge (Status: {cf5.status.value})")

        print("\n" + "=" * 70)
        print("ALL 8 PREVENT-VS-DETECT LIFECYCLE TESTS PASSED 100% SUCCESSFULLY!")
        print("=" * 70)

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
