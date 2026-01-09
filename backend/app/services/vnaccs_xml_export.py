"""
VNACCS/VCIS XML Export Service
Xuất tờ khai hải quan theo chuẩn XML của Tổng cục Hải quan Việt Nam

Format reference: Vietnamese Customs VNACCS/VCIS system
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from dataclasses import dataclass
import xml.etree.ElementTree as ET
from xml.dom import minidom


@dataclass
class HSCodeItem:
    """HS Code line item for XML export"""
    item_no: int
    hs_code: str
    description: str
    product_code: Optional[str] = None
    quantity: float = 0
    unit: str = "PCE"
    unit_price: float = 0
    currency: str = "USD"
    total_value: float = 0
    customs_value: float = 0
    origin_country: str = ""
    import_duty_rate: float = 0
    vat_rate: float = 10
    exemption_code: Optional[str] = None
    gross_weight: float = 0
    net_weight: float = 0


@dataclass
class CustomsDeclarationData:
    """Customs declaration data for XML export"""
    # Declaration info
    declaration_no: str
    declaration_type: str  # IMP, EXP
    declaration_type_code: str  # A11, A12, B11, C11, etc.
    customs_office_code: str
    customs_office_name: str
    registration_date: Optional[date] = None
    classification_code: str = "1"  # Luồng xanh/vàng/đỏ
    representative_hs_code: str = ""

    # Importer/Declarant
    importer_tax_code: str = ""
    importer_name: str = ""
    importer_address: str = ""
    importer_phone: str = ""

    # Exporter
    exporter_name: str = ""
    exporter_address: str = ""
    exporter_country: str = ""

    # Transport
    bl_no: str = ""
    bl_date: Optional[date] = None
    vessel_name: str = ""
    voyage_no: str = ""
    loading_port_code: str = ""
    loading_port_name: str = ""
    discharge_port_code: str = ""
    discharge_port_name: str = ""
    arrival_date: Optional[date] = None
    border_gate_code: str = ""
    border_gate_name: str = ""

    # Cargo
    total_packages: int = 0
    package_unit: str = "PKG"
    gross_weight: float = 0
    net_weight: float = 0
    weight_unit: str = "KGM"
    container_count: int = 0
    container_numbers: str = ""

    # Invoice
    invoice_no: str = ""
    invoice_date: Optional[date] = None
    currency: str = "USD"
    exchange_rate: float = 0
    total_value: float = 0
    fob_value: float = 0
    freight_value: float = 0
    insurance_value: float = 0
    incoterms: str = "FOB"

    # Tax summary
    total_customs_value: float = 0
    total_import_duty: float = 0
    total_vat: float = 0
    total_special_consumption: float = 0
    total_environmental: float = 0
    total_tax: float = 0
    tax_currency: str = "VND"

    # Items
    items: List[HSCodeItem] = None

    def __post_init__(self):
        if self.items is None:
            self.items = []


class VNACCSXMLExporter:
    """
    VNACCS XML Exporter
    Generates XML files according to Vietnamese Customs standard format
    """

    def __init__(self):
        self.encoding = "UTF-8"
        self.version = "1.0"

    def export_import_declaration(self, data: CustomsDeclarationData) -> str:
        """
        Export import declaration (tờ khai nhập khẩu) to XML.

        Returns:
            Pretty-printed XML string
        """
        # Create root element
        root = ET.Element("IMP")
        root.set("xmlns", "http://www.customs.gov.vn/vnaccs")
        root.set("version", "1.0")

        # Declaration Header
        header = ET.SubElement(root, "DeclarationHeader")
        self._add_element(header, "DeclarationNumber", data.declaration_no)
        self._add_element(header, "DeclarationType", data.declaration_type_code)
        self._add_element(header, "CustomsOfficeCode", data.customs_office_code)
        self._add_element(header, "CustomsOfficeName", data.customs_office_name)
        self._add_element(header, "RegistrationDate", self._format_datetime(data.registration_date))
        self._add_element(header, "ClassificationCode", data.classification_code)
        self._add_element(header, "RepresentativeHSCode", data.representative_hs_code or (data.items[0].hs_code[:4] if data.items else ""))

        # Importer
        importer = ET.SubElement(root, "Importer")
        self._add_element(importer, "TaxCode", data.importer_tax_code)
        self._add_element(importer, "Name", data.importer_name)
        self._add_element(importer, "Address", data.importer_address)
        self._add_element(importer, "Phone", data.importer_phone)

        # Exporter
        exporter = ET.SubElement(root, "Exporter")
        self._add_element(exporter, "Name", data.exporter_name)
        self._add_element(exporter, "Address", data.exporter_address)
        self._add_element(exporter, "CountryCode", data.exporter_country)

        # Transport
        transport = ET.SubElement(root, "Transport")
        self._add_element(transport, "BillOfLadingNo", data.bl_no)
        self._add_element(transport, "BillOfLadingDate", self._format_date(data.bl_date))
        self._add_element(transport, "VesselName", data.vessel_name)
        self._add_element(transport, "VoyageNo", data.voyage_no)
        self._add_element(transport, "LoadingPortCode", data.loading_port_code)
        self._add_element(transport, "LoadingPortName", data.loading_port_name)
        self._add_element(transport, "DischargePortCode", data.discharge_port_code)
        self._add_element(transport, "DischargePortName", data.discharge_port_name)
        self._add_element(transport, "ArrivalDate", self._format_date(data.arrival_date))
        self._add_element(transport, "BorderGateCode", data.border_gate_code)
        self._add_element(transport, "BorderGateName", data.border_gate_name)

        # Cargo
        cargo = ET.SubElement(root, "Cargo")
        self._add_element(cargo, "TotalPackages", str(data.total_packages))
        self._add_element(cargo, "PackageUnit", data.package_unit)
        self._add_element(cargo, "GrossWeight", f"{data.gross_weight:.2f}")
        self._add_element(cargo, "NetWeight", f"{data.net_weight:.2f}")
        self._add_element(cargo, "WeightUnit", data.weight_unit)
        self._add_element(cargo, "ContainerCount", str(data.container_count))
        if data.container_numbers:
            containers = ET.SubElement(cargo, "Containers")
            for container in data.container_numbers.split(","):
                self._add_element(containers, "ContainerNo", container.strip())

        # Invoice
        invoice = ET.SubElement(root, "Invoice")
        self._add_element(invoice, "InvoiceNo", data.invoice_no)
        self._add_element(invoice, "InvoiceDate", self._format_date(data.invoice_date))
        self._add_element(invoice, "Currency", data.currency)
        self._add_element(invoice, "ExchangeRate", f"{data.exchange_rate:.0f}")
        self._add_element(invoice, "TotalValue", f"{data.total_value:.2f}")
        self._add_element(invoice, "FOBValue", f"{data.fob_value:.2f}")
        self._add_element(invoice, "FreightValue", f"{data.freight_value:.2f}")
        self._add_element(invoice, "InsuranceValue", f"{data.insurance_value:.2f}")
        self._add_element(invoice, "Incoterms", data.incoterms)

        # Tax Summary
        tax_summary = ET.SubElement(root, "TaxSummary")
        self._add_element(tax_summary, "TotalCustomsValue", f"{data.total_customs_value:.0f}")
        self._add_element(tax_summary, "TotalImportDuty", f"{data.total_import_duty:.0f}")
        self._add_element(tax_summary, "TotalVAT", f"{data.total_vat:.0f}")
        self._add_element(tax_summary, "TotalSpecialConsumption", f"{data.total_special_consumption:.0f}")
        self._add_element(tax_summary, "TotalEnvironmental", f"{data.total_environmental:.0f}")
        self._add_element(tax_summary, "TotalTax", f"{data.total_tax:.0f}")
        self._add_element(tax_summary, "Currency", data.tax_currency)

        # Items
        items_elem = ET.SubElement(root, "Items")
        for item in data.items:
            item_elem = ET.SubElement(items_elem, "Item")
            self._add_element(item_elem, "ItemNo", f"{item.item_no:02d}")
            self._add_element(item_elem, "HSCode", item.hs_code)
            self._add_element(item_elem, "Description", item.description)
            if item.product_code:
                self._add_element(item_elem, "ProductCode", item.product_code)
            self._add_element(item_elem, "Quantity", f"{item.quantity:.2f}")
            self._add_element(item_elem, "Unit", item.unit)
            self._add_element(item_elem, "UnitPrice", f"{item.unit_price:.2f}")
            self._add_element(item_elem, "Currency", item.currency)
            self._add_element(item_elem, "TotalValue", f"{item.total_value:.2f}")
            self._add_element(item_elem, "CustomsValue", f"{item.customs_value:.0f}")
            self._add_element(item_elem, "OriginCountry", item.origin_country)
            self._add_element(item_elem, "ImportDutyRate", f"{item.import_duty_rate:.1f}")
            self._add_element(item_elem, "VATRate", f"{item.vat_rate:.1f}")
            if item.exemption_code:
                self._add_element(item_elem, "ExemptionCode", item.exemption_code)
            self._add_element(item_elem, "GrossWeight", f"{item.gross_weight:.2f}")
            self._add_element(item_elem, "NetWeight", f"{item.net_weight:.2f}")

        return self._prettify(root)

    def export_export_declaration(self, data: CustomsDeclarationData) -> str:
        """
        Export export declaration (tờ khai xuất khẩu) to XML.

        Returns:
            Pretty-printed XML string
        """
        # Create root element
        root = ET.Element("EXP")
        root.set("xmlns", "http://www.customs.gov.vn/vnaccs")
        root.set("version", "1.0")

        # Declaration Header
        header = ET.SubElement(root, "DeclarationHeader")
        self._add_element(header, "DeclarationNumber", data.declaration_no)
        self._add_element(header, "DeclarationType", data.declaration_type_code)
        self._add_element(header, "CustomsOfficeCode", data.customs_office_code)
        self._add_element(header, "CustomsOfficeName", data.customs_office_name)
        self._add_element(header, "RegistrationDate", self._format_datetime(data.registration_date))
        self._add_element(header, "ClassificationCode", data.classification_code)
        self._add_element(header, "RepresentativeHSCode", data.representative_hs_code or (data.items[0].hs_code[:4] if data.items else ""))

        # Exporter (Vietnamese company)
        exporter = ET.SubElement(root, "Exporter")
        self._add_element(exporter, "TaxCode", data.importer_tax_code)  # In export, this is the exporter
        self._add_element(exporter, "Name", data.importer_name)
        self._add_element(exporter, "Address", data.importer_address)
        self._add_element(exporter, "Phone", data.importer_phone)

        # Importer (Foreign buyer)
        importer = ET.SubElement(root, "Importer")
        self._add_element(importer, "Name", data.exporter_name)
        self._add_element(importer, "Address", data.exporter_address)
        self._add_element(importer, "CountryCode", data.exporter_country)

        # Transport
        transport = ET.SubElement(root, "Transport")
        self._add_element(transport, "BillOfLadingNo", data.bl_no)
        self._add_element(transport, "BillOfLadingDate", self._format_date(data.bl_date))
        self._add_element(transport, "VesselName", data.vessel_name)
        self._add_element(transport, "VoyageNo", data.voyage_no)
        self._add_element(transport, "LoadingPortCode", data.loading_port_code)
        self._add_element(transport, "LoadingPortName", data.loading_port_name)
        self._add_element(transport, "DischargePortCode", data.discharge_port_code)
        self._add_element(transport, "DischargePortName", data.discharge_port_name)
        self._add_element(transport, "DepartureDate", self._format_date(data.arrival_date))
        self._add_element(transport, "BorderGateCode", data.border_gate_code)
        self._add_element(transport, "BorderGateName", data.border_gate_name)

        # Cargo
        cargo = ET.SubElement(root, "Cargo")
        self._add_element(cargo, "TotalPackages", str(data.total_packages))
        self._add_element(cargo, "PackageUnit", data.package_unit)
        self._add_element(cargo, "GrossWeight", f"{data.gross_weight:.2f}")
        self._add_element(cargo, "NetWeight", f"{data.net_weight:.2f}")
        self._add_element(cargo, "WeightUnit", data.weight_unit)
        self._add_element(cargo, "ContainerCount", str(data.container_count))
        if data.container_numbers:
            containers = ET.SubElement(cargo, "Containers")
            for container in data.container_numbers.split(","):
                self._add_element(containers, "ContainerNo", container.strip())

        # Invoice
        invoice = ET.SubElement(root, "Invoice")
        self._add_element(invoice, "InvoiceNo", data.invoice_no)
        self._add_element(invoice, "InvoiceDate", self._format_date(data.invoice_date))
        self._add_element(invoice, "Currency", data.currency)
        self._add_element(invoice, "ExchangeRate", f"{data.exchange_rate:.0f}")
        self._add_element(invoice, "TotalValue", f"{data.total_value:.2f}")
        self._add_element(invoice, "FOBValue", f"{data.fob_value:.2f}")
        self._add_element(invoice, "Incoterms", data.incoterms)

        # Tax Summary (for export, usually minimal)
        tax_summary = ET.SubElement(root, "TaxSummary")
        self._add_element(tax_summary, "TotalCustomsValue", f"{data.total_customs_value:.0f}")
        self._add_element(tax_summary, "TotalExportDuty", f"{data.total_import_duty:.0f}")
        self._add_element(tax_summary, "TotalTax", f"{data.total_tax:.0f}")
        self._add_element(tax_summary, "Currency", data.tax_currency)

        # Items
        items_elem = ET.SubElement(root, "Items")
        for item in data.items:
            item_elem = ET.SubElement(items_elem, "Item")
            self._add_element(item_elem, "ItemNo", f"{item.item_no:02d}")
            self._add_element(item_elem, "HSCode", item.hs_code)
            self._add_element(item_elem, "Description", item.description)
            if item.product_code:
                self._add_element(item_elem, "ProductCode", item.product_code)
            self._add_element(item_elem, "Quantity", f"{item.quantity:.2f}")
            self._add_element(item_elem, "Unit", item.unit)
            self._add_element(item_elem, "UnitPrice", f"{item.unit_price:.2f}")
            self._add_element(item_elem, "Currency", item.currency)
            self._add_element(item_elem, "TotalValue", f"{item.total_value:.2f}")
            self._add_element(item_elem, "CustomsValue", f"{item.customs_value:.0f}")
            self._add_element(item_elem, "DestinationCountry", item.origin_country)
            self._add_element(item_elem, "GrossWeight", f"{item.gross_weight:.2f}")
            self._add_element(item_elem, "NetWeight", f"{item.net_weight:.2f}")

        return self._prettify(root)

    def _add_element(self, parent: ET.Element, tag: str, text: str) -> ET.Element:
        """Add a child element with text content."""
        elem = ET.SubElement(parent, tag)
        elem.text = text or ""
        return elem

    def _format_date(self, d: Optional[date]) -> str:
        """Format date as YYYY-MM-DD."""
        if d is None:
            return ""
        if isinstance(d, datetime):
            return d.strftime("%Y-%m-%d")
        return d.strftime("%Y-%m-%d")

    def _format_datetime(self, d: Optional[date]) -> str:
        """Format datetime as ISO format."""
        if d is None:
            return ""
        if isinstance(d, datetime):
            return d.strftime("%Y-%m-%dT%H:%M:%S")
        return d.strftime("%Y-%m-%dT00:00:00")

    def _prettify(self, elem: ET.Element) -> str:
        """Return a pretty-printed XML string."""
        rough_string = ET.tostring(elem, encoding="unicode")
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ", encoding=None)


# Convenience functions
def export_to_vnaccs_xml(declaration_data: Dict[str, Any], items_data: List[Dict[str, Any]]) -> str:
    """
    Export customs declaration to VNACCS XML format.

    Args:
        declaration_data: Dictionary with declaration fields
        items_data: List of HS code item dictionaries

    Returns:
        XML string
    """
    # Convert items
    items = []
    for item in items_data:
        items.append(HSCodeItem(
            item_no=item.get("item_no", 1),
            hs_code=item.get("hs_code", ""),
            description=item.get("product_name", "") or item.get("hs_description", ""),
            product_code=item.get("product_code"),
            quantity=item.get("quantity", 0),
            unit=item.get("unit", "PCE"),
            unit_price=item.get("unit_price", 0),
            currency=item.get("currency_code", "USD"),
            total_value=item.get("total_value", 0),
            customs_value=item.get("customs_value", 0),
            origin_country=item.get("country_of_origin", ""),
            import_duty_rate=item.get("import_duty_rate", 0),
            vat_rate=item.get("vat_rate", 10),
            exemption_code=item.get("exemption_code"),
            gross_weight=item.get("gross_weight", 0),
            net_weight=item.get("net_weight", 0),
        ))

    # Convert declaration
    data = CustomsDeclarationData(
        declaration_no=declaration_data.get("declaration_no", ""),
        declaration_type="IMP" if declaration_data.get("declaration_type") == "IMPORT" else "EXP",
        declaration_type_code=declaration_data.get("declaration_type_code", "C11"),
        customs_office_code=declaration_data.get("customs_office_code", ""),
        customs_office_name=declaration_data.get("customs_office_name", ""),
        registration_date=declaration_data.get("registration_date"),
        classification_code=declaration_data.get("customs_channel", "1"),
        importer_tax_code=declaration_data.get("trader_tax_code", ""),
        importer_name=declaration_data.get("trader_name", ""),
        importer_address=declaration_data.get("trader_address", ""),
        importer_phone=declaration_data.get("trader_phone", ""),
        exporter_name=declaration_data.get("foreign_partner_name", ""),
        exporter_address=declaration_data.get("foreign_partner_address", ""),
        exporter_country=declaration_data.get("country_of_origin", ""),
        bl_no=declaration_data.get("bl_no", ""),
        bl_date=declaration_data.get("bl_date"),
        vessel_name=declaration_data.get("vessel_name", ""),
        voyage_no=declaration_data.get("voyage_no", ""),
        loading_port_code=declaration_data.get("loading_port", ""),
        loading_port_name=declaration_data.get("loading_port_name", ""),
        discharge_port_code=declaration_data.get("discharge_port", ""),
        discharge_port_name=declaration_data.get("discharge_port_name", ""),
        arrival_date=declaration_data.get("arrival_date"),
        border_gate_code=declaration_data.get("border_gate", ""),
        border_gate_name=declaration_data.get("border_gate_name", ""),
        total_packages=declaration_data.get("total_packages", 0),
        package_unit=declaration_data.get("package_unit", "PKG"),
        gross_weight=declaration_data.get("gross_weight", 0),
        net_weight=declaration_data.get("net_weight", 0),
        container_count=declaration_data.get("container_count", 0),
        container_numbers=declaration_data.get("container_numbers", ""),
        invoice_no=declaration_data.get("invoice_no", ""),
        invoice_date=declaration_data.get("invoice_date"),
        currency=declaration_data.get("currency_code", "USD"),
        exchange_rate=declaration_data.get("exchange_rate", 0),
        total_value=declaration_data.get("fob_value", 0),
        fob_value=declaration_data.get("fob_value", 0),
        freight_value=declaration_data.get("freight_value", 0),
        insurance_value=declaration_data.get("insurance_value", 0),
        incoterms=declaration_data.get("incoterms", "FOB"),
        total_customs_value=declaration_data.get("customs_value", 0),
        total_import_duty=declaration_data.get("import_duty", 0),
        total_vat=declaration_data.get("vat", 0),
        total_special_consumption=declaration_data.get("special_consumption_tax", 0),
        total_environmental=declaration_data.get("environmental_tax", 0),
        total_tax=declaration_data.get("total_tax", 0),
        items=items,
    )

    exporter = VNACCSXMLExporter()

    if data.declaration_type == "EXP":
        return exporter.export_export_declaration(data)
    return exporter.export_import_declaration(data)
