"""
HRM - Training API Routes
Training courses, participants, certificates
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.hrm.training import Training, TrainingParticipant, Certificate, TrainingStatus, ParticipantStatus
from app.models.hrm.employee import Employee
from app.core.security import get_current_user

router = APIRouter(prefix="/training", tags=["HRM - Training"])


# === Schemas ===

class TrainingCreate(BaseModel):
    name: str
    training_type: str = "SKILL"
    description: Optional[str] = None
    objectives: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_hours: float = 0
    location: Optional[str] = None
    format: str = "OFFLINE"
    trainer_name: Optional[str] = None
    trainer_organization: Optional[str] = None
    cost_per_person: float = 0
    max_participants: Optional[int] = None
    passing_score: float = 70
    is_mandatory: bool = False
    notes: Optional[str] = None


class ParticipantAdd(BaseModel):
    employee_id: str
    notes: Optional[str] = None


class CertificateCreate(BaseModel):
    employee_id: str
    certificate_name: str
    certificate_type: str = "INTERNAL"
    issuing_organization: Optional[str] = None
    issue_date: str
    expiry_date: Optional[str] = None
    training_id: Optional[str] = None
    license_class: Optional[str] = None
    file_url: Optional[str] = None
    alert_before_days: int = 30
    notes: Optional[str] = None


# === Trainings ===

@router.get("/courses")
def list_trainings(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    training_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """List training courses"""
    tenant_id = str(current_user.tenant_id)

    query = select(Training).where(Training.tenant_id == tenant_id)

    if status:
        query = query.where(Training.status == status)

    if training_type:
        query = query.where(Training.training_type == training_type)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Training.created_at.desc()).offset(offset).limit(page_size)

    trainings = session.exec(query).all()

    # Enrich
    result = []
    for tr in trainings:
        tr_dict = tr.model_dump()

        # Count participants
        participant_count = session.exec(
            select(func.count()).where(TrainingParticipant.training_id == tr.id)
        ).one()
        tr_dict["participant_count"] = participant_count

        # Count completed
        completed_count = session.exec(
            select(func.count()).where(
                TrainingParticipant.training_id == tr.id,
                TrainingParticipant.status == ParticipantStatus.COMPLETED.value
            )
        ).one()
        tr_dict["completed_count"] = completed_count

        result.append(tr_dict)

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/courses/{training_id}")
def get_training(
    training_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get training details with participants"""
    tenant_id = str(current_user.tenant_id)

    training = session.get(Training, training_id)
    if not training or str(training.tenant_id) != tenant_id:
        raise HTTPException(404, "Training not found")

    tr_dict = training.model_dump()

    # Get participants
    participants = session.exec(
        select(TrainingParticipant).where(TrainingParticipant.training_id == training_id)
    ).all()

    enriched_participants = []
    for p in participants:
        p_dict = p.model_dump()
        emp = session.get(Employee, p.employee_id)
        p_dict["employee"] = {
            "id": emp.id,
            "employee_code": emp.employee_code,
            "full_name": emp.full_name
        } if emp else None
        enriched_participants.append(p_dict)

    tr_dict["participants"] = enriched_participants

    return tr_dict


@router.post("/courses")
def create_training(
    payload: TrainingCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create training course"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only HR can create trainings")

    tenant_id = str(current_user.tenant_id)

    # Generate code
    count = session.exec(
        select(func.count()).where(Training.tenant_id == tenant_id)
    ).one()
    code = f"DT-{datetime.now().year}-{count + 1:03d}"

    training = Training(
        tenant_id=tenant_id,
        code=code,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(training)
    session.commit()
    session.refresh(training)

    return training


@router.patch("/courses/{training_id}")
def update_training(
    training_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update training"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only HR can update trainings")

    tenant_id = str(current_user.tenant_id)

    training = session.get(Training, training_id)
    if not training or str(training.tenant_id) != tenant_id:
        raise HTTPException(404, "Training not found")

    for key, value in payload.items():
        if hasattr(training, key):
            setattr(training, key, value)

    session.add(training)
    session.commit()
    session.refresh(training)

    return training


@router.post("/courses/{training_id}/start")
def start_training(
    training_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Start training"""
    tenant_id = str(current_user.tenant_id)

    training = session.get(Training, training_id)
    if not training or str(training.tenant_id) != tenant_id:
        raise HTTPException(404, "Training not found")

    training.status = TrainingStatus.IN_PROGRESS.value
    if not training.start_date:
        training.start_date = datetime.now().strftime("%Y-%m-%d")

    # Update all participants to IN_PROGRESS
    participants = session.exec(
        select(TrainingParticipant).where(
            TrainingParticipant.training_id == training_id,
            TrainingParticipant.status == ParticipantStatus.ENROLLED.value
        )
    ).all()

    for p in participants:
        p.status = ParticipantStatus.IN_PROGRESS.value
        session.add(p)

    session.add(training)
    session.commit()
    session.refresh(training)

    return training


@router.post("/courses/{training_id}/complete")
def complete_training(
    training_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete training"""
    tenant_id = str(current_user.tenant_id)

    training = session.get(Training, training_id)
    if not training or str(training.tenant_id) != tenant_id:
        raise HTTPException(404, "Training not found")

    training.status = TrainingStatus.COMPLETED.value
    if not training.end_date:
        training.end_date = datetime.now().strftime("%Y-%m-%d")

    session.add(training)
    session.commit()
    session.refresh(training)

    return training


# === Participants ===

@router.post("/courses/{training_id}/participants")
def add_participant(
    training_id: str,
    payload: ParticipantAdd,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add participant to training"""
    tenant_id = str(current_user.tenant_id)

    training = session.get(Training, training_id)
    if not training or str(training.tenant_id) != tenant_id:
        raise HTTPException(404, "Training not found")

    employee = session.get(Employee, payload.employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid employee_id")

    # Check if already enrolled
    existing = session.exec(
        select(TrainingParticipant).where(
            TrainingParticipant.training_id == training_id,
            TrainingParticipant.employee_id == payload.employee_id
        )
    ).first()

    if existing:
        raise HTTPException(400, "Employee already enrolled")

    participant = TrainingParticipant(
        tenant_id=tenant_id,
        training_id=training_id,
        employee_id=payload.employee_id,
        enrolled_date=datetime.now().strftime("%Y-%m-%d"),
        enrolled_by=str(current_user.id),
        notes=payload.notes
    )

    session.add(participant)
    session.commit()
    session.refresh(participant)

    return participant


@router.post("/courses/{training_id}/participants/bulk")
def add_participants_bulk(
    training_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add multiple participants"""
    tenant_id = str(current_user.tenant_id)

    training = session.get(Training, training_id)
    if not training or str(training.tenant_id) != tenant_id:
        raise HTTPException(404, "Training not found")

    employee_ids = payload.get("employee_ids", [])
    added = 0

    for emp_id in employee_ids:
        employee = session.get(Employee, emp_id)
        if not employee or str(employee.tenant_id) != tenant_id:
            continue

        existing = session.exec(
            select(TrainingParticipant).where(
                TrainingParticipant.training_id == training_id,
                TrainingParticipant.employee_id == emp_id
            )
        ).first()

        if existing:
            continue

        participant = TrainingParticipant(
            tenant_id=tenant_id,
            training_id=training_id,
            employee_id=emp_id,
            enrolled_date=datetime.now().strftime("%Y-%m-%d"),
            enrolled_by=str(current_user.id)
        )
        session.add(participant)
        added += 1

    session.commit()

    return {"message": f"Added {added} participants"}


@router.post("/participants/{participant_id}/complete")
def complete_participant(
    participant_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark participant as completed"""
    tenant_id = str(current_user.tenant_id)

    participant = session.get(TrainingParticipant, participant_id)
    if not participant or str(participant.tenant_id) != tenant_id:
        raise HTTPException(404, "Participant not found")

    score = payload.get("score")
    training = session.get(Training, participant.training_id)

    participant.score = score
    participant.completion_date = datetime.now().strftime("%Y-%m-%d")

    if score is not None and training:
        participant.is_passed = score >= training.passing_score
        participant.status = ParticipantStatus.COMPLETED.value if participant.is_passed else ParticipantStatus.FAILED.value
    else:
        participant.status = ParticipantStatus.COMPLETED.value
        participant.is_passed = True

    session.add(participant)
    session.commit()
    session.refresh(participant)

    return participant


# === Certificates ===

@router.get("/certificates")
def list_certificates(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    employee_id: Optional[str] = Query(None),
    expiring_soon: bool = Query(False),
):
    """List certificates"""
    tenant_id = str(current_user.tenant_id)

    query = select(Certificate).where(Certificate.tenant_id == tenant_id)

    if employee_id:
        query = query.where(Certificate.employee_id == employee_id)

    if expiring_soon:
        # Expiring in next 30 days
        today = datetime.now().strftime("%Y-%m-%d")
        thirty_days = (datetime.now().replace(day=datetime.now().day + 30)).strftime("%Y-%m-%d")
        query = query.where(
            Certificate.expiry_date != None,
            Certificate.expiry_date >= today,
            Certificate.expiry_date <= thirty_days
        )

    certificates = session.exec(query.order_by(Certificate.expiry_date)).all()

    # Enrich
    result = []
    for cert in certificates:
        cert_dict = cert.model_dump()

        emp = session.get(Employee, cert.employee_id)
        cert_dict["employee"] = {
            "id": emp.id,
            "employee_code": emp.employee_code,
            "full_name": emp.full_name
        } if emp else None

        result.append(cert_dict)

    return result


@router.post("/certificates")
def create_certificate(
    payload: CertificateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create certificate"""
    tenant_id = str(current_user.tenant_id)

    employee = session.get(Employee, payload.employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid employee_id")

    # Generate certificate number
    count = session.exec(
        select(func.count()).where(Certificate.tenant_id == tenant_id)
    ).one()
    cert_number = f"CC-{datetime.now().year}-{count + 1:04d}"

    certificate = Certificate(
        tenant_id=tenant_id,
        certificate_number=cert_number,
        **payload.model_dump()
    )

    session.add(certificate)
    session.commit()
    session.refresh(certificate)

    return certificate


# === Dashboard ===

@router.get("/dashboard")
def training_dashboard(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get training dashboard stats"""
    tenant_id = str(current_user.tenant_id)

    # Active trainings
    active_trainings = session.exec(
        select(func.count()).where(
            Training.tenant_id == tenant_id,
            Training.status == TrainingStatus.IN_PROGRESS.value
        )
    ).one()

    # Planned trainings
    planned_trainings = session.exec(
        select(func.count()).where(
            Training.tenant_id == tenant_id,
            Training.status == TrainingStatus.PLANNED.value
        )
    ).one()

    # Total participants this year
    year_start = f"{datetime.now().year}-01-01"
    total_participants = session.exec(
        select(func.count()).where(
            TrainingParticipant.tenant_id == tenant_id,
            TrainingParticipant.enrolled_date >= year_start
        )
    ).one()

    # Completed participants this year
    completed_participants = session.exec(
        select(func.count()).where(
            TrainingParticipant.tenant_id == tenant_id,
            TrainingParticipant.status == ParticipantStatus.COMPLETED.value,
            TrainingParticipant.completion_date >= year_start
        )
    ).one()

    # Expiring certificates (next 30 days)
    from datetime import timedelta
    today = datetime.now().strftime("%Y-%m-%d")
    thirty_days = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    expiring_certs = session.exec(
        select(func.count()).where(
            Certificate.tenant_id == tenant_id,
            Certificate.expiry_date != None,
            Certificate.expiry_date >= today,
            Certificate.expiry_date <= thirty_days
        )
    ).one()

    return {
        "active_trainings": active_trainings,
        "planned_trainings": planned_trainings,
        "total_participants": total_participants,
        "completed_participants": completed_participants,
        "expiring_certificates": expiring_certs
    }
