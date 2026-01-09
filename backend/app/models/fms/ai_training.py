"""
FMS AI Training Models - Hệ thống học máy từ corrections của user

Models:
- AIParsingSession: Session master cho mỗi lần parse
- AIParsingOutput: Raw output của AI cho từng field
- AICorrection: Lịch sử sửa đổi của user
- AICustomerRule: Rules mapping theo khách hàng
- AIPartnerMatch: Lịch sử matching partner
"""
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
import uuid
import json
import hashlib


# ============================================================
# ENUMS
# ============================================================

class SessionStatus:
    DRAFT = "DRAFT"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"
    CANCELLED = "CANCELLED"


class FieldCategory:
    HEADER = "header"
    EXPORTER = "exporter"
    IMPORTER = "importer"
    TRANSPORT = "transport"
    CARGO = "cargo"
    ITEM = "item"


class CorrectionType:
    MANUAL_EDIT = "MANUAL_EDIT"
    PARTNER_LINK = "PARTNER_LINK"
    HS_LOOKUP = "HS_LOOKUP"
    DROPDOWN_SELECT = "DROPDOWN_SELECT"


class RuleType:
    FIELD_MAPPING = "FIELD_MAPPING"
    VALUE_TRANSFORM = "VALUE_TRANSFORM"
    DEFAULT_VALUE = "DEFAULT_VALUE"


class PartnerType:
    EXPORTER = "EXPORTER"
    IMPORTER = "IMPORTER"
    LOCATION = "LOCATION"


class MatchMethod:
    EXACT = "EXACT"
    TAX_CODE = "TAX_CODE"
    ALIAS = "ALIAS"
    FUZZY = "FUZZY"


class UserAction:
    ACCEPTED = "ACCEPTED"
    SELECTED_OTHER = "SELECTED_OTHER"
    CREATE_NEW = "CREATE_NEW"
    SKIPPED = "SKIPPED"


# ============================================================
# AI PARSING SESSION
# ============================================================

class AIParsingSession(SQLModel, table=True):
    """Master record for each AI parsing operation"""
    __tablename__ = "fms_ai_parsing_sessions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Session identification - auto-generated: AIP-2026-XXXXX (random suffix)
    session_code: str = Field(default_factory=lambda: f"AIP-{datetime.now().year}-{uuid.uuid4().hex[:8].upper()}")
    status: str = Field(default=SessionStatus.DRAFT)

    # Source documents
    original_files: Optional[str] = None  # JSON: [{file_id, filename, storage_path}]
    document_types: Optional[str] = None  # JSON: ["INVOICE", "BILL_OF_LADING"]

    # AI parsing metadata
    ai_provider_used: Optional[str] = None
    ai_model_used: Optional[str] = None
    ai_confidence: Optional[Decimal] = None
    ai_latency_ms: Optional[int] = None
    ai_tokens_used: Optional[int] = None

    # Customer context (for learning)
    customer_id: Optional[str] = Field(default=None, index=True)
    shipper_name: Optional[str] = None
    shipper_pattern_hash: Optional[str] = Field(default=None, index=True)

    # Result tracking
    declaration_id: Optional[str] = None
    total_fields_parsed: int = Field(default=0)
    total_fields_corrected: int = Field(default=0)
    correction_rate: Optional[Decimal] = None

    # Approval tracking
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None

    # Relationships
    outputs: List["AIParsingOutput"] = Relationship(back_populates="session")
    corrections: List["AICorrection"] = Relationship(back_populates="session")
    partner_matches: List["AIPartnerMatch"] = Relationship(back_populates="session")

    def get_original_files(self) -> List[Dict]:
        """Parse original_files JSON"""
        if self.original_files:
            return json.loads(self.original_files)
        return []

    def set_original_files(self, files: List[Dict]):
        """Set original_files as JSON"""
        self.original_files = json.dumps(files)

    def get_document_types(self) -> List[str]:
        """Parse document_types JSON"""
        if self.document_types:
            return json.loads(self.document_types)
        return []

    def set_document_types(self, types: List[str]):
        """Set document_types as JSON"""
        self.document_types = json.dumps(types)

    @staticmethod
    def generate_session_code(tenant_id: str, sequence: int) -> str:
        """Generate session code: AIP-2026-00001"""
        year = datetime.now().year
        return f"AIP-{year}-{sequence:05d}"

    @staticmethod
    def compute_shipper_hash(shipper_name: str) -> str:
        """Compute hash for shipper pattern matching"""
        if not shipper_name:
            return ""
        normalized = shipper_name.upper().strip()
        # Extract main words (remove CO., LTD, COMPANY, etc.)
        skip_words = {'CO', 'LTD', 'LIMITED', 'COMPANY', 'CORP', 'CORPORATION', 'INC', 'INCORPORATED'}
        words = [w for w in normalized.split() if w not in skip_words]
        pattern = ' '.join(sorted(words[:3]))  # Use first 3 significant words
        return hashlib.sha256(pattern.encode()).hexdigest()[:16]


# ============================================================
# AI PARSING OUTPUT
# ============================================================

class AIParsingOutput(SQLModel, table=True):
    """Stores AI's raw output for each field"""
    __tablename__ = "fms_ai_parsing_outputs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: str = Field(foreign_key="fms_ai_parsing_sessions.id", index=True)

    # Field identification
    field_category: str  # header, exporter, importer, transport, cargo, item
    field_name: str  # invoice_no, exporter_name, hs_code, etc.
    item_index: Optional[int] = None  # NULL for header fields, 0-based for items

    # AI extracted values
    ai_extracted_value: Optional[str] = None
    ai_confidence: Optional[Decimal] = None
    ai_source_document: Optional[str] = None  # INVOICE, BILL_OF_LADING
    ai_source_content: Optional[str] = None  # Original text snippet

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    session: Optional[AIParsingSession] = Relationship(back_populates="outputs")


# ============================================================
# AI CORRECTION
# ============================================================

class AICorrection(SQLModel, table=True):
    """Every user edit is recorded for learning"""
    __tablename__ = "fms_ai_corrections"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: str = Field(foreign_key="fms_ai_parsing_sessions.id", index=True)
    output_id: Optional[str] = Field(default=None, foreign_key="fms_ai_parsing_outputs.id")

    # Field identification
    field_category: str
    field_name: str
    item_index: Optional[int] = None

    # Correction details
    original_value: Optional[str] = None
    corrected_value: Optional[str] = None
    correction_type: Optional[str] = None  # MANUAL_EDIT, PARTNER_LINK, HS_LOOKUP

    # For partner linking
    linked_partner_type: Optional[str] = None  # EXPORTER, IMPORTER, LOCATION
    linked_partner_id: Optional[str] = None

    # Context
    correction_reason: Optional[str] = None

    # User tracking
    corrected_by: str
    corrected_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    session: Optional[AIParsingSession] = Relationship(back_populates="corrections")


# ============================================================
# AI CUSTOMER RULE
# ============================================================

class AICustomerRule(SQLModel, table=True):
    """Per-customer mapping rules learned from corrections"""
    __tablename__ = "fms_ai_customer_rules"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Customer identification
    customer_id: Optional[str] = Field(default=None, index=True)  # NULL = all customers
    shipper_pattern: Optional[str] = None  # Fuzzy pattern: "CHUNQIU*"
    shipper_pattern_hash: Optional[str] = Field(default=None, index=True)

    # Rule details
    rule_type: str  # FIELD_MAPPING, VALUE_TRANSFORM, DEFAULT_VALUE
    source_field: Optional[str] = None
    target_field: Optional[str] = None
    transform_logic: Optional[str] = None  # JSON: {"type": "split", "delimiter": "/"}

    # Context
    document_type: Optional[str] = None  # NULL = all types
    description: Optional[str] = None

    # Confidence tracking
    times_applied: int = Field(default=0)
    times_overridden: int = Field(default=0)
    effectiveness_score: Optional[Decimal] = None

    # Status
    is_active: bool = Field(default=True)
    is_auto_generated: bool = Field(default=False)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None

    def get_transform_logic(self) -> Optional[Dict]:
        """Parse transform_logic JSON"""
        if self.transform_logic:
            return json.loads(self.transform_logic)
        return None

    def set_transform_logic(self, logic: Dict):
        """Set transform_logic as JSON"""
        self.transform_logic = json.dumps(logic)

    def calculate_effectiveness(self) -> float:
        """Calculate rule effectiveness score"""
        if self.times_applied == 0:
            return 0.0
        return 1.0 - (self.times_overridden / self.times_applied)


# ============================================================
# AI PARTNER MATCH
# ============================================================

class AIPartnerMatch(SQLModel, table=True):
    """Track all partner matching attempts"""
    __tablename__ = "fms_ai_partner_matches"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: str = Field(foreign_key="fms_ai_parsing_sessions.id", index=True)

    # Input
    partner_type: str  # EXPORTER, IMPORTER
    extracted_name: Optional[str] = None
    extracted_address: Optional[str] = None
    extracted_tax_code: Optional[str] = None
    extracted_country: Optional[str] = None

    # Match results
    match_method: Optional[str] = None  # EXACT, FUZZY, TAX_CODE, ALIAS
    matched_partner_id: Optional[str] = None
    match_confidence: Optional[Decimal] = None
    alternative_matches: Optional[str] = None  # JSON: [{id, name, confidence}]

    # User action
    user_action: Optional[str] = None  # ACCEPTED, SELECTED_OTHER, CREATE_NEW, SKIPPED
    user_selected_partner_id: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None

    # Relationships
    session: Optional[AIParsingSession] = Relationship(back_populates="partner_matches")

    def get_alternative_matches(self) -> List[Dict]:
        """Parse alternative_matches JSON"""
        if self.alternative_matches:
            return json.loads(self.alternative_matches)
        return []

    def set_alternative_matches(self, matches: List[Dict]):
        """Set alternative_matches as JSON"""
        self.alternative_matches = json.dumps(matches)


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def normalize_name(name: str) -> str:
    """Normalize name for matching"""
    if not name:
        return ""
    # Uppercase and strip
    normalized = name.upper().strip()
    # Remove common suffixes
    remove_patterns = [
        'CO.,LTD', 'CO., LTD', 'CO.,LTD.', 'CO. LTD', 'CO LTD',
        'LIMITED', 'LTD', 'LTD.', 'COMPANY', 'CORP', 'CORPORATION',
        'INC', 'INC.', 'INCORPORATED', 'JSC', 'JOINT STOCK COMPANY',
        'TNHH', 'CÔNG TY TNHH', 'CÔNG TY CỔ PHẦN', 'CTCP', 'CONG TY'
    ]
    for pattern in remove_patterns:
        normalized = normalized.replace(pattern, '')
    # Remove extra spaces and punctuation
    normalized = ' '.join(normalized.split())
    normalized = normalized.replace(',', '').replace('.', '').replace('-', ' ')
    return normalized.strip()


def tokenize_name(name: str) -> List[str]:
    """Tokenize name for fuzzy matching"""
    normalized = normalize_name(name)
    if not normalized:
        return []
    # Split into words
    tokens = normalized.split()
    # Filter short words
    tokens = [t for t in tokens if len(t) > 1]
    return tokens


def compute_name_hash(name: str) -> str:
    """Compute hash for exact matching"""
    normalized = normalize_name(name)
    if not normalized:
        return ""
    return hashlib.sha256(normalized.encode()).hexdigest()
