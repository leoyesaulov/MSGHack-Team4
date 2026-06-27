from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, DECIMAL, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    district = Column(String(100))
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    proposals = relationship("Proposal", back_populates="author")
    votes = relationship("Vote", back_populates="user")
    comments = relationship("Comment", back_populates="author")

class District(Base):
    __tablename__ = 'districts'
    
    id = Column(Integer, primary_key=True)
    ars = Column(String(12), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    population = Column(Integer, nullable=False)
    last_updated = Column(DateTime)
    rule_type = Column(String(20), default='percentage') #fixed, percentage, mixed
    threshold_percentage = Column(DECIMAL(5,2))
    fixed_threshold = Column(Integer)
    min_threshold = Column(Integer, default=50)
    max_threshold = Column(Integer, default=500)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Beziehungen
    proposal_thresholds = relationship("ProposalThreshold", back_populates="district")
    
    def calculate_threshold(self, category=None):
        """berechnet dynamischen Schwellwert basierend auf Stadt-Regel"""
        if not self.population:
            raise ValueError(f"Keine Bevölkerungsdaten für {self.name} (ARS: {self.ars}).Bitte API-Update durchführen!")

        if self.rule_type == 'fixed':
            if self.fixed_threshold is None:
                raise ValueError(f"Für {self.name} ist Regel-Typ 'fixed' gesetzt, aber fixed_threshold ist None.")
            return self.fixed_threshold

        elif self.rule_type == 'percentage':
            if self.threshold_percentage is None:
                raise ValueError(f"Für {self.name} ist Regel-Typ 'percentage' gesetzt, aber fixed_threshold ist None.")
            return int(self.population*self.threshold_percentage/ 100)
        
        elif self.rule_type == 'mixed':
            if any([self.threshold_percentage is None, self.min_threshold is None, self.max_threshold is None]):
                raise ValueError(f"threshold_percentage, min_threshold oder max_threshold fehlt für {self.name}")
            calculated = int(self.population * self.threshold_percentage/100)
            return max(self.min_threshold, min(self.max_threshold, calculated))
        else: 
            raise ValueError(f"Unbekannter Regel-Typ '{self.rule_type}' für {self.name}.Erlaubt sind: 'fixed', 'percentage', 'mixed' ")

class Proposal(Base):
    __tablename__ = 'proposals'
    
    id = Column(Integer, primary_key=True)
    author_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    title = Column(String(255), nullable=False)
    description_raw = Column(Text, nullable=False)
    description_refined = Column(Text)
    location_name = Column(String(255))
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    category = Column(String(100), nullable=False)
    department = Column(String(100))
    status = Column(String(50), default='draft')
    threshold = Column(Integer, default=50)
    formal_text = Column(Text)
    image_path = Column(String(500))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    author = relationship("User", back_populates="proposals")
    votes = relationship("Vote", back_populates="proposal")
    comments = relationship("Comment", back_populates="proposal")
    thresholds = relationship("ProposalThreshold", back_populates="proposal", cascade="all, delete-orphan")

class ProposalThreshold(Base):
    __tablename__ = 'proposal_thresholds'
    
    id = Column(Integer, primary_key=True)
    proposal_id = Column(Integer, ForeignKey('proposals.id', ondelete='CASCADE'))
    district_id = Column(Integer, ForeignKey('districts.id', ondelete='CASCADE'))
    
    # Manuelle Überschreibung (optional)
    configured_percentage = Column(DECIMAL(5,2))
    configured_min_votes = Column(Integer)
    
    # Berechnete Werte
    calculated_threshold = Column(Integer)
    current_votes = Column(Integer, default=0)
    votes_needed = Column(Integer)
    
    # Status-Tracking
    threshold_reached = Column(Boolean, default=False)
    reached_at = Column(DateTime)
    was_successful = Column(Boolean, default=False)
    success_factor_analysis = Column(Text)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Beziehungen
    proposal = relationship("Proposal", back_populates="thresholds")
    district = relationship("District", back_populates="proposal_thresholds")
    
    __table_args__ = (
        UniqueConstraint('proposal_id', 'district_id', name='uq_proposal_district'),
    )
    
    def update_threshold(self):
        """Aktualisiert den Schwellwert basierend auf District-Einstellungen"""
        # Verwende konfigurierte Werte oder Fallback auf District
        percentage = self.configured_percentage or self.district.threshold_percentage
        min_votes = self.configured_min_votes or self.district.min_threshold
        
        # Berechne dynamischen Schwellwert
        self.calculated_threshold = int(self.district.population * percentage / 100)
        self.calculated_threshold = max(min_votes, self.calculated_threshold)
        
        # Aktualisiere benötigte Stimmen
        self.votes_needed = max(0, self.calculated_threshold - (self.current_votes or 0))
        
        return self.calculated_threshold
    
    def check_threshold_reached(self):
        """Prüft ob der Schwellwert erreicht wurde"""
        if self.current_votes >= self.calculated_threshold:
            self.threshold_reached = True
            self.reached_at = func.now()
            return True
        return False

class Vote(Base):
    __tablename__ = 'votes'
    
    id = Column(Integer, primary_key=True)
    proposal_id = Column(Integer, ForeignKey('proposals.id', ondelete='CASCADE'))
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    vote_type = Column(String(20), default='upvote')
    created_at = Column(DateTime, server_default=func.now())
    
    proposal = relationship("Proposal", back_populates="votes")
    user = relationship("User", back_populates="votes")
    
    __table_args__ = (
        UniqueConstraint('proposal_id', 'user_id', name='uq_vote_proposal_user'),
    )

class Comment(Base):
    __tablename__ = 'comments'
    
    id = Column(Integer, primary_key=True)
    proposal_id = Column(Integer, ForeignKey('proposals.id', ondelete='CASCADE'))
    author_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    proposal = relationship("Proposal", back_populates="comments")
    author = relationship("User", back_populates="comments")
