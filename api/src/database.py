from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import text
import os

db_user = os.getenv("POSTGRES_USER", "dbuser")
db_pass = os.getenv("POSTGRES_PASSWORD", "dbpass")
db_name = os.getenv("POSTGRES_DB", "cityvoice")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{db_user}:{db_pass}@172.18.0.2:5432/{db_name}",
)

engine = create_engine(DATABASE_URL)


def create_db_and_tables():
    # Enable pgvector extension (best-effort — server may not have it installed)
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
    except Exception as e:
        print(f"Warning: Could not enable pgvector extension: {e}")

    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
