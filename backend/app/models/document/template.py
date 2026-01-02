"""
Document Management - Template Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class TemplateCategory(str, Enum):
    """Template category"""
    CONTRACT = "CONTRACT"
    INVOICE = "INVOICE"
    REPORT = "REPORT"
    LETTER = "LETTER"
    FORM = "FORM"
    POLICY = "POLICY"
    PROCEDURE = "PROCEDURE"
    OTHER = "OTHER"


class FieldType(str, Enum):
    """Template field type"""
    TEXT = "TEXT"
    NUMBER = "NUMBER"
    DATE = "DATE"
    DATETIME = "DATETIME"
    BOOLEAN = "BOOLEAN"
    SELECT = "SELECT"
    MULTISELECT = "MULTISELECT"
    TEXTAREA = "TEXTAREA"
    RICH_TEXT = "RICH_TEXT"
    FILE = "FILE"
    IMAGE = "IMAGE"
    SIGNATURE = "SIGNATURE"
    TABLE = "TABLE"


class DocumentTemplate(SQLModel, table=True):
    """Document Template - Reusable document templates"""
    __tablename__ = "dms_templates"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Basic Info
    code: str = Field(index=True)
    name: str
    description: Optional[str] = None
    category: str = Field(default=TemplateCategory.OTHER.value)

    # Template Content
    content_type: str = Field(default="HTML")  # HTML, DOCX, PDF
    template_content: Optional[str] = None  # HTML/JSON content
    template_file_path: Optional[str] = None  # For DOCX/PDF templates
    preview_image: Optional[str] = None

    # Settings
    is_active: bool = Field(default=True)
    is_default: bool = Field(default=False)
    default_folder_id: Optional[str] = None

    # Workflow
    requires_approval: bool = Field(default=False)
    workflow_id: Optional[str] = None

    # Versioning
    version: int = Field(default=1)
    is_current_version: bool = Field(default=True)
    previous_version_id: Optional[str] = None

    # Usage Stats
    usage_count: int = Field(default=0)
    last_used_at: Optional[datetime] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class TemplateField(SQLModel, table=True):
    """Template Field - Dynamic fields in templates"""
    __tablename__ = "dms_template_fields"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    template_id: str = Field(index=True)

    # Field Info
    field_order: int = Field(default=0)
    field_key: str  # Variable name in template
    field_label: str  # Display label
    field_type: str = Field(default=FieldType.TEXT.value)

    # Validation
    is_required: bool = Field(default=False)
    default_value: Optional[str] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None

    # Options (for SELECT/MULTISELECT)
    options: Optional[str] = None  # JSON array

    # Validation Rules
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    regex_pattern: Optional[str] = None

    # Display
    width: Optional[str] = None  # CSS width
    group_name: Optional[str] = None  # Field grouping

    # Conditional
    depends_on_field: Optional[str] = None
    depends_on_value: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GeneratedDocument(SQLModel, table=True):
    """Generated Document - Documents created from templates"""
    __tablename__ = "dms_generated_documents"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Template Reference
    template_id: str = Field(index=True)
    template_version: int = Field(default=1)

    # Generated Document
    document_id: Optional[str] = Field(index=True)  # Link to actual document
    document_name: str

    # Field Values
    field_values: Optional[str] = None  # JSON of field_key: value

    # Status
    status: str = Field(default="DRAFT")  # DRAFT, GENERATED, APPROVED, REJECTED

    # Entity Reference
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None

    # Audit
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    generated_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
