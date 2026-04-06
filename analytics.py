# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session
# from sqlalchemy import func
# from datetime import datetime, timedelta

# from database import SessionLocal
# import models

# router = APIRouter()


# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()


# @router.get("/analytics")
# def get_analytics(db: Session = Depends(get_db)):
#     total = db.query(models.Complaint).count()

#     category_counts = (
#         db.query(models.Complaint.category, func.count(models.Complaint.id))
#         .group_by(models.Complaint.category)
#         .all()
#     )

#     urgency_counts = (
#         db.query(models.Complaint.urgency, func.count(models.Complaint.id))
#         .group_by(models.Complaint.urgency)
#         .all()
#     )

#     one_hour_ago = datetime.utcnow() - timedelta(hours=1)

#     last_hour_count = (
#         db.query(models.Complaint)
#         .filter(models.Complaint.created_at >= one_hour_ago)
#         .count()
#     )

#     spike_detected = False
#     if total > 0:
#         average_per_hour = total / 24  # simple assumption
#         if last_hour_count > 2 * average_per_hour:
#             spike_detected = True

#     return {
#         "total_complaints": total,
#         "category_distribution": dict(category_counts),
#         "urgency_distribution": dict(urgency_counts),
#         "last_hour_complaints": last_hour_count,
#         "spike_detected": spike_detected
#     }





from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional

from database import SessionLocal
import models

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    total = db.query(models.Complaint).count()

    # 1. Group by the LOWERCASE version of the string to merge duplicates
    category_counts = (
        db.query(func.lower(models.Complaint.category), func.count(models.Complaint.id))
        .group_by(func.lower(models.Complaint.category))
        .all()
    )

    # Apply the same case-insensitive grouping to urgency
    urgency_counts = (
        db.query(func.lower(models.Complaint.urgency), func.count(models.Complaint.id))
        .group_by(func.lower(models.Complaint.urgency))
        .all()
    )

    one_hour_ago = datetime.utcnow() - timedelta(hours=1)

    last_hour_count = (
        db.query(models.Complaint)
        .filter(models.Complaint.created_at >= one_hour_ago)
        .count()
    )

    spike_detected = False
    if total > 0:
        average_per_hour = total / 24  # simple assumption
        if last_hour_count > 2 * average_per_hour:
            spike_detected = True

    # 2. Format the keys into clean Title Case (e.g., "maintenance" -> "Maintenance")
    formatted_categories = { (k.title() if k else "Unknown"): v for k, v in category_counts }
    formatted_urgencies = { (k.title() if k else "Unknown"): v for k, v in urgency_counts }

    return {
        "total_complaints": total,
        "category_distribution": formatted_categories,
        "urgency_distribution": formatted_urgencies,
        "last_hour_complaints": last_hour_count,
        "spike_detected": spike_detected
    }

@router.get("/analytics/student")
def get_student_analytics(email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        return {"total": 0, "resolved": 0, "pending": 0, "category_distribution": {}}

    complaints = db.query(models.Complaint).filter(models.Complaint.user_id == user.id).all()
    total    = len(complaints)
    resolved = sum(1 for c in complaints if c.status == "completed")
    pending  = sum(1 for c in complaints if c.status != "completed")

    cat_counts = {}
    for c in complaints:
        key = (c.category or "unknown").lower().title()
        cat_counts[key] = cat_counts.get(key, 0) + 1

    return {
        "total":                total,
        "resolved":             resolved,
        "pending":              pending,
        "category_distribution": cat_counts,
    }


@router.get("/analytics/staff")
def get_staff_analytics(staff_id: Optional[str] = None, db: Session = Depends(get_db)):
    all_complaints = db.query(models.Complaint).all()
    total    = len(all_complaints)
    pending  = sum(1 for c in all_complaints if c.status != "completed")

    high_priority_pending = sum(
        1 for c in all_complaints
        if c.status != "completed" and (c.urgency or "").lower() in ("high", "critical")
    )

    # Resolved counts scoped to this staff member if staff_id provided
    if staff_id:
        resolved_complaints = [c for c in all_complaints if c.status == "completed" and c.resolved_by == staff_id]
    else:
        resolved_complaints = [c for c in all_complaints if c.status == "completed"]

    resolved = len(resolved_complaints)

    one_week_ago = datetime.utcnow() - timedelta(days=7)
    resolved_this_week = sum(
        1 for c in resolved_complaints
        if c.created_at and c.created_at.replace(tzinfo=None) >= one_week_ago
    )

    dept_pending = {}
    urgency_pending = {}
    for c in all_complaints:
        if c.status != "completed":
            dk = (c.department or "unknown").lower().title()
            dept_pending[dk] = dept_pending.get(dk, 0) + 1
            uk = (c.urgency or "unknown").lower().title()
            urgency_pending[uk] = urgency_pending.get(uk, 0) + 1

    # Average review rating for this staff member's resolved complaints
    rated = [c for c in resolved_complaints if c.review_stars is not None]
    avg_rating = round(sum(c.review_stars for c in rated) / len(rated), 1) if rated else None
    total_reviews = len(rated)

    return {
        "total_complaints":             total,
        "total_resolved":               resolved,
        "total_pending":                pending,
        "high_priority_pending":        high_priority_pending,
        "resolved_this_week":           resolved_this_week,
        "department_distribution":      dept_pending,
        "urgency_pending_distribution": urgency_pending,
        "avg_rating":                   avg_rating,
        "total_reviews":                total_reviews,
    }