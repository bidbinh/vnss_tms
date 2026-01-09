"""
Document Parser Service for Customs Declaration
Trích xuất dữ liệu từ PDF/Excel để tạo tờ khai hải quan

Supports:
- PDF: Invoice, Packing List, Bill of Lading, Arrival Notice
- Excel: Packing List, Item lists
"""
import re
import io
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, field, asdict

from app.config.customs_mapping import (
    DocumentType,
    detect_document_type,
    get_mappings_for_type,
    get_item_mappings_for_type,
    MappingField,
)


@dataclass
class ParsedItem:
    """Parsed line item from document

    Theo Guider mapping:
    - product_code: DELL PN / Customer PN (mã người nhập khẩu yêu cầu)
    - supplier_code: Supplier PN / Model (mã của nhà cung cấp/xuất khẩu)
    - product_name: Description of Goods (mô tả hàng hóa)
    """
    item_no: int = 0
    product_code: Optional[str] = None      # DELL PN / Customer PN
    supplier_code: Optional[str] = None     # Supplier PN / Model number
    product_name: Optional[str] = None      # Description of goods
    hs_code: Optional[str] = None
    quantity: float = 0
    unit: Optional[str] = None
    unit_price: float = 0
    total_value: float = 0
    net_weight: float = 0
    gross_weight: float = 0
    country_of_origin: Optional[str] = None
    carton_no: Optional[str] = None


@dataclass
class ParsedDocument:
    """Result of document parsing"""
    document_type: Optional[str] = None
    raw_text: str = ""
    confidence: float = 0.0

    # Header fields
    invoice_no: Optional[str] = None
    invoice_date: Optional[str] = None
    bl_no: Optional[str] = None
    bl_date: Optional[str] = None

    # Parties
    seller_name: Optional[str] = None
    seller_address: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_address: Optional[str] = None
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None

    # Transport
    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None
    flight_no: Optional[str] = None
    loading_port: Optional[str] = None
    discharge_port: Optional[str] = None
    eta: Optional[str] = None

    # Cargo summary
    total_packages: int = 0
    package_unit: Optional[str] = None
    gross_weight: float = 0
    net_weight: float = 0
    volume: float = 0
    container_numbers: Optional[str] = None

    # Values
    currency: str = "USD"
    total_value: float = 0
    incoterms: Optional[str] = None

    # Items
    items: List[ParsedItem] = field(default_factory=list)

    # Metadata
    warnings: List[str] = field(default_factory=list)
    extracted_fields: Dict[str, Any] = field(default_factory=dict)


class DocumentParser:
    """
    Parser for customs-related documents.
    Extracts structured data from PDF text or Excel content.
    """

    # Common regex patterns
    PATTERNS = {
        # Numbers and amounts
        "invoice_no": r"(?:Invoice\s*(?:No\.?|Number|#)[\s:]*)([\w\-\/]+)",
        "bl_no": r"(?:B/?L\s*(?:No\.?|Number)[\s:]*|Bill of Lading\s*(?:No\.?)[\s:]*)([\w\-\/]+)",
        "awb_no": r"(?:AWB\s*(?:No\.?|Number)[\s:]*|Air\s*Waybill[\s:]*)([\d\-]+)",
        "po_no": r"(?:P/?O\s*(?:No\.?|Number)[\s:]*|Purchase Order[\s:]*)([\w\-\/]+)",

        # Dates
        "date": r"(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})",
        "invoice_date": r"(?:Invoice\s*Date|Date of Issue|Date)[\s:]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})",

        # Transport
        "vessel": r"(?:Vessel|Ship|V\.?)[\s:]+([A-Z][A-Z0-9\s\-]+?)(?:\s|$)",
        "voyage": r"(?:Voyage|Voy\.?|V\.)[\s:]+([A-Z0-9\-]+)",
        "flight": r"(?:Flight\s*(?:No\.?)?[\s:]*|FLT[\s:]*)([\w\d]+)",
        "eta": r"(?:ETA|Estimated\s*Arrival)[\s:]+(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})",

        # Ports
        "port_of_loading": r"(?:Port of Loading|POL|From|Origin)[\s:]+([A-Z][A-Za-z\s,]+?)(?:\n|$)",
        "port_of_discharge": r"(?:Port of Discharge|POD|To|Destination)[\s:]+([A-Z][A-Za-z\s,]+?)(?:\n|$)",

        # Weights and measures
        "gross_weight": r"(?:Gross\s*Weight|G\.?W\.?|GWT)[\s:]*([0-9,\.]+)\s*(?:KG|KGS|KGM)?",
        "net_weight": r"(?:Net\s*Weight|N\.?W\.?|NWT)[\s:]*([0-9,\.]+)\s*(?:KG|KGS|KGM)?",
        "volume": r"(?:Volume|CBM|Measurement)[\s:]*([0-9,\.]+)\s*(?:CBM|M3)?",
        "packages": r"(?:Packages|Cartons|Pallets|Qty|Pieces)[\s:]*(\d+)\s*(?:PKG|CTN|PLT|PCS)?",

        # Container
        "container": r"([A-Z]{4}\d{7})",
        "container_full": r"([A-Z]{4}\d{7})\s*/?\s*(\d{2}[A-Z]{2})",

        # Values
        "amount": r"(?:Total|Amount|Value)[\s:]*([A-Z]{3})?\s*([0-9,\.]+)",
        "currency": r"(?:Currency)[\s:]*([A-Z]{3})",
        # Incoterms: DAP, FOB, CIF, CFR, EXW, FCA, CPT, CIP, DDP, etc. + optional location
        "incoterms": r"(?:Incoterms|Terms of Delivery|Delivery Term|Trade Terms?)[\s:]*([A-Z]{3})(?:\s+[A-Z]+)?",

        # HS Code
        "hs_code": r"(?:HS\s*Code|HS|Tariff)[\s:]*(\d{4,10})",

        # Product description section marker
        "description_section": r"(?:DESCRIPTION OF GOODS|COMMODITY|GOODS DESCRIPTION)[\s/]*(?:PART\s*NUMBER)?",
    }

    def __init__(self):
        self._compiled_patterns: Dict[str, re.Pattern] = {}
        self._compile_patterns()

    def _compile_patterns(self):
        """Pre-compile regex patterns for efficiency."""
        for name, pattern in self.PATTERNS.items():
            self._compiled_patterns[name] = re.compile(pattern, re.IGNORECASE | re.MULTILINE)

    def parse_pdf_text(self, text: str) -> ParsedDocument:
        """
        Parse extracted text from PDF document.

        Args:
            text: Raw text extracted from PDF

        Returns:
            ParsedDocument with extracted fields
        """
        result = ParsedDocument(raw_text=text)

        # Detect document type
        doc_type = detect_document_type(text)
        if doc_type:
            result.document_type = doc_type.value
            result.confidence = 0.8
        else:
            result.warnings.append("Could not determine document type")
            result.confidence = 0.3

        # Extract common fields
        self._extract_document_numbers(text, result)
        self._extract_parties(text, result)
        self._extract_transport(text, result)
        self._extract_cargo_summary(text, result)
        self._extract_values(text, result)

        # Extract items if applicable
        if doc_type in [DocumentType.INVOICE, DocumentType.PACKING_LIST]:
            self._extract_items(text, result, doc_type)

        return result

    def _extract_document_numbers(self, text: str, result: ParsedDocument):
        """Extract invoice, B/L, AWB numbers."""
        # Invoice number
        match = self._compiled_patterns["invoice_no"].search(text)
        if match:
            result.invoice_no = match.group(1).strip()
            result.extracted_fields["invoice_no"] = result.invoice_no

        # Invoice date
        match = self._compiled_patterns["invoice_date"].search(text)
        if match:
            result.invoice_date = match.group(1).strip()
            result.extracted_fields["invoice_date"] = result.invoice_date

        # B/L number
        match = self._compiled_patterns["bl_no"].search(text)
        if match:
            result.bl_no = match.group(1).strip()
            result.extracted_fields["bl_no"] = result.bl_no

        # AWB number
        match = self._compiled_patterns["awb_no"].search(text)
        if match:
            if not result.bl_no:
                result.bl_no = match.group(1).strip()
                result.extracted_fields["awb_no"] = result.bl_no

    def _extract_parties(self, text: str, result: ParsedDocument):
        """Extract seller, buyer, consignee information."""
        # Seller/Shipper
        seller_patterns = [
            r"(?:Seller|Shipper|Exporter)[\s:]+(.+?)(?:\n\n|\nConsignee|\nBuyer)",
            r"(?:From|Ship From)[\s:]+(.+?)(?:\n\n|\nTo|\nShip To)",
        ]
        for pattern in seller_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                seller_text = match.group(1).strip()
                lines = seller_text.split("\n")
                result.seller_name = lines[0].strip() if lines else None
                result.seller_address = "\n".join(lines[1:]).strip() if len(lines) > 1 else None
                result.extracted_fields["seller_name"] = result.seller_name
                break

        # Consignee/Buyer
        consignee_patterns = [
            r"(?:Consignee|Buyer|Importer|Ship To)[\s:]+(.+?)(?:\n\n|\nNotify|\nPort)",
            r"(?:To|Deliver To)[\s:]+(.+?)(?:\n\n|\nFrom|\nOrigin)",
        ]
        for pattern in consignee_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                consignee_text = match.group(1).strip()
                lines = consignee_text.split("\n")
                result.consignee_name = lines[0].strip() if lines else None
                result.consignee_address = "\n".join(lines[1:]).strip() if len(lines) > 1 else None
                result.extracted_fields["consignee_name"] = result.consignee_name
                break

    def _extract_transport(self, text: str, result: ParsedDocument):
        """Extract transport details."""
        # Vessel
        match = self._compiled_patterns["vessel"].search(text)
        if match:
            result.vessel_name = match.group(1).strip()
            result.extracted_fields["vessel_name"] = result.vessel_name

        # Voyage
        match = self._compiled_patterns["voyage"].search(text)
        if match:
            result.voyage_no = match.group(1).strip()
            result.extracted_fields["voyage_no"] = result.voyage_no

        # Flight
        match = self._compiled_patterns["flight"].search(text)
        if match:
            result.flight_no = match.group(1).strip()
            result.extracted_fields["flight_no"] = result.flight_no

        # ETA
        match = self._compiled_patterns["eta"].search(text)
        if match:
            result.eta = match.group(1).strip()
            result.extracted_fields["eta"] = result.eta

        # Port of Loading
        match = self._compiled_patterns["port_of_loading"].search(text)
        if match:
            result.loading_port = match.group(1).strip()
            result.extracted_fields["loading_port"] = result.loading_port

        # Port of Discharge
        match = self._compiled_patterns["port_of_discharge"].search(text)
        if match:
            result.discharge_port = match.group(1).strip()
            result.extracted_fields["discharge_port"] = result.discharge_port

    def _extract_cargo_summary(self, text: str, result: ParsedDocument):
        """Extract cargo summary information."""
        # Gross weight
        match = self._compiled_patterns["gross_weight"].search(text)
        if match:
            result.gross_weight = self._parse_number(match.group(1))
            result.extracted_fields["gross_weight"] = result.gross_weight

        # Net weight
        match = self._compiled_patterns["net_weight"].search(text)
        if match:
            result.net_weight = self._parse_number(match.group(1))
            result.extracted_fields["net_weight"] = result.net_weight

        # Volume
        match = self._compiled_patterns["volume"].search(text)
        if match:
            result.volume = self._parse_number(match.group(1))
            result.extracted_fields["volume"] = result.volume

        # Packages
        match = self._compiled_patterns["packages"].search(text)
        if match:
            result.total_packages = int(self._parse_number(match.group(1)))
            result.extracted_fields["total_packages"] = result.total_packages

        # Container numbers
        containers = self._compiled_patterns["container"].findall(text)
        if containers:
            result.container_numbers = ",".join(set(containers))
            result.extracted_fields["container_numbers"] = result.container_numbers

    def _extract_values(self, text: str, result: ParsedDocument):
        """Extract financial values."""
        # Currency
        match = self._compiled_patterns["currency"].search(text)
        if match:
            result.currency = match.group(1).upper()
            result.extracted_fields["currency"] = result.currency

        # Total amount
        match = self._compiled_patterns["amount"].search(text)
        if match:
            if match.group(1):
                result.currency = match.group(1).upper()
            result.total_value = self._parse_number(match.group(2))
            result.extracted_fields["total_value"] = result.total_value

        # Incoterms
        match = self._compiled_patterns["incoterms"].search(text)
        if match:
            result.incoterms = match.group(1).upper()
            result.extracted_fields["incoterms"] = result.incoterms

    # Skip patterns - lines containing these are NOT product items
    SKIP_KEYWORDS = [
        # Party/address info
        "SELLER", "BUYER", "CONSIGNEE", "NOTIFY", "SHIPPER", "IMPORTER", "EXPORTER",
        "ADDRESS", "FAX:", "TEL:", "PHONE:", "EMAIL:", "CONTACT:",
        # Document info
        "INVOICE NO", "INVOICE DATE", "B/L NO", "DATE OF ISSUE", "PO NO",
        "CONTRACT NO", "REFERENCE", "REF:",
        # Terms
        "PAYMENT TERM", "DELIVERY TERM", "INCOTERM", "TERMS OF",
        "SHIPPING MARK", "MARKS & NO", "PORT OF",
        # Totals/summary (should be calculated, not items)
        "TOTAL:", "GRAND TOTAL", "SUB TOTAL", "SUBTOTAL", "SUM:",
        # Headers
        "DESCRIPTION", "PART NUMBER", "QUANTITY", "UNIT PRICE", "AMOUNT",
        "NO.", "STT", "HS CODE", "ORIGIN", "COUNTRY",
        # Misc non-item lines
        "FLAT/RM", "CONNAUGHT", "1 CONNAUGHT", "JARDINE", "CENTRAL",
        "HONG KONG", "CHINA", "VIETNAM", "FROM:", "TO:",
        "PAGE", "DATE:", "ISSUED BY",
    ]

    def _is_skip_line(self, line: str) -> bool:
        """Check if line should be skipped (not a product item)."""
        line_upper = line.upper().strip()

        # Skip if line starts with or contains skip keywords
        for keyword in self.SKIP_KEYWORDS:
            if keyword in line_upper:
                return True

        # Skip lines that are mostly text (addresses, notes)
        numbers = re.findall(r"\d+\.?\d*", line)
        if len(line) > 50 and len(numbers) < 2:
            return True

        # Skip lines with email or phone patterns
        if re.search(r"@|\.com|\.vn|\+\d{10,}", line):
            return True

        return False

    def _is_valid_product_line(self, line: str) -> bool:
        """Check if line looks like a valid product item."""
        # Must have reasonable length
        if len(line.strip()) < 15:
            return False

        # Should have numbers for quantity/price/amount
        numbers = re.findall(r"\d+\.?\d*", line)
        if len(numbers) < 2:
            return False

        # Look for product code pattern (alphanumeric with optional hyphen, 5+ chars)
        has_product_code = bool(re.search(r"\b[A-Z0-9][A-Z0-9\-]{4,}[A-Z0-9]\b", line))

        # Look for HS code pattern (8 digits typically)
        has_hs_code = bool(re.search(r"\b\d{8}\b", line))

        # At least one identifier should be present
        return has_product_code or has_hs_code

    def _extract_items(self, text: str, result: ParsedDocument, doc_type: Optional[DocumentType]):
        """
        Extract line items from invoice or packing list.

        Invoice structure (based on Guider mapping):
        - Description of Goods: TFT-LCD MODULE (mô tả sản phẩm)
        - Customer PN / DELL PN: G2DHY (mã khách hàng/nhập khẩu yêu cầu)
        - Supplier PN / Model: MV270FHM-NX4-4D50 (mã nhà cung cấp)
        - Quantity, Unit Price, Amount
        """
        items: List[ParsedItem] = []
        lines = text.split("\n")

        # Find item data rows - look for lines with quantity/price/amount pattern
        # Typical invoice line has: description, qty, unit, price, amount
        item_no = 1

        # Track current product info (may span multiple lines)
        current_description = None
        current_customer_pn = None
        current_supplier_pn = None

        for idx, line in enumerate(lines):
            line = line.strip()

            # Skip empty lines
            if not line:
                continue

            # Skip header/skip lines
            if self._is_skip_line(line):
                continue

            # Check if this line has numeric data (qty, price, amount)
            numbers = re.findall(r"(\d+(?:,\d{3})*(?:\.\d+)?)", line)
            clean_numbers = [self._parse_number(n) for n in numbers if self._parse_number(n) > 0]

            # Look for product codes in line
            # DELL PN pattern: short alphanumeric like G2DHY, DKGM6, etc (4-6 chars)
            dell_pn_match = re.search(r"\b([A-Z][A-Z0-9]{3,5})\b", line)
            # Supplier PN pattern: longer with hyphens like MV270FHM-NX4-4D50
            supplier_pn_match = re.search(r"\b([A-Z0-9]{2,}[A-Z0-9\-]{3,}[A-Z0-9]{2,})\b", line)

            # Check if line looks like a product description (text without many numbers)
            is_description_line = len(line) > 5 and len(clean_numbers) <= 1

            # Check for common product descriptions
            product_keywords = ["MODULE", "LCD", "TFT", "DISPLAY", "PANEL", "SCREEN", "BOARD", "CABLE", "ADAPTER"]
            has_product_keyword = any(kw in line.upper() for kw in product_keywords)

            if has_product_keyword and is_description_line:
                current_description = line
                continue

            # If line has DELL PN pattern (short code, standalone or indented)
            if dell_pn_match and len(line) < 30 and len(clean_numbers) == 0:
                potential_pn = dell_pn_match.group(1)
                if potential_pn not in ["TOTAL", "FROM", "FLAT", "DATE", "ITEM"]:
                    current_customer_pn = potential_pn
                continue

            # If line has Supplier PN pattern (longer code with hyphens)
            if supplier_pn_match and len(line) < 50:
                potential_spn = supplier_pn_match.group(1)
                # Must have hyphen or be long enough to be supplier code
                if "-" in potential_spn or len(potential_spn) > 10:
                    current_supplier_pn = potential_spn

            # Check if this is a data line with qty/price/amount
            # Needs at least 2 numbers that look like qty and amount
            if len(clean_numbers) >= 2:
                # Filter out HS code (8 digits) from numbers
                hs_match = re.search(r"\b(\d{8})\b", line)
                hs_code = hs_match.group(1) if hs_match else None

                if hs_code:
                    hs_value = float(hs_code)
                    clean_numbers = [n for n in clean_numbers if n != hs_value]

                if len(clean_numbers) >= 2:
                    item = ParsedItem(item_no=item_no)
                    item.hs_code = hs_code

                    # Assign product info from previous lines or current line
                    item.product_name = current_description
                    item.product_code = current_customer_pn  # DELL PN
                    item.supplier_code = current_supplier_pn  # Supplier PN

                    # If no product info collected, try to extract from current line
                    if not item.product_code and dell_pn_match:
                        item.product_code = dell_pn_match.group(1)
                    if not item.supplier_code and supplier_pn_match:
                        item.supplier_code = supplier_pn_match.group(1)

                    # Try to identify qty, unit_price, total from numbers
                    # Logic: find pair where qty * price ≈ total
                    found_match = False
                    for i in range(len(clean_numbers)):
                        for j in range(len(clean_numbers)):
                            if i != j:
                                product = clean_numbers[i] * clean_numbers[j]
                                for k, total_candidate in enumerate(clean_numbers):
                                    if k != i and k != j and total_candidate > 0:
                                        # Allow 1% tolerance
                                        if abs(product - total_candidate) < total_candidate * 0.02:
                                            # Smaller number is likely qty
                                            if clean_numbers[i] <= clean_numbers[j]:
                                                item.quantity = clean_numbers[i]
                                                item.unit_price = clean_numbers[j]
                                            else:
                                                item.quantity = clean_numbers[j]
                                                item.unit_price = clean_numbers[i]
                                            item.total_value = total_candidate
                                            found_match = True
                                            break
                                if found_match:
                                    break
                        if found_match:
                            break

                    # Fallback: assume order is qty, price, total
                    if not found_match and len(clean_numbers) >= 3:
                        item.quantity = clean_numbers[-3]
                        item.unit_price = clean_numbers[-2]
                        item.total_value = clean_numbers[-1]
                    elif not found_match and len(clean_numbers) == 2:
                        item.quantity = clean_numbers[0]
                        item.total_value = clean_numbers[1]
                        if item.quantity > 0:
                            item.unit_price = item.total_value / item.quantity

                    # Extract unit from line (PCE, PCS, SET, KG, etc.)
                    unit_match = re.search(r"\b(PCE|PCS|SET|KG|KGS|CTN|PKG|EA|UNIT)\b", line, re.IGNORECASE)
                    if unit_match:
                        item.unit = unit_match.group(1).upper()

                    # Extract origin country
                    if "CN" in line.split() or "CHINA" in line.upper():
                        item.country_of_origin = "CN"
                    elif "HK" in line.upper():
                        item.country_of_origin = "HK"
                    elif "VN" in line.split() or "VIETNAM" in line.upper():
                        item.country_of_origin = "VN"

                    # Validate: must have quantity > 0
                    if item.quantity > 0:
                        items.append(item)
                        item_no += 1

                        # Reset for next item
                        current_description = None
                        current_customer_pn = None
                        current_supplier_pn = None

        result.items = items

    def _parse_number(self, value: str) -> float:
        """Parse a number string, handling commas and decimals."""
        if not value:
            return 0.0
        # Remove commas and spaces
        cleaned = value.replace(",", "").replace(" ", "")
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def parse_excel_data(self, data: List[Dict[str, Any]]) -> ParsedDocument:
        """
        Parse data from Excel file (as list of dicts from rows).

        Args:
            data: List of dictionaries representing Excel rows

        Returns:
            ParsedDocument with extracted fields
        """
        result = ParsedDocument(document_type=DocumentType.PACKING_LIST.value)

        if not data:
            result.warnings.append("No data in Excel file")
            return result

        # First row headers can help identify document type
        headers = set()
        for row in data:
            headers.update(row.keys())

        # Extract items
        items: List[ParsedItem] = []
        for idx, row in enumerate(data):
            item = ParsedItem(item_no=idx + 1)

            # Map common column names
            column_mappings = {
                "part_number": ["Part Number", "P/N", "PN", "Part No", "Model", "Product Code"],
                "product_name": ["Description", "Item Description", "Goods", "Product Name"],
                "hs_code": ["HS Code", "HS", "Tariff Code"],
                "quantity": ["Quantity", "Qty", "QTY", "PCS", "Pieces"],
                "unit": ["Unit", "UOM", "U/M"],
                "unit_price": ["Unit Price", "Price", "UP"],
                "total_value": ["Amount", "Total", "Value", "Extended"],
                "gross_weight": ["Gross Weight", "G.W.", "GW", "GWT"],
                "net_weight": ["Net Weight", "N.W.", "NW", "NWT"],
                "country_of_origin": ["Origin", "Country of Origin", "C/O", "COO"],
            }

            for field_name, possible_columns in column_mappings.items():
                for col in possible_columns:
                    if col in row and row[col]:
                        value = row[col]
                        if field_name in ["quantity", "unit_price", "total_value", "gross_weight", "net_weight"]:
                            value = self._parse_number(str(value))
                        setattr(item, field_name, value)
                        break

            # Only add if it has meaningful data
            if item.product_code or item.product_name or item.quantity > 0:
                items.append(item)

        result.items = items

        # Calculate summary
        result.total_packages = len(items)
        result.gross_weight = sum(i.gross_weight for i in items)
        result.net_weight = sum(i.net_weight for i in items)
        result.total_value = sum(i.total_value for i in items)

        return result

    def to_customs_data(self, parsed: ParsedDocument) -> Dict[str, Any]:
        """
        Convert ParsedDocument to CustomsDeclaration create payload.

        Returns:
            Dictionary suitable for CustomsCreate schema
        """
        return {
            # Document references
            "invoice_no": parsed.invoice_no,
            "invoice_date": parsed.invoice_date,
            "bl_no": parsed.bl_no,
            "bl_date": parsed.bl_date,

            # Parties
            "foreign_partner_name": parsed.seller_name,
            "foreign_partner_address": parsed.seller_address,
            "trader_name": parsed.consignee_name,
            "trader_address": parsed.consignee_address,

            # Transport
            "vessel_name": parsed.vessel_name,
            "voyage_no": parsed.voyage_no,
            "flight_no": parsed.flight_no,
            "loading_port": parsed.loading_port,
            "discharge_port": parsed.discharge_port,

            # Cargo
            "total_packages": parsed.total_packages,
            "gross_weight": parsed.gross_weight,
            "net_weight": parsed.net_weight,
            "container_numbers": parsed.container_numbers,

            # Values
            "currency_code": parsed.currency,
            "fob_value": parsed.total_value,
            "incoterms": parsed.incoterms,
        }

    def to_hs_items(self, parsed: ParsedDocument) -> List[Dict[str, Any]]:
        """
        Convert parsed items to HSCode create payloads.

        Returns:
            List of dictionaries suitable for HSCodeCreate schema
        """
        return [
            {
                "item_no": item.item_no,
                "hs_code": item.hs_code or "",
                "product_code": item.product_code,      # Customer PN / DELL PN
                "supplier_code": item.supplier_code,    # Supplier PN / Model
                "product_name": item.product_name,      # Description of Goods
                "quantity": item.quantity,
                "unit": item.unit,
                "unit_price": item.unit_price,
                "total_value": item.total_value,
                "country_of_origin": item.country_of_origin,
                "gross_weight": item.gross_weight,
                "net_weight": item.net_weight,
            }
            for item in parsed.items
        ]


# Singleton instance
parser = DocumentParser()


def parse_pdf_content(text: str) -> ParsedDocument:
    """Convenience function to parse PDF text."""
    return parser.parse_pdf_text(text)


def parse_excel_content(data: List[Dict[str, Any]]) -> ParsedDocument:
    """Convenience function to parse Excel data."""
    return parser.parse_excel_data(data)
