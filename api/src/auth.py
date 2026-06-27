from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from .database import get_session
from .models import User

SECRET_KEY = "cityvoice-dev-secret-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int, username: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "username": username, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Ungültige oder abgelaufene Sitzung",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise credentials_exc
    user = session.get(User, user_id)
    if not user:
        raise credentials_exc
    return user


def get_current_behoerde(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_behoerde:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nur Behördenaccounts haben Zugriff")
    return current_user


def get_current_user_optional(token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)), session: Session = Depends(get_session)) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
        return session.get(User, user_id)
    except Exception:
        return None
