from models import Base
from database import engine
from sqlalchemy import text

def run_migration():
    print("🚀 Starte Datenbank-Migration...")
    
    try:
        with engine.connect() as conn:
            print("✅ Datenbankverbindung erfolgreich")
        
        Base.metadata.create_all(bind=engine)
        print("✅ Tabellen erfolgreich erstellt")
        with engine.connect() as conn:
            # Prüfen ob schon Daten existieren
          
        
        print("🎉 Migration erfolgreich abgeschlossen!")
        
    except Exception as e:
        print(f"❌ Fehler bei der Migration: {e}")
        raise

if __name__ == "__main__":
    run_migration()
