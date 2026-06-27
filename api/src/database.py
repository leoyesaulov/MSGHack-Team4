import os
from sqlmodel import SQLModel, Session, create_engine

# 1. Fetch individual variables (with your default fallbacks)
db_user = os.getenv("DB_USER", "dbuser")
db_pass = os.getenv("DB_PASSWORD", "dbpass")
db_name = os.getenv("DB_NAME", "cityvoice")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{db_user}:{dbpass}@db/{db_name}",
)

engine = create_engine(DATABASE_URL)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
