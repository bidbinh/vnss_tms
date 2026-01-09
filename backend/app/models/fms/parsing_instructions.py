"""
FMS Parsing Instructions Model
Hướng dẫn parse chứng từ theo từng khách hàng/shipper

User viết instructions bằng tiếng Việt tự nhiên, hệ thống inject vào prompt khi AI parse.
"""
from sqlmodel import SQLModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import json


class ParsingInstruction(SQLModel, table=True):
    """Customer-specific parsing instructions for AI"""
    __tablename__ = "fms_parsing_instructions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Identification
    name: str  # Display name: "Hướng dẫn cho CHUNQIU"
    description: Optional[str] = None  # Short description

    # Matching criteria - instruction applies when any matches
    shipper_pattern: Optional[str] = None  # Glob pattern: "CHUNQIU*", "*HONGBO*"
    shipper_keywords: Optional[str] = None  # JSON array: ["CHUNQIU", "春秋"]
    customer_id: Optional[str] = Field(default=None, index=True)

    # Main instruction content - Vietnamese text
    instructions: str  # Free-form instructions

    # Structured rules (optional, for programmatic use)
    field_mappings: Optional[str] = None  # JSON
    data_source_priority: Optional[str] = None  # JSON
    value_transforms: Optional[str] = None  # JSON

    # Examples for AI context
    examples: Optional[str] = None  # JSON array

    # Status
    is_active: bool = Field(default=True)
    priority: int = Field(default=0)  # Higher = checked first
    times_applied: int = Field(default=0)
    last_applied_at: Optional[datetime] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None

    # ============================================================
    # JSON HELPERS
    # ============================================================

    def get_shipper_keywords(self) -> List[str]:
        """Get keywords as list"""
        if self.shipper_keywords:
            return json.loads(self.shipper_keywords)
        return []

    def set_shipper_keywords(self, keywords: List[str]):
        """Set keywords from list"""
        self.shipper_keywords = json.dumps(keywords, ensure_ascii=False)

    def get_field_mappings(self) -> Dict[str, str]:
        """Get field mappings dict"""
        if self.field_mappings:
            return json.loads(self.field_mappings)
        return {}

    def set_field_mappings(self, mappings: Dict[str, str]):
        """Set field mappings"""
        self.field_mappings = json.dumps(mappings, ensure_ascii=False)

    def get_data_source_priority(self) -> Dict[str, List[str]]:
        """Get data source priority"""
        if self.data_source_priority:
            return json.loads(self.data_source_priority)
        return {}

    def set_data_source_priority(self, priority: Dict[str, List[str]]):
        """Set data source priority"""
        self.data_source_priority = json.dumps(priority, ensure_ascii=False)

    def get_value_transforms(self) -> Dict[str, Dict[str, str]]:
        """Get value transforms"""
        if self.value_transforms:
            return json.loads(self.value_transforms)
        return {}

    def set_value_transforms(self, transforms: Dict[str, Dict[str, str]]):
        """Set value transforms"""
        self.value_transforms = json.dumps(transforms, ensure_ascii=False)

    def get_examples(self) -> List[Dict[str, Any]]:
        """Get examples list"""
        if self.examples:
            return json.loads(self.examples)
        return []

    def set_examples(self, examples: List[Dict[str, Any]]):
        """Set examples"""
        self.examples = json.dumps(examples, ensure_ascii=False)

    # ============================================================
    # MATCHING LOGIC
    # ============================================================

    def matches_shipper(self, shipper_name: str) -> bool:
        """Check if this instruction matches a shipper name"""
        # Global instruction: no pattern and no keywords = apply to ALL
        if not self.shipper_pattern and not self.shipper_keywords:
            return True

        if not shipper_name:
            return False

        shipper_upper = shipper_name.upper().strip()

        # Check pattern match (glob-style)
        if self.shipper_pattern:
            pattern = self.shipper_pattern.upper().strip()
            if pattern.startswith('*') and pattern.endswith('*'):
                # *KEYWORD* - contains
                keyword = pattern[1:-1]
                if keyword in shipper_upper:
                    return True
            elif pattern.startswith('*'):
                # *SUFFIX - ends with
                suffix = pattern[1:]
                if shipper_upper.endswith(suffix):
                    return True
            elif pattern.endswith('*'):
                # PREFIX* - starts with
                prefix = pattern[:-1]
                if shipper_upper.startswith(prefix):
                    return True
            else:
                # Exact match
                if shipper_upper == pattern:
                    return True

        # Check keyword match
        keywords = self.get_shipper_keywords()
        for keyword in keywords:
            if keyword.upper() in shipper_upper:
                return True

        return False

    # ============================================================
    # PROMPT GENERATION
    # ============================================================

    def to_prompt_text(self) -> str:
        """
        Convert instruction to text for AI prompt injection.
        Returns Vietnamese text that AI can understand.
        """
        lines = []
        lines.append(f"=== HƯỚNG DẪN PARSE CHO: {self.name} ===")
        lines.append("")

        # Main instructions
        if self.instructions:
            lines.append("📋 HƯỚNG DẪN CHÍNH:")
            lines.append(self.instructions)
            lines.append("")

        # Field mappings
        mappings = self.get_field_mappings()
        if mappings:
            lines.append("🔄 MAPPING TRƯỜNG DỮ LIỆU:")
            for source, target in mappings.items():
                target_vi = self._translate_field(target)
                lines.append(f"  - \"{source}\" trong chứng từ → {target_vi}")
            lines.append("")

        # Data source priority
        priority = self.get_data_source_priority()
        if priority:
            lines.append("📊 ƯU TIÊN NGUỒN DỮ LIỆU:")
            for field, sources in priority.items():
                field_vi = self._translate_field(field)
                lines.append(f"  - {field_vi}: Ưu tiên {' > '.join(sources)}")
            lines.append("")

        # Value transforms
        transforms = self.get_value_transforms()
        if transforms:
            lines.append("✏️ CHUYỂN ĐỔI GIÁ TRỊ:")
            for field, mappings in transforms.items():
                for from_val, to_val in mappings.items():
                    lines.append(f"  - \"{from_val}\" → \"{to_val}\"")
            lines.append("")

        # Examples
        examples = self.get_examples()
        if examples:
            lines.append("📝 VÍ DỤ:")
            for i, ex in enumerate(examples[:3], 1):  # Max 3 examples
                lines.append(f"  Ví dụ {i}:")
                if 'input' in ex:
                    lines.append(f"    Input: {ex['input']}")
                if 'output' in ex:
                    lines.append(f"    Output: {ex['output']}")
                if 'explanation' in ex:
                    lines.append(f"    Giải thích: {ex['explanation']}")
            lines.append("")

        return "\n".join(lines)

    def _translate_field(self, field: str) -> str:
        """Translate field name to Vietnamese"""
        translations = {
            'exporter': 'Người xuất khẩu',
            'exporter_name': 'Tên người xuất khẩu',
            'exporter_address': 'Địa chỉ người xuất khẩu',
            'importer': 'Người nhập khẩu',
            'importer_name': 'Tên người nhập khẩu',
            'importer_address': 'Địa chỉ người nhập khẩu',
            'importer_tax_code': 'Mã số thuế người nhập khẩu',
            'consignee': 'Người nhận hàng',
            'shipper': 'Người gửi hàng',
            'address': 'Địa chỉ',
            'container': 'Số container',
            'vessel': 'Tên tàu',
            'bl_no': 'Số vận đơn',
            'invoice_no': 'Số hóa đơn',
        }
        return translations.get(field.lower(), field)
