from typing import List, Dict, Optional, Any
from pydantic import BaseModel
from app.schemas.bed import BedResponse
from app.schemas.patient_stay import PatientStayResponse
from app.schemas.lab_order import LabOrderResponse
from app.schemas.conflict import ConflictLogResponse
from app.schemas.activity import ActivityLogResponse
from app.schemas.auth import UserResponse

class RoomTypeStats(BaseModel):
    room_type: str
    price_per_day: float
    total: int
    available: int
    occupied: int
    reserved: int
    maintenance: int
    cleaning_pending: int = 0

class AdminDashboardStats(BaseModel):
    total_beds: int
    available_beds: int
    occupied_beds: int
    reserved_beds: int
    maintenance_beds: int
    cleaning_pending_beds: int = 0
    room_type_breakdown: List[RoomTypeStats]
    current_admissions_count: int
    discharges_today_count: int
    pending_labs_count: int
    avg_lab_turnaround_minutes: Optional[float] = None
    daily_inpatient_revenue: float = 0.0
    open_conflicts_count: int = 0
    revenue_at_risk_per_day: float = 0.0

class HODDashboardStats(BaseModel):
    department: str
    total_beds: int
    available_beds: int
    occupied_beds: int
    reserved_beds: int
    maintenance_beds: int
    cleaning_pending_beds: int = 0
    room_type_breakdown: List[RoomTypeStats]
    active_stays_count: int
    pending_labs_count: int
    open_conflicts_count: int = 0


class StaffDashboardStats(BaseModel):
    department: str
    total_beds: int
    available_beds: int
    occupied_beds: int
    reserved_beds: int
    maintenance_beds: int
    cleaning_pending_beds: int = 0
    active_stays_count: int
    pending_labs_count: int

