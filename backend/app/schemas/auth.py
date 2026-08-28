from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.user import UserRole

class UserResponse(BaseModel):
    id: int
    hospital_id: int
    full_name: str
    email: EmailStr
    role: UserRole
    department: Optional[str] = None
    registered_passkey: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SignupRequest(BaseModel):
    hospital_id: int = 1
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole
    department: Optional[str] = None
    invite_code: str = Field(..., min_length=1)

    @field_validator("email")
    @classmethod
    def validate_gmail(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not cleaned.endswith("@gmail.com"):
            raise ValueError("Only @gmail.com email addresses are allowed for registration.")
        return cleaned

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: Optional[str] = None
    reset_link: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class PasskeyCreate(BaseModel):
    role: UserRole
    code: Optional[str] = None
    department: Optional[str] = None

class PasskeyResponse(BaseModel):
    id: int
    hospital_id: int
    role: UserRole
    code: str
    department: Optional[str] = None
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
