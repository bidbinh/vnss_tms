"""
Project Management - Resources API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.project import (
    Resource, ResourceType,
    ResourceAllocation,
    ResourceCalendar,
)
from app.core.security import get_current_user

router = APIRouter()


class ResourceCreate(BaseModel):
    code: str
    name: str
    resource_type: str = ResourceType.HUMAN.value
    description: Optional[str] = None
    user_id: Optional[str] = None
    employee_id: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    capacity_hours_per_day: Decimal = Decimal("8")
    capacity_hours_per_week: Decimal = Decimal("40")
    cost_rate_per_hour: Decimal = Decimal("0")
    billing_rate_per_hour: Decimal = Decimal("0")
    currency: str = "VND"
    skills: Optional[str] = None
    notes: Optional[str] = None


class ResourceAllocationCreate(BaseModel):
    resource_id: str
    project_id: str
    task_id: Optional[str] = None
    start_date: date
    end_date: date
    allocation_percent: Decimal = Decimal("100")
    planned_hours: Decimal = Decimal("0")
    role: Optional[str] = None
    notes: Optional[str] = None


@router.get("/resources")
def list_resources(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    resource_type: Optional[str] = Query(None),
    is_available: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List all resources"""
    tenant_id = str(current_user.tenant_id)

    query = select(Resource).where(Resource.tenant_id == tenant_id)

    if resource_type:
        query = query.where(Resource.resource_type == resource_type)

    if is_available is not None:
        query = query.where(Resource.is_available == is_available)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(Resource.name)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/resources")
def create_resource(
    payload: ResourceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new resource"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(Resource).where(
            Resource.tenant_id == tenant_id,
            Resource.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Resource code '{payload.code}' already exists")

    resource = Resource(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_available=True,
        created_by=str(current_user.id),
    )

    session.add(resource)
    session.commit()
    session.refresh(resource)

    return resource.model_dump()


@router.get("/resources/{resource_id}")
def get_resource(
    resource_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get resource with allocations"""
    tenant_id = str(current_user.tenant_id)

    resource = session.get(Resource, resource_id)
    if not resource or str(resource.tenant_id) != tenant_id:
        raise HTTPException(404, "Resource not found")

    # Get allocations
    allocations = session.exec(
        select(ResourceAllocation).where(
            ResourceAllocation.tenant_id == tenant_id,
            ResourceAllocation.resource_id == resource_id
        ).order_by(ResourceAllocation.start_date.desc())
    ).all()

    result = resource.model_dump()
    result["allocations"] = [a.model_dump() for a in allocations]

    return result


@router.put("/resources/{resource_id}")
def update_resource(
    resource_id: str,
    payload: ResourceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a resource"""
    tenant_id = str(current_user.tenant_id)

    resource = session.get(Resource, resource_id)
    if not resource or str(resource.tenant_id) != tenant_id:
        raise HTTPException(404, "Resource not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key != "code":
            setattr(resource, key, value)

    resource.updated_at = datetime.utcnow()

    session.add(resource)
    session.commit()
    session.refresh(resource)

    return resource.model_dump()


# =====================
# RESOURCE ALLOCATIONS
# =====================

@router.get("/resource-allocations")
def list_allocations(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    resource_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List resource allocations"""
    tenant_id = str(current_user.tenant_id)

    query = select(ResourceAllocation).where(ResourceAllocation.tenant_id == tenant_id)

    if resource_id:
        query = query.where(ResourceAllocation.resource_id == resource_id)

    if project_id:
        query = query.where(ResourceAllocation.project_id == project_id)

    if start_date:
        query = query.where(ResourceAllocation.end_date >= start_date)

    if end_date:
        query = query.where(ResourceAllocation.start_date <= end_date)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(ResourceAllocation.start_date)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/resource-allocations")
def create_allocation(
    payload: ResourceAllocationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create resource allocation"""
    tenant_id = str(current_user.tenant_id)

    # Calculate planned cost
    resource = session.get(Resource, payload.resource_id)
    planned_cost = Decimal("0")
    if resource:
        planned_cost = payload.planned_hours * resource.cost_rate_per_hour

    allocation = ResourceAllocation(
        tenant_id=tenant_id,
        **payload.model_dump(),
        planned_cost=planned_cost,
        created_by=str(current_user.id),
    )

    session.add(allocation)
    session.commit()
    session.refresh(allocation)

    return allocation.model_dump()


@router.put("/resource-allocations/{allocation_id}")
def update_allocation(
    allocation_id: str,
    payload: ResourceAllocationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update resource allocation"""
    tenant_id = str(current_user.tenant_id)

    allocation = session.get(ResourceAllocation, allocation_id)
    if not allocation or str(allocation.tenant_id) != tenant_id:
        raise HTTPException(404, "Allocation not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(allocation, key, value)

    allocation.updated_at = datetime.utcnow()

    session.add(allocation)
    session.commit()
    session.refresh(allocation)

    return allocation.model_dump()


@router.delete("/resource-allocations/{allocation_id}")
def delete_allocation(
    allocation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete resource allocation"""
    tenant_id = str(current_user.tenant_id)

    allocation = session.get(ResourceAllocation, allocation_id)
    if not allocation or str(allocation.tenant_id) != tenant_id:
        raise HTTPException(404, "Allocation not found")

    session.delete(allocation)
    session.commit()

    return {"success": True}


# =====================
# RESOURCE AVAILABILITY
# =====================

@router.get("/resources/{resource_id}/availability")
def get_resource_availability(
    resource_id: str,
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get resource availability for a period"""
    tenant_id = str(current_user.tenant_id)

    resource = session.get(Resource, resource_id)
    if not resource or str(resource.tenant_id) != tenant_id:
        raise HTTPException(404, "Resource not found")

    # Get allocations in period
    allocations = session.exec(
        select(ResourceAllocation).where(
            ResourceAllocation.tenant_id == tenant_id,
            ResourceAllocation.resource_id == resource_id,
            ResourceAllocation.start_date <= end_date,
            ResourceAllocation.end_date >= start_date
        )
    ).all()

    # Calculate total allocated percentage
    total_allocation = sum([a.allocation_percent for a in allocations])

    return {
        "resource_id": resource_id,
        "resource_name": resource.name,
        "period": {"start": start_date, "end": end_date},
        "max_allocation": resource.max_allocation_percent,
        "total_allocated": total_allocation,
        "available_allocation": max(Decimal("0"), resource.max_allocation_percent - total_allocation),
        "is_overallocated": total_allocation > resource.max_allocation_percent,
        "allocations": [a.model_dump() for a in allocations],
    }
