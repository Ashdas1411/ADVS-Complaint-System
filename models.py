# models.py  —  SQLAlchemy models for ADVS Smart Hostel System

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String(255), unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OTP(Base):
    __tablename__ = "otp_codes"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String(255))
    otp        = Column(String(6))
    expires_at = Column(DateTime)


class Complaint(Base):
    __tablename__ = "complaints"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"))
    room_number      = Column(String(20), nullable=True)   
    description      = Column(Text)
    department       = Column(String(50))
    category         = Column(String(100))
    urgency          = Column(String(50))
    blockchain_hash  = Column(String(255))
    status           = Column(String(50), default="pending")
    resolved_by      = Column(String(50), nullable=True)
    review_stars     = Column(Integer,    nullable=True)
    review_text      = Column(Text,       nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())


class MaintenanceStaff(Base):
    __tablename__ = "maintenance_staff"

    id           = Column(Integer, primary_key=True, index=True)
    staff_id     = Column(String(50), unique=True, index=True)
    name         = Column(String(100))
    password_hash = Column(String(255))
    hostel_zone  = Column(String(10))   # "MH" or "WH"
    block        = Column(String(5), nullable=True)   # e.g. "Q", "R", "A"
    created_at   = Column(DateTime(timezone=True), server_default=func.now())