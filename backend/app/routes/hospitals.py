from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.hospital import Hospital
from app.models.bed import Bed, BedStatus
from app.models.doctor import DoctorBranchAssignment, DoctorDutyStatus
from app.schemas.hospital import HospitalResponse

router = APIRouter(prefix="/hospitals", tags=["Hospital Branches"])

@router.get("", response_model=List[HospitalResponse])
def get_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).order_by(Hospital.id).all()
    results = []
    for h in hospitals:
        avail_beds = db.query(Bed).filter(
            Bed.hospital_id == h.id,
            Bed.current_status == BedStatus.AVAILABLE
        ).count()

        on_duty_docs = db.query(DoctorBranchAssignment).filter(
            DoctorBranchAssignment.hospital_id == h.id,
            DoctorBranchAssignment.duty_status == DoctorDutyStatus.ON_DUTY
        ).count()

        results.append(HospitalResponse(
            id=h.id,
            name=h.name,
            branch_code=h.branch_code,
            city=h.city,
            address=h.address,
            state=h.state,
            latitude=h.latitude,
            longitude=h.longitude,
            phone=h.phone,
            emergency_contact=h.emergency_contact,
            available_beds_count=avail_beds,
            on_duty_doctors_count=on_duty_docs,
            created_at=h.created_at
        ))
    return results

@router.get("/{hospital_id}", response_model=HospitalResponse)
def get_hospital(hospital_id: int, db: Session = Depends(get_db)):
    h = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not h:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital branch not found")

    avail_beds = db.query(Bed).filter(
        Bed.hospital_id == h.id,
        Bed.current_status == BedStatus.AVAILABLE
    ).count()

    on_duty_docs = db.query(DoctorBranchAssignment).filter(
        DoctorBranchAssignment.hospital_id == h.id,
        DoctorBranchAssignment.duty_status == DoctorDutyStatus.ON_DUTY
    ).count()

    return HospitalResponse(
        id=h.id,
        name=h.name,
        branch_code=h.branch_code,
        city=h.city,
        address=h.address,
        state=h.state,
        latitude=h.latitude,
        longitude=h.longitude,
        phone=h.phone,
        emergency_contact=h.emergency_contact,
        available_beds_count=avail_beds,
        on_duty_doctors_count=on_duty_docs,
        created_at=h.created_at
    )
