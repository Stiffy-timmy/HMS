from app.schemas.auth import (
    UserResponse, LoginRequest, SignupRequest, TokenResponse,
    ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest,
    PasskeyCreate, PasskeyResponse
)
from app.schemas.hospital import HospitalResponse
from app.schemas.bed import BedResponse, BedStatusUpdate, BedCreate
from app.schemas.patient_stay import PatientStayResponse, PatientStayCreate
from app.schemas.billing import BillingResponse
from app.schemas.lab_order import LabOrderResponse, LabOrderUpdateStatus
from app.schemas.conflict import ConflictLogResponse
from app.schemas.activity import ActivityLogResponse
from app.schemas.dashboard import AdminDashboardStats, HODDashboardStats, StaffDashboardStats, RoomTypeStats

__all__ = [
    "UserResponse", "LoginRequest", "SignupRequest", "TokenResponse",
    "ForgotPasswordRequest", "ForgotPasswordResponse", "ResetPasswordRequest",
    "PasskeyCreate", "PasskeyResponse",
    "HospitalResponse", "BedResponse", "BedStatusUpdate", "BedCreate",
    "PatientStayResponse", "PatientStayCreate", "BillingResponse",
    "LabOrderResponse", "LabOrderUpdateStatus", "ConflictLogResponse",
    "ActivityLogResponse", "AdminDashboardStats", "HODDashboardStats",
    "StaffDashboardStats", "RoomTypeStats"
]
