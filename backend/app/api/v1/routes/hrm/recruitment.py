"""
HRM - Recruitment API Routes
Job postings, candidates, interviews
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.hrm.recruitment import JobPosting, Candidate, Interview, JobStatus, CandidateStatus
from app.models.hrm.department import Department, Position
from app.models.hrm.employee import Employee
from app.core.security import get_current_user

router = APIRouter(prefix="/recruitment", tags=["HRM - Recruitment"])


# === Schemas ===

class JobPostingCreate(BaseModel):
    title: str
    position_id: Optional[str] = None
    department_id: Optional[str] = None
    branch_id: Optional[str] = None
    job_type: str = "FULL_TIME"
    experience_level: Optional[str] = None
    headcount: int = 1
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    show_salary: bool = True
    work_location: Optional[str] = None
    is_remote: bool = False
    description: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    deadline: Optional[str] = None
    hiring_manager_id: Optional[str] = None
    notes: Optional[str] = None


class CandidateCreate(BaseModel):
    job_posting_id: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    current_company: Optional[str] = None
    current_position: Optional[str] = None
    experience_years: Optional[float] = None
    highest_education: Optional[str] = None
    expected_salary: Optional[float] = None
    available_date: Optional[str] = None
    resume_url: Optional[str] = None
    cover_letter: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None


class InterviewCreate(BaseModel):
    candidate_id: str
    interview_round: int = 1
    interview_type: str = "ONSITE"
    interview_name: Optional[str] = None
    scheduled_date: str
    scheduled_time: str
    duration_minutes: int = 60
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    interviewer_ids_json: Optional[str] = None
    notes: Optional[str] = None


# === Job Postings ===

@router.get("/jobs")
def list_job_postings(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """List job postings"""
    tenant_id = str(current_user.tenant_id)

    query = select(JobPosting).where(JobPosting.tenant_id == tenant_id)

    if status:
        query = query.where(JobPosting.status == status)

    if department_id:
        query = query.where(JobPosting.department_id == department_id)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(JobPosting.created_at.desc()).offset(offset).limit(page_size)

    jobs = session.exec(query).all()

    # Enrich
    result = []
    for job in jobs:
        job_dict = job.model_dump()

        if job.department_id:
            dept = session.get(Department, job.department_id)
            job_dict["department_name"] = dept.name if dept else None

        if job.position_id:
            pos = session.get(Position, job.position_id)
            job_dict["position_name"] = pos.name if pos else None

        # Count candidates
        candidate_count = session.exec(
            select(func.count()).where(Candidate.job_posting_id == job.id)
        ).one()
        job_dict["candidate_count"] = candidate_count

        result.append(job_dict)

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/jobs/{job_id}")
def get_job_posting(
    job_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get job posting details"""
    tenant_id = str(current_user.tenant_id)

    job = session.get(JobPosting, job_id)
    if not job or str(job.tenant_id) != tenant_id:
        raise HTTPException(404, "Job posting not found")

    job_dict = job.model_dump()

    if job.department_id:
        dept = session.get(Department, job.department_id)
        job_dict["department_name"] = dept.name if dept else None

    if job.position_id:
        pos = session.get(Position, job.position_id)
        job_dict["position_name"] = pos.name if pos else None

    return job_dict


@router.post("/jobs")
def create_job_posting(
    payload: JobPostingCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create job posting"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only HR can create job postings")

    tenant_id = str(current_user.tenant_id)

    # Generate code
    count = session.exec(
        select(func.count()).where(JobPosting.tenant_id == tenant_id)
    ).one()
    code = f"JOB-{datetime.now().year}-{count + 1:03d}"

    job = JobPosting(
        tenant_id=tenant_id,
        code=code,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(job)
    session.commit()
    session.refresh(job)

    return job


@router.patch("/jobs/{job_id}")
def update_job_posting(
    job_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update job posting"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only HR can update job postings")

    tenant_id = str(current_user.tenant_id)

    job = session.get(JobPosting, job_id)
    if not job or str(job.tenant_id) != tenant_id:
        raise HTTPException(404, "Job posting not found")

    for key, value in payload.items():
        if hasattr(job, key):
            setattr(job, key, value)

    session.add(job)
    session.commit()
    session.refresh(job)

    return job


@router.post("/jobs/{job_id}/publish")
def publish_job(
    job_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Publish job posting"""
    tenant_id = str(current_user.tenant_id)

    job = session.get(JobPosting, job_id)
    if not job or str(job.tenant_id) != tenant_id:
        raise HTTPException(404, "Job posting not found")

    job.status = JobStatus.OPEN.value
    job.posted_date = datetime.now().strftime("%Y-%m-%d")

    session.add(job)
    session.commit()
    session.refresh(job)

    return job


@router.post("/jobs/{job_id}/close")
def close_job(
    job_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Close job posting"""
    tenant_id = str(current_user.tenant_id)

    job = session.get(JobPosting, job_id)
    if not job or str(job.tenant_id) != tenant_id:
        raise HTTPException(404, "Job posting not found")

    job.status = JobStatus.CLOSED.value

    session.add(job)
    session.commit()
    session.refresh(job)

    return job


# === Candidates ===

@router.get("/candidates")
def list_candidates(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    job_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """List candidates"""
    tenant_id = str(current_user.tenant_id)

    query = select(Candidate).where(Candidate.tenant_id == tenant_id)

    if job_id:
        query = query.where(Candidate.job_posting_id == job_id)

    if status:
        query = query.where(Candidate.status == status)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Candidate.created_at.desc()).offset(offset).limit(page_size)

    candidates = session.exec(query).all()

    # Enrich
    result = []
    for cand in candidates:
        cand_dict = cand.model_dump()

        job = session.get(JobPosting, cand.job_posting_id)
        cand_dict["job_title"] = job.title if job else None

        result.append(cand_dict)

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/candidates/{candidate_id}")
def get_candidate(
    candidate_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get candidate details with interviews"""
    tenant_id = str(current_user.tenant_id)

    cand = session.get(Candidate, candidate_id)
    if not cand or str(cand.tenant_id) != tenant_id:
        raise HTTPException(404, "Candidate not found")

    cand_dict = cand.model_dump()

    job = session.get(JobPosting, cand.job_posting_id)
    cand_dict["job_title"] = job.title if job else None

    # Get interviews
    interviews = session.exec(
        select(Interview).where(Interview.candidate_id == candidate_id)
        .order_by(Interview.interview_round)
    ).all()
    cand_dict["interviews"] = [i.model_dump() for i in interviews]

    return cand_dict


@router.post("/candidates")
def create_candidate(
    payload: CandidateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create candidate"""
    tenant_id = str(current_user.tenant_id)

    # Validate job posting
    job = session.get(JobPosting, payload.job_posting_id)
    if not job or str(job.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid job_posting_id")

    candidate = Candidate(
        tenant_id=tenant_id,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(candidate)

    # Update job applications count
    job.applications_count = (job.applications_count or 0) + 1
    session.add(job)

    session.commit()
    session.refresh(candidate)

    return candidate


@router.patch("/candidates/{candidate_id}")
def update_candidate(
    candidate_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update candidate"""
    tenant_id = str(current_user.tenant_id)

    cand = session.get(Candidate, candidate_id)
    if not cand or str(cand.tenant_id) != tenant_id:
        raise HTTPException(404, "Candidate not found")

    for key, value in payload.items():
        if hasattr(cand, key):
            setattr(cand, key, value)

    session.add(cand)
    session.commit()
    session.refresh(cand)

    return cand


@router.post("/candidates/{candidate_id}/status")
def update_candidate_status(
    candidate_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update candidate status"""
    tenant_id = str(current_user.tenant_id)

    cand = session.get(Candidate, candidate_id)
    if not cand or str(cand.tenant_id) != tenant_id:
        raise HTTPException(404, "Candidate not found")

    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(400, "Status is required")

    cand.status = new_status
    if new_status == CandidateStatus.REJECTED.value:
        cand.rejection_reason = payload.get("reason")

    session.add(cand)
    session.commit()
    session.refresh(cand)

    return cand


# === Interviews ===

@router.get("/interviews")
def list_interviews(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    candidate_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    """List interviews"""
    tenant_id = str(current_user.tenant_id)

    query = select(Interview).where(Interview.tenant_id == tenant_id)

    if candidate_id:
        query = query.where(Interview.candidate_id == candidate_id)

    if date_from:
        query = query.where(Interview.scheduled_date >= date_from)

    if date_to:
        query = query.where(Interview.scheduled_date <= date_to)

    if status:
        query = query.where(Interview.status == status)

    interviews = session.exec(
        query.order_by(Interview.scheduled_date.desc(), Interview.scheduled_time.desc())
    ).all()

    # Enrich
    result = []
    for intv in interviews:
        intv_dict = intv.model_dump()

        cand = session.get(Candidate, intv.candidate_id)
        if cand:
            intv_dict["candidate_name"] = cand.full_name
            job = session.get(JobPosting, cand.job_posting_id)
            intv_dict["job_title"] = job.title if job else None

        result.append(intv_dict)

    return result


@router.post("/interviews")
def create_interview(
    payload: InterviewCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create interview"""
    tenant_id = str(current_user.tenant_id)

    # Validate candidate
    cand = session.get(Candidate, payload.candidate_id)
    if not cand or str(cand.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid candidate_id")

    interview = Interview(
        tenant_id=tenant_id,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(interview)
    session.commit()
    session.refresh(interview)

    return interview


@router.post("/interviews/{interview_id}/complete")
def complete_interview(
    interview_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete interview with feedback"""
    tenant_id = str(current_user.tenant_id)

    interview = session.get(Interview, interview_id)
    if not interview or str(interview.tenant_id) != tenant_id:
        raise HTTPException(404, "Interview not found")

    interview.status = "COMPLETED"
    interview.result = payload.get("result", "PENDING")
    interview.score = payload.get("score")
    interview.strengths = payload.get("strengths")
    interview.weaknesses = payload.get("weaknesses")
    interview.overall_feedback = payload.get("overall_feedback")
    interview.recommendation = payload.get("recommendation")
    interview.completed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    interview.completed_by = str(current_user.id)

    session.add(interview)
    session.commit()
    session.refresh(interview)

    return interview


# === Dashboard Stats ===

@router.get("/dashboard")
def recruitment_dashboard(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get recruitment dashboard stats"""
    tenant_id = str(current_user.tenant_id)

    # Open jobs
    open_jobs = session.exec(
        select(func.count()).where(
            JobPosting.tenant_id == tenant_id,
            JobPosting.status == JobStatus.OPEN.value
        )
    ).one()

    # Total candidates
    total_candidates = session.exec(
        select(func.count()).where(Candidate.tenant_id == tenant_id)
    ).one()

    # Candidates by status
    new_candidates = session.exec(
        select(func.count()).where(
            Candidate.tenant_id == tenant_id,
            Candidate.status == CandidateStatus.NEW.value
        )
    ).one()

    in_interview = session.exec(
        select(func.count()).where(
            Candidate.tenant_id == tenant_id,
            Candidate.status.in_([
                CandidateStatus.SCREENING.value,
                CandidateStatus.INTERVIEW_1.value,
                CandidateStatus.INTERVIEW_2.value,
            ])
        )
    ).one()

    hired = session.exec(
        select(func.count()).where(
            Candidate.tenant_id == tenant_id,
            Candidate.status == CandidateStatus.HIRED.value
        )
    ).one()

    # Upcoming interviews (next 7 days)
    today = datetime.now().strftime("%Y-%m-%d")
    week_later = (datetime.now().replace(day=datetime.now().day + 7)).strftime("%Y-%m-%d")
    upcoming_interviews = session.exec(
        select(func.count()).where(
            Interview.tenant_id == tenant_id,
            Interview.status == "SCHEDULED",
            Interview.scheduled_date >= today,
            Interview.scheduled_date <= week_later
        )
    ).one()

    return {
        "open_jobs": open_jobs,
        "total_candidates": total_candidates,
        "new_candidates": new_candidates,
        "in_interview": in_interview,
        "hired": hired,
        "upcoming_interviews": upcoming_interviews
    }
