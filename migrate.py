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
            result = conn.execute(text("SELECT COUNT(*) FROM districts"))
            count = result.scalar()
            
            if count == 0:
                print("📝 Füge Beispieldaten für Städte ein...")
                
                # Beispiel-Städte einfügen
                districts = [
                    {
                        'name': 'Berlin-Mitte',
                        'population': 400000,
                        'threshold_percentage': 1.0,
                        'min_threshold': 50,
                        'max_threshold': 400
                    },
                    {
                        'name': 'Berlin-Prenzlauer Berg',
                        'population': 170000,
                        'threshold_percentage': 0.8,
                        'min_threshold': 30,
                        'max_threshold': 200
                    },
                    {
                        'name': 'Berlin-Lichtenberg',
                        'population': 300000,
                        'threshold_percentage': 1.2,
                        'min_threshold': 60,
                        'max_threshold': 400
                    },
                    {
                        'name': 'Hamburg-Mitte',
                        'population': 300000,
                        'threshold_percentage': 1.0,
                        'min_threshold': 50,
                        'max_threshold': 350
                    },
                    {
                        'name': 'München-Altstadt',
                        'population': 250000,
                        'threshold_percentage': 0.9,
                        'min_threshold': 40,
                        'max_threshold': 300
                    }
                ]
                
                for dist in districts:
                    conn.execute(
                        text("""
                            INSERT INTO districts (name, population, threshold_percentage, min_threshold, max_threshold)
                            VALUES (:name, :population, :threshold_percentage, :min_threshold, :max_threshold)
                        """),
                        dist
                    )
                
                conn.commit()
                print(f"✅ {len(districts)} Städte/Bezirke eingefügt")
            else:
                print(f"ℹ️  Es existieren bereits {count} Städte/Bezirke in der Datenbank")
        
        print("🎉 Migration erfolgreich abgeschlossen!")
        
    except Exception as e:
        print(f"❌ Fehler bei der Migration: {e}")
        raise

if __name__ == "__main__":
    run_migration()
