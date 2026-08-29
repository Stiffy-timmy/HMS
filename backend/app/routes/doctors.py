from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.doctor import Doctor, DoctorBranchAssignment, DoctorDutyStatus
from app.models.hospital import Hospital
from app.schemas.doctor import DoctorResponse, DoctorAssignmentResponse, DoctorDutyStatusUpdate
from app.services.activity_service import log_activity
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/doctors", tags=["Doctors & Duty Roster"])

@router.get("", response_model=List[DoctorResponse])
def get_doctors(
    speciality: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Doctor)
    if speciality:
        query = query.filter(Doctor.speciality.ilike(f"%{speciality.strip()}%"))
    return query.order_by(Doctor.speciality, Doctor.full_name).all()

@router.get("/assignments", response_model=List[DoctorAssignmentResponse])
def get_doctor_assignments(
    hospital_id: Optional[int] = None,
    department: Optional[str] = None,
    duty_status: Optional[DoctorDutyStatus] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DoctorBranchAssignment).join(Doctor).join(Hospital)
    if hospital_id:
        query = query.filter(DoctorBranchAssignment.hospital_id == hospital_id)
    if department:
        query = query.filter(DoctorBranchAssignment.department.ilike(f"%{department.strip()}%"))
    if duty_status:
        query = query.filter(DoctorBranchAssignment.duty_status == duty_status)

    assignments = query.order_by(Hospital.name, DoctorBranchAssignment.department, Doctor.full_name).all()
    results = []
    for a in assignments:
        results.append(DoctorAssignmentResponse(
            id=a.id,
            doctor_id=a.doctor_id,
            hospital_id=a.hospital_id,
            hospital_name=a.hospital.name if a.hospital else None,
            hospital_city=a.hospital.city if a.hospital else None,
            branch_code=a.hospital.branch_code if a.hospital else None,
            doctor_name=a.doctor.full_name if a.doctor else None,
            doctor_qualification=a.doctor.qualification if a.doctor else None,
            doctor_speciality=a.doctor.speciality if a.doctor else None,
            consultation_fee=a.doctor.consultation_fee if a.doctor else 800.0,
            department=a.department,
            duty_status=a.duty_status,
            room_number=a.room_number,
            shift_timings=a.shift_timings,
            days_available=a.days_available,
            last_updated_at=a.last_updated_at,
            updated_by_name=a.updated_by.full_name if a.updated_by else None
        ))
    return results

@router.patch("/assignments/{assignment_id}/duty-status", response_model=DoctorAssignmentResponse)
async def update_doctor_duty_status(
    assignment_id: int,
    payload: DoctorDutyStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignment = db.query(DoctorBranchAssignment).filter(DoctorBranchAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor assignment not found")

    old_status = assignment.duty_status.value
    assignment.duty_status = payload.duty_status
    if payload.room_number:
        assignment.room_number = payload.room_number.strip()
    if payload.shift_timings:
        assignment.shift_timings = payload.shift_timings.strip()
    if payload.department:
        assignment.department = payload.department.strip()

    assignment.last_updated_at = datetime.now(timezone.utc)
    assignment.updated_by_id = current_user.id
    db.commit()
    db.refresh(assignment)

    # Activity Log
    status_label = assignment.duty_status.value.replace("_", " ").title()
    doctor_name = assignment.doctor.full_name if assignment.doctor else f"Doctor #{assignment.doctor_id}"
    branch_name = assignment.hospital.name if assignment.hospital else f"Branch #{assignment.hospital_id}"
    act_desc = f"{current_user.full_name} ({current_user.role.value.upper()}) updated {doctor_name} duty status from '{old_status}' to '{status_label}' in {branch_name} [{assignment.department}]"
    
    await log_activity(
        db=db,
        hospital_id=assignment.hospital_id,
        user_id=current_user.id,
        action_description=act_desc,
        department=assignment.department
    )

    # Broadcast WebSocket Event
    await ws_manager.broadcast_change(
        table="DoctorDutyAssignment",
        action="update",
        id=assignment.id,
        hospital_id=assignment.hospital_id,
        department=assignment.department,
        details={
            "assignment_id": assignment.id,
            "doctor_name": doctor_name,
            "speciality": assignment.doctor.speciality if assignment.doctor else "",
            "old_status": old_status,
            "new_status": assignment.duty_status.value,
            "hospital_id": assignment.hospital_id,
            "branch_name": branch_name,
            "room_number": assignment.room_number
        }
    )

    return DoctorAssignmentResponse(
        id=assignment.id,
        doctor_id=assignment.doctor_id,
        hospital_id=assignment.hospital_id,
        hospital_name=assignment.hospital.name if assignment.hospital else None,
        hospital_city=assignment.hospital.city if assignment.hospital else None,
        branch_code=assignment.hospital.branch_code if assignment.hospital else None,
        doctor_name=assignment.doctor.full_name if assignment.doctor else None,
        doctor_qualification=assignment.doctor.qualification if assignment.doctor else None,
        doctor_speciality=assignment.doctor.speciality if assignment.doctor else None,
        consultation_fee=assignment.doctor.consultation_fee if assignment.doctor else 800.0,
        department=assignment.department,
        duty_status=assignment.duty_status,
        room_number=assignment.room_number,
        shift_timings=assignment.shift_timings,
        days_available=assignment.days_available,
        last_updated_at=assignment.last_updated_at,
        updated_by_name=current_user.full_name
    )
