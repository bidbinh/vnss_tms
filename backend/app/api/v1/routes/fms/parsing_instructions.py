"""
FMS Parsing Instructions API Routes
Quản lý hướng dẫn parse chứng từ theo từng khách hàng/shipper

Endpoints:
- GET /instructions: List all instructions
- POST /instructions: Create new instruction
- GET /instructions/{id}: Get instruction detail
- PUT /instructions/{id}: Update instruction
- DELETE /instructions/{id}: Delete (deactivate) instruction
- GET /instructions/for-shipper: Get matching instructions for a shipper
- POST /instructions/{id}/test: Test instruction against sample text
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import json

from app.db.session import get_session
from app.models.fms.parsing_instructions import ParsingInstruction
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/parsing-instructions", tags=["FMS Parsing Instructions"])


# ============================================================
# REQUEST/RESPONSE MODELS
# ============================================================

class InstructionCreate(BaseModel):
    """Create new parsing instruction"""
    name: str
    description: Optional[str] = None
    shipper_pattern: Optional[str] = None
    shipper_keywords: Optional[List[str]] = None
    customer_id: Optional[str] = None
    instructions: str
    field_mappings: Optional[dict] = None
    data_source_priority: Optional[dict] = None
    value_transforms: Optional[dict] = None
    examples: Optional[List[dict]] = None
    priority: int = 0
    is_active: bool = True


class InstructionUpdate(BaseModel):
    """Update parsing instruction"""
    name: Optional[str] = None
    description: Optional[str] = None
    shipper_pattern: Optional[str] = None
    shipper_keywords: Optional[List[str]] = None
    customer_id: Optional[str] = None
    instructions: Optional[str] = None
    field_mappings: Optional[dict] = None
    data_source_priority: Optional[dict] = None
    value_transforms: Optional[dict] = None
    examples: Optional[List[dict]] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class InstructionResponse(BaseModel):
    """Instruction response"""
    id: str
    name: str
    description: Optional[str] = None
    shipper_pattern: Optional[str]
    shipper_keywords: Optional[List[str]]
    customer_id: Optional[str]
    instructions: str
    field_mappings: Optional[dict]
    data_source_priority: Optional[dict]
    value_transforms: Optional[dict]
    examples: Optional[List[dict]]
    priority: int
    is_active: bool
    times_applied: int
    last_applied_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]


class InstructionListResponse(BaseModel):
    """List response with summary"""
    id: str
    name: str
    description: Optional[str] = None
    shipper_pattern: Optional[str]
    shipper_keywords: Optional[List[str]] = None
    instructions: str  # Include instructions for editing
    field_mappings: Optional[dict] = None
    data_source_priority: Optional[dict] = None
    value_transforms: Optional[dict] = None
    examples: Optional[List[dict]] = None
    is_active: bool
    priority: int
    times_applied: int
    last_applied_at: Optional[datetime] = None
    created_at: datetime


class PaginatedInstructionsResponse(BaseModel):
    """Paginated response"""
    items: List[InstructionListResponse]
    total: int
    page: int
    page_size: int


class TestInstructionRequest(BaseModel):
    """Test instruction against sample"""
    shipper_name: str
    sample_text: Optional[str] = None


class TestInstructionResponse(BaseModel):
    """Test result"""
    matches: bool
    prompt_text: str
    match_reason: Optional[str]


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def model_to_response(inst: ParsingInstruction) -> InstructionResponse:
    """Convert model to response"""
    return InstructionResponse(
        id=inst.id,
        name=inst.name,
        description=inst.description,
        shipper_pattern=inst.shipper_pattern,
        shipper_keywords=inst.get_shipper_keywords() if inst.shipper_keywords else None,
        customer_id=inst.customer_id,
        instructions=inst.instructions,
        field_mappings=inst.get_field_mappings() if inst.field_mappings else None,
        data_source_priority=inst.get_data_source_priority() if inst.data_source_priority else None,
        value_transforms=inst.get_value_transforms() if inst.value_transforms else None,
        examples=inst.get_examples() if inst.examples else None,
        priority=inst.priority,
        is_active=inst.is_active,
        times_applied=inst.times_applied,
        last_applied_at=inst.last_applied_at,
        created_at=inst.created_at,
        updated_at=inst.updated_at,
    )


# ============================================================
# STATIC ROUTES (must come before dynamic /{id} routes)
# ============================================================

@router.get("/for-shipper")
def get_instructions_for_shipper(
    shipper_name: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get all matching instructions for a shipper name.
    Returns instructions sorted by priority, with generated prompt text.
    """
    tenant_id = str(current_user.tenant_id)

    # Get all active instructions
    instructions = session.exec(
        select(ParsingInstruction).where(
            ParsingInstruction.tenant_id == tenant_id,
            ParsingInstruction.is_active == True
        ).order_by(ParsingInstruction.priority.desc())
    ).all()

    # Find matching instructions
    matches = []
    for inst in instructions:
        if inst.matches_shipper(shipper_name):
            matches.append({
                "id": inst.id,
                "name": inst.name,
                "shipper_pattern": inst.shipper_pattern,
                "priority": inst.priority,
                "prompt_text": inst.to_prompt_text(),
            })

    # Combine all matching prompts
    combined_prompt = ""
    if matches:
        combined_prompt = "\n\n".join([m["prompt_text"] for m in matches])

    return {
        "shipper_name": shipper_name,
        "matching_instructions": matches,
        "combined_prompt": combined_prompt,
        "total_matches": len(matches),
    }


@router.post("/increment-applied/{instruction_id}")
def increment_applied_count(
    instruction_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Increment the times_applied counter (called after successful parse)"""
    tenant_id = str(current_user.tenant_id)

    inst = session.exec(
        select(ParsingInstruction).where(
            ParsingInstruction.id == instruction_id,
            ParsingInstruction.tenant_id == tenant_id
        )
    ).first()

    if not inst:
        raise HTTPException(status_code=404, detail="Instruction not found")

    inst.times_applied += 1
    inst.last_applied_at = datetime.utcnow()

    session.add(inst)
    session.commit()

    return {"success": True, "times_applied": inst.times_applied}


# ============================================================
# CRUD ENDPOINTS
# ============================================================

@router.get("", response_model=PaginatedInstructionsResponse)
def list_instructions(
    is_active: Optional[bool] = None,
    customer_id: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all parsing instructions"""
    from sqlalchemy import func

    tenant_id = str(current_user.tenant_id)

    # Base query
    base_query = select(ParsingInstruction).where(
        ParsingInstruction.tenant_id == tenant_id
    )

    if is_active is not None:
        base_query = base_query.where(ParsingInstruction.is_active == is_active)
    if customer_id:
        base_query = base_query.where(ParsingInstruction.customer_id == customer_id)
    if search:
        base_query = base_query.where(
            ParsingInstruction.name.ilike(f"%{search}%") |
            ParsingInstruction.shipper_pattern.ilike(f"%{search}%")
        )

    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total = session.exec(count_query).one()

    # Get paginated results
    query = base_query.order_by(
        ParsingInstruction.priority.desc(),
        ParsingInstruction.name
    ).offset(skip).limit(limit)

    instructions = session.exec(query).all()

    items = [InstructionListResponse(
        id=inst.id,
        name=inst.name,
        description=inst.description,
        shipper_pattern=inst.shipper_pattern,
        shipper_keywords=inst.get_shipper_keywords() if inst.shipper_keywords else None,
        instructions=inst.instructions,
        field_mappings=inst.get_field_mappings() if inst.field_mappings else None,
        data_source_priority=inst.get_data_source_priority() if inst.data_source_priority else None,
        value_transforms=inst.get_value_transforms() if inst.value_transforms else None,
        examples=inst.get_examples() if inst.examples else None,
        is_active=inst.is_active,
        priority=inst.priority,
        times_applied=inst.times_applied,
        last_applied_at=inst.last_applied_at,
        created_at=inst.created_at,
    ) for inst in instructions]

    return PaginatedInstructionsResponse(
        items=items,
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.post("", response_model=InstructionResponse)
def create_instruction(
    data: InstructionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new parsing instruction"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    inst = ParsingInstruction(
        tenant_id=tenant_id,
        name=data.name,
        description=data.description,
        shipper_pattern=data.shipper_pattern,
        customer_id=data.customer_id,
        instructions=data.instructions,
        priority=data.priority,
        is_active=data.is_active,
        created_by=user_id,
    )

    # Set JSON fields
    if data.shipper_keywords:
        inst.set_shipper_keywords(data.shipper_keywords)
    if data.field_mappings:
        inst.set_field_mappings(data.field_mappings)
    if data.data_source_priority:
        inst.set_data_source_priority(data.data_source_priority)
    if data.value_transforms:
        inst.set_value_transforms(data.value_transforms)
    if data.examples:
        inst.set_examples(data.examples)

    session.add(inst)
    session.commit()
    session.refresh(inst)

    return model_to_response(inst)


@router.get("/{instruction_id}", response_model=InstructionResponse)
def get_instruction(
    instruction_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get instruction detail"""
    tenant_id = str(current_user.tenant_id)

    inst = session.exec(
        select(ParsingInstruction).where(
            ParsingInstruction.id == instruction_id,
            ParsingInstruction.tenant_id == tenant_id
        )
    ).first()

    if not inst:
        raise HTTPException(status_code=404, detail="Instruction not found")

    return model_to_response(inst)


@router.put("/{instruction_id}", response_model=InstructionResponse)
def update_instruction(
    instruction_id: str,
    data: InstructionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update parsing instruction"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    inst = session.exec(
        select(ParsingInstruction).where(
            ParsingInstruction.id == instruction_id,
            ParsingInstruction.tenant_id == tenant_id
        )
    ).first()

    if not inst:
        raise HTTPException(status_code=404, detail="Instruction not found")

    # Update fields
    if data.name is not None:
        inst.name = data.name
    if data.description is not None:
        inst.description = data.description
    if data.shipper_pattern is not None:
        inst.shipper_pattern = data.shipper_pattern
    if data.customer_id is not None:
        inst.customer_id = data.customer_id
    if data.instructions is not None:
        inst.instructions = data.instructions
    if data.priority is not None:
        inst.priority = data.priority
    if data.is_active is not None:
        inst.is_active = data.is_active

    # Update JSON fields
    if data.shipper_keywords is not None:
        inst.set_shipper_keywords(data.shipper_keywords)
    if data.field_mappings is not None:
        inst.set_field_mappings(data.field_mappings)
    if data.data_source_priority is not None:
        inst.set_data_source_priority(data.data_source_priority)
    if data.value_transforms is not None:
        inst.set_value_transforms(data.value_transforms)
    if data.examples is not None:
        inst.set_examples(data.examples)

    inst.updated_at = datetime.utcnow()
    inst.updated_by = user_id

    session.add(inst)
    session.commit()
    session.refresh(inst)

    return model_to_response(inst)


@router.delete("/{instruction_id}")
def delete_instruction(
    instruction_id: str,
    hard_delete: bool = True,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete instruction (hard delete by default, soft delete if hard_delete=False)"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    inst = session.exec(
        select(ParsingInstruction).where(
            ParsingInstruction.id == instruction_id,
            ParsingInstruction.tenant_id == tenant_id
        )
    ).first()

    if not inst:
        raise HTTPException(status_code=404, detail="Instruction not found")

    if hard_delete:
        # Hard delete - remove from database
        session.delete(inst)
    else:
        # Soft delete - just deactivate
        inst.is_active = False
        inst.updated_at = datetime.utcnow()
        inst.updated_by = user_id
        session.add(inst)

    session.commit()

    return {"success": True, "message": "Instruction deleted" if hard_delete else "Instruction deactivated"}


# ============================================================
# DYNAMIC ENDPOINTS (with /{id}/)
# ============================================================

@router.post("/{instruction_id}/test", response_model=TestInstructionResponse)
def test_instruction(
    instruction_id: str,
    data: TestInstructionRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Test if an instruction matches a shipper name"""
    tenant_id = str(current_user.tenant_id)

    inst = session.exec(
        select(ParsingInstruction).where(
            ParsingInstruction.id == instruction_id,
            ParsingInstruction.tenant_id == tenant_id
        )
    ).first()

    if not inst:
        raise HTTPException(status_code=404, detail="Instruction not found")

    matches = inst.matches_shipper(data.shipper_name)
    prompt_text = inst.to_prompt_text()

    match_reason = None
    if matches:
        shipper_upper = data.shipper_name.upper()
        if inst.shipper_pattern:
            pattern = inst.shipper_pattern.upper()
            if pattern.endswith('*') and shipper_upper.startswith(pattern[:-1]):
                match_reason = f"Khớp pattern '{inst.shipper_pattern}' (starts with)"
            elif pattern.startswith('*') and pattern.endswith('*'):
                match_reason = f"Khớp pattern '{inst.shipper_pattern}' (contains)"
            elif pattern.startswith('*') and shipper_upper.endswith(pattern[1:]):
                match_reason = f"Khớp pattern '{inst.shipper_pattern}' (ends with)"
            else:
                match_reason = f"Khớp pattern '{inst.shipper_pattern}' (exact)"
        else:
            keywords = inst.get_shipper_keywords()
            for kw in keywords:
                if kw.upper() in shipper_upper:
                    match_reason = f"Khớp keyword '{kw}'"
                    break

    return TestInstructionResponse(
        matches=matches,
        prompt_text=prompt_text,
        match_reason=match_reason,
    )
