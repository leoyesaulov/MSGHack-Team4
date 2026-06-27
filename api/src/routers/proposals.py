from datetime import datetime
from typing import Optional
from pathlib import Path
import uuid
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlmodel import Session, select, func

from ..database import get_session
from ..models import (
    Proposal, ProposalCreate, ProposalRead, ProposalUpdate,
    Vote, VoteRead,
    Comment, CommentCreate, CommentRead,
    ProposalStatus, User,
)
from ..auth import get_current_user, get_current_user_optional, get_current_behoerde

router = APIRouter(prefix="/proposals", tags=["proposals"])

UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def _enrich(proposal: Proposal, session: Session, request: Optional[Request] = None) -> ProposalRead:
    vote_count = session.exec(
        select(func.count()).where(Vote.proposal_id == proposal.id)
    ).one()
    data = ProposalRead.model_validate(proposal)
    data.vote_count = vote_count
    if proposal.author:
        data.author_username = proposal.author.username
        data.author_display_name = proposal.author.display_name
    if proposal.image_path:
        base = str(request.base_url).rstrip("/") if request else ""
        data.image_url = f"{base}/uploads/{proposal.image_path}"
    return data


@router.get("/", response_model=list[ProposalRead])
def list_proposals(
    request: Request,
    status: Optional[ProposalStatus] = None,
    category: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    q = select(Proposal)
    if status:
        q = q.where(Proposal.status == status)
    if category:
        q = q.where(Proposal.category == category)
    if current_user and current_user.gemeinde:
        q = q.where(Proposal.gemeinde == current_user.gemeinde)
    proposals = session.exec(q.order_by(Proposal.created_at.desc())).all()
    for p in proposals:
        _ = p.author
    return [_enrich(p, session, request) for p in proposals]


@router.post("/", response_model=ProposalRead, status_code=201)
def create_proposal(
    request: Request,
    payload: ProposalCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    proposal = Proposal.model_validate(payload, update={
        "author_id": current_user.id,
        "gemeinde": current_user.gemeinde,
    })
    session.add(proposal)
    session.commit()
    session.refresh(proposal)
    _ = proposal.author
    return _enrich(proposal, session, request)


@router.get("/behoerde/inbox", response_model=list[ProposalRead])
def behoerde_inbox(
    request: Request,
    session: Session = Depends(get_session),
    behoerde: User = Depends(get_current_behoerde),
):
    """All actionable proposals for the Behörde's own Gemeinde."""
    actionable_statuses = [
        ProposalStatus.submitted,
        ProposalStatus.accepted,
        ProposalStatus.rejected,
    ]
    q = select(Proposal).where(Proposal.status.in_(actionable_statuses))
    if behoerde.gemeinde:
        q = q.where(Proposal.gemeinde == behoerde.gemeinde)
    q = q.order_by(Proposal.updated_at.desc())
    proposals = session.exec(q).all()
    for p in proposals:
        _ = p.author
    return [_enrich(p, session, request) for p in proposals]


@router.get("/{proposal_id}", response_model=ProposalRead)
def get_proposal(proposal_id: int, request: Request, session: Session = Depends(get_session)):
    proposal = session.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    _ = proposal.author
    return _enrich(proposal, session, request)


@router.delete("/{proposal_id}", status_code=204)
def delete_proposal(
    proposal_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    proposal = session.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nicht autorisiert")
    # Delete related votes and comments first (no cascade configured)
    for vote in session.exec(select(Vote).where(Vote.proposal_id == proposal_id)).all():
        session.delete(vote)
    for comment in session.exec(select(Comment).where(Comment.proposal_id == proposal_id)).all():
        session.delete(comment)
    session.delete(proposal)
    session.commit()


@router.patch("/{proposal_id}", response_model=ProposalRead)
def update_proposal(
    proposal_id: int,
    request: Request,
    payload: ProposalUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    proposal = session.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if not current_user.is_behoerde and proposal.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nicht autorisiert")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(proposal, field, value)
    proposal.updated_at = datetime.utcnow()
    session.add(proposal)
    session.commit()
    session.refresh(proposal)
    _ = proposal.author
    return _enrich(proposal, session, request)


# ---- Image upload ----

@router.post("/{proposal_id}/image", response_model=ProposalRead)
async def upload_image(
    proposal_id: int,
    request: Request,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    proposal = session.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nicht autorisiert")
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Nur JPEG, PNG, WebP oder GIF erlaubt")

    # Check size
    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Datei zu groß (max. 10 MB)")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    filename = f"{proposal_id}_{uuid.uuid4().hex}.{ext}"
    dest = UPLOADS_DIR / filename

    # Delete old image if exists
    if proposal.image_path:
        old = UPLOADS_DIR / proposal.image_path
        if old.exists():
            old.unlink()

    dest.write_bytes(contents)
    proposal.image_path = filename
    proposal.updated_at = datetime.utcnow()
    session.add(proposal)
    session.commit()
    session.refresh(proposal)
    _ = proposal.author
    return _enrich(proposal, session, request)


# ---- Votes ----

@router.get("/{proposal_id}/votes", response_model=list[VoteRead])
def list_votes(proposal_id: int, session: Session = Depends(get_session)):
    proposal = session.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return session.exec(select(Vote).where(Vote.proposal_id == proposal_id)).all()


@router.post("/{proposal_id}/votes", response_model=VoteRead, status_code=201)
def add_vote(
    proposal_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    proposal = session.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal.author_id == current_user.id:
        raise HTTPException(status_code=409, detail="Du kannst deinen eigenen Vorschlag nicht unterstützen")
    existing = session.exec(
        select(Vote).where(Vote.proposal_id == proposal_id, Vote.user_id == current_user.id)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Du hast bereits abgestimmt")

    vote = Vote(proposal_id=proposal_id, user_id=current_user.id)
    session.add(vote)

    vote_count = session.exec(
        select(func.count()).where(Vote.proposal_id == proposal_id)
    ).one() + 1

    if proposal.status == ProposalStatus.open and vote_count > proposal.threshold:
        proposal.status = ProposalStatus.submitted
        proposal.updated_at = datetime.utcnow()
        session.add(proposal)

    session.commit()
    session.refresh(vote)
    return vote


@router.delete("/{proposal_id}/votes", status_code=204)
def remove_vote(
    proposal_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    vote = session.exec(
        select(Vote).where(Vote.proposal_id == proposal_id, Vote.user_id == current_user.id)
    ).first()
    if not vote:
        raise HTTPException(status_code=404, detail="Noch nicht abgestimmt")
    session.delete(vote)
    session.commit()


# ---- Comments ----

@router.get("/{proposal_id}/comments", response_model=list[CommentRead])
def list_comments(proposal_id: int, session: Session = Depends(get_session)):
    proposal = session.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    comments = session.exec(
        select(Comment).where(Comment.proposal_id == proposal_id).order_by(Comment.created_at)
    ).all()
    for c in comments:
        _ = c.author
    result = []
    for c in comments:
        r = CommentRead.model_validate(c)
        if c.author:
            r.author_username = c.author.username
            r.author_display_name = c.author.display_name
        result.append(r)
    return result


@router.post("/{proposal_id}/comments", response_model=CommentRead, status_code=201)
def add_comment(
    proposal_id: int,
    payload: CommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    proposal = session.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    comment = Comment(
        proposal_id=proposal_id,
        author_id=current_user.id,
        text=payload.text,
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    _ = comment.author
    r = CommentRead.model_validate(comment)
    r.author_username = current_user.username
    r.author_display_name = current_user.display_name
    return r
