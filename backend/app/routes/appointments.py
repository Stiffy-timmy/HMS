import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.hospital import Hospital
from app.models.doctor import Doctor, DoctorBranchAssignment, DoctorDutyStatus
from app.models.appointment import PatientAppointment, AppointmentStatus
from app.schemas.appointment import (
    AppointmentRecommendationRequest,
    RecommendedBranchOption,
    AppointmentBookingRequest,
    AppointmentResponse
)
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/appointments", tags=["Patient Appointments & Recommendations"])

# City Coordinates for Proximity Scoring (Approximate coordinates in India)
CITY_LOCATIONS = {
    "hyderabad": {"lat": 17.3850, "lng": 78.4867, "branch": "MC-HTC"},
    "bengaluru": {"lat": 12.9716, "lng": 77.5946, "branch": "MC-BLR"},
    "bangalore": {"lat": 12.9716, "lng": 77.5946, "branch": "MC-BLR"},
    "visakhapatnam": {"lat": 17.6868, "lng": 83.2185, "branch": "MC-VZP"},
    "vizag": {"lat": 17.6868, "lng": 83.2185, "branch": "MC-VZP"},
    "mumbai": {"lat": 19.0760, "lng": 72.8777, "branch": "MC-MUM"},
    "navi mumbai": {"lat": 19.0330, "lng": 73.0297, "branch": "MC-MUM"}
}

def detect_speciality_from_illness(illness: str, fallback: str = "General Medicine") -> str:
    text = (illness or "").lower()
    if any(k in text for k in ["heart", "chest", "bp", "blood pressure", "palpitation", "angina", "stemi", "cardiac"]):
        return "Cardiology"
    if any(k in text for k in ["bone", "joint", "knee", "fracture", "spine", "ortho", "arthritis", "ligament", "shoulder"]):
        return "Orthopedics"
    if any(k in text for k in ["brain", "headache", "migraine", "nerve", "stroke", "paralysis", "seizure", "neuro"]):
        return "Neurology"
    if any(k in text for k in ["lung", "breath", "cough", "asthma", "pneumonia", "pulmo", "respiratory", "wheezing"]):
        return "Pulmonology"
    if any(k in text for k in ["fever", "weakness", "vomiting", "stomach", "infection", "diabetes", "flu", "cold"]):
        return "General Medicine"
    return fallback

@router.post("/recommend", response_model=List[RecommendedBranchOption])
def recommend_branches(
    payload: AppointmentRecommendationRequest,
    db: Session = Depends(get_db)
):
    target_speciality = payload.speciality_requested.strip() if payload.speciality_requested else detect_speciality_from_illness(payload.illness_description)
    patient_city_clean = payload.patient_city.strip().lower()

    # Query all Doctor Branch assignments with doctors in that speciality
    assignments = db.query(DoctorBranchAssignment).join(Doctor).join(Hospital).filter(
        Doctor.speciality.ilike(f"%{target_speciality}%")
    ).all()

    if not assignments:
        # Fallback to all on-duty general practitioners
        assignments = db.query(DoctorBranchAssignment).join(Doctor).join(Hospital).filter(
            DoctorBranchAssignment.duty_status == DoctorDutyStatus.ON_DUTY
        ).all()

    recommendations = []
    
    # Standard time slots
    base_slots = ["09:30 AM", "11:00 AM", "01:30 PM", "03:30 PM", "05:00 PM", "06:30 PM"]

    for assign in assignments:
        h = assign.hospital
        doc = assign.doctor
        is_on_duty = assign.duty_status == DoctorDutyStatus.ON_DUTY
        is_local_city = (h.city and patient_city_clean in h.city.lower()) or (patient_city_clean in (h.name or "").lower())

        if is_local_city and is_on_duty:
            dist_badge = "[RECOMMENDED] Nearest Branch (Local City)"
            is_pri = True
            reason = f"On-Duty {doc.speciality} Specialist '{doc.full_name}' available today at your local {h.city} branch."
        elif is_local_city and not is_on_duty:
            dist_badge = "Local Branch (Specialist On Leave)"
            is_pri = False
            reason = f"Local {h.city} specialist is currently on leave. Check next nearest branch below."
        elif is_on_duty:
            dist_badge = f"Network Branch ({h.city})"
            is_pri = False
            reason = f"On-Duty {doc.speciality} Specialist '{doc.full_name}' is available at {h.name}."
        else:
            dist_badge = f"Network Branch ({h.city})"
            is_pri = False
            reason = f"Specialist currently {assign.duty_status.value.replace('_', ' ')}."

        recommendations.append(RecommendedBranchOption(
            hospital_id=h.id,
            hospital_name=h.name,
            branch_code=h.branch_code or f"MC-BR{h.id}",
            city=h.city or h.state,
            address=h.address,
            distance_badge=dist_badge,
            is_primary_match=is_pri,
            doctor_id=doc.id,
            doctor_name=doc.full_name,
            doctor_qualification=doc.qualification,
            doctor_speciality=doc.speciality,
            consultation_fee=doc.consultation_fee,
            duty_status=assign.duty_status.value,
            room_number=assign.room_number,
            shift_timings=assign.shift_timings,
            available_slots=base_slots,
            recommendation_reason=reason
        ))

    # Sort so Primary match / On-Duty appears first
    recommendations.sort(key=lambda x: (
        not (x.is_primary_match and x.duty_status == "on_duty"),
        not (x.duty_status == "on_duty"),
        x.city != payload.patient_city
    ))

    return recommendations

@router.post("/book", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    payload: AppointmentBookingRequest,
    db: Session = Depends(get_db)
):
    hospital = db.query(Hospital).filter(Hospital.id == payload.hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital branch not found")

    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    # Generate unique token e.g. APT-HTC-8492
    branch_prefix = hospital.branch_code.replace("MC-", "") if hospital.branch_code else f"BR{hospital.id}"
    rand_digits = random.randint(1000, 9999)
    token = f"APT-{branch_prefix}-{rand_digits}"

    appointment = PatientAppointment(
        appointment_token=token,
        hospital_id=hospital.id,
        doctor_id=doctor.id,
        patient_name=payload.patient_name.strip(),
        patient_phone=payload.patient_phone.strip(),
        patient_email=payload.patient_email.strip() if payload.patient_email else None,
        patient_age=payload.patient_age,
        patient_gender=payload.patient_gender,
        patient_city=payload.patient_city.strip(),
        illness_description=payload.illness_description.strip(),
        speciality_requested=payload.speciality_requested.strip(),
        appointment_date=payload.appointment_date,
        time_slot=payload.time_slot.strip(),
        status=AppointmentStatus.CONFIRMED,
        created_at=datetime.now(timezone.utc)
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    # Broadcast WebSocket Event
    await ws_manager.broadcast_change(
        table="PatientAppointment",
        action="create",
        id=appointment.id,
        hospital_id=hospital.id,
        department=doctor.speciality,
        details={
            "appointment_token": appointment.appointment_token,
            "patient_name": appointment.patient_name,
            "doctor_name": doctor.full_name,
            "speciality": doctor.speciality,
            "time_slot": appointment.time_slot,
            "hospital_name": hospital.name,
            "city": hospital.city
        }
    )

    return AppointmentResponse(
        id=appointment.id,
        appointment_token=appointment.appointment_token,
        hospital_id=hospital.id,
        hospital_name=hospital.name,
        hospital_city=hospital.city,
        hospital_address=hospital.address,
        doctor_id=doctor.id,
        doctor_name=doctor.full_name,
        doctor_qualification=doctor.qualification,
        doctor_speciality=doctor.speciality,
        patient_name=appointment.patient_name,
        patient_phone=appointment.patient_phone,
        patient_email=appointment.patient_email,
        patient_age=appointment.patient_age,
        patient_gender=appointment.patient_gender,
        patient_city=appointment.patient_city,
        illness_description=appointment.illness_description,
        speciality_requested=appointment.speciality_requested,
        appointment_date=appointment.appointment_date,
        time_slot=appointment.time_slot,
        status=appointment.status,
        created_at=appointment.created_at
    )

@router.get("", response_model=List[AppointmentResponse])
def get_appointments(
    hospital_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(PatientAppointment).join(Hospital).join(Doctor)
    if hospital_id:
        query = query.filter(PatientAppointment.hospital_id == hospital_id)
    if doctor_id:
        query = query.filter(PatientAppointment.doctor_id == doctor_id)

    appointments = query.order_by(PatientAppointment.created_at.desc()).all()
    results = []
    for a in appointments:
        results.append(AppointmentResponse(
            id=a.id,
            appointment_token=a.appointment_token,
            hospital_id=a.hospital_id,
            hospital_name=a.hospital.name if a.hospital else None,
            hospital_city=a.hospital.city if a.hospital else None,
            hospital_address=a.hospital.address if a.hospital else None,
            doctor_id=a.doctor_id,
            doctor_name=a.doctor.full_name if a.doctor else None,
            doctor_qualification=a.doctor.qualification if a.doctor else None,
            doctor_speciality=a.doctor.speciality if a.doctor else None,
            patient_name=a.patient_name,
            patient_phone=a.patient_phone,
            patient_email=a.patient_email,
            patient_age=a.patient_age,
            patient_gender=a.patient_gender,
            patient_city=a.patient_city,
            illness_description=a.illness_description,
            speciality_requested=a.speciality_requested,
            appointment_date=a.appointment_date,
            time_slot=a.time_slot,
            status=a.status,
            created_at=a.created_at
        ))
    return results
