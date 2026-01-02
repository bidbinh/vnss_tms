"""
Document Management - Template API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.document import (
    DocumentTemplate, TemplateCategory,
    TemplateField, FieldType,
    GeneratedDocument,
)
from app.core.security import get_current_user

router = APIRouter()


# =================== DOCUMENT TEMPLATES ===================

@router.get("/templates")
def get_templates(
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get document templates"""
    query = select(DocumentTemplate).where(
        DocumentTemplate.tenant_id == str(current_user.tenant_id),
        DocumentTemplate.is_current_version == True
    )

    if category:
        query = query.where(DocumentTemplate.category == category)

    if is_active is not None:
        query = query.where(DocumentTemplate.is_active == is_active)

    if search:
        query = query.where(DocumentTemplate.name.ilike(f"%{search}%"))

    query = query.order_by(DocumentTemplate.name)
    query = query.offset(skip).limit(limit)
    templates = session.exec(query).all()

    return {"items": templates, "total": len(templates)}


@router.get("/templates/{template_id}")
def get_template(
    template_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get template by ID with fields"""
    template = session.exec(
        select(DocumentTemplate).where(
            DocumentTemplate.id == template_id,
            DocumentTemplate.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Get fields
    fields = session.exec(
        select(TemplateField).where(
            TemplateField.template_id == template_id
        ).order_by(TemplateField.field_order)
    ).all()

    return {
        "template": template,
        "fields": fields
    }


@router.post("/templates")
def create_template(
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create document template"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    template = DocumentTemplate(
        tenant_id=tenant_id,
        code=data.get("code"),
        name=data.get("name"),
        description=data.get("description"),
        category=data.get("category", TemplateCategory.OTHER.value),
        content_type=data.get("content_type", "HTML"),
        template_content=data.get("template_content"),
        template_file_path=data.get("template_file_path"),
        preview_image=data.get("preview_image"),
        is_active=data.get("is_active", True),
        is_default=data.get("is_default", False),
        default_folder_id=data.get("default_folder_id"),
        requires_approval=data.get("requires_approval", False),
        workflow_id=data.get("workflow_id"),
        notes=data.get("notes"),
        created_by=user_id,
    )
    session.add(template)
    session.flush()

    # Create fields if provided
    fields_data = data.get("fields", [])
    for i, field_data in enumerate(fields_data):
        field = TemplateField(
            tenant_id=tenant_id,
            template_id=template.id,
            field_order=i + 1,
            field_key=field_data.get("field_key"),
            field_label=field_data.get("field_label"),
            field_type=field_data.get("field_type", FieldType.TEXT.value),
            is_required=field_data.get("is_required", False),
            default_value=field_data.get("default_value"),
            placeholder=field_data.get("placeholder"),
            help_text=field_data.get("help_text"),
            options=field_data.get("options"),
            min_length=field_data.get("min_length"),
            max_length=field_data.get("max_length"),
            min_value=field_data.get("min_value"),
            max_value=field_data.get("max_value"),
            regex_pattern=field_data.get("regex_pattern"),
            width=field_data.get("width"),
            group_name=field_data.get("group_name"),
        )
        session.add(field)

    session.commit()
    session.refresh(template)

    return template


@router.put("/templates/{template_id}")
def update_template(
    template_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update template"""
    template = session.exec(
        select(DocumentTemplate).where(
            DocumentTemplate.id == template_id,
            DocumentTemplate.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    for key, value in data.items():
        if hasattr(template, key) and key not in ["id", "tenant_id", "created_at", "fields"]:
            setattr(template, key, value)

    template.updated_at = datetime.utcnow()
    template.updated_by = str(current_user.id)

    session.add(template)
    session.commit()
    session.refresh(template)

    return template


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete template"""
    template = session.exec(
        select(DocumentTemplate).where(
            DocumentTemplate.id == template_id,
            DocumentTemplate.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Delete fields
    fields = session.exec(
        select(TemplateField).where(TemplateField.template_id == template_id)
    ).all()
    for field in fields:
        session.delete(field)

    session.delete(template)
    session.commit()

    return {"success": True, "message": "Template deleted"}


# =================== TEMPLATE FIELDS ===================

@router.get("/templates/{template_id}/fields")
def get_template_fields(
    template_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get template fields"""
    fields = session.exec(
        select(TemplateField).where(
            TemplateField.template_id == template_id,
            TemplateField.tenant_id == str(current_user.tenant_id)
        ).order_by(TemplateField.field_order)
    ).all()

    return {"items": fields}


@router.post("/templates/{template_id}/fields")
def add_template_field(
    template_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add field to template"""
    tenant_id = str(current_user.tenant_id)

    # Get max order
    max_order_field = session.exec(
        select(TemplateField).where(
            TemplateField.template_id == template_id
        ).order_by(TemplateField.field_order.desc())
    ).first()
    next_order = (max_order_field.field_order + 1) if max_order_field else 1

    field = TemplateField(
        tenant_id=tenant_id,
        template_id=template_id,
        field_order=data.get("field_order", next_order),
        field_key=data.get("field_key"),
        field_label=data.get("field_label"),
        field_type=data.get("field_type", FieldType.TEXT.value),
        is_required=data.get("is_required", False),
        default_value=data.get("default_value"),
        placeholder=data.get("placeholder"),
        help_text=data.get("help_text"),
        options=data.get("options"),
        min_length=data.get("min_length"),
        max_length=data.get("max_length"),
        min_value=data.get("min_value"),
        max_value=data.get("max_value"),
        regex_pattern=data.get("regex_pattern"),
        width=data.get("width"),
        group_name=data.get("group_name"),
    )
    session.add(field)
    session.commit()
    session.refresh(field)

    return field


@router.put("/templates/{template_id}/fields/{field_id}")
def update_template_field(
    template_id: str,
    field_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update template field"""
    field = session.exec(
        select(TemplateField).where(
            TemplateField.id == field_id,
            TemplateField.template_id == template_id,
            TemplateField.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    for key, value in data.items():
        if hasattr(field, key) and key not in ["id", "tenant_id", "template_id", "created_at"]:
            setattr(field, key, value)

    field.updated_at = datetime.utcnow()

    session.add(field)
    session.commit()
    session.refresh(field)

    return field


@router.delete("/templates/{template_id}/fields/{field_id}")
def delete_template_field(
    template_id: str,
    field_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete template field"""
    field = session.exec(
        select(TemplateField).where(
            TemplateField.id == field_id,
            TemplateField.template_id == template_id,
            TemplateField.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    session.delete(field)
    session.commit()

    return {"success": True, "message": "Field deleted"}


# =================== GENERATE DOCUMENTS ===================

@router.post("/templates/{template_id}/generate")
def generate_document(
    template_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Generate document from template"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    template = session.exec(
        select(DocumentTemplate).where(
            DocumentTemplate.id == template_id,
            DocumentTemplate.tenant_id == tenant_id
        )
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Create generated document record
    import json
    generated = GeneratedDocument(
        tenant_id=tenant_id,
        template_id=template_id,
        template_version=template.version,
        document_name=data.get("document_name", f"Generated from {template.name}"),
        field_values=json.dumps(data.get("field_values", {})),
        status="GENERATED",
        entity_type=data.get("entity_type"),
        entity_id=data.get("entity_id"),
        generated_by=user_id,
    )
    session.add(generated)

    # Update template usage
    template.usage_count += 1
    template.last_used_at = datetime.utcnow()
    session.add(template)

    session.commit()
    session.refresh(generated)

    return generated


@router.get("/generated-documents")
def get_generated_documents(
    template_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get generated documents"""
    query = select(GeneratedDocument).where(
        GeneratedDocument.tenant_id == str(current_user.tenant_id)
    )

    if template_id:
        query = query.where(GeneratedDocument.template_id == template_id)

    if status:
        query = query.where(GeneratedDocument.status == status)

    query = query.order_by(GeneratedDocument.generated_at.desc())
    query = query.offset(skip).limit(limit)
    documents = session.exec(query).all()

    return {"items": documents, "total": len(documents)}
