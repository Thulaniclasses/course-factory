"""Course Factory backend database."""
import os
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import (Column, Integer, String, Text, DateTime, Boolean,
                        create_engine)
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv(Path(__file__).resolve().parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set in backend/.env")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False)
    password_hash = Column(String(255))
    role = Column(String(32), default="lecturer")
    created_at = Column(DateTime, default=datetime.utcnow)


class Course(Base):
    __tablename__ = "courses"
    id = Column(String(64), primary_key=True)     # UUID stored as string
    user_id = Column(Integer, nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    source_text = Column(Text)
    raw_json = Column(Text, nullable=False)       # full GeneratedCourse as JSON
    generated_at = Column(String(64))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    published = Column(Boolean, default=True)


def init_db():
    Base.metadata.create_all(engine)


def get_session():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()
