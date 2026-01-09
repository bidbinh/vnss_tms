"""
FMS AI Training API Routes
Quản lý hệ thống học máy từ corrections của user

Endpoints:
- /sessions: Parsing session management
- /corrections: User correction tracking
- /rules: Customer-specific rules
- /partners: Partner matching
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
import json

from app.db.session import get_session
from app.models.fms.ai_training import (
    AIParsingSession,
    AIParsingOutput,
    AICorrection,
    AICustomerRule,
    AIPartnerMatch,
    SessionStatus,
    FieldCategory,
    CorrectionType,
    RuleType,
    PartnerType,
    MatchMethod,
    UserAction,
)
from app.models.fms.customs_partners import CustomsExporter, CustomsImporter
from app.models import User
from app.core.security import get_current_user
from app.services.partner_matching_service import PartnerMatchingService
from app.services.rule_learning_service import RuleLearningService

router = APIRouter(prefix="/ai-training", tags=["FMS AI Training"])


# ============================================================
# REQUEST/RESPONSE MODELS
# ============================================================

class SessionCreate(BaseModel):
    file_ids: List[str] = []
    customer_id: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    session_code: str
    status: str
    ai_provider_used: Optional[str]
    ai_confidence: Optional[float]
    shipper_name: Optional[str]
    total_fields_parsed: int
    total_fields_corrected: int
    created_at: datetime


class CorrectionCreate(BaseModel):
    field_category: str
    field_name: str
    item_index: Optional[int] = None
    original_value: Optional[str] = None
    corrected_value: str
    correction_type: str = CorrectionType.MANUAL_EDIT
    linked_partner_type: Optional[str] = None
    linked_partner_id: Optional[str] = None
    correction_reason: Optional[str] = None


class CorrectionResponse(BaseModel):
    id: str
    field_category: str
    field_name: str
    item_index: Optional[int]
    original_value: Optional[str]
    corrected_value: Optional[str]
    correction_type: Optional[str]
    corrected_at: datetime


class RuleCreate(BaseModel):
    customer_id: Optional[str] = None
    shipper_pattern: str
    rule_type: str
    source_field: Optional[str] = None
    target_field: str
    transform_logic: Optional[dict] = None
    document_type: Optional[str] = None
    description: Optional[str] = None


class RuleResponse(BaseModel):
    id: str
    shipper_pattern: Optional[str]
    rule_type: str
    source_field: Optional[str]
    target_field: Optional[str]
    times_applied: int
    effectiveness_score: Optional[float]
    is_auto_generated: bool
    is_active: bool


class PartnerMatchRequest(BaseModel):
    partner_type: str  # EXPORTER, IMPORTER
    name: str
    address: Optional[str] = None
    tax_code: Optional[str] = None
    country_code: Optional[str] = None


class PartnerLinkRequest(BaseModel):
    session_id: str
    partner_type: str
    extracted_name: str
    partner_id: str
    create_alias: bool = True


# ============================================================
# SESSION MANAGEMENT
# ============================================================

@router.get("/sessions", response_model=List[SessionResponse])
def list_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    shipper_name: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List AI parsing sessions"""
    tenant_id = str(current_user.tenant_id)

    query = select(AIParsingSession).where(
        AIParsingSession.tenant_id == tenant_id
    )

    if status:
        query = query.where(AIParsingSession.status == status)
    if shipper_name:
        query = query.where(AIParsingSession.shipper_name.ilike(f"%{shipper_name}%"))

    query = query.order_by(AIParsingSession.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    sessions = session.exec(query).all()

    return [SessionResponse(
        id=s.id,
        session_code=s.session_code,
        status=s.status,
        ai_provider_used=s.ai_provider_used,
        ai_confidence=float(s.ai_confidence) if s.ai_confidence else None,
        shipper_name=s.shipper_name,
        total_fields_parsed=s.total_fields_parsed,
        total_fields_corrected=s.total_fields_corrected,
        created_at=s.created_at,
    ) for s in sessions]


@router.get("/sessions/{session_id}")
def get_session_detail(
    session_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get full session details including all parsed fields"""
    tenant_id = str(current_user.tenant_id)

    ai_session = session.exec(
        select(AIParsingSession).where(
            AIParsingSession.id == session_id,
            AIParsingSession.tenant_id == tenant_id
        )
    ).first()

    if not ai_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get outputs
    outputs = session.exec(
        select(AIParsingOutput).where(
            AIParsingOutput.session_id == session_id
        )
    ).all()

    # Get corrections
    corrections = session.exec(
        select(AICorrection).where(
            AICorrection.session_id == session_id
        ).order_by(AICorrection.corrected_at)
    ).all()

    # Get partner matches
    partner_matches = session.exec(
        select(AIPartnerMatch).where(
            AIPartnerMatch.session_id == session_id
        )
    ).all()

    return {
        "session": {
            "id": ai_session.id,
            "session_code": ai_session.session_code,
            "status": ai_session.status,
            "original_files": ai_session.get_original_files(),
            "document_types": ai_session.get_document_types(),
            "ai_provider_used": ai_session.ai_provider_used,
            "ai_confidence": float(ai_session.ai_confidence) if ai_session.ai_confidence else None,
            "shipper_name": ai_session.shipper_name,
            "customer_id": ai_session.customer_id,
            "declaration_id": ai_session.declaration_id,
            "total_fields_parsed": ai_session.total_fields_parsed,
            "total_fields_corrected": ai_session.total_fields_corrected,
            "correction_rate": float(ai_session.correction_rate) if ai_session.correction_rate else None,
            "created_at": ai_session.created_at,
            "approved_at": ai_session.approved_at,
        },
        "outputs": [{
            "id": o.id,
            "field_category": o.field_category,
            "field_name": o.field_name,
            "item_index": o.item_index,
            "ai_extracted_value": o.ai_extracted_value,
            "ai_confidence": float(o.ai_confidence) if o.ai_confidence else None,
            "ai_source_document": o.ai_source_document,
        } for o in outputs],
        "corrections": [{
            "id": c.id,
            "field_category": c.field_category,
            "field_name": c.field_name,
            "item_index": c.item_index,
            "original_value": c.original_value,
            "corrected_value": c.corrected_value,
            "correction_type": c.correction_type,
            "corrected_at": c.corrected_at,
        } for c in corrections],
        "partner_matches": [{
            "id": pm.id,
            "partner_type": pm.partner_type,
            "extracted_name": pm.extracted_name,
            "match_method": pm.match_method,
            "match_confidence": float(pm.match_confidence) if pm.match_confidence else None,
            "user_action": pm.user_action,
            "user_selected_partner_id": pm.user_selected_partner_id,
        } for pm in partner_matches],
    }


@router.get("/sessions/{session_id}/audit-trail")
def get_session_audit_trail(
    session_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get complete audit trail for a session"""
    tenant_id = str(current_user.tenant_id)

    ai_session = session.exec(
        select(AIParsingSession).where(
            AIParsingSession.id == session_id,
            AIParsingSession.tenant_id == tenant_id
        )
    ).first()

    if not ai_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get all corrections with timeline
    corrections = session.exec(
        select(AICorrection).where(
            AICorrection.session_id == session_id
        ).order_by(AICorrection.corrected_at)
    ).all()

    # Build timeline
    timeline = []

    # Session created event
    timeline.append({
        "type": "SESSION_CREATED",
        "timestamp": ai_session.created_at,
        "details": {
            "provider": ai_session.ai_provider_used,
            "confidence": float(ai_session.ai_confidence) if ai_session.ai_confidence else None,
        }
    })

    # Add corrections to timeline
    for corr in corrections:
        timeline.append({
            "type": "FIELD_CORRECTED",
            "timestamp": corr.corrected_at,
            "details": {
                "field_category": corr.field_category,
                "field_name": corr.field_name,
                "item_index": corr.item_index,
                "original_value": corr.original_value[:100] if corr.original_value else None,
                "corrected_value": corr.corrected_value[:100] if corr.corrected_value else None,
                "correction_type": corr.correction_type,
            }
        })

    # Session approved event
    if ai_session.approved_at:
        timeline.append({
            "type": "SESSION_APPROVED",
            "timestamp": ai_session.approved_at,
            "details": {
                "approved_by": ai_session.approved_by,
                "declaration_id": ai_session.declaration_id,
            }
        })

    return {
        "session_id": session_id,
        "session_code": ai_session.session_code,
        "total_events": len(timeline),
        "summary": {
            "total_fields_parsed": ai_session.total_fields_parsed,
            "total_fields_corrected": ai_session.total_fields_corrected,
            "accuracy_rate": 1 - float(ai_session.correction_rate or 0),
        },
        "timeline": timeline,
    }


class ApproveSessionRequest(BaseModel):
    """Request body for approving session"""
    declaration_id: Optional[str] = None
    trigger_learning: bool = True


@router.post("/sessions/{session_id}/approve")
def approve_session(
    session_id: str,
    request: ApproveSessionRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Finalize the session:
    - Mark as approved
    - Trigger rule learning from corrections
    - Link to declaration if provided
    """
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)
    declaration_id = request.declaration_id

    ai_session = session.exec(
        select(AIParsingSession).where(
            AIParsingSession.id == session_id,
            AIParsingSession.tenant_id == tenant_id
        )
    ).first()

    if not ai_session:
        raise HTTPException(status_code=404, detail="Session not found")

    if ai_session.status == SessionStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Session already approved")

    # Update session
    ai_session.status = SessionStatus.APPROVED
    ai_session.approved_at = datetime.utcnow()
    ai_session.approved_by = user_id
    if declaration_id:
        ai_session.declaration_id = declaration_id

    # Calculate correction rate
    if ai_session.total_fields_parsed > 0:
        ai_session.correction_rate = Decimal(
            str(ai_session.total_fields_corrected / ai_session.total_fields_parsed)
        )

    session.add(ai_session)

    # Trigger rule learning
    rule_service = RuleLearningService(session)
    learned_rules = rule_service.learn_from_session(session_id)

    session.commit()

    return {
        "success": True,
        "session_id": session_id,
        "status": SessionStatus.APPROVED,
        "rules_learned": len(learned_rules),
        "rule_ids": [r.id for r in learned_rules],
    }


# ============================================================
# CORRECTIONS
# ============================================================

@router.post("/sessions/{session_id}/corrections", response_model=CorrectionResponse)
def save_correction(
    session_id: str,
    correction: CorrectionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Save a user correction to a field"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    # Verify session exists
    ai_session = session.exec(
        select(AIParsingSession).where(
            AIParsingSession.id == session_id,
            AIParsingSession.tenant_id == tenant_id
        )
    ).first()

    if not ai_session:
        raise HTTPException(status_code=404, detail="Session not found")

    if ai_session.status == SessionStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Cannot modify approved session")

    # Find corresponding output
    output = session.exec(
        select(AIParsingOutput).where(
            AIParsingOutput.session_id == session_id,
            AIParsingOutput.field_category == correction.field_category,
            AIParsingOutput.field_name == correction.field_name,
            AIParsingOutput.item_index == correction.item_index
        )
    ).first()

    # Create correction record
    corr = AICorrection(
        session_id=session_id,
        output_id=output.id if output else None,
        field_category=correction.field_category,
        field_name=correction.field_name,
        item_index=correction.item_index,
        original_value=correction.original_value or (output.ai_extracted_value if output else None),
        corrected_value=correction.corrected_value,
        correction_type=correction.correction_type,
        linked_partner_type=correction.linked_partner_type,
        linked_partner_id=correction.linked_partner_id,
        correction_reason=correction.correction_reason,
        corrected_by=user_id,
    )

    session.add(corr)

    # Update session counter
    ai_session.total_fields_corrected += 1
    ai_session.updated_at = datetime.utcnow()
    session.add(ai_session)

    session.commit()
    session.refresh(corr)

    return CorrectionResponse(
        id=corr.id,
        field_category=corr.field_category,
        field_name=corr.field_name,
        item_index=corr.item_index,
        original_value=corr.original_value,
        corrected_value=corr.corrected_value,
        correction_type=corr.correction_type,
        corrected_at=corr.corrected_at,
    )


class BatchCorrectionRequest(BaseModel):
    """Request body for batch corrections"""
    corrections: List[CorrectionCreate]


@router.post("/sessions/{session_id}/corrections/batch")
def save_batch_corrections(
    session_id: str,
    request: BatchCorrectionRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Save multiple corrections at once"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    ai_session = session.exec(
        select(AIParsingSession).where(
            AIParsingSession.id == session_id,
            AIParsingSession.tenant_id == tenant_id
        )
    ).first()

    if not ai_session:
        raise HTTPException(status_code=404, detail="Session not found")

    if ai_session.status == SessionStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Cannot modify approved session")

    saved = []
    for correction in request.corrections:
        corr = AICorrection(
            session_id=session_id,
            field_category=correction.field_category,
            field_name=correction.field_name,
            item_index=correction.item_index,
            original_value=correction.original_value,
            corrected_value=correction.corrected_value,
            correction_type=correction.correction_type,
            linked_partner_type=correction.linked_partner_type,
            linked_partner_id=correction.linked_partner_id,
            corrected_by=user_id,
        )
        session.add(corr)
        saved.append(corr)

    ai_session.total_fields_corrected += len(corrections)
    ai_session.updated_at = datetime.utcnow()
    session.add(ai_session)

    session.commit()

    return {
        "success": True,
        "saved_count": len(saved),
    }


@router.get("/sessions/{session_id}/corrections", response_model=List[CorrectionResponse])
def list_corrections(
    session_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all corrections for a session"""
    corrections = session.exec(
        select(AICorrection).where(
            AICorrection.session_id == session_id
        ).order_by(AICorrection.corrected_at)
    ).all()

    return [CorrectionResponse(
        id=c.id,
        field_category=c.field_category,
        field_name=c.field_name,
        item_index=c.item_index,
        original_value=c.original_value,
        corrected_value=c.corrected_value,
        correction_type=c.correction_type,
        corrected_at=c.corrected_at,
    ) for c in corrections]


# ============================================================
# CUSTOMER RULES
# ============================================================

@router.get("/rules", response_model=List[RuleResponse])
def list_rules(
    customer_id: Optional[str] = None,
    shipper_pattern: Optional[str] = None,
    is_active: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List customer-specific mapping rules"""
    tenant_id = str(current_user.tenant_id)

    query = select(AICustomerRule).where(
        AICustomerRule.tenant_id == tenant_id,
        AICustomerRule.is_active == is_active
    )

    if customer_id:
        query = query.where(AICustomerRule.customer_id == customer_id)
    if shipper_pattern:
        query = query.where(AICustomerRule.shipper_pattern.ilike(f"%{shipper_pattern}%"))

    query = query.order_by(AICustomerRule.effectiveness_score.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    rules = session.exec(query).all()

    return [RuleResponse(
        id=r.id,
        shipper_pattern=r.shipper_pattern,
        rule_type=r.rule_type,
        source_field=r.source_field,
        target_field=r.target_field,
        times_applied=r.times_applied,
        effectiveness_score=float(r.effectiveness_score) if r.effectiveness_score else None,
        is_auto_generated=r.is_auto_generated,
        is_active=r.is_active,
    ) for r in rules]


@router.post("/rules", response_model=RuleResponse)
def create_rule(
    rule: RuleCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Manually create a customer rule"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    new_rule = AICustomerRule(
        tenant_id=tenant_id,
        customer_id=rule.customer_id,
        shipper_pattern=rule.shipper_pattern,
        shipper_pattern_hash=AIParsingSession.compute_shipper_hash(rule.shipper_pattern),
        rule_type=rule.rule_type,
        source_field=rule.source_field,
        target_field=rule.target_field,
        transform_logic=json.dumps(rule.transform_logic) if rule.transform_logic else None,
        document_type=rule.document_type,
        description=rule.description,
        is_auto_generated=False,
        created_by=user_id,
    )

    session.add(new_rule)
    session.commit()
    session.refresh(new_rule)

    return RuleResponse(
        id=new_rule.id,
        shipper_pattern=new_rule.shipper_pattern,
        rule_type=new_rule.rule_type,
        source_field=new_rule.source_field,
        target_field=new_rule.target_field,
        times_applied=new_rule.times_applied,
        effectiveness_score=float(new_rule.effectiveness_score) if new_rule.effectiveness_score else None,
        is_auto_generated=new_rule.is_auto_generated,
        is_active=new_rule.is_active,
    )


@router.get("/rules/for-shipper")
def get_rules_for_shipper(
    shipper_name: str,
    document_type: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get applicable rules for a shipper name"""
    tenant_id = str(current_user.tenant_id)

    rule_service = RuleLearningService(session)
    rules = rule_service.get_rules_for_shipper(tenant_id, shipper_name, document_type)

    return [RuleResponse(
        id=r.id,
        shipper_pattern=r.shipper_pattern,
        rule_type=r.rule_type,
        source_field=r.source_field,
        target_field=r.target_field,
        times_applied=r.times_applied,
        effectiveness_score=float(r.effectiveness_score) if r.effectiveness_score else None,
        is_auto_generated=r.is_auto_generated,
        is_active=r.is_active,
    ) for r in rules]


@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Deactivate a rule"""
    tenant_id = str(current_user.tenant_id)

    rule = session.exec(
        select(AICustomerRule).where(
            AICustomerRule.id == rule_id,
            AICustomerRule.tenant_id == tenant_id
        )
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule.is_active = False
    rule.updated_at = datetime.utcnow()
    session.add(rule)
    session.commit()

    return {"success": True, "message": "Rule deactivated"}


# ============================================================
# PARTNER MATCHING
# ============================================================

@router.post("/partners/match")
def match_partner(
    request: PartnerMatchRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Find matching partner from database.
    Returns best match with confidence and alternatives for dropdown.
    """
    tenant_id = str(current_user.tenant_id)

    service = PartnerMatchingService(session)

    if request.partner_type == PartnerType.EXPORTER:
        result = service.match_exporter(
            name=request.name,
            address=request.address,
            country_code=request.country_code,
            tenant_id=tenant_id,
        )
    elif request.partner_type == PartnerType.IMPORTER:
        result = service.match_importer(
            name=request.name,
            address=request.address,
            tax_code=request.tax_code,
            tenant_id=tenant_id,
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid partner_type")

    return result.to_dict()


@router.post("/partners/link")
def link_partner(
    request: PartnerLinkRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Link AI-extracted name to a database partner.
    Optionally creates an alias for future matching.
    """
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    service = PartnerMatchingService(session)

    success = service.link_partner(
        partner_type=request.partner_type,
        partner_id=request.partner_id,
        extracted_name=request.extracted_name,
        create_alias=request.create_alias,
        user_id=user_id,
    )

    if not success:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Record in partner match table if session provided
    if request.session_id:
        match_record = AIPartnerMatch(
            session_id=request.session_id,
            partner_type=request.partner_type,
            extracted_name=request.extracted_name,
            user_action=UserAction.SELECTED_OTHER,
            user_selected_partner_id=request.partner_id,
            resolved_at=datetime.utcnow(),
            resolved_by=user_id,
        )
        session.add(match_record)
        session.commit()

    return {"success": True, "message": "Partner linked successfully"}


@router.post("/partners/update-matching-fields")
def update_all_matching_fields(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Update matching fields for all partners.
    Run after bulk import.
    """
    tenant_id = str(current_user.tenant_id)

    service = PartnerMatchingService(session)
    counts = service.update_all_matching_fields(tenant_id)

    return {
        "success": True,
        "updated": counts,
    }


# ============================================================
# ANALYTICS
# ============================================================

@router.get("/analytics")
def get_correction_analytics(
    shipper_name: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get analytics on AI accuracy and corrections.
    Used for identifying improvement areas.
    """
    tenant_id = str(current_user.tenant_id)

    shipper_hash = None
    if shipper_name:
        shipper_hash = AIParsingSession.compute_shipper_hash(shipper_name)

    service = RuleLearningService(session)
    analytics = service.get_correction_analytics(tenant_id, shipper_hash, days)

    return analytics
