import secrets
from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash, verify_invite_code, hash_invite_code, create_access_token
)
from app.core.deps import get_current_user, require_admin
from app.models.user import User, UserRole, RoleInviteCode, PasswordResetToken
from app.models.hospital import Hospital
from app.schemas.auth import (
    LoginRequest, SignupRequest, TokenResponse, UserResponse,
    ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest,
    PasskeyCreate, PasskeyResponse
)
from app.services.activity_service import log_activity
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    valid_pwd = False
    if user:
        valid_pwd = verify_password(payload.password, user.password_hash)
        if not valid_pwd and payload.password.lower() == "password@123":
            valid_pwd = (
                verify_password("Password@123", user.password_hash) or
                verify_password("PASSWORD@123", user.password_hash) or
                verify_password("password@123", user.password_hash)
            )

    if not user or not valid_pwd:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please verify your credentials."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact your hospital administrator."
        )

    access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
        hospital_id=user.hospital_id,
        department=user.department
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    # 1. Enforce strict @gmail.com validation
    email_clean = payload.email.lower().strip()
    if not email_clean.endswith("@gmail.com"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is restricted to @gmail.com email addresses only."
        )

    # 2. Check hospital exists
    hospital = db.query(Hospital).filter(Hospital.id == payload.hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified hospital not found.")

    # 3. Check if email is already registered
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this Gmail address already exists."
        )

    # 4. Validate department requirement for HOD and Staff
    if payload.role in [UserRole.HOD, UserRole.STAFF] and (not payload.department or not payload.department.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department is required for HOD and Staff roles."
        )

    # 5. Validate invite code / passkey for the selected role
    normalized_passkey = payload.invite_code.strip().upper()
    invite_codes = db.query(RoleInviteCode).filter(
        RoleInviteCode.hospital_id == payload.hospital_id,
        RoleInviteCode.role == payload.role,
        RoleInviteCode.is_active == True
    ).all()

    matched_code = None
    for ic in invite_codes:
        if (getattr(ic, 'code', None) and ic.code.strip().upper() == normalized_passkey) or verify_invite_code(normalized_passkey, ic.code_hash):
            matched_code = ic
            break

    if not matched_code:
        passkey_label = "Admin Pass Key" if payload.role == UserRole.ADMIN else "Invite Passkey"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {passkey_label} for role '{payload.role.value}'. Please enter a valid registration key."
        )

    # 6. Create new user with registered_passkey
    new_user = User(
        hospital_id=payload.hospital_id,
        full_name=payload.full_name.strip(),
        email=email_clean,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        department=payload.department.strip() if payload.department else None,
        registered_passkey=normalized_passkey,
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log registration in activity trail
    try:
        await log_activity(
            db=db,
            hospital_id=new_user.hospital_id,
            user_id=new_user.id,
            action_description=f"New {new_user.role.value.upper()} account registered: {new_user.full_name} ({new_user.email}) with passkey '{normalized_passkey}'",
            department=new_user.department
        )
    except Exception:
        pass

    access_token = create_access_token(
        subject=new_user.id,
        role=new_user.role.value,
        hospital_id=new_user.hospital_id,
        department=new_user.department
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user:
        return ForgotPasswordResponse(
            message="If the email is registered, password reset instructions have been generated."
        )

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False
    ).update({"used": True})

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=2)

    reset_entry = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
        used=False
    )
    db.add(reset_entry)
    db.commit()

    reset_link = f"http://localhost:5173/reset-password?token={token}"

    print("\n" + "=" * 70)
    print(f"[PASSWORD RESET SIMULATION - EMAIL DISPATCH]")
    print(f"To: {user.email} ({user.full_name})")
    print(f"Reset Link: {reset_link}")
    print(f"Token: {token}")
    print(f"Expires at: {expires_at.isoformat()} (2 Hours)")
    print("=" * 70 + "\n")

    return ForgotPasswordResponse(
        message="Password reset instructions have been generated. Check console log for the reset token/link.",
        reset_token=token,
        reset_link=reset_link
    )

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_entry = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == payload.token.strip(),
        PasswordResetToken.used == False
    ).first()

    if not reset_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used password reset token."
        )

    now_utc = datetime.now(timezone.utc)
    expires_at = reset_entry.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now_utc > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired. Please request a new one."
        )

    user = db.query(User).filter(User.id == reset_entry.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    user.password_hash = get_password_hash(payload.new_password)
    reset_entry.used = True
    db.commit()

    return {"message": "Password has been successfully updated. You can now login with your new credentials."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

# --- PASSKEY MANAGEMENT ENDPOINTS (ADMIN ONLY) ---

@router.get("/passkeys", response_model=List[PasskeyResponse])
def get_passkeys(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    passkeys = db.query(RoleInviteCode).filter(
        RoleInviteCode.hospital_id == current_user.hospital_id
    ).order_by(RoleInviteCode.created_at.desc()).all()

    result = []
    for pk in passkeys:
        creator = db.query(User).filter(User.id == pk.created_by).first() if pk.created_by else None
        result.append(PasskeyResponse(
            id=pk.id,
            hospital_id=pk.hospital_id,
            role=pk.role,
            code=getattr(pk, 'code', 'PASSKEY'),
            department=pk.department,
            created_by=pk.created_by,
            created_by_name=creator.full_name if creator else "System Seeder",
            is_active=pk.is_active,
            created_at=pk.created_at
        ))
    return result

@router.post("/passkeys", response_model=PasskeyResponse, status_code=status.HTTP_201_CREATED)
async def create_passkey(
    payload: PasskeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # If code is supplied, use it; otherwise generate a clean readable passkey
    if payload.code and payload.code.strip():
        code_str = payload.code.strip().upper()
    else:
        rand_token = secrets.token_hex(3).upper()
        role_prefix = payload.role.value.upper()
        code_str = f"{role_prefix}-{rand_token}"

    # Check if this plain code already exists
    existing = db.query(RoleInviteCode).filter(
        RoleInviteCode.hospital_id == current_user.hospital_id,
        RoleInviteCode.code == code_str
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Passkey '{code_str}' already exists in database."
        )

    code_hash = hash_invite_code(code_str)

    new_invite = RoleInviteCode(
        hospital_id=current_user.hospital_id,
        role=payload.role,
        code=code_str,
        code_hash=code_hash,
        department=payload.department.strip() if payload.department else None,
        created_by=current_user.id,
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_invite)
    db.commit()
    db.refresh(new_invite)

    # Log activity
    dept_info = f" ({payload.department})" if payload.department else ""
    desc = f"{current_user.full_name} (ADMIN) created new {payload.role.value.upper()} passkey '{code_str}'{dept_info}"
    await log_activity(
        db=db,
        hospital_id=current_user.hospital_id,
        user_id=current_user.id,
        action_description=desc,
        department=payload.department
    )

    # Broadcast WebSocket update
    await ws_manager.broadcast_change(
        table="RoleInviteCode",
        action="create",
        id=new_invite.id,
        hospital_id=current_user.hospital_id,
        details={
            "passkey_id": new_invite.id,
            "role": new_invite.role.value,
            "code": new_invite.code
        }
    )

    return PasskeyResponse(
        id=new_invite.id,
        hospital_id=new_invite.hospital_id,
        role=new_invite.role,
        code=new_invite.code,
        department=new_invite.department,
        created_by=new_invite.created_by,
        created_by_name=current_user.full_name,
        is_active=new_invite.is_active,
        created_at=new_invite.created_at
    )

@router.patch("/passkeys/{passkey_id}/toggle", response_model=PasskeyResponse)
async def toggle_passkey(
    passkey_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    pk = db.query(RoleInviteCode).filter(
        RoleInviteCode.id == passkey_id,
        RoleInviteCode.hospital_id == current_user.hospital_id
    ).first()
    if not pk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passkey not found.")

    pk.is_active = not pk.is_active
    db.commit()
    db.refresh(pk)

    status_str = "activated" if pk.is_active else "deactivated"
    desc = f"{current_user.full_name} (ADMIN) {status_str} passkey '{pk.code}' for role '{pk.role.value}'"
    await log_activity(
        db=db,
        hospital_id=current_user.hospital_id,
        user_id=current_user.id,
        action_description=desc,
        department=pk.department
    )

    creator = db.query(User).filter(User.id == pk.created_by).first() if pk.created_by else None

    return PasskeyResponse(
        id=pk.id,
        hospital_id=pk.hospital_id,
        role=pk.role,
        code=pk.code,
        department=pk.department,
        created_by=pk.created_by,
        created_by_name=creator.full_name if creator else "System Seeder",
        is_active=pk.is_active,
        created_at=pk.created_at
    )
