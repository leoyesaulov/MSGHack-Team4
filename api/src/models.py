from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import Field, SQLModel, Relationship


class ProposalStatus(str, Enum):
    draft = "draft"
    open = "open"
    submitted = "submitted"
    accepted = "accepted"
    rejected = "rejected"


class Department(str, Enum):
    tiefbauamt = "Tiefbauamt"
    ordnungsamt = "Ordnungsamt"
    gruenflaechenamt = "Grünflächenamt"
    stadtplanungsamt = "Stadtplanungsamt"
    schulamt = "Schulamt"
    umweltamt = "Umweltamt"
    sonstige = "Sonstige"


# ---- Users ----

class UserBase(SQLModel):
    username: str = Field(unique=True, index=True)
    display_name: str
    email: str = Field(unique=True, index=True)
    district: Optional[str] = None


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    is_behoerde: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    proposals: list["Proposal"] = Relationship(back_populates="author")
    votes: list["Vote"] = Relationship(back_populates="user")
    comments: list["Comment"] = Relationship(back_populates="author")


class UserCreate(SQLModel):
    username: str
    display_name: str
    email: str
    password: str
    district: Optional[str] = None


class UserRead(UserBase):
    id: int
    is_behoerde: bool
    created_at: datetime


# ---- Proposals ----

class ProposalBase(SQLModel):
    title: str
    description_raw: str
    description_refined: Optional[str] = None
    location_name: str
    latitude: float
    longitude: float
    category: str
    department: Optional[Department] = None
    status: ProposalStatus = ProposalStatus.open
    threshold: int = 50
    formal_text: Optional[str] = None
    image_path: Optional[str] = None


class Proposal(ProposalBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    author_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    author: Optional[User] = Relationship(back_populates="proposals")
    votes: list["Vote"] = Relationship(back_populates="proposal")
    comments: list["Comment"] = Relationship(back_populates="proposal")


class ProposalCreate(ProposalBase):
    pass


class ProposalRead(ProposalBase):
    id: int
    author_id: int
    author_username: str = ""
    author_display_name: str = ""
    created_at: datetime
    updated_at: datetime
    vote_count: int = 0
    image_url: Optional[str] = None


class ProposalUpdate(SQLModel):
    title: Optional[str] = None
    description_refined: Optional[str] = None
    status: Optional[ProposalStatus] = None
    department: Optional[Department] = None
    formal_text: Optional[str] = None


# ---- Votes ----

class VoteBase(SQLModel):
    proposal_id: int = Field(foreign_key="proposal.id")


class Vote(VoteBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    proposal: Optional[Proposal] = Relationship(back_populates="votes")
    user: Optional[User] = Relationship(back_populates="votes")


class VoteRead(VoteBase):
    id: int
    user_id: int
    created_at: datetime


# ---- Comments ----

class CommentBase(SQLModel):
    proposal_id: int = Field(foreign_key="proposal.id")
    text: str


class Comment(CommentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    author_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    proposal: Optional[Proposal] = Relationship(back_populates="comments")
    author: Optional[User] = Relationship(back_populates="comments")


class CommentCreate(CommentBase):
    pass


class CommentRead(CommentBase):
    id: int
    author_id: int
    author_username: str = ""
    author_display_name: str = ""
    created_at: datetime
