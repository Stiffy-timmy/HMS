import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    HOD = "hod"
    STAFF = "staff"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    department = Column(String(100), nullable=True)
    registered_passkey = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    hospital = relationship("Hospital", back_populates="users")
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")
    admitted_stays = relationship("PatientStay", back_populates="admitting_user")

class RoleInviteCode(Base):
    __tablename__ = "role_invite_codes"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    role = Column(Enum(UserRole), nullable=False)
    code = Column(String(100), nullable=False, index=True)
    code_hash = Column(String(255), nullable=False)
    department = Column(String(100), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    hospital = relationship("Hospital", back_populates="invite_codes")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="reset_tokens")
