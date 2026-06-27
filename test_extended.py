from database import SessionLocal
from models import User, Proposal, District, ProposalThreshold, Vote
from sqlalchemy import text

def test_extended():
    print("🧪 Starte erweiterten Datenbank-Test mit Städten...")
    db = SessionLocal()
    
    try:
        # 1. Alle Städte anzeigen
        print("\n📊 Städte/Bezirke in der Datenbank:")
        districts = db.query(District).all()
        for d in districts:
            threshold = d.calculate_threshold()
            print(f"   - {d.name}: {d.population:,} Einwohner")
            print(f"     Schwellwert: {threshold} Stimmen ({d.threshold_percentage}%)")
            print(f"     Min: {d.min_threshold}, Max: {d.max_threshold}")
        
        # 2. Test-User erstellen
        test_user = User(
            username="test_buerger2",
            display_name="Test Bürger 2",
            email="test2@example.com",
            hashed_password="test_hash_123",
            district="Berlin-Mitte"
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print(f"\n✅ User erstellt: {test_user.display_name} (ID: {test_user.id})")
        
        # 3. Test-Proposal mit Stadt-Verknüpfung erstellen
        test_proposal = Proposal(
            author_id=test_user.id,
            title="Mein zweiter Bürgerantrag mit Stadtbezirk",
            description_raw="Wir brauchen mehr Fahrradwege in Berlin-Mitte!",
            category="Verkehr",
            status="open",
            threshold=50  # Legacy-Wert, wird nicht mehr verwendet
        )
        db.add(test_proposal)
        db.commit()
        db.refresh(test_proposal)
        print(f"✅ Proposal erstellt: {test_proposal.title} (ID: {test_proposal.id})")
        
        # 4. Proposal mit Stadt verknüpfen (Schwellwert konfigurieren)
        district = db.query(District).filter_by(name="Berlin-Mitte").first()
        
        proposal_threshold = ProposalThreshold(
            proposal_id=test_proposal.id,
            district_id=district.id,
            # Optional: Überschreibe Werte
            # configured_percentage=0.9,
            # configured_min_votes=40
        )
        db.add(proposal_threshold)
        db.commit()
        
        # 5. Schwellwert berechnen
        proposal_threshold.update_threshold()
        print(f"✅ Schwellwert für {district.name}:")
        print(f"   - Berechnet: {proposal_threshold.calculated_threshold} Stimmen")
        print(f"   - Aktuell: {proposal_threshold.current_votes} Stimmen")
        print(f"   - Benötigt: {proposal_threshold.votes_needed} Stimmen")
        
        # 6. Stimmen hinzufügen
        for i in range(3):
            vote = Vote(
                proposal_id=test_proposal.id,
                user_id=test_user.id,  # Gleicher User, aber wir haben nur einen
                vote_type="upvote"
            )
            db.add(vote)
        
        db.commit()
        
        # 7. Aktuelle Stimmen zählen
        vote_count = db.query(Vote).filter_by(proposal_id=test_proposal.id).count()
        proposal_threshold.current_votes = vote_count
        proposal_threshold.update_threshold()
        
        print(f"\n📊 Nach dem Hinzufügen von {vote_count} Stimmen:")
        print(f"   - Aktuell: {proposal_threshold.current_votes} Stimmen")
        print(f"   - Benötigt: {proposal_threshold.votes_needed} Stimmen")
        print(f"   - Schwellwert erreicht: {proposal_threshold.threshold_reached}")
        
        # 8. Prüfen ob Schwellwert erreicht
        if proposal_threshold.check_threshold_reached():
            print("🎉 SCHWELLWERT ERREICHT! Proposal wird an Amt gesendet!")
            # Status des Proposals aktualisieren
            test_proposal.status = 'threshold_reached'
            db.commit()
        
        print("\n🎉 Erweiterter Test erfolgreich!")
        
    except Exception as e:
        print(f"❌ Fehler: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_extended()
