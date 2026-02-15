import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Render: dùng DATABASE_URL (PostgreSQL). Local: dùng SQLite.
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    # Render PostgreSQL: thêm sslmode=require khi deploy trên Render (tránh lỗi SSL)
    if os.environ.get("RENDER") == "true" and "postgresql" in DATABASE_URL and "sslmode=" not in DATABASE_URL:
        sep = "&" if "?" in DATABASE_URL else "?"
        DATABASE_URL = DATABASE_URL + sep + "sslmode=require"
    engine = create_engine(DATABASE_URL)
else:
    _db_path = Path(__file__).resolve().parent.parent / "app.db"
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{_db_path}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency FastAPI: tạo session DB cho mỗi request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

