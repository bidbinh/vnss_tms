"""
ECUS Integration Service
Kết nối và đồng bộ dữ liệu với phần mềm ECUS5VNACCS (SQL Server)
"""
import pyodbc
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime, date
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class ECUSConnectionConfig:
    """Cấu hình kết nối ECUS SQL Server"""
    server: str = "localhost"  # hoặc ECUSSQL2008, .\SQLEXPRESS
    database: str = "ECUS5VNACCS"
    username: str = "sa"
    password: str = "123456"
    port: int = 1433
    driver: str = "ODBC Driver 17 for SQL Server"

    def get_connection_string(self) -> str:
        """Tạo connection string cho pyodbc"""
        return (
            f"DRIVER={{{self.driver}}};"
            f"SERVER={self.server},{self.port};"
            f"DATABASE={self.database};"
            f"UID={self.username};"
            f"PWD={self.password};"
            f"TrustServerCertificate=yes;"
        )


class ECUSIntegrationService:
    """
    Service để tích hợp với ECUS5VNACCS
    - Kết nối SQL Server
    - Insert/Update tờ khai
    - Lookup dữ liệu
    """

    def __init__(self, config: ECUSConnectionConfig = None):
        self.config = config or ECUSConnectionConfig()
        self.connection: Optional[pyodbc.Connection] = None

    def test_connection(self) -> Dict[str, Any]:
        """Test kết nối đến ECUS database"""
        try:
            conn_str = self.config.get_connection_string()
            conn = pyodbc.connect(conn_str, timeout=10)
            cursor = conn.cursor()

            # Lấy thông tin database
            cursor.execute("SELECT DB_NAME() as db_name, @@VERSION as version")
            row = cursor.fetchone()

            # Đếm số tờ khai
            cursor.execute("SELECT COUNT(*) FROM TK_NHAP")
            tk_count = cursor.fetchone()[0]

            conn.close()

            return {
                "success": True,
                "database": row.db_name,
                "sql_version": row.version[:50] + "...",
                "declaration_count": tk_count,
                "message": "Kết nối ECUS thành công!"
            }
        except pyodbc.Error as e:
            logger.error(f"ECUS connection failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Không thể kết nối đến ECUS. Vui lòng kiểm tra cấu hình."
            }

    def connect(self) -> bool:
        """Mở kết nối đến ECUS"""
        try:
            conn_str = self.config.get_connection_string()
            self.connection = pyodbc.connect(conn_str)
            return True
        except pyodbc.Error as e:
            logger.error(f"ECUS connection failed: {e}")
            return False

    def disconnect(self):
        """Đóng kết nối"""
        if self.connection:
            self.connection.close()
            self.connection = None

    def get_ecus_tables(self) -> List[str]:
        """Lấy danh sách bảng trong ECUS database"""
        if not self.connection:
            self.connect()

        cursor = self.connection.cursor()
        cursor.execute("""
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """)

        tables = [row.TABLE_NAME for row in cursor.fetchall()]
        return tables

    def get_table_columns(self, table_name: str) -> List[Dict[str, Any]]:
        """Lấy thông tin cột của một bảng"""
        if not self.connection:
            self.connect()

        cursor = self.connection.cursor()
        cursor.execute(f"""
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                IS_NULLABLE,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        """, table_name)

        columns = []
        for row in cursor.fetchall():
            columns.append({
                "name": row.COLUMN_NAME,
                "type": row.DATA_TYPE,
                "max_length": row.CHARACTER_MAXIMUM_LENGTH,
                "nullable": row.IS_NULLABLE == "YES",
                "default": row.COLUMN_DEFAULT
            })
        return columns

    def insert_declaration(self, declaration_data: Dict[str, Any], items_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Insert tờ khai vào ECUS database

        Args:
            declaration_data: Dữ liệu header tờ khai
            items_data: Danh sách dòng hàng

        Returns:
            Dict với kết quả insert
        """
        if not self.connection:
            if not self.connect():
                return {"success": False, "error": "Không thể kết nối ECUS"}

        try:
            cursor = self.connection.cursor()

            # === INSERT TỜ KHAI (TK_NHAP) ===
            # Mapping từ ERP fields sang ECUS fields
            tk_data = self._map_declaration_to_ecus(declaration_data)

            # Tạo câu INSERT động
            columns = ", ".join(tk_data.keys())
            placeholders = ", ".join(["?" for _ in tk_data])
            sql = f"INSERT INTO TK_NHAP ({columns}) VALUES ({placeholders})"

            cursor.execute(sql, list(tk_data.values()))

            # Lấy ID vừa insert (nếu có identity)
            cursor.execute("SELECT @@IDENTITY")
            tk_id = cursor.fetchone()[0]

            # === INSERT DÒNG HÀNG (HANG_NHAP) ===
            for item in items_data:
                hang_data = self._map_item_to_ecus(item, tk_id)
                columns = ", ".join(hang_data.keys())
                placeholders = ", ".join(["?" for _ in hang_data])
                sql = f"INSERT INTO HANG_NHAP ({columns}) VALUES ({placeholders})"
                cursor.execute(sql, list(hang_data.values()))

            # Commit transaction
            self.connection.commit()

            return {
                "success": True,
                "ecus_id": tk_id,
                "items_count": len(items_data),
                "message": f"Đã đồng bộ tờ khai vào ECUS (ID: {tk_id})"
            }

        except pyodbc.Error as e:
            self.connection.rollback()
            logger.error(f"ECUS insert failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Lỗi khi đồng bộ vào ECUS"
            }

    def _map_declaration_to_ecus(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map dữ liệu từ ERP CustomsDeclaration sang ECUS TK_NHAP

        Note: Tên cột thực tế trong ECUS cần được xác nhận bằng cách
        chạy get_table_columns('TK_NHAP')
        """
        return {
            # Header
            "SO_TK": data.get("declaration_no", ""),
            "LOAI_HINH": data.get("declaration_type_code", "A11"),
            "MA_CHI_CUC": data.get("customs_office_code", ""),
            "TEN_CHI_CUC": data.get("customs_office_name", ""),
            "NGAY_DK": self._format_date(data.get("registration_date")),

            # Người nhập khẩu
            "MA_NK": data.get("importer_code", ""),
            "TEN_NK": data.get("trader_name", ""),
            "MA_THUE_NK": data.get("trader_tax_code", ""),
            "DIA_CHI_NK": data.get("trader_address", ""),

            # Đối tác nước ngoài
            "TEN_NN": data.get("foreign_partner_name", ""),
            "DIA_CHI_NN": data.get("foreign_partner_address", ""),
            "MA_NUOC_NN": data.get("foreign_partner_country", ""),

            # Hóa đơn
            "SO_HD": data.get("invoice_no", ""),
            "NGAY_HD": self._format_date(data.get("invoice_date")),
            "SO_HOP_DONG": data.get("contract_no", ""),

            # Vận tải
            "PT_VAN_TAI": data.get("transport_mode", "1"),
            "SO_VAN_DON": data.get("bl_no", ""),
            "NGAY_VAN_DON": self._format_date(data.get("bl_date")),
            "TEN_TAU": data.get("vessel_name", ""),
            "SO_CHUYEN": data.get("voyage_no", ""),

            # Cảng
            "MA_CANG_XEP": data.get("loading_port", ""),
            "MA_CANG_DO": data.get("discharge_port", ""),
            "MA_CUA_KHAU": data.get("border_gate", ""),

            # Trị giá
            "MA_TIEN": data.get("currency_code", "USD"),
            "TY_GIA": data.get("exchange_rate", 0),
            "TRI_GIA_FOB": data.get("fob_value", 0),
            "TRI_GIA_CIF": data.get("cif_value", 0),
            "PHI_VAN_CHUYEN": data.get("freight_value", 0),
            "PHI_BAO_HIEM": data.get("insurance_value", 0),
            "TRI_GIA_TINH_THUE": data.get("customs_value", 0),

            # Hàng hóa
            "TONG_SO_KIEN": data.get("total_packages", 0),
            "TRONG_LUONG": data.get("gross_weight", 0),
            "TRONG_LUONG_TINH": data.get("net_weight", 0),
            "SO_CONTAINER": data.get("container_count", 0),

            # Thuế
            "THUE_NK": data.get("import_duty", 0),
            "THUE_VAT": data.get("vat", 0),
            "THUE_TTDB": data.get("special_consumption_tax", 0),
            "TONG_THUE": data.get("total_tax", 0),

            # Incoterms
            "DIEU_KIEN_GH": data.get("incoterms", "FOB"),

            # C/O
            "SO_CO": data.get("co_no", ""),
            "FORM_CO": data.get("co_form", ""),

            # Audit
            "NGAY_TAO": datetime.now(),
            "NGUOI_TAO": data.get("created_by", "ERP"),
        }

    def _map_item_to_ecus(self, item: Dict[str, Any], tk_id: int) -> Dict[str, Any]:
        """
        Map dữ liệu từ ERP HSCode sang ECUS HANG_NHAP
        """
        return {
            "TK_ID": tk_id,
            "STT": item.get("item_no", 1),

            # Mã hàng
            "MA_HS": item.get("hs_code", ""),
            "TEN_HANG": item.get("product_name", ""),
            "MO_TA_HS": item.get("hs_description", ""),
            "MA_HANG": item.get("product_code", ""),
            "MA_NCC": item.get("supplier_code", ""),

            # Xuất xứ
            "MA_NUOC_XX": item.get("country_of_origin", ""),

            # Số lượng
            "SO_LUONG": item.get("quantity", 0),
            "DON_VI": item.get("unit_code", ""),
            "SO_LUONG_2": item.get("quantity_2"),
            "DON_VI_2": item.get("unit_2_code"),

            # Trọng lượng
            "TRONG_LUONG": item.get("gross_weight", 0),
            "TRONG_LUONG_TINH": item.get("net_weight", 0),

            # Giá trị
            "DON_GIA": item.get("unit_price", 0),
            "MA_TIEN": item.get("currency_code", "USD"),
            "TRI_GIA": item.get("total_value", 0),
            "TRI_GIA_TINH_THUE": item.get("customs_value", 0),

            # Thuế suất
            "TS_NK": item.get("import_duty_rate", 0),
            "TS_VAT": item.get("vat_rate", 10),
            "TS_TTDB": item.get("special_consumption_rate", 0),

            # Số tiền thuế
            "THUE_NK": item.get("import_duty_amount", 0),
            "THUE_VAT": item.get("vat_amount", 0),
            "THUE_TTDB": item.get("special_consumption_amount", 0),
            "TONG_THUE": item.get("total_tax_amount", 0),

            # Miễn giảm
            "MA_MIEN_GIAM": item.get("exemption_code"),
            "TIEN_MIEN_GIAM": item.get("exemption_amount", 0),
        }

    def _format_date(self, d) -> Optional[str]:
        """Format date cho SQL Server"""
        if d is None:
            return None
        if isinstance(d, str):
            return d
        if isinstance(d, (date, datetime)):
            return d.strftime("%Y-%m-%d")
        return None

    def lookup_hs_code(self, product_code: str) -> Optional[Dict[str, Any]]:
        """
        Lookup mã HS từ mã hàng trong ECUS

        Returns:
            Dict với thông tin HS code hoặc None
        """
        if not self.connection:
            if not self.connect():
                return None

        try:
            cursor = self.connection.cursor()

            # Tìm trong bảng danh mục hàng hóa của ECUS
            cursor.execute("""
                SELECT TOP 1
                    MA_HS, TEN_HANG, TS_NK, TS_VAT, DON_VI
                FROM DM_HANG_HOA
                WHERE MA_HANG = ?
            """, product_code)

            row = cursor.fetchone()
            if row:
                return {
                    "hs_code": row.MA_HS,
                    "product_name": row.TEN_HANG,
                    "import_duty_rate": row.TS_NK,
                    "vat_rate": row.TS_VAT,
                    "unit_code": row.DON_VI
                }
            return None

        except pyodbc.Error as e:
            logger.error(f"ECUS lookup failed: {e}")
            return None


# === API FUNCTIONS ===

def test_ecus_connection(config: Dict[str, Any]) -> Dict[str, Any]:
    """Test kết nối ECUS với cấu hình từ client"""
    ecus_config = ECUSConnectionConfig(
        server=config.get("server", "localhost"),
        database=config.get("database", "ECUS5VNACCS"),
        username=config.get("username", "sa"),
        password=config.get("password", "123456"),
        port=config.get("port", 1433)
    )
    service = ECUSIntegrationService(ecus_config)
    return service.test_connection()


def sync_declaration_to_ecus(
    config: Dict[str, Any],
    declaration_data: Dict[str, Any],
    items_data: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Đồng bộ tờ khai từ ERP sang ECUS"""
    ecus_config = ECUSConnectionConfig(
        server=config.get("server", "localhost"),
        database=config.get("database", "ECUS5VNACCS"),
        username=config.get("username", "sa"),
        password=config.get("password", "123456"),
        port=config.get("port", 1433)
    )
    service = ECUSIntegrationService(ecus_config)
    result = service.insert_declaration(declaration_data, items_data)
    service.disconnect()
    return result


def get_ecus_schema(config: Dict[str, Any]) -> Dict[str, Any]:
    """Lấy thông tin schema của ECUS database"""
    ecus_config = ECUSConnectionConfig(
        server=config.get("server", "localhost"),
        database=config.get("database", "ECUS5VNACCS"),
        username=config.get("username", "sa"),
        password=config.get("password", "123456"),
        port=config.get("port", 1433)
    )
    service = ECUSIntegrationService(ecus_config)

    if not service.connect():
        return {"success": False, "error": "Cannot connect to ECUS"}

    tables = service.get_ecus_tables()
    schema = {}
    for table in tables:
        schema[table] = service.get_table_columns(table)

    service.disconnect()

    return {
        "success": True,
        "tables": tables,
        "schema": schema
    }
