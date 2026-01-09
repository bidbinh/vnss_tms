"""
Customs Document Mapping Rules
Quy tắc ánh xạ dữ liệu từ chứng từ nguồn sang tờ khai hải quan

Based on Guider.xlsx mapping specification
"""
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum


class DocumentType(str, Enum):
    """Loại chứng từ nguồn"""
    INVOICE = "INVOICE"
    PACKING_LIST = "PACKING_LIST"
    BILL_OF_LADING = "BILL_OF_LADING"
    AIRWAY_BILL = "AIRWAY_BILL"
    ARRIVAL_NOTICE = "ARRIVAL_NOTICE"


@dataclass
class MappingField:
    """Field mapping configuration"""
    source_field: str  # Field name in source document
    target_field: str  # Field name in customs declaration
    source_label: str  # Label in source document (for pattern matching)
    required: bool = False
    transform: Optional[str] = None  # Transform function name


# Invoice to CustomsDeclaration mapping
INVOICE_MAPPINGS: List[MappingField] = [
    MappingField("seller", "foreign_partner_name", "Seller|Shipper|Exporter", required=True),
    MappingField("seller_address", "foreign_partner_address", "Address"),
    MappingField("consignee", "trader_name", "Consignee|Ship to|Buyer|Importer", required=True),
    MappingField("consignee_address", "trader_address", "Address"),
    MappingField("invoice_no", "invoice_no", "Invoice No|Invoice Number|Inv No", required=True),
    MappingField("invoice_date", "invoice_date", "Invoice Date|Date of Issue|Date", required=True),
    MappingField("po_no", "contract_no", "PO No|P/O No|Purchase Order"),
    MappingField("incoterms", "incoterms", "Terms of Delivery|Incoterms|Delivery Term"),
    MappingField("currency", "currency_code", "Currency"),
    MappingField("total_amount", "fob_value", "Total Amount|Total|Amount", required=True),
    MappingField("gross_weight", "gross_weight", "Gross Weight|G.W.|GW"),
    MappingField("net_weight", "net_weight", "Net Weight|N.W.|NW"),
]

# Invoice items to HSCode mapping
INVOICE_ITEM_MAPPINGS: List[MappingField] = [
    MappingField("description", "product_name", "Description|Goods Description|Item Description", required=True),
    MappingField("hs_description", "hs_description", "HS Description"),
    MappingField("part_number", "product_code", "Part Number|P/N|Part No|Customer PN|DELL PN"),
    MappingField("quantity", "quantity", "Quantity|Qty|QTY", required=True),
    MappingField("unit", "unit", "Unit|UOM"),
    MappingField("unit_price", "unit_price", "Unit Price|Price|Unit Prices", required=True),
    MappingField("amount", "total_value", "Amount|Total|Extended", required=True),
    MappingField("hs_code", "hs_code", "HS Code|HS|Tariff Code"),
    MappingField("origin", "country_of_origin", "Origin|Country of Origin|C/O"),
]

# Bill of Lading to CustomsDeclaration mapping
BL_MAPPINGS: List[MappingField] = [
    MappingField("bl_no", "bl_no", "B/L No|BL No|Bill of Lading No|Sea way bill", required=True),
    MappingField("bl_date", "bl_date", "Date of Issue|Date|B/L Date"),
    MappingField("shipper", "foreign_partner_name", "Shipper|Exporter"),
    MappingField("consignee", "trader_name", "Consignee|Notify Party"),
    MappingField("vessel", "vessel_name", "Vessel|Ship|Vessel Name|Ship Name", required=True),
    MappingField("voyage", "voyage_no", "Voyage|Voyage No|V."),
    MappingField("port_of_loading", "loading_port", "Port of Loading|POL|From", required=True),
    MappingField("port_of_discharge", "discharge_port", "Port of Discharge|POD|To", required=True),
    MappingField("gross_weight", "gross_weight", "Gross Weight|Weight|KGS"),
    MappingField("measurement", "volume", "Measurement|CBM|Volume"),
    MappingField("container_no", "container_numbers", "Container No|Container|CNTR No"),
    MappingField("seal_no", "seal_numbers", "Seal No|Seal"),
    MappingField("packages", "total_packages", "No. of Packages|Packages|PKG"),
]

# Airway Bill to CustomsDeclaration mapping
AWB_MAPPINGS: List[MappingField] = [
    MappingField("awb_no", "bl_no", "AWB No|Air Waybill|HAWB|MAWB", required=True),
    MappingField("awb_date", "bl_date", "Date of Issue|Date"),
    MappingField("shipper", "foreign_partner_name", "Shipper|Consignor"),
    MappingField("consignee", "trader_name", "Consignee"),
    MappingField("flight_no", "flight_no", "Flight No|Flight", required=True),
    MappingField("flight_date", "flight_date", "Flight Date|Date"),
    MappingField("airport_of_departure", "loading_port", "Airport of Departure|From|Origin"),
    MappingField("airport_of_destination", "discharge_port", "Airport of Destination|To|Destination"),
    MappingField("gross_weight", "gross_weight", "Gross Weight|Weight|Chargeable Weight"),
    MappingField("packages", "total_packages", "No. of Pieces|Pieces|Packages"),
]

# Arrival Notice to CustomsDeclaration mapping
ARRIVAL_NOTICE_MAPPINGS: List[MappingField] = [
    MappingField("eta", "expected_arrival_date", "ETA|Estimated Arrival"),
    MappingField("vessel", "vessel_name", "First Vessel|Vessel|Ship"),
    MappingField("mbl", "emanifest_no", "MBL|Master BL"),
    MappingField("hbl", "bl_no", "HBL|House BL|House B/L"),
    MappingField("port_of_loading", "loading_port", "Port of Loading|POL|From"),
    MappingField("port_of_discharge", "discharge_port", "Port of Discharge|POD|To"),
    MappingField("warehouse", "border_gate_name", "Warehouse|WH|Storage"),
    MappingField("pallets", "total_packages", "Pallets|Cartons|Packages|Quantities"),
    MappingField("gross_weight", "gross_weight", "KGS|Gross Weight|Weight"),
    MappingField("cbm", "volume", "CBM|Measurement|Volume"),
]

# Packing List to HSCode items mapping
PACKING_LIST_MAPPINGS: List[MappingField] = [
    MappingField("description", "product_name", "Description|Item Description|Goods"),
    MappingField("part_number", "product_code", "Part Number|P/N|PN|Model"),
    MappingField("quantity", "quantity", "Quantity|Qty|PCS"),
    MappingField("net_weight", "net_weight", "Net Weight|N.W.|NW"),
    MappingField("gross_weight", "gross_weight", "Gross Weight|G.W.|GW"),
    MappingField("measurement", "volume", "Measurement|CBM|Volume"),
    MappingField("carton_no", "carton_no", "Carton No|CTN|C/NO"),
]


# Mapping registry by document type
MAPPING_REGISTRY: Dict[DocumentType, List[MappingField]] = {
    DocumentType.INVOICE: INVOICE_MAPPINGS,
    DocumentType.PACKING_LIST: PACKING_LIST_MAPPINGS,
    DocumentType.BILL_OF_LADING: BL_MAPPINGS,
    DocumentType.AIRWAY_BILL: AWB_MAPPINGS,
    DocumentType.ARRIVAL_NOTICE: ARRIVAL_NOTICE_MAPPINGS,
}

ITEM_MAPPING_REGISTRY: Dict[DocumentType, List[MappingField]] = {
    DocumentType.INVOICE: INVOICE_ITEM_MAPPINGS,
    DocumentType.PACKING_LIST: PACKING_LIST_MAPPINGS,
}


# Pattern keywords for document type detection
DOCUMENT_TYPE_PATTERNS: Dict[DocumentType, List[str]] = {
    DocumentType.INVOICE: [
        "commercial invoice", "invoice", "proforma invoice",
        "tax invoice", "sales invoice"
    ],
    DocumentType.PACKING_LIST: [
        "packing list", "packing slip", "pack list",
        "packing specification", "detailed packing list"
    ],
    DocumentType.BILL_OF_LADING: [
        "bill of lading", "b/l", "bl", "ocean bill",
        "sea waybill", "house b/l", "master b/l"
    ],
    DocumentType.AIRWAY_BILL: [
        "air waybill", "awb", "airway bill",
        "house awb", "master awb", "hawb", "mawb"
    ],
    DocumentType.ARRIVAL_NOTICE: [
        "arrival notice", "arrival notification",
        "notice of arrival", "cargo arrival", "pre-arrival"
    ],
}


def detect_document_type(text: str) -> Optional[DocumentType]:
    """
    Detect document type from text content.
    Returns the most likely document type based on keyword matching.
    """
    text_lower = text.lower()

    # Count keyword matches for each type
    scores: Dict[DocumentType, int] = {}

    for doc_type, patterns in DOCUMENT_TYPE_PATTERNS.items():
        score = 0
        for pattern in patterns:
            if pattern in text_lower:
                score += 1
        if score > 0:
            scores[doc_type] = score

    if not scores:
        return None

    # Return type with highest score
    return max(scores, key=scores.get)


def get_mappings_for_type(doc_type: DocumentType) -> List[MappingField]:
    """Get field mappings for a document type."""
    return MAPPING_REGISTRY.get(doc_type, [])


def get_item_mappings_for_type(doc_type: DocumentType) -> List[MappingField]:
    """Get item field mappings for a document type."""
    return ITEM_MAPPING_REGISTRY.get(doc_type, [])
