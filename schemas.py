from typing import Optional
from pydantic import BaseModel, EmailStr


class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerify(BaseModel):
    email: EmailStr
    otp: str


class ComplaintCreate(BaseModel):
    email:       EmailStr
    description: str
    room_number: Optional[str] = None  

class StaffRegister(BaseModel):
    staff_id:    str
    name:        str
    password:    str
    hostel_zone: str
    block:       str

class StaffUpdate(BaseModel):
    staff_id:    str
    name:        Optional[str] = None
    password:    Optional[str] = None
    hostel_zone: Optional[str] = None
    block:       Optional[str] = None

class StaffLogin(BaseModel):
    staff_id: str
    password: str

class StaffLoginResponse(BaseModel):
    message:     str
    staff_id:    str
    name:        str
    hostel_zone: str

class StaffRegisterWithOTP(BaseModel):
    staff_id:    str
    name:        str
    password:    str
    hostel_zone: str
    block:       str
    email:       str
    otp:         str

class ComplaintReview(BaseModel):
    stars: int
    text:  Optional[str] = None