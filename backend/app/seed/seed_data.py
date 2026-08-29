from datetime import datetime, timezone, timedelta
from app.core.database import Base, SessionLocal, engine
from app.core.security import get_password_hash, hash_invite_code
from app.models.hospital import Hospital
from app.models.user import User, UserRole, RoleInviteCode
from app.models.bed import Bed, RoomType, BedStatus
from app.models.patient_stay import PatientStay, StayStatus
from app.models.billing import Billing, BillingStatus
from app.models.lab_order import LabOrder, LabStatus
from app.models.activity import ActivityLog
from app.models.requisition import RequisitionOrder, RequisitionType, RequisitionStatus, RequisitionUrgency
from app.models.equipment import MedicalEquipment, EquipmentStatus
from app.models.doctor import Doctor, DoctorBranchAssignment, DoctorDutyStatus
from app.models.appointment import PatientAppointment, AppointmentStatus

def seed_database():
    print("[INIT] Initializing Database and Seeding Multi-Branch Data...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # 1. Seed 4 Hospital Branches
        hospitals = [
            Hospital(
                id=1,
                name="Medicover Hospitals - Hitech City (Hyderabad)",
                branch_code="MC-HTC",
                city="Hyderabad",
                address="Plot 12, Hitec City Main Rd, Cyberabad, Hyderabad",
                state="Telangana",
                latitude=17.4474,
                longitude=78.3762,
                phone="+91 40 6833 4455",
                emergency_contact="1057",
                created_at=now - timedelta(days=90)
            ),
            Hospital(
                id=2,
                name="Medicover Hospitals - Whitefield (Bengaluru)",
                branch_code="MC-BLR",
                city="Bengaluru",
                address="ITPB Main Rd, Whitefield, Bengaluru",
                state="Karnataka",
                latitude=12.9698,
                longitude=77.7500,
                phone="+91 80 4688 5500",
                emergency_contact="1057",
                created_at=now - timedelta(days=80)
            ),
            Hospital(
                id=3,
                name="Medicover Hospitals - MVP Colony (Visakhapatnam)",
                branch_code="MC-VZP",
                city="Visakhapatnam",
                address="Sector 9, MVP Colony, Visakhapatnam",
                state="Andhra Pradesh",
                latitude=17.7412,
                longitude=83.3340,
                phone="+91 891 350 4400",
                emergency_contact="1057",
                created_at=now - timedelta(days=70)
            ),
            Hospital(
                id=4,
                name="Medicover Hospitals - Navi Mumbai (Mumbai)",
                branch_code="MC-MUM",
                city="Mumbai",
                address="Sector 15, Palm Beach Rd, Navi Mumbai",
                state="Maharashtra",
                latitude=19.0330,
                longitude=73.0297,
                phone="+91 22 5055 6600",
                emergency_contact="1057",
                created_at=now - timedelta(days=60)
            ),
        ]
        db.add_all(hospitals)
        db.commit()
        for h in hospitals:
            db.refresh(h)
        print(f"[OK] Created 4 Hospital Branches: {[h.name for h in hospitals]}")

        # 2. Seed Role Invite Codes across branches
        invite_codes = [
            # Master Admin passkey
            RoleInviteCode(hospital_id=1, role=UserRole.ADMIN, code="ADMIN-SECURE-2026", code_hash=hash_invite_code("ADMIN-SECURE-2026"), department=None, is_active=True),
            
            # Branch 1 (Hitech City)
            RoleInviteCode(hospital_id=1, role=UserRole.HOD, code="HOD-DEPT-2026", code_hash=hash_invite_code("HOD-DEPT-2026"), department="Cardiology", is_active=True),
            RoleInviteCode(hospital_id=1, role=UserRole.STAFF, code="STAFF-OP-2026", code_hash=hash_invite_code("STAFF-OP-2026"), department="Cardiology", is_active=True),
            RoleInviteCode(hospital_id=1, role=UserRole.STAFF, code="STAFF-HK-2026", code_hash=hash_invite_code("STAFF-HK-2026"), department="Housekeeping", is_active=True),
            RoleInviteCode(hospital_id=1, role=UserRole.TECHNICIAN_PHARMACIST, code="TECH-PHARM-2026", code_hash=hash_invite_code("TECH-PHARM-2026"), department="Biomedical & Pharmacy", is_active=True),
            
            # Branch 2 (Whitefield)
            RoleInviteCode(hospital_id=2, role=UserRole.HOD, code="BLR-HOD-2026", code_hash=hash_invite_code("BLR-HOD-2026"), department="Cardiology", is_active=True),
            RoleInviteCode(hospital_id=2, role=UserRole.STAFF, code="BLR-STAFF-2026", code_hash=hash_invite_code("BLR-STAFF-2026"), department="Cardiology", is_active=True),
            
            # Branch 3 (MVP Colony)
            RoleInviteCode(hospital_id=3, role=UserRole.HOD, code="VZP-HOD-2026", code_hash=hash_invite_code("VZP-HOD-2026"), department="Cardiology", is_active=True),
            RoleInviteCode(hospital_id=3, role=UserRole.STAFF, code="VZP-STAFF-2026", code_hash=hash_invite_code("VZP-STAFF-2026"), department="Cardiology", is_active=True),
            
            # Branch 4 (Navi Mumbai)
            RoleInviteCode(hospital_id=4, role=UserRole.HOD, code="MUM-HOD-2026", code_hash=hash_invite_code("MUM-HOD-2026"), department="Orthopedics", is_active=True),
            RoleInviteCode(hospital_id=4, role=UserRole.STAFF, code="MUM-STAFF-2026", code_hash=hash_invite_code("MUM-STAFF-2026"), department="Orthopedics", is_active=True),
        ]
        db.add_all(invite_codes)
        db.commit()
        print(f"[OK] Created {len(invite_codes)} Role Invite Codes across branches")

        # 3. Seed Users
        default_pwd = get_password_hash("Password@123")
        users = [
            # Master Admin (Oversees all branches)
            User(
                hospital_id=1,
                full_name="Dr. Rajesh Sharma",
                email="admin@medicover.com",
                password_hash=default_pwd,
                role=UserRole.ADMIN,
                department=None,
                registered_passkey="ADMIN-SECURE-2026",
                is_active=True,
                created_at=now - timedelta(days=60)
            ),
            # Branch 1 (Hitech City) Users
            User(
                hospital_id=1,
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
                hospital_id=1,
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
                hospital_id=1,
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
                hospital_id=1,
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
                hospital_id=1,
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
                hospital_id=1,
                full_name="Housekeeping Lead Ramesh",
                email="staff.housekeeping@medicover.com",
                password_hash=default_pwd,
                role=UserRole.STAFF,
                department="Housekeeping",
                registered_passkey="STAFF-HK-2026",
                is_active=True,
                created_at=now - timedelta(days=30)
            ),
            User(
                hospital_id=1,
                full_name="Rajesh Pillai (Biomed & Pharm)",
                email="tech.pharmacist@medicover.com",
                password_hash=default_pwd,
                role=UserRole.TECHNICIAN_PHARMACIST,
                department="Biomedical & Pharmacy",
                registered_passkey="TECH-PHARM-2026",
                is_active=True,
                created_at=now - timedelta(days=30)
            ),
            # Branch 2 (Whitefield) Users
            User(
                hospital_id=2,
                full_name="Dr. Arvind Swaminathan (BLR)",
                email="hod.cardio.blr@medicover.com",
                password_hash=default_pwd,
                role=UserRole.HOD,
                department="Cardiology",
                registered_passkey="BLR-HOD-2026",
                is_active=True,
                created_at=now - timedelta(days=40)
            ),
            User(
                hospital_id=2,
                full_name="Nurse Kavita Nair (BLR)",
                email="staff.cardio.blr@medicover.com",
                password_hash=default_pwd,
                role=UserRole.STAFF,
                department="Cardiology",
                registered_passkey="BLR-STAFF-2026",
                is_active=True,
                created_at=now - timedelta(days=25)
            ),
            # Branch 3 (MVP Colony) Users
            User(
                hospital_id=3,
                full_name="Dr. Priya Deshmukh (VZP)",
                email="hod.cardio.vzp@medicover.com",
                password_hash=default_pwd,
                role=UserRole.HOD,
                department="Cardiology",
                registered_passkey="VZP-HOD-2026",
                is_active=True,
                created_at=now - timedelta(days=40)
            ),
            # Branch 4 (Navi Mumbai) Users
            User(
                hospital_id=4,
                full_name="Dr. Rohit Nambiar (MUM)",
                email="hod.ortho.mum@medicover.com",
                password_hash=default_pwd,
                role=UserRole.HOD,
                department="Orthopedics",
                registered_passkey="MUM-HOD-2026",
                is_active=True,
                created_at=now - timedelta(days=40)
            ),
        ]
        db.add_all(users)
        db.commit()
        for u in users:
            db.refresh(u)
        print(f"[OK] Created {len(users)} Users across 4 branches")

        # 4. Seed Specialist Doctors Roster
        doctors = [
            Doctor(
                id=1,
                full_name="Dr. Ananya Rao",
                qualification="MD, DM (Cardiology), FACC",
                speciality="Cardiology",
                experience_years=14,
                consultation_fee=1000.0,
                bio="Lead Interventional Cardiologist specializing in complex angioplasty, TAVR, and coronary stent procedures.",
                contact_email="dr.ananya@medicover.com",
                created_at=now - timedelta(days=90)
            ),
            Doctor(
                id=2,
                full_name="Dr. Arvind Swaminathan",
                qualification="MD, DNB (Cardiology), FSCAI",
                speciality="Cardiology",
                experience_years=12,
                consultation_fee=900.0,
                bio="Consultant Cardiologist with expertise in cardiac pacing, heart failure management, and preventive echocardiography.",
                contact_email="dr.arvind@medicover.com",
                created_at=now - timedelta(days=90)
            ),
            Doctor(
                id=3,
                full_name="Dr. Vikram Sethi",
                qualification="MS (Orthopedics), MCh (Joint Replacement)",
                speciality="Orthopedics",
                experience_years=16,
                consultation_fee=1100.0,
                bio="Senior Orthopedic Surgeon specializing in robotic knee/hip replacement and minimally invasive trauma surgery.",
                contact_email="dr.vikram@medicover.com",
                created_at=now - timedelta(days=90)
            ),
            Doctor(
                id=4,
                full_name="Dr. Sneha Kulkarni",
                qualification="MS (Orthopedics), Arthroscopy Fellow",
                speciality="Orthopedics",
                experience_years=9,
                consultation_fee=850.0,
                bio="Consultant Orthopedic Surgeon focusing on sports injuries, ACL reconstruction, and shoulder arthroscopy.",
                contact_email="dr.sneha@medicover.com",
                created_at=now - timedelta(days=90)
            ),
            Doctor(
                id=5,
                full_name="Dr. Priya Deshmukh",
                qualification="MD, DM (Neurology), FAAN",
                speciality="Neurology",
                experience_years=13,
                consultation_fee=1200.0,
                bio="Senior Neurologist specializing in acute ischemic stroke, epilepsy, neuromuscular disorders, and Parkinson's disease.",
                contact_email="dr.priya@medicover.com",
                created_at=now - timedelta(days=90)
            ),
            Doctor(
                id=6,
                full_name="Dr. Rohit Nambiar",
                qualification="MD (Internal Medicine)",
                speciality="General Medicine",
                experience_years=15,
                consultation_fee=750.0,
                bio="Senior Consultant Physician managing acute febrile illnesses, diabetes, hypertension, and multiorgan infections.",
                contact_email="dr.rohit@medicover.com",
                created_at=now - timedelta(days=90)
            ),
            Doctor(
                id=7,
                full_name="Dr. Meera Nanda",
                qualification="MD (Pulmonary Medicine), FCCP",
                speciality="Pulmonology",
                experience_years=11,
                consultation_fee=950.0,
                bio="Consultant Pulmonologist & Critical Care Specialist treating severe asthma, COPD, sleep apnea, and post-COVID lung fibrosis.",
                contact_email="dr.meera@medicover.com",
                created_at=now - timedelta(days=90)
            ),
        ]
        db.add_all(doctors)
        db.commit()
        for d in doctors:
            db.refresh(d)
        print(f"[OK] Created {len(doctors)} Specialist Doctors across Specialities")

        # 5. Seed Doctor Duty Assignments across 4 Branches
        assignments = [
            # Branch 1 (Hitech City, Hyderabad)
            DoctorBranchAssignment(
                doctor_id=1, hospital_id=1, department="Cardiology",
                duty_status=DoctorDutyStatus.ON_DUTY, room_number="OPD Suite 101",
                shift_timings="09:00 AM - 02:00 PM", days_available="Mon, Tue, Wed, Thu, Fri, Sat",
                last_updated_at=now, updated_by_id=users[1].id
            ),
            DoctorBranchAssignment(
                doctor_id=3, hospital_id=1, department="Orthopedics",
                duty_status=DoctorDutyStatus.ON_DUTY, room_number="OPD Suite 105",
                shift_timings="10:00 AM - 04:00 PM", days_available="Mon, Tue, Wed, Thu, Fri",
                last_updated_at=now, updated_by_id=users[2].id
            ),
            DoctorBranchAssignment(
                doctor_id=5, hospital_id=1, department="Neurology",
                duty_status=DoctorDutyStatus.ON_DUTY, room_number="OPD Suite 202",
                shift_timings="11:00 AM - 05:00 PM", days_available="Tue, Thu, Sat",
                last_updated_at=now, updated_by_id=users[1].id
            ),
            DoctorBranchAssignment(
                doctor_id=6, hospital_id=1, department="General Medicine",
                duty_status=DoctorDutyStatus.ON_DUTY, room_number="OPD Suite 103",
                shift_timings="08:00 AM - 02:00 PM", days_available="Mon - Sat",
                last_updated_at=now, updated_by_id=users[0].id
            ),
            DoctorBranchAssignment(
                doctor_id=7, hospital_id=1, department="Pulmonology",
                duty_status=DoctorDutyStatus.ON_LEAVE, room_number="OPD Suite 208",
                shift_timings="02:00 PM - 07:00 PM", days_available="Mon, Wed, Fri",
                last_updated_at=now - timedelta(hours=4), updated_by_id=users[1].id
            ),

            # Branch 2 (Whitefield, Bengaluru)
            DoctorBranchAssignment(
                doctor_id=2, hospital_id=2, department="Cardiology",
                duty_status=DoctorDutyStatus.ON_DUTY, room_number="OPD Suite 102",
                shift_timings="09:00 AM - 03:00 PM", days_available="Mon - Sat",
                last_updated_at=now, updated_by_id=users[8].id
            ),
            DoctorBranchAssignment(
                doctor_id=4, hospital_id=2, department="Orthopedics",
                duty_status=DoctorDutyStatus.ON_DUTY, room_number="OPD Suite 106",
                shift_timings="10:00 AM - 04:00 PM", days_available="Mon - Fri",
                last_updated_at=now, updated_by_id=users[8].id
            ),
            DoctorBranchAssignment(
                doctor_id=7, hospital_id=2, department="Pulmonology",
                duty_status=DoctorDutyStatus.ON_DUTY, room_number="OPD Suite 204",
                shift_timings="01:00 PM - 06:00 PM", days_available="Mon - Sat",
                last_updated_at=now, updated_by_id=users[8].id
            ),
            DoctorBranchAssignment(
                doctor_id=6, hospital_id=2, department="General Medicine",
                duty_status=DoctorDutyStatus.ON_DUTY, room_number="OPD Suite 101",
                shift_timings="09:00 AM - 02:00 PM", days_available="Mon - Sat",
                last_updated_at=now, updated_by_id=users[8].id
            ),

            # Branch 3 (MVP Colony, Visakhapatnam)
            DoctorBranchAssignment(
                doctor_id=1, hospital_id=3, department="Cardiology",
                duty_status=DoctorDutyStatus.ON_DUTY, room_number="OPD Suite 101",
                shift_timings="02:00 PM - 06:00 PM", days_available="Wed, Sat (Visiting)",
                last_updated_at=now, updated_by_id=users[10].id
            ),
            DoctorBranchAssignment(
                doctor_id=3, hospital_id=3, department="Orthopedics",
                duty_status=DoctorDutyStatus.ON_LEAVE, room_number="OPD Suite 104",
                shift_timings="10:00 AM - 02:00 PM", days_available="Mon, Fri",
                last_updated_at=now - timedelta(hours=6), updated_by_id=users[10].id
            ),
            DoctorBranchAssignment(
                doctor_id=5, hospital_id=3, department="Neurology",
                duty_status=DoctorDutyStatus.ON_DUTY, room_number="OPD Suite 201",
                shift_timings="10:00 AM - 04:00 PM", days_available="Mon - Sat",
                last_updated_at=now, updated_by_id=users[10].id
            ),

            # Branch 4 (Navi Mumbai, Mumbai)
            DoctorBranchAssignment(
                doctor_id=2, hospital_id=4, department="Cardiology",
                duty_status=DoctorDutyStatus.ON_DUTY, room_number="OPD Suite 102",
                shift_timings="09:00 AM - 02:00 PM", days_available="Mon - Sat",
                last_updated_at=now, updated_by_id=users[11].id
            ),
            DoctorBranchAssignment(
                doctor_id=3, hospital_id=4, department="Orthopedics",
                duty_status=DoctorDutyStatus.ON_DUTY, room_number="OPD Suite 107",
                shift_timings="11:00 AM - 05:00 PM", days_available="Mon - Sat",
                last_updated_at=now, updated_by_id=users[11].id
            ),
            DoctorBranchAssignment(
                doctor_id=7, hospital_id=4, department="Pulmonology",
                duty_status=DoctorDutyStatus.ON_DUTY, room_number="OPD Suite 203",
                shift_timings="02:00 PM - 07:00 PM", days_available="Mon - Sat",
                last_updated_at=now, updated_by_id=users[11].id
            ),
        ]
        db.add_all(assignments)
        db.commit()
        print(f"[OK] Created {len(assignments)} Doctor Duty Assignments across 4 Branches")

        # 6. Seed Beds for Branch 1 (20 beds) and other branches (6-8 beds each)
        beds = []
        # Branch 1 (Hitech City) - 20 beds
        for i in range(1, 21):
            if i <= 5:
                rtype, dept, price, ward_name = RoomType.SINGLE, "Cardiology", 18000.0, f"Cardio Deluxe Room 10{i}"
            elif i <= 10:
                rtype, dept, price, ward_name = RoomType.DOUBLE, "Cardiology", 12000.0, f"Cardio Ward Bed 20{i}"
            elif i <= 15:
                rtype, dept, price, ward_name = RoomType.TRIPLE, "Orthopedics", 8000.0, f"Ortho Ward Bed 30{i}"
            else:
                rtype, dept, price, ward_name = RoomType.ICU, "Orthopedics", 35000.0, f"Critical Care ICU Bed {i}"

            # Default status
            status = BedStatus.OCCUPIED if i in [1, 2, 3, 6, 7, 11, 16, 17] else BedStatus.AVAILABLE

            beds.append(Bed(
                hospital_id=1,
                ward=ward_name,
                room_type=rtype,
                price_per_day=price,
                department=dept,
                current_status=status
            ))

        # Branch 2 (Whitefield) - 8 beds
        for i in range(1, 9):
            dept = "Cardiology" if i <= 4 else "Orthopedics"
            rtype = RoomType.SINGLE if i <= 4 else RoomType.ICU
            price = 19000.0 if i <= 4 else 38000.0
            ward_name = f"BLR Ward Suite {i}"
            beds.append(Bed(
                hospital_id=2,
                ward=ward_name,
                room_type=rtype,
                price_per_day=price,
                department=dept,
                current_status=BedStatus.OCCUPIED if i in [1, 5] else BedStatus.AVAILABLE
            ))

        # Branch 3 (MVP Colony) - 6 beds
        for i in range(1, 7):
            ward_name = f"VZP Ward Suite {i}"
            beds.append(Bed(
                hospital_id=3,
                ward=ward_name,
                room_type=RoomType.DOUBLE if i <= 4 else RoomType.ICU,
                price_per_day=11000.0 if i <= 4 else 32000.0,
                department="Cardiology",
                current_status=BedStatus.OCCUPIED if i in [1] else BedStatus.AVAILABLE
            ))

        # Branch 4 (Navi Mumbai) - 6 beds
        for i in range(1, 7):
            ward_name = f"MUM Ward Suite {i}"
            beds.append(Bed(
                hospital_id=4,
                ward=ward_name,
                room_type=RoomType.SINGLE if i <= 3 else RoomType.ICU,
                price_per_day=22000.0 if i <= 3 else 42000.0,
                department="Orthopedics",
                current_status=BedStatus.OCCUPIED if i in [2] else BedStatus.AVAILABLE
            ))

        db.add_all(beds)
        db.commit()
        for b in beds:
            db.refresh(b)
        print(f"[OK] Created {len(beds)} Beds across 4 Hospital Branches")

        # 7. Seed Sample Patient Stays for Branch 1
        stays = [
            PatientStay(
                hospital_id=1,
                patient_name="Aarav Verma",
                patient_ref_id="PT-CARD-1001",
                bed_id=beds[0].id,
                admitted_by=users[3].id,
                admitted_at=now - timedelta(days=2),
                expected_discharge_at=now + timedelta(days=2),
                actual_discharge_at=None,
                status=StayStatus.ACTIVE
            ),
            PatientStay(
                hospital_id=1,
                patient_name="Pooja Hegde",
                patient_ref_id="PT-CARD-1002",
                bed_id=beds[1].id,
                admitted_by=users[3].id,
                admitted_at=now - timedelta(days=1, hours=5),
                expected_discharge_at=now + timedelta(days=3),
                actual_discharge_at=None,
                status=StayStatus.ACTIVE
            ),
        ]
        db.add_all(stays)
        db.commit()
        for s in stays:
            db.refresh(s)
        print(f"[OK] Created {len(stays)} Patient Stays in Branch 1")

        # 8. Seed Sample Billings & Labs
        billings = [
            Billing(hospital_id=1, stay_id=stays[0].id, status=BillingStatus.NOT_STARTED, total_amount=0.0),
            Billing(hospital_id=1, stay_id=stays[1].id, status=BillingStatus.NOT_STARTED, total_amount=0.0),
        ]
        db.add_all(billings)
        db.commit()

        # 9. Seed Medical Equipments & Requisitions
        equipments = [
            MedicalEquipment(
                hospital_id=1,
                equipment_name="Hamilton-C6 Mechanical Ventilator",
                asset_tag="EQ-ICU-001",
                category="Ventilator",
                department="Cardiology",
                location_room="Cardiac ICU Room 1",
                status=EquipmentStatus.OPERATIONAL,
                last_inspected_at=now - timedelta(days=2),
                last_inspected_by_id=users[7].id,
                maintenance_notes="Routine 500h maintenance passed. O2 sensor verified.",
                created_at=now - timedelta(days=60)
            ),
            MedicalEquipment(
                hospital_id=1,
                equipment_name="Mindray BeneHeart D3 Defibrillator",
                asset_tag="EQ-ICU-002",
                category="Defibrillator",
                department="Cardiology",
                location_room="Cardiac ICU Crash Cart A",
                status=EquipmentStatus.OPERATIONAL,
                last_inspected_at=now - timedelta(days=1),
                last_inspected_by_id=users[7].id,
                maintenance_notes="Daily self-test passed. Battery at 100% capacity.",
                created_at=now - timedelta(days=60)
            ),
            MedicalEquipment(
                hospital_id=1,
                equipment_name="B. Braun Infusomat Space Volumetric Pump",
                asset_tag="EQ-CARD-002",
                category="Infusion",
                department="Cardiology",
                location_room="Cardio Ward 3B",
                status=EquipmentStatus.MAINTENANCE,
                last_inspected_at=now - timedelta(hours=4),
                last_inspected_by_id=users[7].id,
                maintenance_notes="Error Err-402: Upstream occlusion sensor recalibration in progress.",
                created_at=now - timedelta(days=45)
            ),
        ]
        db.add_all(equipments)
        db.commit()

        # 10. Seed Sample Patient Appointments (Public Zero-Login bookings)
        sample_appointments = [
            PatientAppointment(
                appointment_token="APT-HTC-1092",
                hospital_id=1,
                doctor_id=1, # Dr. Ananya Rao
                patient_name="Kiran Kumar Rao",
                patient_phone="9849012345",
                patient_email="kiran.rao@gmail.com",
                patient_age=45,
                patient_gender="Male",
                patient_city="Hyderabad",
                illness_description="Mild chest tightness and high BP readings since 3 days.",
                speciality_requested="Cardiology",
                appointment_date=now + timedelta(days=1),
                time_slot="11:30 AM",
                status=AppointmentStatus.CONFIRMED,
                created_at=now - timedelta(hours=2)
            ),
            PatientAppointment(
                appointment_token="APT-BLR-4821",
                hospital_id=2,
                doctor_id=4, # Dr. Sneha Kulkarni
                patient_name="Divya Sundaram",
                patient_phone="9880123456",
                patient_email="divya.s@gmail.com",
                patient_age=32,
                patient_gender="Female",
                patient_city="Bengaluru",
                illness_description="Right knee pain and swelling after badminton match.",
                speciality_requested="Orthopedics",
                appointment_date=now + timedelta(days=1),
                time_slot="02:00 PM",
                status=AppointmentStatus.CONFIRMED,
                created_at=now - timedelta(hours=1)
            ),
        ]
        db.add_all(sample_appointments)
        db.commit()
        print(f"[OK] Created {len(sample_appointments)} Sample Patient Appointments")

        # 11. Seed Activity Logs
        activities = [
            ActivityLog(
                hospital_id=1,
                user_id=users[1].id,
                action_description="Dr. Ananya Rao (HOD) confirmed On-Duty schedule in Hitech City Cardiology OPD Suite 101",
                timestamp=now - timedelta(hours=1)
            ),
            ActivityLog(
                hospital_id=1,
                user_id=users[0].id,
                action_description="Dr. Rajesh Sharma (MASTER ADMIN) verified multi-branch network sync across 4 hospital branches",
                timestamp=now - timedelta(hours=3)
            ),
        ]
        db.add_all(activities)
        db.commit()
        print(f"[OK] Created {len(activities)} Activity Logs")

        print("\n[SUCCESS] Database seeded successfully!")
        print("=" * 70)
        print("MULTI-BRANCH NETWORK CREDENTIALS:")
        print("1. Master Admin (All 4 Branches): admin@medicover.com / Password@123")
        print("2. HOD Cardio (Hitech City): hod.cardio@medicover.com / Password@123")
        print("3. HOD Ortho (Hitech City): hod.ortho@medicover.com / Password@123")
        print("4. Staff Cardio (Hitech City): staff.cardio1@medicover.com / Password@123")
        print("5. Tech/Pharm (Hitech City): tech.pharmacist@medicover.com / Password@123")
        print("6. HOD Cardio (Whitefield): hod.cardio.blr@medicover.com / Password@123")
        print("7. HOD Cardio (MVP Colony): hod.cardio.vzp@medicover.com / Password@123")
        print("8. HOD Ortho (Navi Mumbai): hod.ortho.mum@medicover.com / Password@123")
        print("-> Zero-login appointment booking available at route: /book-appointment")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding database: {e}")
        raise e
    finally:
        db.close()

def seed_if_empty():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@medicover.com").first()
        if not admin or db.query(Hospital).count() < 4:
            print("[INFO] Database empty or missing 4 branches. Running initial seeder...")
            seed_database()
        else:
            print("[INFO] 4 hospital branches and demo accounts verified.")
    except Exception as e:
        print(f"[INFO] Auto-seed check: {e}")
        Base.metadata.create_all(bind=engine)
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
