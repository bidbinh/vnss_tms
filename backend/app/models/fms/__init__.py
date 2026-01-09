"""
FMS - Forwarding Management System Models
Quản lý giao nhận vận tải quốc tế (Sea, Air, Express)
"""

from app.models.fms.shipment import (
    FMSShipment,
    ShipmentType,
    ShipmentMode,
    ShipmentStatus,
    IncotermsType,
)
from app.models.fms.container import (
    FMSContainer,
    ContainerType,
    ContainerSize,
    ContainerStatus,
)
from app.models.fms.bill_of_lading import (
    BillOfLading,
    BLType,
    BLStatus,
    FreightTerms,
)
from app.models.fms.airway_bill import (
    AirwayBill,
    AWBType,
    AWBStatus,
)
from app.models.fms.customs import (
    CustomsDeclaration,
    DeclarationType,
    DeclarationStatus,
    HSCode,
)
from app.models.fms.quotation import (
    FMSQuotation,
    QuotationItem,
    QuotationStatus,
    ChargeType,
)
from app.models.fms.agent import (
    ForwardingAgent,
    AgentType,
    AgentAgreement,
)
from app.models.fms.rate import (
    FreightRate,
    RateType,
    RateCharge,
)
from app.models.fms.tracking import (
    ShipmentTracking,
    TrackingEvent,
    TrackingSource,
)
from app.models.fms.document import (
    FMSDocument,
    DocumentType as FMSDocumentType,
)
from app.models.fms.consolidation import (
    Consolidation,
    ConsolidationItem,
    ConsolidationType,
    ConsolidationStatus,
)
from app.models.fms.master_data import (
    Country,
    Port,
    PortType,
    CustomsOffice,
    HSCodeCatalog,
    Currency,
    UnitOfMeasure,
    DeclarationTypeCode,
    ExemptionCode,
)
from app.models.fms.customs_partners import (
    CustomsExporter,
    CustomsImporter,
    CustomsLocation,
)
from app.models.fms.ai_training import (
    AIParsingSession,
    AIParsingOutput,
    AICorrection,
    AICustomerRule,
    AIPartnerMatch,
)
from app.models.fms.parsing_instructions import (
    ParsingInstruction,
)

__all__ = [
    # Shipment
    "FMSShipment",
    "ShipmentType",
    "ShipmentMode",
    "ShipmentStatus",
    "IncotermsType",
    # Container
    "FMSContainer",
    "ContainerType",
    "ContainerSize",
    "ContainerStatus",
    # Bill of Lading
    "BillOfLading",
    "BLType",
    "BLStatus",
    "FreightTerms",
    # Airway Bill
    "AirwayBill",
    "AWBType",
    "AWBStatus",
    # Customs
    "CustomsDeclaration",
    "DeclarationType",
    "DeclarationStatus",
    "HSCode",
    # Quotation
    "FMSQuotation",
    "QuotationItem",
    "QuotationStatus",
    "ChargeType",
    # Agent
    "ForwardingAgent",
    "AgentType",
    "AgentAgreement",
    # Rate
    "FreightRate",
    "RateType",
    "RateCharge",
    # Tracking
    "ShipmentTracking",
    "TrackingEvent",
    "TrackingSource",
    # Document
    "FMSDocument",
    "FMSDocumentType",
    # Consolidation
    "Consolidation",
    "ConsolidationItem",
    "ConsolidationType",
    "ConsolidationStatus",
    # Master Data
    "Country",
    "Port",
    "PortType",
    "CustomsOffice",
    "HSCodeCatalog",
    "Currency",
    "UnitOfMeasure",
    "DeclarationTypeCode",
    "ExemptionCode",
    # Customs Partners
    "CustomsExporter",
    "CustomsImporter",
    "CustomsLocation",
    # AI Training
    "AIParsingSession",
    "AIParsingOutput",
    "AICorrection",
    "AICustomerRule",
    "AIPartnerMatch",
    # Parsing Instructions
    "ParsingInstruction",
]
