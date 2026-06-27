from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import text
import os
import time
from sqlalchemy.exc import OperationalError

db_user = os.getenv("POSTGRES_USER", "dbuser")
db_pass = os.getenv("POSTGRES_PASSWORD", "dbpass")
db_name = os.getenv("POSTGRES_DB", "cityvoice")
db_host = os.getenv("POSTGRES_HOST", "db")  # Use 'db' hostname in Docker Compose

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{db_user}:{db_pass}@{db_host}:5432/{db_name}",
)

engine = create_engine(DATABASE_URL)


def create_db_and_tables():
    # Wait for database to be ready (max 30 seconds)
    max_retries = 30
    for i in range(max_retries):
        try:
            with engine.connect() as conn:
                # Enable pgvector extension
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                conn.commit()
            break
        except OperationalError as e:
            if i == max_retries - 1:
                raise
            print(f"Database not ready yet, retrying in 1 second... ({i+1}/{max_retries})")
            time.sleep(1)

    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
