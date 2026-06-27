from database import SessionLocal
from models import User, Proposal, Vote

def test_database():
    print("🧪 Starte Datenbank-Test...")
    db = SessionLocal()
    
    try:
        test_user = User(
            username="test_buerger",
            display_name="Test Bürger",
            email="test@example.com",
            hashed_password="test_hash_123",
            district="Mitte"
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print(f"✅ User erstellt: {test_user.display_name} (ID: {test_user.id})")
        
        test_proposal = Proposal(
            author_id=test_user.id,
            title="Mein erster Bürgerantrag",
            description_raw="Ich möchte mehr Bänke im Park.",
            category="Umwelt",
            status="draft",
            threshold=50
        )
        db.add(test_proposal)
        db.commit()
        db.refresh(test_proposal)
        print(f"✅ Proposal erstellt: {test_proposal.title} (ID: {test_proposal.id})")
        
        test_vote = Vote(
            proposal_id=test_proposal.id,
            user_id=test_user.id,
            vote_type="upvote"
        )
        db.add(test_vote)
        db.commit()
        print(f"✅ Stimme abgegeben für Proposal {test_proposal.id}")
        
        print("\n📊 Aktuelle Daten:")
        print(f"   - User: {test_user.display_name}")
        print(f"   - Proposal: {test_proposal.title}")
        print(f"   - Votes: 1")
        print(f"   - Benötigt: {test_proposal.threshold}")
        
        print("\n🎉 Datenbank-Test erfolgreich!")
        
    except Exception as e:
        print(f"❌ Fehler: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_database()
