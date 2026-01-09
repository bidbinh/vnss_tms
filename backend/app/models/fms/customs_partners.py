"""
FMS Customs Partners - Danh mục đối tác khai báo hải quan
- Người xuất khẩu (Exporters)
- Người nhập khẩu (Importers)
- Địa điểm lưu kho/dỡ hàng (Locations)
"""
from sqlmodel import SQLModel, Field
from typing import Optional, List
from datetime import datetime
import uuid
import json
import hashlib


def normalize_partner_name(name: str) -> str:
    """Normalize name for matching"""
    if not name:
        return ""
    normalized = name.upper().strip()
    remove_patterns = [
        'CO.,LTD', 'CO., LTD', 'CO.,LTD.', 'CO. LTD', 'CO LTD',
        'LIMITED', 'LTD', 'LTD.', 'COMPANY', 'CORP', 'CORPORATION',
        'INC', 'INC.', 'INCORPORATED', 'JSC', 'JOINT STOCK COMPANY',
        'TNHH', 'CÔNG TY TNHH', 'CÔNG TY CỔ PHẦN', 'CTCP', 'CONG TY'
    ]
    for pattern in remove_patterns:
        normalized = normalized.replace(pattern, '')
    normalized = ' '.join(normalized.split())
    normalized = normalized.replace(',', '').replace('.', '').replace('-', ' ')
    return normalized.strip()


class CustomsExporter(SQLModel, table=True):
    """
    Danh mục Người Xuất Khẩu (Exporters/Shippers)
    """
    __tablename__ = "fms_customs_exporters"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Thông tin cơ bản
    seq_no: Optional[int] = None  # TT - Số thứ tự
    name: str = Field(index=True)  # Tên người Xuất Khẩu/Nhập Khẩu
    notes: Optional[str] = None  # Ghi chú (VD: Số HĐ thuê KNQ, Shipper)

    # Địa chỉ (có thể có nhiều dòng)
    address_line_1: Optional[str] = None  # Địa chỉ đối tác 1
    address_line_2: Optional[str] = None  # Địa chỉ đối tác 2
    address_line_3: Optional[str] = None  # Địa chỉ đối tác 3
    address_line_4: Optional[str] = None  # Địa chỉ đối tác 4

    # Thông tin bổ sung
    country_code: Optional[str] = None  # Mã quốc gia (HK, SG, TW, CN...)
    tax_code: Optional[str] = None  # Mã số thuế
    contact_name: Optional[str] = None  # Người liên hệ
    phone: Optional[str] = None  # Số điện thoại
    email: Optional[str] = None  # Email

    # === AI MATCHING COLUMNS ===
    name_normalized: Optional[str] = None  # Normalized name for matching
    name_tokens: Optional[str] = None  # JSON array of tokens for fuzzy match
    name_hash: Optional[str] = None  # SHA256 hash for exact match
    alias_names: Optional[str] = None  # JSON array of alternative names
    match_priority: int = Field(default=0)  # Higher = prefer in matching
    ai_match_count: int = Field(default=0)  # Times AI matched this partner
    user_select_count: int = Field(default=0)  # Times user manually selected

    # Trạng thái
    is_active: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    def update_matching_fields(self):
        """Update name_normalized, name_tokens, name_hash from name"""
        if self.name:
            self.name_normalized = normalize_partner_name(self.name)
            tokens = self.name_normalized.split()
            self.name_tokens = json.dumps([t for t in tokens if len(t) > 1])
            self.name_hash = hashlib.sha256(self.name_normalized.encode()).hexdigest()

    def get_alias_names(self) -> List[str]:
        """Parse alias_names JSON"""
        if self.alias_names:
            return json.loads(self.alias_names)
        return []

    def add_alias(self, alias: str):
        """Add an alias name"""
        aliases = self.get_alias_names()
        normalized = normalize_partner_name(alias)
        if normalized and normalized not in aliases:
            aliases.append(normalized)
            self.alias_names = json.dumps(aliases)


class CustomsImporter(SQLModel, table=True):
    """
    Danh mục Người Nhập Khẩu (Importers/Consignees)
    """
    __tablename__ = "fms_customs_importers"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Thông tin cơ bản
    seq_no: Optional[int] = None  # TT - Số thứ tự
    name: str = Field(index=True)  # Người Nhập Khẩu
    postal_code: Optional[str] = None  # Mã Bưu Chính
    tax_code: Optional[str] = None  # Mã số thuế
    address: Optional[str] = None  # Địa chỉ
    phone: Optional[str] = None  # Số điện thoại

    # Địa chỉ bổ sung (nếu có)
    address_line_3: Optional[str] = None
    address_line_4: Optional[str] = None

    # Thông tin bổ sung
    contact_name: Optional[str] = None  # Người liên hệ
    email: Optional[str] = None  # Email
    fax: Optional[str] = None  # Fax

    # === AI MATCHING COLUMNS ===
    name_normalized: Optional[str] = None  # Normalized name for matching
    name_tokens: Optional[str] = None  # JSON array of tokens for fuzzy match
    name_hash: Optional[str] = None  # SHA256 hash for exact match
    tax_code_hash: Optional[str] = None  # Hash for tax code matching
    alias_names: Optional[str] = None  # JSON array of alternative names
    match_priority: int = Field(default=0)  # Higher = prefer in matching
    ai_match_count: int = Field(default=0)  # Times AI matched this partner
    user_select_count: int = Field(default=0)  # Times user manually selected

    # Trạng thái
    is_active: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    def update_matching_fields(self):
        """Update name_normalized, name_tokens, name_hash, tax_code_hash from name and tax_code"""
        if self.name:
            self.name_normalized = normalize_partner_name(self.name)
            tokens = self.name_normalized.split()
            self.name_tokens = json.dumps([t for t in tokens if len(t) > 1])
            self.name_hash = hashlib.sha256(self.name_normalized.encode()).hexdigest()
        if self.tax_code:
            clean_tax = self.tax_code.replace('-', '').replace(' ', '').upper()
            self.tax_code_hash = hashlib.sha256(clean_tax.encode()).hexdigest()

    def get_alias_names(self) -> List[str]:
        """Parse alias_names JSON"""
        if self.alias_names:
            return json.loads(self.alias_names)
        return []

    def add_alias(self, alias: str):
        """Add an alias name"""
        aliases = self.get_alias_names()
        normalized = normalize_partner_name(alias)
        if normalized and normalized not in aliases:
            aliases.append(normalized)
            self.alias_names = json.dumps(aliases)


class CustomsLocation(SQLModel, table=True):
    """
    Danh mục Địa điểm lưu kho/dỡ hàng
    """
    __tablename__ = "fms_customs_locations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Thông tin cơ bản
    seq_no: Optional[int] = None  # TT - Số thứ tự
    code: str = Field(index=True)  # Mã địa điểm (15BBC01, VNHUGT, CNPIN...)
    name: str  # Tên địa điểm lưu kho
    location_type: Optional[str] = None  # Loại địa điểm (Địa điểm dỡ hàng, Kho ngoại quan...)

    # Thông tin bổ sung
    address: Optional[str] = None
    province: Optional[str] = None
    country_code: Optional[str] = None  # VN, CN...
    customs_office_code: Optional[str] = None  # Mã chi cục HQ quản lý

    # Trạng thái
    is_active: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
