from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
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
            "is_behoerde": user.is_behoerde,
        },
    }


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user
