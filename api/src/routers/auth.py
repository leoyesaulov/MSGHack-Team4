from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlmodel import Session, select

from ..database import get_session
from ..models import User, UserCreate, UserRead
from ..auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=201)
def register(payload: UserCreate, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.username == payload.username)).first():
        raise HTTPException(status_code=409, detail="Benutzername bereits vergeben")
    if session.exec(select(User).where(User.email == payload.email)).first():
        raise HTTPException(status_code=409, detail="E-Mail-Adresse bereits registriert")
    user = User(
        username=payload.username,
        display_name=payload.display_name,
        email=payload.email,
        district=payload.district,
        gemeinde=payload.gemeinde,
        hashed_password=hash_password(payload.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == form.username)).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falscher Benutzername oder falsches Passwort",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(user.id, user.username)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "email": user.email,
            "district": user.district,
            "gemeinde": user.gemeinde,
            "is_behoerde": user.is_behoerde,
        },
    }


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    username: Optional[str] = None
    gemeinde: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


@router.patch("/me", response_model=UserRead)
def update_me(
    payload: ProfileUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(status_code=400, detail="Aktuelles Passwort erforderlich")
        if not verify_password(payload.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Aktuelles Passwort ist falsch")
        current_user.hashed_password = hash_password(payload.new_password)

    if payload.username and payload.username != current_user.username:
        existing = session.exec(select(User).where(User.username == payload.username)).first()
        if existing:
            raise HTTPException(status_code=409, detail="Benutzername bereits vergeben")
        current_user.username = payload.username

    if payload.display_name is not None:
        current_user.display_name = payload.display_name

    if payload.gemeinde is not None:
        current_user.gemeinde = payload.gemeinde

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user
