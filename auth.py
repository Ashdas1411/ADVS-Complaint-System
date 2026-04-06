import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
import models
import schemas

import smtplib
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__truncate_error=False
)

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/generate-otp")
def generate_otp(request: schemas.OTPRequest, db: Session = Depends(get_db)):
    otp = str(random.randint(100000, 999999))
    expiry = datetime.utcnow() + timedelta(minutes=5)

    otp_entry = models.OTP(
        email=request.email,
        otp=otp,
        expires_at=expiry
    )

    db.add(otp_entry)
    db.commit()

    send_email_otp(request.email, otp)

    return {
        "message": "OTP sent to email"
    }


@router.post("/verify-otp")
def verify_otp(request: schemas.OTPVerify, db: Session = Depends(get_db)):
    otp_record = (
        db.query(models.OTP)
        .filter(models.OTP.email == request.email)
        .order_by(models.OTP.id.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP not found")

    if otp_record.otp != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if otp_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    # Check if user exists
    user = db.query(models.User).filter(models.User.email == request.email).first()

    if not user:
        user = models.User(email=request.email)
        db.add(user)
        db.commit()

    return {"message": "Login successful"}

def send_email_otp(to_email, otp):
    sender_email = os.getenv("EMAIL_ADDRESS")
    sender_password = os.getenv("EMAIL_PASSWORD")

    subject = "Your OTP Code"
    body = f"Your OTP for the ADVS Complaint system is: {otp}"

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())
    except Exception as e:
        print("Email error:", e)

@router.post("/staff/register")
def register_staff(request: schemas.StaffRegister, db: Session = Depends(get_db)):
    existing = db.query(models.MaintenanceStaff).filter(
        models.MaintenanceStaff.staff_id == request.staff_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Staff ID already registered")

    hostel_zone = request.hostel_zone.strip().upper()
    if hostel_zone not in ("MH", "WH"):
        raise HTTPException(status_code=400, detail="hostel_zone must be 'MH' or 'WH'")

    block = request.block.strip().upper()

    hashed = pwd_context.hash(request.password)
    staff = models.MaintenanceStaff(
        staff_id      = request.staff_id.strip(),
        name          = request.name.strip(),
        password_hash = hashed,
        hostel_zone   = hostel_zone,
        block         = block,
    )
    db.add(staff)
    db.commit()
    return {"message": "Staff account created successfully"}


@router.post("/staff/login")
def login_staff(request: schemas.StaffLogin, db: Session = Depends(get_db)):
    staff = db.query(models.MaintenanceStaff).filter(
        models.MaintenanceStaff.staff_id == request.staff_id.strip()
    ).first()

    if not staff:
        raise HTTPException(status_code=400, detail="Invalid Staff ID or password")

    if not pwd_context.verify(request.password, staff.password_hash):
        raise HTTPException(status_code=400, detail="Invalid Staff ID or password")

    return {
        "message":     "Login successful",
        "staff_id":    staff.staff_id,
        "name":        staff.name,
        "hostel_zone": staff.hostel_zone,
        "block":       staff.block or "",
    }

@router.patch("/staff/update")
def update_staff(request: schemas.StaffUpdate, db: Session = Depends(get_db)):
    staff = db.query(models.MaintenanceStaff).filter(
        models.MaintenanceStaff.staff_id == request.staff_id.strip()
    ).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    if request.name is not None:
        staff.name = request.name.strip()
    if request.hostel_zone is not None:
        zone = request.hostel_zone.strip().upper()
        if zone not in ("MH", "WH"):
            raise HTTPException(status_code=400, detail="hostel_zone must be 'MH' or 'WH'")
        staff.hostel_zone = zone
    if request.block is not None:
        staff.block = request.block.strip().upper()
    if request.password is not None and request.password.strip() != "":
        staff.password_hash = pwd_context.hash(request.password)

    db.commit()
    db.refresh(staff)
    return {
        "message":     "Profile updated",
        "staff_id":    staff.staff_id,
        "name":        staff.name,
        "hostel_zone": staff.hostel_zone,
        "block":       staff.block or "",
    }


@router.delete("/staff/delete")
def delete_staff(staff_id: str, db: Session = Depends(get_db)):
    staff = db.query(models.MaintenanceStaff).filter(
        models.MaintenanceStaff.staff_id == staff_id.strip()
    ).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    db.delete(staff)
    db.commit()
    return {"message": "Account deleted"}


@router.post("/staff/register-with-otp")
def register_staff_with_otp(request: schemas.StaffRegisterWithOTP, db: Session = Depends(get_db)):
    otp_record = (
        db.query(models.OTP)
        .filter(models.OTP.email == request.email)
        .order_by(models.OTP.id.desc())
        .first()
    )
    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP not found")
    if otp_record.otp != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if otp_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    existing = db.query(models.MaintenanceStaff).filter(
        models.MaintenanceStaff.staff_id == request.staff_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Staff ID already registered")

    hostel_zone = request.hostel_zone.strip().upper()
    if hostel_zone not in ("MH", "WH"):
        raise HTTPException(status_code=400, detail="hostel_zone must be 'MH' or 'WH'")

    hashed = pwd_context.hash(request.password)
    staff = models.MaintenanceStaff(
        staff_id      = request.staff_id.strip(),
        name          = request.name.strip(),
        password_hash = hashed,
        hostel_zone   = hostel_zone,
        block         = request.block.strip().upper(),
    )
    db.add(staff)
    db.commit()
    return {"message": "Account created successfully"}