"""
Actor API Routes - Unified Actor Management

Provides CRUD operations for Actors and ActorRelationships.
Supports both legacy endpoints (for backward compatibility) and new unified endpoints.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, and_
from sqlmodel import Session, select
from pydantic import BaseModel
import uuid

from app.db.session import get_session
from app.core.security import get_current_user_optional
from app.models.actor import (
    Actor, ActorType, ActorStatus,
    ActorRelationship, RelationshipType, RelationshipStatus, RelationshipRole
)

router = APIRouter(prefix="/actors", tags=["Actors"])


# ============================================
# SCHEMAS
# ============================================

class ActorCreate(BaseModel):
    type: str = ActorType.PERSON.value
    name: str
    code: Optional[str] = None
    slug: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    country: str = "VN"
    tax_code: Optional[str] = None
    business_type: Optional[str] = None
    id_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    metadata: Optional[dict] = None


class ActorUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    slug: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    country: Optional[str] = None
    tax_code: Optional[str] = None
    business_type: Optional[str] = None
    id_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    status: Optional[str] = None
    metadata: Optional[dict] = None


class ActorResponse(BaseModel):
    id: str
    type: str
    status: str
    code: Optional[str]
    name: str
    slug: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    address: Optional[str]
    city: Optional[str]
    country: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RelationshipCreate(BaseModel):
    related_actor_id: str
    type: str
    role: Optional[str] = None
    message: Optional[str] = None
    permissions: Optional[dict] = None
    payment_terms: Optional[dict] = None


class RelationshipUpdate(BaseModel):
    status: Optional[str] = None
    role: Optional[str] = None
    message: Optional[str] = None
    permissions: Optional[dict] = None
    payment_terms: Optional[dict] = None
    decline_reason: Optional[str] = None


class RelationshipResponse(BaseModel):
    id: str
    actor_id: str
    related_actor_id: str
    type: str
    role: Optional[str]
    status: str
    message: Optional[str]
    total_orders_completed: int
    total_amount_paid: float
    total_amount_pending: float
    rating: Optional[float]
    created_at: datetime
    updated_at: datetime
    # Nested actor info
    related_actor: Optional[ActorResponse] = None

    class Config:
        from_attributes = True


# ============================================
# ACTOR ENDPOINTS
# ============================================

@router.get("", response_model=List[ActorResponse])
async def list_actors(
    type: Optional[str] = Query(None, description="Filter by actor type (PERSON, ORGANIZATION)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name, code, email, phone"),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    session: Session = Depends(get_session),
):
    """List all actors with optional filters"""
    query = select(Actor)

    if type:
        query = query.where(Actor.type == type)

    if status:
        query = query.where(Actor.status == status)
    else:
        query = query.where(Actor.status != ActorStatus.DELETED.value)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Actor.name.ilike(search_term),
                Actor.code.ilike(search_term),
                Actor.email.ilike(search_term),
                Actor.phone.ilike(search_term),
            )
        )

    query = query.order_by(Actor.updated_at.desc()).offset(offset).limit(limit)
    actors = session.exec(query).all()
    return actors


@router.get("/{actor_id}", response_model=ActorResponse)
async def get_actor(
    actor_id: str,
    session: Session = Depends(get_session),
):
    """Get a single actor by ID"""
    actor = session.get(Actor, actor_id)
    if not actor or actor.status == ActorStatus.DELETED.value:
        raise HTTPException(status_code=404, detail="Actor not found")
    return actor


@router.post("", response_model=ActorResponse)
async def create_actor(
    data: ActorCreate,
    session: Session = Depends(get_session),
):
    """Create a new actor"""
    now = datetime.utcnow()

    actor = Actor(
        id=str(uuid.uuid4()),
        created_at=now,
        updated_at=now,
        type=data.type,
        status=ActorStatus.ACTIVE.value,
        name=data.name,
        code=data.code,
        slug=data.slug,
        email=data.email,
        phone=data.phone,
        avatar_url=data.avatar_url,
        bio=data.bio,
        address=data.address,
        city=data.city,
        district=data.district,
        country=data.country,
        tax_code=data.tax_code,
        business_type=data.business_type,
        id_number=data.id_number,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        metadata=data.metadata,
    )

    session.add(actor)
    session.commit()
    session.refresh(actor)
    return actor


@router.patch("/{actor_id}", response_model=ActorResponse)
async def update_actor(
    actor_id: str,
    data: ActorUpdate,
    session: Session = Depends(get_session),
):
    """Update an actor"""
    actor = session.get(Actor, actor_id)
    if not actor or actor.status == ActorStatus.DELETED.value:
        raise HTTPException(status_code=404, detail="Actor not found")

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(actor, key, value)

    actor.updated_at = datetime.utcnow()
    session.add(actor)
    session.commit()
    session.refresh(actor)
    return actor


@router.delete("/{actor_id}")
async def delete_actor(
    actor_id: str,
    session: Session = Depends(get_session),
):
    """Soft delete an actor"""
    actor = session.get(Actor, actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    actor.status = ActorStatus.DELETED.value
    actor.updated_at = datetime.utcnow()
    session.add(actor)
    session.commit()
    return {"message": "Actor deleted successfully"}


# ============================================
# RELATIONSHIP ENDPOINTS
# ============================================

@router.get("/{actor_id}/relationships", response_model=List[RelationshipResponse])
async def list_actor_relationships(
    actor_id: str,
    type: Optional[str] = Query(None, description="Filter by relationship type"),
    role: Optional[str] = Query(None, description="Filter by role"),
    status: Optional[str] = Query(None, description="Filter by status"),
    direction: Optional[str] = Query("outgoing", description="outgoing (from actor) or incoming (to actor) or both"),
    session: Session = Depends(get_session),
):
    """List relationships for an actor"""
    # Verify actor exists
    actor = session.get(Actor, actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    if direction == "outgoing":
        query = select(ActorRelationship).where(ActorRelationship.actor_id == actor_id)
    elif direction == "incoming":
        query = select(ActorRelationship).where(ActorRelationship.related_actor_id == actor_id)
    else:
        query = select(ActorRelationship).where(
            or_(
                ActorRelationship.actor_id == actor_id,
                ActorRelationship.related_actor_id == actor_id
            )
        )

    if type:
        query = query.where(ActorRelationship.type == type)

    if role:
        query = query.where(ActorRelationship.role == role)

    if status:
        query = query.where(ActorRelationship.status == status)

    relationships = session.exec(query.order_by(ActorRelationship.updated_at.desc())).all()

    # Add related actor info
    result = []
    for rel in relationships:
        rel_dict = {
            "id": rel.id,
            "actor_id": rel.actor_id,
            "related_actor_id": rel.related_actor_id,
            "type": rel.type,
            "role": rel.role,
            "status": rel.status,
            "message": rel.message,
            "total_orders_completed": rel.total_orders_completed,
            "total_amount_paid": rel.total_amount_paid,
            "total_amount_pending": rel.total_amount_pending,
            "rating": rel.rating,
            "created_at": rel.created_at,
            "updated_at": rel.updated_at,
        }

        # Get related actor
        related_id = rel.related_actor_id if rel.actor_id == actor_id else rel.actor_id
        related_actor = session.get(Actor, related_id)
        if related_actor:
            rel_dict["related_actor"] = related_actor

        result.append(rel_dict)

    return result


@router.post("/{actor_id}/relationships", response_model=RelationshipResponse)
async def create_relationship(
    actor_id: str,
    data: RelationshipCreate,
    session: Session = Depends(get_session),
):
    """Create a new relationship from this actor to another"""
    # Verify both actors exist
    actor = session.get(Actor, actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    related_actor = session.get(Actor, data.related_actor_id)
    if not related_actor:
        raise HTTPException(status_code=404, detail="Related actor not found")

    # Check if relationship already exists
    existing = session.exec(
        select(ActorRelationship).where(
            and_(
                ActorRelationship.actor_id == actor_id,
                ActorRelationship.related_actor_id == data.related_actor_id,
                ActorRelationship.type == data.type
            )
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Relationship already exists")

    now = datetime.utcnow()
    relationship = ActorRelationship(
        id=str(uuid.uuid4()),
        created_at=now,
        updated_at=now,
        actor_id=actor_id,
        related_actor_id=data.related_actor_id,
        type=data.type,
        role=data.role,
        status=RelationshipStatus.PENDING.value,
        message=data.message,
        permissions=data.permissions,
        payment_terms=data.payment_terms,
    )

    session.add(relationship)
    session.commit()
    session.refresh(relationship)

    return {
        **relationship.__dict__,
        "related_actor": related_actor
    }


@router.patch("/{actor_id}/relationships/{relationship_id}", response_model=RelationshipResponse)
async def update_relationship(
    actor_id: str,
    relationship_id: str,
    data: RelationshipUpdate,
    session: Session = Depends(get_session),
):
    """Update a relationship"""
    relationship = session.get(ActorRelationship, relationship_id)
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")

    # Verify this relationship belongs to the actor
    if relationship.actor_id != actor_id and relationship.related_actor_id != actor_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this relationship")

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(relationship, key, value)

    relationship.updated_at = datetime.utcnow()
    session.add(relationship)
    session.commit()
    session.refresh(relationship)

    # Get related actor
    related_id = relationship.related_actor_id if relationship.actor_id == actor_id else relationship.actor_id
    related_actor = session.get(Actor, related_id)

    return {
        **relationship.__dict__,
        "related_actor": related_actor
    }


@router.delete("/{actor_id}/relationships/{relationship_id}")
async def delete_relationship(
    actor_id: str,
    relationship_id: str,
    session: Session = Depends(get_session),
):
    """Delete a relationship"""
    relationship = session.get(ActorRelationship, relationship_id)
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")

    # Verify this relationship belongs to the actor
    if relationship.actor_id != actor_id and relationship.related_actor_id != actor_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this relationship")

    session.delete(relationship)
    session.commit()
    return {"message": "Relationship deleted successfully"}


# ============================================
# CONVENIENCE ENDPOINTS
# ============================================

@router.get("/{actor_id}/employees", response_model=List[RelationshipResponse])
async def list_employees(
    actor_id: str,
    role: Optional[str] = Query(None, description="Filter by role (DRIVER, DISPATCHER, etc)"),
    session: Session = Depends(get_session),
):
    """List employees of an organization actor"""
    return await list_actor_relationships(
        actor_id=actor_id,
        type=RelationshipType.EMPLOYS.value,
        role=role,
        status=RelationshipStatus.ACTIVE.value,
        direction="outgoing",
        session=session
    )


@router.get("/{actor_id}/employers", response_model=List[RelationshipResponse])
async def list_employers(
    actor_id: str,
    session: Session = Depends(get_session),
):
    """List organizations that employ this person actor"""
    return await list_actor_relationships(
        actor_id=actor_id,
        type=RelationshipType.EMPLOYS.value,
        role=None,
        status=RelationshipStatus.ACTIVE.value,
        direction="incoming",
        session=session
    )


@router.get("/{actor_id}/connections", response_model=List[RelationshipResponse])
async def list_connections(
    actor_id: str,
    role: Optional[str] = Query(None),
    session: Session = Depends(get_session),
):
    """List network connections (dispatcher-driver connections)"""
    return await list_actor_relationships(
        actor_id=actor_id,
        type=RelationshipType.CONNECTS.value,
        role=role,
        status=RelationshipStatus.ACTIVE.value,
        direction="both",
        session=session
    )


@router.get("/{actor_id}/pending-requests", response_model=List[RelationshipResponse])
async def list_pending_requests(
    actor_id: str,
    session: Session = Depends(get_session),
):
    """List pending relationship requests (incoming)"""
    return await list_actor_relationships(
        actor_id=actor_id,
        type=None,
        role=None,
        status=RelationshipStatus.PENDING.value,
        direction="incoming",
        session=session
    )
