"""
ECUS Integration API - Đồng bộ dữ liệu với phần mềm ECUS5VNACCS
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime

from app.services.ecus_integration import (
    test_ecus_connection,
    sync_declaration_to_ecus,
    get_ecus_schema,
    ECUSIntegrationService,
    ECUSConnectionConfig
)
from app.db.session import get_session
from sqlmodel import Session

router = APIRouter(prefix="/ecus", tags=["ECUS Integration"])


# === SCHEMAS ===

class ECUSConnectionConfigSchema(BaseModel):
    """Cấu hình kết nối ECUS"""
    server: str = "localhost"
    database: str = "ECUS5VNACCS"
    username: str = "sa"
    password: str = "123456"
    port: int = 1433


class TestConnectionResponse(BaseModel):
    """Response cho test connection"""
    success: bool
    message: str
    database: Optional[str] = None
    sql_version: Optional[str] = None
    declaration_count: Optional[int] = None
    error: Optional[str] = None


class SyncDeclarationRequest(BaseModel):
    """Request đồng bộ tờ khai"""
    config: ECUSConnectionConfigSchema
    declaration_id: str  # ID tờ khai trong ERP


class SyncDeclarationResponse(BaseModel):
    """Response đồng bộ tờ khai"""
    success: bool
    message: str
    ecus_id: Optional[int] = None
    items_count: Optional[int] = None
    error: Optional[str] = None


class HSCodeLookupRequest(BaseModel):
    """Request lookup HS code"""
    config: ECUSConnectionConfigSchema
    product_code: str


class HSCodeLookupResponse(BaseModel):
    """Response lookup HS code"""
    success: bool
    product_code: str
    hs_code: Optional[str] = None
    product_name: Optional[str] = None
    import_duty_rate: Optional[float] = None
    vat_rate: Optional[float] = None
    unit_code: Optional[str] = None
    message: Optional[str] = None


# === ENDPOINTS ===

@router.post("/test-connection", response_model=TestConnectionResponse)
async def api_test_connection(config: ECUSConnectionConfigSchema):
    """
    Test kết nối đến ECUS database

    Sử dụng endpoint này để kiểm tra:
    - Kết nối SQL Server thành công
    - Database ECUS tồn tại
    - Số lượng tờ khai hiện có
    """
    result = test_ecus_connection(config.model_dump())
    return TestConnectionResponse(**result)


@router.post("/sync-declaration", response_model=SyncDeclarationResponse)
async def api_sync_declaration(
    request: SyncDeclarationRequest,
    session: Session = Depends(get_session)
):
    """
    Đồng bộ tờ khai từ ERP sang ECUS

    1. Lấy dữ liệu tờ khai từ ERP database
    2. Insert vào ECUS SQL Server (TK_NHAP, HANG_NHAP)
    3. Cập nhật trạng thái đồng bộ trong ERP
    """
    from app.models.fms.customs import CustomsDeclaration, HSCode
    from sqlmodel import select

    # Lấy tờ khai từ ERP
    declaration = session.exec(
        select(CustomsDeclaration).where(CustomsDeclaration.id == request.declaration_id)
    ).first()

    if not declaration:
        raise HTTPException(status_code=404, detail="Không tìm thấy tờ khai")

    # Lấy danh sách dòng hàng
    items = session.exec(
        select(HSCode).where(HSCode.declaration_id == request.declaration_id).order_by(HSCode.item_no)
    ).all()

    # Convert to dict
    declaration_data = {
        "declaration_no": declaration.declaration_no,
        "declaration_type_code": declaration.declaration_type_code,
        "customs_office_code": declaration.customs_office_code,
        "customs_office_name": declaration.customs_office_name,
        "registration_date": declaration.registration_date,
        "importer_code": declaration.importer_code,
        "trader_name": declaration.trader_name,
        "trader_tax_code": declaration.trader_tax_code,
        "trader_address": declaration.trader_address,
        "foreign_partner_name": declaration.foreign_partner_name,
        "foreign_partner_address": declaration.foreign_partner_address,
        "foreign_partner_country": declaration.foreign_partner_country,
        "invoice_no": declaration.invoice_no,
        "invoice_date": declaration.invoice_date,
        "contract_no": declaration.contract_no,
        "transport_mode": declaration.transport_mode,
        "bl_no": declaration.bl_no,
        "bl_date": declaration.bl_date,
        "vessel_name": declaration.vessel_name,
        "voyage_no": declaration.voyage_no,
        "loading_port": declaration.loading_port,
        "discharge_port": declaration.discharge_port,
        "border_gate": declaration.border_gate,
        "currency_code": declaration.currency_code,
        "exchange_rate": declaration.exchange_rate,
        "fob_value": declaration.fob_value,
        "cif_value": declaration.cif_value,
        "freight_value": declaration.freight_value,
        "insurance_value": declaration.insurance_value,
        "customs_value": declaration.customs_value,
        "total_packages": declaration.total_packages,
        "gross_weight": declaration.gross_weight,
        "net_weight": declaration.net_weight,
        "container_count": declaration.container_count,
        "import_duty": declaration.import_duty,
        "vat": declaration.vat,
        "special_consumption_tax": declaration.special_consumption_tax,
        "total_tax": declaration.total_tax,
        "incoterms": declaration.incoterms,
        "co_no": declaration.co_no,
        "co_form": declaration.co_form,
        "created_by": declaration.created_by,
    }

    items_data = []
    for item in items:
        items_data.append({
            "item_no": item.item_no,
            "hs_code": item.hs_code,
            "product_name": item.product_name,
            "hs_description": item.hs_description,
            "product_code": item.product_code,
            "supplier_code": item.supplier_code,
            "country_of_origin": item.country_of_origin,
            "quantity": item.quantity,
            "unit_code": item.unit_code,
            "quantity_2": item.quantity_2,
            "unit_2_code": item.unit_2_code,
            "gross_weight": item.gross_weight,
            "net_weight": item.net_weight,
            "unit_price": item.unit_price,
            "currency_code": item.currency_code,
            "total_value": item.total_value,
            "customs_value": item.customs_value,
            "import_duty_rate": item.import_duty_rate,
            "vat_rate": item.vat_rate,
            "special_consumption_rate": item.special_consumption_rate,
            "import_duty_amount": item.import_duty_amount,
            "vat_amount": item.vat_amount,
            "special_consumption_amount": item.special_consumption_amount,
            "total_tax_amount": item.total_tax_amount,
            "exemption_code": item.exemption_code,
            "exemption_amount": item.exemption_amount,
        })

    # Đồng bộ sang ECUS
    result = sync_declaration_to_ecus(
        request.config.model_dump(),
        declaration_data,
        items_data
    )

    # Cập nhật trạng thái sync trong ERP
    if result.get("success"):
        declaration.ecus_synced = True
        declaration.ecus_sync_date = datetime.utcnow()
        declaration.ecus_declaration_id = str(result.get("ecus_id"))
        session.add(declaration)
        session.commit()

    return SyncDeclarationResponse(**result)


@router.post("/lookup-hs", response_model=HSCodeLookupResponse)
async def api_lookup_hs_code(request: HSCodeLookupRequest):
    """
    Lookup mã HS từ mã hàng trong ECUS

    Sử dụng để tự động điền HS code khi nhập mã hàng DN
    """
    ecus_config = ECUSConnectionConfig(
        server=request.config.server,
        database=request.config.database,
        username=request.config.username,
        password=request.config.password,
        port=request.config.port
    )

    service = ECUSIntegrationService(ecus_config)
    result = service.lookup_hs_code(request.product_code)
    service.disconnect()

    if result:
        return HSCodeLookupResponse(
            success=True,
            product_code=request.product_code,
            hs_code=result.get("hs_code"),
            product_name=result.get("product_name"),
            import_duty_rate=result.get("import_duty_rate"),
            vat_rate=result.get("vat_rate"),
            unit_code=result.get("unit_code"),
            message="Tìm thấy mã HS"
        )
    else:
        return HSCodeLookupResponse(
            success=False,
            product_code=request.product_code,
            message="Không tìm thấy mã HS cho mã hàng này"
        )


@router.post("/schema")
async def api_get_ecus_schema(config: ECUSConnectionConfigSchema):
    """
    Lấy thông tin schema của ECUS database

    Dùng để xác định cấu trúc bảng thực tế trong ECUS
    """
    result = get_ecus_schema(config.model_dump())
    return result


@router.get("/default-config")
async def api_get_default_config():
    """
    Lấy cấu hình mặc định của ECUS

    Thông tin này có thể được lưu trong localStorage của user
    """
    return {
        "server": "localhost",
        "database": "ECUS5VNACCS",
        "username": "sa",
        "password": "123456",
        "port": 1433,
        "driver": "ODBC Driver 17 for SQL Server",
        "note": "Cấu hình mặc định. Vui lòng điều chỉnh theo máy cài ECUS."
    }
