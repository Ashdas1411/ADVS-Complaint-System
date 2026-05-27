# ADVS Portal

An AI-powered complaint management platform designed to modernize hostel maintenance operations through intelligent complaint classification, automated staff routing, analytics, and structured resolution workflows.

---

# Overview

Hostel complaint systems in many institutions are still handled manually through registers, calls, or informal messaging channels. These approaches create several operational challenges:

- complaints are difficult to track
- maintenance requests are often delayed
- urgent issues are not prioritized properly
- students lack transparency regarding complaint status
- maintenance staff receive unstructured issue reports
- administrators cannot monitor performance or trends effectively

This project addresses these challenges by providing a centralized complaint management platform that combines:
- AI-powered complaint classification
- urgency prediction
- automated complaint routing
- structured maintenance workflows
- analytics-driven monitoring
- secure authentication systems

The platform is designed to improve operational efficiency, accountability, and response time within hostel infrastructure management.

---

# Core Features

## Intelligent Complaint Classification
The system uses an NLP-based machine learning model to automatically analyze complaint descriptions and predict:
- department
- complaint category
- urgency level

This removes the need for manual complaint sorting and ensures standardized issue handling.

---

## Automated Staff Routing
Complaints are automatically routed to maintenance staff based on:
- hostel zone
- assigned block
- department relevance

This enables efficient task distribution and ensures complaints reach the appropriate personnel without manual intervention.

---

## Complaint Lifecycle Management
The platform supports the complete complaint workflow:
- complaint submission
- AI processing
- routing to staff
- complaint resolution
- student feedback and review

Students can monitor the status of their complaints throughout the process.

---

## Role-Based Access System
The platform includes separate workflows and permissions for:
- students
- maintenance staff

This ensures controlled access to complaint operations and analytics.

---

## Analytics and Monitoring
The system provides analytical insights including:
- complaint distributions
- urgency trends
- department-wise complaint frequency
- complaint spike detection
- staff performance metrics
- weekly resolution tracking

---

## Security Features
The system includes:
- OTP-based student authentication
- bcrypt password hashing for staff accounts
- SHA-256 complaint integrity hashing

---

# Student Workflow

## 1. Authentication
Students authenticate using email-based OTP verification.

### Workflow
1. Student enters email address
2. OTP is generated and sent via email
3. OTP verification authenticates the student

This eliminates the need for traditional password management for students.

---

## 2. Complaint Submission
Students submit complaints by providing:
- room number
- complaint description

### Example
```text
"No water supply in washroom since morning"
```

---

## 3. AI-Based Complaint Processing
Once submitted, the complaint is processed by the machine learning module.

The system automatically predicts:
- department
- complaint category
- urgency level

### Example Classification
```text
Department: Hostel
Category: Maintenance
Urgency: High
```

This enables immediate prioritization and routing without human intervention.

---

## 4. Complaint Storage and Integrity
Each complaint is securely stored in the database.

A SHA-256 hash is generated using complaint details to ensure:
- complaint integrity
- tamper resistance
- traceability

---

## 5. Complaint Tracking
Students can:
- view submitted complaints
- monitor complaint status
- track resolution progress

### Statuses Include
- pending
- completed

---

## 6. Feedback and Review System
After resolution, students can:
- submit star ratings
- provide written feedback

This creates accountability and enables staff performance evaluation.

---

# Staff Workflow

## 1. Staff Registration and Authentication
Maintenance staff accounts include:
- staff ID
- password
- hostel zone
- assigned block

Passwords are securely hashed using bcrypt before storage.

---

## 2. Complaint Routing Mechanism
When a complaint is submitted:
1. the AI module classifies the complaint
2. the system determines the relevant hostel zone and block
3. complaints are routed to the corresponding maintenance staff

This minimizes manual coordination and reduces response delays.

---

## 3. Complaint Management Dashboard
Staff members can view:
- pending complaints
- complaint urgency levels
- department categories
- hostel/block-specific tasks
- resolved complaints

The dashboard is designed to streamline operational workflow and task prioritization.

---

## 4. Complaint Resolution
After resolving an issue, staff can mark complaints as completed.

The system records:
- complaint status
- resolving staff member
- resolution activity

This creates a structured audit trail for complaint handling.

---

## 5. Staff Analytics
The staff analytics system provides:
- total complaints resolved
- pending complaint counts
- weekly resolution metrics
- average review ratings
- urgency-based workload distribution

These metrics help evaluate operational efficiency and staff performance.

---

# Machine Learning Module

The project includes an NLP-based classification system trained on a custom hostel complaint dataset.

The model is designed to identify:
- maintenance-related issues
- safety concerns
- administrative complaints
- mess-related complaints
- residential issues

The dataset contains structured examples for:
- department classification
- category classification
- urgency prediction

This allows the platform to intelligently process natural language complaints submitted by students.

---

# Database Design

The platform uses a structured relational database design.

## Main Tables

### Users
Stores student authentication and account information.

### MaintenanceStaff
Stores:
- staff credentials
- hostel zone assignments
- block allocations

### Complaints
Stores:
- complaint details
- department
- category
- urgency level
- complaint status
- blockchain hash
- staff assignment
- reviews and ratings

### OTP
Stores temporary OTP verification records and expiration details.

---

# Tech Stack

## Backend
- Python
- FastAPI
- SQLAlchemy

## Database
- SQLite

## Machine Learning
- NLP-based complaint classification

## Security
- bcrypt password hashing
- OTP authentication
- SHA-256 complaint hashing

## Email Services
- SMTP (Gmail)

---

# API Endpoints

## Authentication APIs
- `/generate-otp`
- `/verify-otp`
- `/staff/register`
- `/staff/login`

---

## Complaint APIs
- `/submit-complaint`
- `/complaints`
- `/complaints/{id}/complete`
- `/complaints/{id}/review`

---

## Analytics APIs
- `/analytics`
- `/analytics/student`
- `/analytics/staff`

---

# Complaint Integrity Mechanism

The platform generates a SHA-256 hash for every complaint using complaint details and user information.

### Example
```python
hash = SHA256(user_id + complaint_description)
```

This mechanism helps maintain:
- complaint authenticity
- tamper resistance
- secure complaint verification

---

# Analytics Features

The analytics module supports:
- complaint volume monitoring
- urgency distribution analysis
- department-level statistics
- complaint spike detection
- staff performance monitoring
- resolution trend analysis

These insights assist administrators in monitoring hostel operational health and resource allocation.

---

# Future Enhancements

Potential future improvements include:
- real blockchain integration
- cloud deployment
- mobile application support
- real-time notifications
- image-based complaint uploads
- AI chatbot assistance
- predictive maintenance analytics
- advanced route optimization
- multi-hostel scalability
- administrator control panel

---

# Real-World Applications

This platform can be adapted for:
- university hostels
- campus infrastructure management
- apartment maintenance systems
- facility management platforms
- residential housing societies
- institutional complaint management systems

---

# Author

Developed by Arka Das

AI-Powered Smart Hostel Infrastructure Management Platform
