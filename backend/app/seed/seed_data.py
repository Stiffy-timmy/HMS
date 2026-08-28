from datetime import datetime, timezone, timedelta
from app.core.database import Base, SessionLocal, engine
from app.core.security import get_password_hash, hash_invite_code
from app.models.hospital import Hospital
from app.models.user import User, UserRole, RoleInviteCode
from app.models.bed import Bed, RoomType, BedStatus
from app.models.patient_stay import PatientStay, StayStatus
from app.models.billing import Billing, BillingStatus
from app.models.lab_order import LabOrder, LabStatus
from app.models.conflict import ConflictLog, ConflictType, ConflictStatus
from app.models.activity import ActivityLog

def seed_database():
    print("[INIT] Initializing Database and Seeding Data...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # 1. Seed Hospital
        hospital = Hospital(
            id=1,
            name="Medicover Super Specialty Hospital",
            address="Plot 12, Hitec City Main Rd, Cyberabad",
            state="Telangana",
            created_at=now - timedelta(days=90)
        )
        db.add(hospital)
        db.commit()
        db.refresh(hospital)
        print(f"[OK] Created Hospital: {hospital.name}")

        # 2. Seed Role Invite Codes
        invite_codes = [
            RoleInviteCode(hospital_id=hospital.id, role=UserRole.ADMIN, code="ADMIN-SECURE-2026", code_hash=hash_invite_code("ADMIN-SECURE-2026"), department=None, is_active=True),
            RoleInviteCode(hospital_id=hospital.id, role=UserRole.HOD, code="HOD-DEPT-2026", code_hash=hash_invite_code("HOD-DEPT-2026"), department="Cardiology", is_active=True),
            RoleInviteCode(hospital_id=hospital.id, role=UserRole.STAFF, code="STAFF-OP-2026", code_hash=hash_invite_code("STAFF-OP-2026"), department="Cardiology", is_active=True),
        ]
        db.add_all(invite_codes)
        db.commit()
        print("[OK] Created Role Invite Codes: ADMIN-SECURE-2026, HOD-DEPT-2026, STAFF-OP-2026")

        # 3. Seed Users
        default_pwd = get_password_hash("Password@123")
        users = [
            User(
                hospital_id=hospital.id,
                full_name="Dr. Rajesh Sharma",
                email="admin@medicover.com",
                password_hash=default_pwd,
                role=UserRole.ADMIN,
                department=None,
                registered_passkey="ADMIN-SECURE-2026",
                is_active=True,
                created_at=now - timedelta(days=60)
            ),
            User(
                hospital_id=hospital.id,
                full_name="Dr. Ananya Rao",
                email="hod.cardio@medicover.com",
                password_hash=default_pwd,
                role=UserRole.HOD,
                department="Cardiology",
                registered_passkey="HOD-DEPT-2026",
                is_active=True,
                created_at=now - timedelta(days=50)
            ),
            User(
                hospital_id=hospital.id,
                full_name="Dr. Vikram Sethi",
                email="hod.ortho@medicover.com",
                password_hash=default_pwd,
                role=UserRole.HOD,
                department="Orthopedics",
                registered_passkey="HOD-DEPT-2026",
                is_active=True,
                created_at=now - timedelta(days=50)
            ),
            User(
                hospital_id=hospital.id,
                full_name="Nurse Priya Patel",
                email="staff.cardio1@medicover.com",
                password_hash=default_pwd,
                role=UserRole.STAFF,
                department="Cardiology",
                registered_passkey="STAFF-OP-2026",
                is_active=True,
                created_at=now - timedelta(days=30)
            ),
            User(
                hospital_id=hospital.id,
                full_name="Tech Arjun Kumar",
                email="staff.cardio2@medicover.com",
                password_hash=default_pwd,
                role=UserRole.STAFF,
                department="Cardiology",
                registered_passkey="STAFF-OP-2026",
                is_active=True,
                created_at=now - timedelta(days=30)
            ),
            User(
                hospital_id=hospital.id,
                full_name="Nurse Sneha Reddy",
                email="staff.ortho1@medicover.com",
                password_hash=default_pwd,
                role=UserRole.STAFF,
                department="Orthopedics",
                registered_passkey="STAFF-OP-2026",
                is_active=True,
                created_at=now - timedelta(days=30)
            ),
            User(
                hospital_id=hospital.id,
                full_name="Tech Rohan Joshi",
                email="staff.ortho2@medicover.com",
                password_hash=default_pwd,
                role=UserRole.STAFF,
                department="Orthopedics",
                registered_passkey="STAFF-OP-2026",
                is_active=True,
                created_at=now - timedelta(days=30)
            ),
        ]
        db.add_all(users)
        db.commit()
        for u in users:
            db.refresh(u)
        print(f"[OK] Created {len(users)} Users (Admin, 2 HODs, 4 Staff)")

        # 4. Seed ~20 Beds across 4 room types with realistic INR prices
        beds_data = [
            # Cardiology Beds (10 beds)
            {"ward": "Cardio Ward 3A", "department": "Cardiology", "room_type": RoomType.SINGLE, "price": 20000.0, "status": BedStatus.OCCUPIED},
            {"ward": "Cardio Ward 3A", "department": "Cardiology", "room_type": RoomType.SINGLE, "price": 20000.0, "status": BedStatus.AVAILABLE},
            {"ward": "Cardio Ward 3B", "department": "Cardiology", "room_type": RoomType.DOUBLE, "price": 12000.0, "status": BedStatus.OCCUPIED},
            {"ward": "Cardio Ward 3B", "department": "Cardiology", "room_type": RoomType.DOUBLE, "price": 12000.0, "status": BedStatus.AVAILABLE},
            {"ward": "Cardio Ward 3C", "department": "Cardiology", "room_type": RoomType.TRIPLE, "price": 8000.0, "status": BedStatus.OCCUPIED},
            {"ward": "Cardio Ward 3C", "department": "Cardiology", "room_type": RoomType.TRIPLE, "price": 8000.0, "status": BedStatus.AVAILABLE},
            {"ward": "Cardio Ward 3C", "department": "Cardiology", "room_type": RoomType.TRIPLE, "price": 8000.0, "status": BedStatus.RESERVED},
            {"ward": "Cardiac ICU", "department": "Cardiology", "room_type": RoomType.ICU, "price": 35000.0, "status": BedStatus.OCCUPIED},
            {"ward": "Cardiac ICU", "department": "Cardiology", "room_type": RoomType.ICU, "price": 35000.0, "status": BedStatus.OCCUPIED},
            {"ward": "Cardiac ICU", "department": "Cardiology", "room_type": RoomType.ICU, "price": 35000.0, "status": BedStatus.MAINTENANCE},

            # Orthopedics Beds (10 beds)
            {"ward": "Ortho Ward 2A", "department": "Orthopedics", "room_type": RoomType.SINGLE, "price": 20000.0, "status": BedStatus.OCCUPIED},
            {"ward": "Ortho Ward 2A", "department": "Orthopedics", "room_type": RoomType.SINGLE, "price": 20000.0, "status": BedStatus.AVAILABLE},
            {"ward": "Ortho Ward 2B", "department": "Orthopedics", "room_type": RoomType.DOUBLE, "price": 12000.0, "status": BedStatus.OCCUPIED},
            {"ward": "Ortho Ward 2B", "department": "Orthopedics", "room_type": RoomType.DOUBLE, "price": 12000.0, "status": BedStatus.AVAILABLE},
            {"ward": "Ortho Ward 2C", "department": "Orthopedics", "room_type": RoomType.TRIPLE, "price": 8000.0, "status": BedStatus.AVAILABLE},
            {"ward": "Ortho Ward 2C", "department": "Orthopedics", "room_type": RoomType.TRIPLE, "price": 8000.0, "status": BedStatus.AVAILABLE},
            {"ward": "Ortho Ward 2C", "department": "Orthopedics", "room_type": RoomType.TRIPLE, "price": 8000.0, "status": BedStatus.RESERVED},
            {"ward": "Post-Op Recovery ICU", "department": "Orthopedics", "room_type": RoomType.ICU, "price": 35000.0, "status": BedStatus.OCCUPIED},
            {"ward": "Post-Op Recovery ICU", "department": "Orthopedics", "room_type": RoomType.ICU, "price": 35000.0, "status": BedStatus.AVAILABLE},
            {"ward": "Post-Op Recovery ICU", "department": "Orthopedics", "room_type": RoomType.ICU, "price": 35000.0, "status": BedStatus.MAINTENANCE},
        ]

        beds = []
        for bd in beds_data:
            b = Bed(
                hospital_id=hospital.id,
                ward=bd["ward"],
                department=bd["department"],
                room_type=bd["room_type"],
                price_per_day=bd["price"],
                current_status=bd["status"],
                last_updated_by=users[0].id,
                last_updated_at=now - timedelta(hours=3)
            )
            beds.append(b)
        db.add_all(beds)
        db.commit()
        for b in beds:
            db.refresh(b)
        print(f"[OK] Created {len(beds)} Beds across Single, Double, Triple and ICU")

        # 5. Seed Patient Stays
        admitted_by_user = users[3]  # Priya Patel
        stays = [
            PatientStay(
                hospital_id=hospital.id,
                patient_name="Aarav Verma",
                patient_ref_id="PAT-2026-0101",
                bed_id=beds[0].id,  # Cardio Single (Occupied)
                admitted_at=now - timedelta(days=2),
                expected_discharge_at=now + timedelta(days=3),
                status=StayStatus.ACTIVE,
                admitted_by=admitted_by_user.id
            ),
            PatientStay(
                hospital_id=hospital.id,
                patient_name="Meera Sundaram",
                patient_ref_id="PAT-2026-0102",
                bed_id=beds[2].id,  # Cardio Double (Occupied)
                admitted_at=now - timedelta(days=4),
                expected_discharge_at=now + timedelta(days=1),
                status=StayStatus.ACTIVE,
                admitted_by=admitted_by_user.id
            ),
            PatientStay(
                hospital_id=hospital.id,
                patient_name="Kavita Nair",
                patient_ref_id="PAT-2026-0103",
                bed_id=beds[4].id,  # Cardio Triple (Occupied)
                admitted_at=now - timedelta(days=1),
                expected_discharge_at=now + timedelta(days=2),
                status=StayStatus.ACTIVE,
                admitted_by=admitted_by_user.id
            ),
            PatientStay(
                hospital_id=hospital.id,
                patient_name="Sunil Gavaskar Kapoor",
                patient_ref_id="PAT-2026-0104",
                bed_id=beds[7].id,  # Cardiac ICU (Occupied)
                admitted_at=now - timedelta(days=3),
                expected_discharge_at=now + timedelta(days=2),
                status=StayStatus.ACTIVE,
                admitted_by=admitted_by_user.id
            ),
            PatientStay(
                hospital_id=hospital.id,
                patient_name="Harish Chawla",
                patient_ref_id="PAT-2026-0105",
                bed_id=beds[8].id,  # Cardiac ICU (Occupied)
                admitted_at=now - timedelta(days=1),
                expected_discharge_at=now + timedelta(days=4),
                status=StayStatus.ACTIVE,
                admitted_by=admitted_by_user.id
            ),
            PatientStay(
                hospital_id=hospital.id,
                patient_name="Devansh Roy",
                patient_ref_id="PAT-2026-0106",
                bed_id=beds[10].id, # Ortho Single (Occupied)
                admitted_at=now - timedelta(days=5),
                expected_discharge_at=now + timedelta(days=1),
                status=StayStatus.ACTIVE,
                admitted_by=users[5].id  # Sneha Reddy
            ),
            PatientStay(
                hospital_id=hospital.id,
                patient_name="Gayatri Menon",
                patient_ref_id="PAT-2026-0107",
                bed_id=beds[12].id, # Ortho Double (Occupied)
                admitted_at=now - timedelta(days=2),
                expected_discharge_at=now + timedelta(days=3),
                status=StayStatus.ACTIVE,
                admitted_by=users[5].id
            ),
            PatientStay(
                hospital_id=hospital.id,
                patient_name="Rameshwar Prasad",
                patient_ref_id="PAT-2026-0108",
                bed_id=beds[17].id, # Ortho ICU (Occupied)
                admitted_at=now - timedelta(days=2),
                expected_discharge_at=now + timedelta(days=2),
                status=StayStatus.ACTIVE,
                admitted_by=users[5].id
            ),
            PatientStay(
                hospital_id=hospital.id,
                patient_name="Deepa Singhania",
                patient_ref_id="PAT-2026-0099",
                bed_id=beds[1].id,  # Cardio Single (Now Available)
                admitted_at=now - timedelta(days=7),
                expected_discharge_at=now - timedelta(hours=4),
                actual_discharge_at=now - timedelta(hours=3),
                status=StayStatus.DISCHARGED,
                admitted_by=admitted_by_user.id
            ),
        ]
        db.add_all(stays)
        db.commit()
        for s in stays:
            db.refresh(s)
        print(f"[OK] Created {len(stays)} Patient Stays (8 active, 1 discharged today)")

        # 6. Seed Billings
        billings = [
            Billing(hospital_id=hospital.id, stay_id=stays[0].id, status=BillingStatus.ACTIVE, total_amount=40000.0, last_updated_at=now - timedelta(hours=2)),
            Billing(hospital_id=hospital.id, stay_id=stays[1].id, status=BillingStatus.ACTIVE, total_amount=48000.0, last_updated_at=now - timedelta(hours=4)),
            Billing(hospital_id=hospital.id, stay_id=stays[2].id, status=BillingStatus.ACTIVE, total_amount=16000.0, last_updated_at=now - timedelta(hours=1)),
            Billing(hospital_id=hospital.id, stay_id=stays[3].id, status=BillingStatus.ACTIVE, total_amount=105000.0, last_updated_at=now - timedelta(hours=6)),
            Billing(hospital_id=hospital.id, stay_id=stays[4].id, status=BillingStatus.ACTIVE, total_amount=35000.0, last_updated_at=now - timedelta(hours=3)),
            Billing(hospital_id=hospital.id, stay_id=stays[5].id, status=BillingStatus.ACTIVE, total_amount=100000.0, last_updated_at=now - timedelta(hours=5)),
            Billing(hospital_id=hospital.id, stay_id=stays[6].id, status=BillingStatus.NOT_STARTED, total_amount=0.0, last_updated_at=now - timedelta(hours=1)),
            Billing(hospital_id=hospital.id, stay_id=stays[7].id, status=BillingStatus.ACTIVE, total_amount=70000.0, last_updated_at=now - timedelta(hours=2)),
            Billing(hospital_id=hospital.id, stay_id=stays[8].id, status=BillingStatus.CLOSED, total_amount=140000.0, last_updated_at=now - timedelta(hours=3)),
        ]
        db.add_all(billings)
        db.commit()
        print(f"[OK] Created {len(billings)} Billing records")

        # 7. Seed Lab Orders (with realistic turnaround timestamps)
        lab_orders = [
            LabOrder(
                hospital_id=hospital.id,
                stay_id=stays[0].id,
                test_name="Troponin I Quantitative",
                ordered_at=now - timedelta(hours=3),
                sample_collected_at=now - timedelta(hours=2, minutes=30),
                result_at=now - timedelta(hours=1, minutes=45),
                status=LabStatus.COMPLETED,
                billed=True
            ),
            LabOrder(
                hospital_id=hospital.id,
                stay_id=stays[0].id,
                test_name="12-Lead Electrocardiogram (ECG)",
                ordered_at=now - timedelta(hours=1),
                sample_collected_at=now - timedelta(minutes=40),
                result_at=None,
                status=LabStatus.IN_PROGRESS,
                billed=False
            ),
            LabOrder(
                hospital_id=hospital.id,
                stay_id=stays[1].id,
                test_name="Complete Lipid Profile",
                ordered_at=now - timedelta(minutes=45),
                sample_collected_at=None,
                result_at=None,
                status=LabStatus.PENDING,
                billed=False
            ),
            LabOrder(
                hospital_id=hospital.id,
                stay_id=stays[3].id,
                test_name="Arterial Blood Gas (ABG) Analysis",
                ordered_at=now - timedelta(hours=2),
                sample_collected_at=now - timedelta(hours=1, minutes=40),
                result_at=now - timedelta(hours=1, minutes=10),
                status=LabStatus.COMPLETED,
                billed=True
            ),
            LabOrder(
                hospital_id=hospital.id,
                stay_id=stays[4].id,
                test_name="Serum Electrolytes (Na/K/Cl)",
                ordered_at=now - timedelta(minutes=30),
                sample_collected_at=None,
                result_at=None,
                status=LabStatus.PENDING,
                billed=False
            ),
            LabOrder(
                hospital_id=hospital.id,
                stay_id=stays[5].id,
                test_name="Digital X-Ray Knee AP/Lateral",
                ordered_at=now - timedelta(hours=4),
                sample_collected_at=now - timedelta(hours=3, minutes=15),
                result_at=now - timedelta(hours=2, minutes=30),
                status=LabStatus.COMPLETED,
                billed=True
            ),
            LabOrder(
                hospital_id=hospital.id,
                stay_id=stays[5].id,
                test_name="C-Reactive Protein (CRP) Quantitative",
                ordered_at=now - timedelta(minutes=50),
                sample_collected_at=now - timedelta(minutes=20),
                result_at=None,
                status=LabStatus.IN_PROGRESS,
                billed=False
            ),
            LabOrder(
                hospital_id=hospital.id,
                stay_id=stays[7].id,
                test_name="Complete Blood Count (CBC) with ESR",
                ordered_at=now - timedelta(minutes=15),
                sample_collected_at=None,
                result_at=None,
                status=LabStatus.PENDING,
                billed=False
            ),
        ]
        db.add_all(lab_orders)
        db.commit()
        print(f"[OK] Created {len(lab_orders)} Lab Orders")

        # 8. Seed Dummy Conflict Logs (to show revenue at risk & operational mismatches)
        conflicts = [
            ConflictLog(
                hospital_id=hospital.id,
                conflict_type=ConflictType.BED_STATUS_MISMATCH,
                related_stay_id=stays[2].id,
                related_bed_id=beds[4].id, # Cardio Triple (₹8,000/day)
                description="Bed #5 marked Available in Ward System but Patient Kavita Nair active stay recorded in ADT",
                detected_at=now - timedelta(hours=3, minutes=20),
                status=ConflictStatus.OPEN,
                assigned_to=users[1].id # Dr. Ananya Rao
            ),
            ConflictLog(
                hospital_id=hospital.id,
                conflict_type=ConflictType.LAB_UNBILLED,
                related_stay_id=stays[0].id,
                related_bed_id=beds[0].id, # Cardio Single (₹20,000/day)
                description="Troponin I lab completed 1h ago but billing item not attached to Billing Account",
                detected_at=now - timedelta(hours=1, minutes=10),
                status=ConflictStatus.OPEN,
                assigned_to=users[1].id
            ),
            ConflictLog(
                hospital_id=hospital.id,
                conflict_type=ConflictType.OCCUPIED_NO_BILLING,
                related_stay_id=stays[6].id,
                related_bed_id=beds[12].id, # Ortho Double (₹12,000/day)
                description="Patient Gayatri Menon occupying Ortho Double Bed #13 with billing status 'not_started'",
                detected_at=now - timedelta(hours=2, minutes=45),
                status=ConflictStatus.UNDER_REVIEW,
                assigned_to=users[2].id # Dr. Vikram Sethi
            ),
            ConflictLog(
                hospital_id=hospital.id,
                conflict_type=ConflictType.DISCHARGE_BED_MISMATCH,
                related_stay_id=stays[8].id,
                related_bed_id=beds[1].id,
                description="Patient Deepa Singhania discharged but bed housekeeping clean status was pending for 2h",
                detected_at=now - timedelta(hours=5),
                status=ConflictStatus.RESOLVED,
                assigned_to=users[1].id
            ),
        ]
        db.add_all(conflicts)
        db.commit()
        print(f"[OK] Created {len(conflicts)} Conflict Logs (3 open/under review, 1 resolved)")

        # 9. Seed Activity Logs
        activities = [
            ActivityLog(
                hospital_id=hospital.id,
                user_id=users[3].id,
                action_description="Nurse Priya Patel (STAFF) admitted patient Aarav Verma to Cardio Single Bed #1",
                timestamp=now - timedelta(days=2)
            ),
            ActivityLog(
                hospital_id=hospital.id,
                user_id=users[4].id,
                action_description="Tech Arjun Kumar (STAFF) ordered 12-Lead ECG for Aarav Verma",
                timestamp=now - timedelta(hours=1)
            ),
            ActivityLog(
                hospital_id=hospital.id,
                user_id=users[1].id,
                action_description="Dr. Ananya Rao (HOD) reviewed Cardiac ICU occupancy alert",
                timestamp=now - timedelta(hours=2)
            ),
            ActivityLog(
                hospital_id=hospital.id,
                user_id=users[5].id,
                action_description="Nurse Sneha Reddy (STAFF) updated Ortho Bed #18 status to 'Occupied'",
                timestamp=now - timedelta(hours=3)
            ),
            ActivityLog(
                hospital_id=hospital.id,
                user_id=users[0].id,
                action_description="Dr. Rajesh Sharma (ADMIN) verified hospital-wide bed pricing tier",
                timestamp=now - timedelta(hours=5)
            ),
        ]
        db.add_all(activities)
        db.commit()
        print(f"[OK] Created {len(activities)} Activity Logs")

        print("\n[SUCCESS] Database seeded successfully!")
        print("=" * 60)
        print("DEMO CREDENTIALS:")
        print("1. Admin: admin@medicover.com / Password@123")
        print("2. HOD Cardio: hod.cardio@medicover.com / Password@123")
        print("3. HOD Ortho: hod.ortho@medicover.com / Password@123")
        print("4. Staff Cardio: staff.cardio1@medicover.com / Password@123")
        print("5. Staff Ortho: staff.ortho1@medicover.com / Password@123")
        print("\nINVITE CODES FOR SIGNUP:")
        print("- Admin Invite Code:  ADMIN-SECURE-2026")
        print("- HOD Invite Code:    HOD-DEPT-2026")
        print("- Staff Invite Code:  STAFF-OP-2026")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding database: {e}")
        raise e
    finally:
        db.close()

def seed_if_empty():
    db = SessionLocal()
    try:
        if db.query(Hospital).count() == 0 or db.query(User).count() == 0:
            print("[INFO] Database is empty. Running initial seeder for deployment...")
            seed_database()
    except Exception as e:
        print(f"[INFO] Auto-seed check: {e}")
        Base.metadata.create_all(bind=engine)
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
