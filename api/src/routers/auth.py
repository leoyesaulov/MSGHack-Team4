from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlmodel import Session, select

from ..database import get_session
from ..models import User, UserCreate, UserRead
from ..auth import hash_password, verify_password, create_access_token, get_current_user
from ..quorum import state_name_to_iso

router = APIRouter(prefix="/auth", tags=["auth"])


async def fetch_gemeinde_geodata(gemeinde: str) -> tuple[Optional[str], Optional[int]]:
    """Return (bundesland_iso, population) for a Gemeinde via Nominatim. Returns (None, None) on failure."""
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": f"{gemeinde}, Germany",
            "format": "json",
            "addressdetails": "1",
            "extratags": "1",
            "limit": "1",
        }
        headers = {"User-Agent": "CityVoice/1.0 (hackathon project)"}
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            data = resp.json()
        if not data:
            return None, None
        result = data[0]
        address = result.get("address", {})
        # State can be in "state" field, or derived from ISO3166-2-lvl4
        state_name = address.get("state")
        if not state_name:
            iso_raw = address.get("ISO3166-2-lvl4", "")  # e.g. "DE-BE"
            bundesland_iso = iso_raw if iso_raw.startswith("DE-") else None
        else:
            bundesland_iso = state_name_to_iso(state_name)

        pop_raw = result.get("extratags", {}).get("population")
        population = int(pop_raw) if pop_raw and str(pop_raw).isdigit() else None

        return bundesland_iso, population
    except Exception:
        return None, None


@router.post("/register", response_model=UserRead, status_code=201)
async def register(payload: UserCreate, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.username == payload.username)).first():
        raise HTTPException(status_code=409, detail="Benutzername bereits vergeben")
    if session.exec(select(User).where(User.email == payload.email)).first():
        raise HTTPException(status_code=409, detail="E-Mail-Adresse bereits registriert")

    bundesland, population = None, None
    if payload.gemeinde:
        bundesland, population = await fetch_gemeinde_geodata(payload.gemeinde)

    user = User(
        username=payload.username,
        display_name=payload.display_name,
        email=payload.email,
        district=payload.district,
        gemeinde=payload.gemeinde,
        bundesland=bundesland,
        population=population,
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
            "bundesland": user.bundesland,
            "population": user.population,
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
async def update_me(
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

    if payload.gemeinde is not None and payload.gemeinde != current_user.gemeinde:
        current_user.gemeinde = payload.gemeinde
        bundesland, population = await fetch_gemeinde_geodata(payload.gemeinde)
        current_user.bundesland = bundesland
        current_user.population = population

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user
