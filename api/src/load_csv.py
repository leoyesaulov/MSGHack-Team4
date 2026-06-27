"""Load Bürgeranträge.csv and populate database with embeddings."""
import csv
import json
from pathlib import Path
from sqlmodel import Session, select
from .database import engine
from .models import Proposal, ProposalStatus, User
from .rag import create_embedding


CSV_PATH = Path(__file__).parent.parent.parent / "Bürgeranträge.csv"


def load_buergerantraege_csv():
    """Load CSV file with existing Bürgeranträge and store with embeddings."""
    with Session(engine) as session:
        # Check if we already have imported proposals
        existing = session.exec(
            select(Proposal).where(Proposal.title.like("CSV:%"))
        ).first()
        if existing:
            print("CSV proposals already loaded, skipping.")
            return

        # Get or create a system user for CSV imports
        system_user = session.exec(
            select(User).where(User.username == "system_csv_import")
        ).first()
        if not system_user:
            from .auth import hash_password
            system_user = User(
                username="system_csv_import",
                display_name="CSV Import System",
                email="system@cityvoice.internal",
                hashed_password=hash_password("no-login-allowed"),
                is_behoerde=False
            )
            session.add(system_user)
            session.flush()

        if not CSV_PATH.exists():
            print(f"CSV file not found at {CSV_PATH}")
            return

        # Read CSV with proper encoding - try different encodings
        encodings_to_try = ['utf-8-sig', 'latin-1', 'cp1252', 'iso-8859-1']
        reader = None
        f = None

        for encoding in encodings_to_try:
            try:
                f = open(CSV_PATH, 'r', encoding=encoding)
                reader = csv.DictReader(f, delimiter=';')
                # Try to read first row to validate encoding
                first_row = next(reader, None)
                if first_row:
                    # Reset file pointer
                    f.seek(0)
                    reader = csv.DictReader(f, delimiter=';')
                    print(f"Successfully opened CSV with encoding: {encoding}")
                    break
            except (UnicodeDecodeError, StopIteration):
                if f:
                    f.close()
                continue

        if not reader or not f:
            print(f"Could not read CSV file with any encoding")
            return

        imported = 0
        for row in reader:
            titel = row.get('Titel', '').strip()
            massnahmen = row.get('Maßnahmen', '').strip()
            begruendung = row.get('Begründung', '').strip()

            if not titel:
                continue

            # Combine all text for embedding
            full_text = f"{titel}\n\n{massnahmen}\n\n{begruendung}"

            # Create embedding
            try:
                print(f"Creating embedding for: {titel[:50].encode('utf-8', errors='replace').decode('utf-8')}...")
            except:
                print(f"Creating embedding for proposal...")
            embedding_vec = create_embedding(full_text)

            # Create proposal (mark with CSV: prefix to identify imported ones)
            proposal = Proposal(
                title=f"CSV: {titel}",
                description_raw=full_text,
                description_refined=massnahmen if massnahmen else None,
                location_name="Unbekannt",  # CSV doesn't have location
                latitude=48.2,  # Default coords
                longitude=11.6,
                category="Importiert",
                status=ProposalStatus.accepted,  # CSV imports are accepted proposals
                threshold=50,
                formal_text=begruendung if begruendung else None,
                author_id=system_user.id,
                embedding=embedding_vec  # Store as list, pgvector handles it
            )
            session.add(proposal)
            imported += 1

        if f:
            f.close()

        session.commit()
        print(f"Imported {imported} proposals from CSV with embeddings.")


if __name__ == "__main__":
    load_buergerantraege_csv()
