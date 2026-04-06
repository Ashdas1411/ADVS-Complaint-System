# complaints.py  —  Complaint submission and retrieval endpoints

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from blockchain_service import generate_complaint_hash

from database import SessionLocal
import models
import schemas
from ml_service import classify_complaint

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/submit-complaint")
def submit_complaint(request: schemas.ComplaintCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    department, category, urgency = classify_complaint(request.description)
    department = department.lower()
    category = category.lower()
    urgency = urgency.lower()

    complaint_hash = generate_complaint_hash(request.description, user.id)

    complaint = models.Complaint(
        user_id         = user.id,
        room_number     = request.room_number,
        description     = request.description,
        department      = department,
        category        = category,
        urgency         = urgency,
        blockchain_hash = complaint_hash,
    )

    db.add(complaint)
    db.commit()

    return {
        "message":     "Complaint submitted",
        "category":    category,
        "urgency":     urgency,
        "department":  department,
        "room_number": request.room_number,
    }


from typing import Optional

@router.get("/complaints")
def get_complaints(email: Optional[str] = None, db: Session = Depends(get_db)):
    if email:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            return []
        return db.query(models.Complaint).filter(models.Complaint.user_id == user.id).all()
    return db.query(models.Complaint).all()


@router.get("/complaints/resolved")
def get_resolved_complaints(staff_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Complaint).filter(models.Complaint.status == "completed")
    if staff_id:
        query = query.filter(models.Complaint.resolved_by == staff_id)
    return query.order_by(models.Complaint.id.desc()).all()

# ─────────────────────────────────────────────────────────────────────────────
#  Mark a complaint as completed
#  PATCH /complaints/{complaint_id}/complete
#
#  Called by maintenance staff from the Route Planner tab when they finish a
#  task.  Sets status = "completed".  All other fields are left untouched.
#  Returns the updated complaint's key fields so the frontend can confirm.
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/complaints/{complaint_id}/complete")
def mark_complaint_complete(complaint_id: int, staff_id: Optional[str] = None, db: Session = Depends(get_db)):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()

    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint {complaint_id} not found.")

    if complaint.status == "completed":
        return {
            "message":      "Already marked as completed.",
            "complaint_id": complaint.id,
            "status":       complaint.status,
        }

    complaint.status      = "completed"
    complaint.resolved_by = staff_id
    db.commit()
    db.refresh(complaint)

    return {
        "message":      "Complaint marked as completed.",
        "complaint_id": complaint.id,
        "status":       complaint.status,
        "room_number":  complaint.room_number,
        "category":     complaint.category,
        "urgency":      complaint.urgency,
    }

@router.post("/complaints/{complaint_id}/review")
def submit_review(complaint_id: int, request: schemas.ComplaintReview, db: Session = Depends(get_db)):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if complaint.status != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed complaints")
    if complaint.review_stars is not None:
        raise HTTPException(status_code=400, detail="Already reviewed")
    if not (1 <= request.stars <= 5):
        raise HTTPException(status_code=400, detail="Stars must be between 1 and 5")
    complaint.review_stars = request.stars
    complaint.review_text  = (request.text or "").strip() or None
    db.commit()
    db.refresh(complaint)
    return {"message": "Review submitted", "stars": complaint.review_stars}