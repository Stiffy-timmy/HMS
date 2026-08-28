from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import bcrypt
import jwt
from app.core.config import settings

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def hash_invite_code(code: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(code.strip().upper().encode("utf-8"), salt).decode("utf-8")

def verify_invite_code(plain_code: str, hashed_code: str) -> bool:
    try:
        return bcrypt.checkpw(plain_code.strip().upper().encode("utf-8"), hashed_code.encode("utf-8"))
    except Exception:
        return False

def create_access_token(subject: Any, role: str, hospital_id: int, department: Optional[str] = None, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "role": role,
        "hospital_id": hospital_id,
        "department": department,
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
