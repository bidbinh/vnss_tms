"""
FMS Customs Model - Customs declaration management
Hải quan xuất nhập khẩu
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
import uuid


class DeclarationType(str, Enum):
    """Loại tờ khai"""
    EXPORT = "EXPORT"  # Tờ khai xuất khẩu
    IMPORT = "IMPORT"  # Tờ khai nhập khẩu
    TRANSIT = "TRANSIT"  # Tờ khai quá cảnh
    TEMPORARY_IMPORT = "TEMPORARY_IMPORT"  # Tạm nhập
    TEMPORARY_EXPORT = "TEMPORARY_EXPORT"  # Tạm xuất
    RE_IMPORT = "RE_IMPORT"  # Tái nhập
    RE_EXPORT = "RE_EXPORT"  # Tái xuất


class DeclarationStatus(str, Enum):
    """Trạng thái tờ khai"""
    DRAFT = "DRAFT"  # Bản nháp
    SUBMITTED = "SUBMITTED"  # Đã nộp
    PROCESSING = "PROCESSING"  # Đang xử lý
    DOCUMENT_CHECK = "DOCUMENT_CHECK"  # Kiểm tra hồ sơ (Luồng vàng)
    PHYSICAL_CHECK = "PHYSICAL_CHECK"  # Kiểm tra thực tế (Luồng đỏ)
    APPROVED = "APPROVED"  # Đã duyệt (Luồng xanh)
    DUTY_PAID = "DUTY_PAID"  # Đã nộp thuế
    RELEASED = "RELEASED"  # Đã thông quan
    CANCELLED = "CANCELLED"  # Đã hủy
    REJECTED = "REJECTED"  # Bị từ chối


class CustomsDeclaration(SQLModel, table=True):
    """
    Customs Declaration - Tờ khai hải quan
    Theo chuẩn VNACCS IDA (133 chỉ tiêu) / EDA (109 chỉ tiêu)
    """
    __tablename__ = "fms_customs_declarations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Liên kết
    shipment_id: str = Field(index=True)

    # === THÔNG TIN TỜ KHAI ===
    declaration_no: Optional[str] = Field(default=None, index=True)  # Số tờ khai (11 ký tự)
    declaration_type: str = Field(default=DeclarationType.EXPORT.value)  # IMPORT/EXPORT
    declaration_type_code: Optional[str] = None  # Mã loại hình: A11, A12, B11, C11, E31...
    first_declaration_no: Optional[str] = None  # Số TK đầu tiên (cho lô >50 dòng, "F" hoặc số TK)
    status: str = Field(default=DeclarationStatus.DRAFT.value)
    transaction_code: Optional[str] = None  # Mã giao dịch: IDA, IDC, IDE...
    amendment_count: int = Field(default=0)  # Số lần sửa đổi bổ sung

    # Reference
    reference_no: Optional[str] = None  # Số tham chiếu nội bộ DN

    # Registration
    registration_date: Optional[date] = None  # Ngày đăng ký
    registration_time: Optional[datetime] = None  # Giờ đăng ký
    tax_registration_code: Optional[str] = None  # Mã loại hình đăng ký thuế

    # === CHI CỤC HẢI QUAN ===
    customs_office_code: Optional[str] = None  # Mã chi cục: 03CES14, HQHANAM...
    customs_office_name: Optional[str] = None  # Tên chi cục
    customs_sub_dept: Optional[str] = None  # Đội/Tổ nghiệp vụ

    # Channel/Lane (Luồng)
    customs_channel: Optional[str] = None  # 1=GREEN, 2=YELLOW, 3=RED
    check_result: Optional[str] = None  # Kết quả kiểm tra

    # === NGƯỜI KHAI HẢI QUAN ===
    declarant_code: Optional[str] = None  # Mã người khai (nhân viên)
    declarant_name: Optional[str] = None  # Tên người khai
    declarant_tax_code: Optional[str] = None  # MST người khai
    declarant_address: Optional[str] = None  # Địa chỉ người khai
    declarant_phone: Optional[str] = None  # SĐT người khai
    declarant_email: Optional[str] = None  # Email người khai

    # === DOANH NGHIỆP XNK ===
    importer_code: Optional[str] = None  # Mã người NK (khác MST)
    importer_postal_code: Optional[str] = None  # Mã bưu chính người NK
    trader_name: Optional[str] = None  # Tên doanh nghiệp XNK
    trader_tax_code: Optional[str] = None  # MST doanh nghiệp
    trader_address: Optional[str] = None  # Địa chỉ doanh nghiệp
    trader_phone: Optional[str] = None  # SĐT doanh nghiệp
    trader_fax: Optional[str] = None  # Fax doanh nghiệp

    # === ĐẠI LÝ HẢI QUAN ===
    broker_name: Optional[str] = None  # Tên đại lý HQ
    broker_code: Optional[str] = None  # Mã đại lý
    broker_tax_code: Optional[str] = None  # MST đại lý

    # === ĐỐI TÁC NƯỚC NGOÀI ===
    foreign_partner_name: Optional[str] = None  # Tên seller/buyer nước ngoài
    foreign_partner_address: Optional[str] = None  # Địa chỉ đối tác
    foreign_partner_country: Optional[str] = None  # Mã nước (2 ký tự)

    # === HỢP ĐỒNG / HÓA ĐƠN ===
    contract_no: Optional[str] = None  # Số hợp đồng
    contract_date: Optional[date] = None  # Ngày hợp đồng
    invoice_no: Optional[str] = None  # Số hóa đơn
    invoice_date: Optional[date] = None  # Ngày hóa đơn
    po_no: Optional[str] = None  # Số PO
    po_date: Optional[date] = None  # Ngày PO

    # === THANH TOÁN ===
    payment_method: Optional[str] = None  # L/C, T/T, D/P, D/A, CAD...
    payment_terms: Optional[str] = None  # Điều kiện thanh toán
    lc_no: Optional[str] = None  # Số L/C
    lc_date: Optional[date] = None  # Ngày mở L/C
    lc_bank: Optional[str] = None  # Ngân hàng mở L/C

    # === VẬN TẢI ===
    transport_mode: Optional[str] = None  # 1=SEA, 4=AIR, 5=ROAD, 6=RAIL
    mbl_no: Optional[str] = None  # Master Bill of Lading
    hbl_no: Optional[str] = None  # House Bill of Lading
    bl_no: Optional[str] = None  # Số vận đơn (nếu không tách MBL/HBL)
    bl_date: Optional[date] = None  # Ngày vận đơn
    awb_no: Optional[str] = None  # Air Waybill number (hàng AIR)
    vessel_name: Optional[str] = None  # Tên tàu
    voyage_no: Optional[str] = None  # Số chuyến
    flight_no: Optional[str] = None  # Số hiệu chuyến bay (hàng AIR)
    eta_date: Optional[date] = None  # Ngày tàu đến (ETA)
    departure_date: Optional[date] = None  # Ngày tàu rời cảng xếp

    # === CẢNG / CỬA KHẨU ===
    loading_port: Optional[str] = None  # Mã cảng xếp (UN/LOCODE)
    loading_port_name: Optional[str] = None  # Tên cảng xếp
    discharge_port: Optional[str] = None  # Mã cảng dỡ
    discharge_port_name: Optional[str] = None  # Tên cảng dỡ
    entry_gate_code: Optional[str] = None  # Mã cửa khẩu nhập
    exit_gate_code: Optional[str] = None  # Mã cửa khẩu xuất
    border_gate: Optional[str] = None  # Mã cửa khẩu
    border_gate_name: Optional[str] = None  # Tên cửa khẩu

    # === KHO / ĐỊA ĐIỂM ===
    warehouse_code: Optional[str] = None  # Mã kho CFS/ICD
    warehouse_name: Optional[str] = None  # Tên kho lưu hàng
    unloading_place_code: Optional[str] = None  # Mã địa điểm dỡ hàng
    unloading_place: Optional[str] = None  # Tên địa điểm dỡ hàng

    # === NƯỚC XUẤT XỨ / ĐÍCH ===
    country_of_origin: Optional[str] = None  # Mã nước xuất xứ
    country_of_destination: Optional[str] = None  # Mã nước đích

    # === ĐIỀU KIỆN THƯƠNG MẠI ===
    incoterms: Optional[str] = None  # FOB, CIF, DAP, DDP...
    incoterms_place: Optional[str] = None  # Địa điểm giao hàng

    # === TRỊ GIÁ ===
    currency_code: str = Field(default="USD")  # Mã tiền tệ
    exchange_rate: Optional[float] = None  # Tỷ giá
    valuation_method: Optional[str] = None  # Phương pháp xác định trị giá: 1,2,3,4,5,6
    price_condition_code: Optional[str] = None  # Mã điều kiện giá

    fob_value: float = Field(default=0)  # Trị giá FOB (ngoại tệ)
    cif_value: float = Field(default=0)  # Trị giá CIF (ngoại tệ)
    freight_value: float = Field(default=0)  # Cước vận chuyển
    insurance_value: float = Field(default=0)  # Phí bảo hiểm
    other_costs: float = Field(default=0)  # Chi phí khác
    commission_value: float = Field(default=0)  # Phí hoa hồng
    brokerage_value: float = Field(default=0)  # Phí môi giới
    packing_cost: float = Field(default=0)  # Chi phí đóng gói

    total_value_foreign: float = Field(default=0)  # Tổng trị giá ngoại tệ
    total_value_vnd: float = Field(default=0)  # Tổng trị giá VND
    customs_value: float = Field(default=0)  # Trị giá tính thuế (VND)

    # === HÀNG HÓA TỔNG HỢP ===
    total_items: int = Field(default=0)  # Tổng số dòng hàng (max 50)
    representative_hs_code: Optional[str] = None  # Mã HS đại diện (4 số)
    goods_description: Optional[str] = None  # Mô tả chung lô hàng

    total_packages: int = Field(default=0)  # Tổng số kiện
    package_unit: Optional[str] = None  # Đơn vị: PKG, CTN, PLT...
    gross_weight: float = Field(default=0)  # Tổng trọng lượng (KG)
    net_weight: float = Field(default=0)  # Trọng lượng tịnh (KG)

    # === CONTAINER ===
    container_count: int = Field(default=0)  # Số container
    container_type: Optional[str] = None  # Loại: 20ft, 40ft, 40HC...
    container_numbers: Optional[str] = None  # Danh sách container (JSON)

    # === THUẾ ===
    import_duty: float = Field(default=0)  # Thuế nhập khẩu
    import_duty_payable: float = Field(default=0)  # Thuế NK phải nộp (sau miễn giảm)
    import_duty_exempted: float = Field(default=0)  # Số tiền miễn thuế NK
    special_consumption_tax: float = Field(default=0)  # Thuế TTĐB
    vat: float = Field(default=0)  # Thuế GTGT
    vat_payable: float = Field(default=0)  # Thuế VAT phải nộp
    vat_exempted: float = Field(default=0)  # Số tiền miễn VAT
    environmental_tax: float = Field(default=0)  # Thuế BVMT
    anti_dumping_tax: float = Field(default=0)  # Thuế chống bán phá giá
    safeguard_tax: float = Field(default=0)  # Thuế tự vệ
    other_tax: float = Field(default=0)  # Thuế khác
    total_tax: float = Field(default=0)  # Tổng thuế
    exemption_code: Optional[str] = None  # Mã miễn giảm thuế: XNK01, XNK32...

    # === NỘP THUẾ ===
    tax_payment_deadline: Optional[date] = None  # Thời hạn nộp thuế
    tax_payment_date: Optional[date] = None  # Ngày nộp thuế thực tế
    tax_receipt_no: Optional[str] = None  # Số biên lai thuế

    # === THÔNG QUAN ===
    release_date: Optional[datetime] = None  # Ngày thông quan
    release_by: Optional[str] = None  # Người ký thông quan

    # === E-MANIFEST ===
    emanifest_no: Optional[str] = None  # Số E-Manifest
    emanifest_date: Optional[datetime] = None  # Ngày E-Manifest

    # === CHỨNG NHẬN XUẤT XỨ (C/O) ===
    co_no: Optional[str] = None  # Số C/O
    co_form: Optional[str] = None  # Form: A, D, E, AK, AJ, CPTPP, VK...
    co_date: Optional[date] = None  # Ngày cấp C/O
    co_issuing_country: Optional[str] = None  # Nước cấp C/O

    # === GIẤY PHÉP ===
    import_license_no: Optional[str] = None  # Số giấy phép NK
    import_license_date: Optional[date] = None  # Ngày cấp GP
    import_license_issuer: Optional[str] = None  # Cơ quan cấp GP
    import_license_expiry: Optional[date] = None  # Ngày hết hạn GP
    inspection_cert_no: Optional[str] = None  # Số chứng thư kiểm tra
    inspection_cert_date: Optional[date] = None  # Ngày chứng thư

    # === CHỨNG TỪ ĐÍNH KÈM ===
    attached_documents: Optional[str] = None  # JSON list chứng từ

    # === HS CODES SUMMARY ===
    hs_codes_summary: Optional[str] = None  # JSON array of HS codes

    # === GHI CHÚ ===
    description: Optional[str] = None  # Mô tả
    notes: Optional[str] = None  # Ghi chú nội bộ
    customs_notes: Optional[str] = None  # Ghi chú cho HQ

    # === FILE ===
    declaration_file: Optional[str] = None  # File tờ khai

    # === ECUS SYNC ===
    ecus_synced: bool = Field(default=False)  # Đã đồng bộ ECUS chưa
    ecus_sync_date: Optional[datetime] = None  # Ngày đồng bộ
    ecus_declaration_id: Optional[str] = None  # ID trong ECUS

    # === AUDIT ===
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class HSCode(SQLModel, table=True):
    """
    HS Code - Mã số hàng hóa (Dòng hàng)
    Chi tiết từng mặt hàng trong tờ khai (tối đa 50 dòng/tờ khai)
    """
    __tablename__ = "fms_hs_codes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Liên kết
    declaration_id: str = Field(index=True)
    shipment_id: Optional[str] = None

    # === SỐ THỨ TỰ ===
    line_no: int = Field(default=1, sa_column_kwargs={"name": "line_no"})  # Số thứ tự dòng hàng (1-50)

    # === MÃ HS ===
    hs_code: str = Field(index=True)  # Mã HS 8-10 số
    hs_description: Optional[str] = None  # Mô tả theo biểu thuế

    # === THÔNG TIN SẢN PHẨM ===
    product_name: Optional[str] = None  # Tên hàng (Description of Goods)
    product_code: Optional[str] = Field(default=None, index=True)  # Mã hàng DN (để lookup HS)
    supplier_code: Optional[str] = None  # Mã nhà cung cấp
    product_specification: Optional[str] = None  # Quy cách chi tiết
    brand: Optional[str] = None  # Nhãn hiệu
    model: Optional[str] = None  # Model/Kiểu
    serial_lot_no: Optional[str] = None  # Số serial/lot

    # === NGÀY SẢN XUẤT / HẠN SỬ DỤNG ===
    manufacturing_date: Optional[date] = None  # Ngày sản xuất
    expiry_date: Optional[date] = None  # Hạn sử dụng

    # === XUẤT XỨ ===
    country_of_origin: Optional[str] = None  # Mã nước xuất xứ
    origin_criteria: Optional[str] = None  # Tiêu chí XX: WO, PE, CTH, RVC...

    # === SỐ LƯỢNG ===
    quantity: float = Field(default=0)  # Số lượng chính
    unit: Optional[str] = None  # Đơn vị tính (hiển thị)
    unit_code: Optional[str] = None  # Mã ĐVT VNACCS: KGM, MTR, PCE...
    quantity_2: Optional[float] = None  # Số lượng phụ
    unit_2: Optional[str] = None  # Đơn vị tính phụ
    unit_2_code: Optional[str] = None  # Mã ĐVT phụ

    # === TRỌNG LƯỢNG ===
    gross_weight: float = Field(default=0)  # Trọng lượng cả bì (KG)
    net_weight: float = Field(default=0)  # Trọng lượng tịnh (KG)

    # === GIÁ TRỊ ===
    unit_price: float = Field(default=0)  # Đơn giá
    currency_code: str = Field(default="USD")  # Mã tiền tệ
    total_value: float = Field(default=0)  # Tổng trị giá (ngoại tệ)
    customs_value: float = Field(default=0)  # Trị giá tính thuế (VND)

    # === THUẾ SUẤT ===
    import_duty_rate: float = Field(default=0)  # % Thuế NK thông thường
    preferential_rate: Optional[float] = None  # % Thuế ưu đãi
    special_preferential_rate: Optional[float] = None  # % Thuế đặc biệt ưu đãi
    applied_rate: Optional[float] = None  # % Thuế thực tế áp dụng
    vat_rate: float = Field(default=10)  # % Thuế GTGT
    special_consumption_rate: float = Field(default=0)  # % Thuế TTĐB
    environmental_rate: float = Field(default=0)  # % Thuế BVMT

    # === SỐ TIỀN THUẾ ===
    import_duty_amount: float = Field(default=0)  # Tiền thuế NK
    vat_amount: float = Field(default=0)  # Tiền thuế VAT
    special_consumption_amount: float = Field(default=0)  # Tiền thuế TTĐB
    environmental_amount: float = Field(default=0)  # Tiền thuế BVMT
    total_tax_amount: float = Field(default=0)  # Tổng tiền thuế

    # === MIỄN GIẢM THUẾ ===
    exemption_code: Optional[str] = None  # Mã miễn giảm: XNK01, XNK32...
    exemption_amount: float = Field(default=0)  # Số tiền miễn giảm
    legal_document: Optional[str] = None  # Văn bản pháp quy

    # === FTA / C/O ===
    preferential_code: Optional[str] = None  # Mã FTA: CPTPP, EVFTA, ACFTA...
    co_form: Optional[str] = None  # Form C/O: D, E, AK, CPTPP...
    co_no_line: Optional[str] = None  # Số C/O cho dòng hàng (nếu khác header)

    # === GIẤY PHÉP ===
    license_no: Optional[str] = None  # Số giấy phép
    license_date: Optional[date] = None  # Ngày cấp
    license_issuer: Optional[str] = None  # Cơ quan cấp
    license_expiry: Optional[date] = None  # Ngày hết hạn

    # === GHI CHÚ ===
    notes: Optional[str] = None

    # === AUDIT ===
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    created_by: Optional[str] = None
    is_deleted: bool = Field(default=False)
