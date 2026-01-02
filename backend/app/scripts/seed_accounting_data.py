"""
Seed Accounting Data
Tạo dữ liệu mẫu cho module Kế toán theo chuẩn VAS (Thông tư 200)
"""
from datetime import datetime, date, timedelta
from decimal import Decimal
from uuid import uuid4
from sqlmodel import Session, select
import random

from app.db.session import engine
from app.models.accounting import (
    ChartOfAccounts, FiscalYear, FiscalPeriod, CostCenter,
    Journal, JournalEntry, JournalEntryLine, GeneralLedger,
    BankAccount, BankTransaction,
    CustomerInvoice, CustomerInvoiceLine, PaymentReceipt, PaymentReceiptAllocation,
    VendorInvoice, VendorInvoiceLine, PaymentVoucher, PaymentVoucherAllocation,
    TaxRate, VATTransaction, VATDeclaration,
    FixedAssetCategory, FixedAsset, DepreciationSchedule,
)


def get_tenant_id(session: Session) -> str:
    """Get first tenant_id from users table"""
    from app.models import User
    user = session.exec(select(User).limit(1)).first()
    if user:
        return str(user.tenant_id)
    return str(uuid4())


def create_chart_of_accounts(session: Session, tenant_id: str):
    """Create Vietnam Chart of Accounts (Thông tư 200)"""

    # Check if already exists
    existing = session.exec(
        select(ChartOfAccounts).where(ChartOfAccounts.tenant_id == tenant_id).limit(1)
    ).first()
    if existing:
        print("Chart of Accounts already exists, skipping...")
        return

    accounts = [
        # LOẠI 1: TÀI SẢN NGẮN HẠN
        ("111", "Tiền mặt", None, "ASSET", "DEBIT", "CURRENT_ASSET", False),
        ("1111", "Tiền Việt Nam", "111", "ASSET", "DEBIT", "CURRENT_ASSET", True),
        ("1112", "Ngoại tệ", "111", "ASSET", "DEBIT", "CURRENT_ASSET", True),
        ("1113", "Vàng tiền tệ", "111", "ASSET", "DEBIT", "CURRENT_ASSET", True),

        ("112", "Tiền gửi ngân hàng", None, "ASSET", "DEBIT", "CURRENT_ASSET", False),
        ("1121", "Tiền Việt Nam", "112", "ASSET", "DEBIT", "CURRENT_ASSET", True),
        ("1122", "Ngoại tệ", "112", "ASSET", "DEBIT", "CURRENT_ASSET", True),
        ("1123", "Vàng tiền tệ", "112", "ASSET", "DEBIT", "CURRENT_ASSET", True),

        ("113", "Tiền đang chuyển", None, "ASSET", "DEBIT", "CURRENT_ASSET", True),

        ("121", "Chứng khoán kinh doanh", None, "ASSET", "DEBIT", "CURRENT_ASSET", True),
        ("128", "Đầu tư nắm giữ đến ngày đáo hạn", None, "ASSET", "DEBIT", "CURRENT_ASSET", True),

        ("131", "Phải thu của khách hàng", None, "ASSET", "DEBIT", "CURRENT_ASSET", True),
        ("133", "Thuế GTGT được khấu trừ", None, "ASSET", "DEBIT", "CURRENT_ASSET", False),
        ("1331", "Thuế GTGT được khấu trừ của hàng hóa, dịch vụ", "133", "ASSET", "DEBIT", "CURRENT_ASSET", True),
        ("1332", "Thuế GTGT được khấu trừ của TSCĐ", "133", "ASSET", "DEBIT", "CURRENT_ASSET", True),

        ("136", "Phải thu nội bộ", None, "ASSET", "DEBIT", "CURRENT_ASSET", True),
        ("138", "Phải thu khác", None, "ASSET", "DEBIT", "CURRENT_ASSET", True),
        ("141", "Tạm ứng", None, "ASSET", "DEBIT", "CURRENT_ASSET", True),

        ("151", "Hàng mua đang đi đường", None, "ASSET", "DEBIT", "INVENTORY", True),
        ("152", "Nguyên liệu, vật liệu", None, "ASSET", "DEBIT", "INVENTORY", True),
        ("153", "Công cụ, dụng cụ", None, "ASSET", "DEBIT", "INVENTORY", True),
        ("154", "Chi phí sản xuất, kinh doanh dở dang", None, "ASSET", "DEBIT", "INVENTORY", True),
        ("155", "Thành phẩm", None, "ASSET", "DEBIT", "INVENTORY", True),
        ("156", "Hàng hóa", None, "ASSET", "DEBIT", "INVENTORY", True),
        ("157", "Hàng gửi đi bán", None, "ASSET", "DEBIT", "INVENTORY", True),

        # LOẠI 2: TÀI SẢN DÀI HẠN
        ("211", "Tài sản cố định hữu hình", None, "ASSET", "DEBIT", "FIXED_ASSET", False),
        ("2111", "Nhà cửa, vật kiến trúc", "211", "ASSET", "DEBIT", "FIXED_ASSET", True),
        ("2112", "Máy móc, thiết bị", "211", "ASSET", "DEBIT", "FIXED_ASSET", True),
        ("2113", "Phương tiện vận tải", "211", "ASSET", "DEBIT", "FIXED_ASSET", True),
        ("2114", "Thiết bị, dụng cụ quản lý", "211", "ASSET", "DEBIT", "FIXED_ASSET", True),
        ("2115", "Cây lâu năm, súc vật làm việc", "211", "ASSET", "DEBIT", "FIXED_ASSET", True),
        ("2118", "TSCĐ khác", "211", "ASSET", "DEBIT", "FIXED_ASSET", True),

        ("212", "Tài sản cố định thuê tài chính", None, "ASSET", "DEBIT", "FIXED_ASSET", True),
        ("213", "Tài sản cố định vô hình", None, "ASSET", "DEBIT", "FIXED_ASSET", True),

        ("214", "Hao mòn tài sản cố định", None, "ASSET", "CREDIT", "FIXED_ASSET", False),
        ("2141", "Hao mòn TSCĐ hữu hình", "214", "ASSET", "CREDIT", "FIXED_ASSET", True),
        ("2142", "Hao mòn TSCĐ thuê tài chính", "214", "ASSET", "CREDIT", "FIXED_ASSET", True),
        ("2143", "Hao mòn TSCĐ vô hình", "214", "ASSET", "CREDIT", "FIXED_ASSET", True),

        ("217", "Bất động sản đầu tư", None, "ASSET", "DEBIT", "FIXED_ASSET", True),
        ("221", "Đầu tư vào công ty con", None, "ASSET", "DEBIT", "INVESTMENT", True),
        ("222", "Đầu tư vào công ty liên doanh, liên kết", None, "ASSET", "DEBIT", "INVESTMENT", True),
        ("228", "Đầu tư khác", None, "ASSET", "DEBIT", "INVESTMENT", True),
        ("229", "Dự phòng tổn thất tài sản", None, "ASSET", "CREDIT", "INVESTMENT", True),

        ("241", "Xây dựng cơ bản dở dang", None, "ASSET", "DEBIT", "FIXED_ASSET", True),
        ("242", "Chi phí trả trước", None, "ASSET", "DEBIT", "OTHER_ASSET", True),
        ("243", "Tài sản thuế thu nhập hoãn lại", None, "ASSET", "DEBIT", "OTHER_ASSET", True),
        ("244", "Ký quỹ, ký cược", None, "ASSET", "DEBIT", "OTHER_ASSET", True),

        # LOẠI 3: NỢ PHẢI TRẢ
        ("331", "Phải trả cho người bán", None, "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("333", "Thuế và các khoản phải nộp Nhà nước", None, "LIABILITY", "CREDIT", "CURRENT_LIABILITY", False),
        ("3331", "Thuế GTGT phải nộp", "333", "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("3332", "Thuế tiêu thụ đặc biệt", "333", "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("3333", "Thuế xuất, nhập khẩu", "333", "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("3334", "Thuế TNDN", "333", "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("3335", "Thuế TNCN", "333", "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("3336", "Thuế tài nguyên", "333", "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("3337", "Thuế nhà đất, tiền thuê đất", "333", "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("3338", "Các loại thuế khác", "333", "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("3339", "Phí, lệ phí và các khoản phải nộp khác", "333", "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),

        ("334", "Phải trả người lao động", None, "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("335", "Chi phí phải trả", None, "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("336", "Phải trả nội bộ", None, "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("337", "Thanh toán theo tiến độ kế hoạch HĐ XD", None, "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("338", "Phải trả, phải nộp khác", None, "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
        ("341", "Vay và nợ thuê tài chính", None, "LIABILITY", "CREDIT", "LONG_TERM_LIABILITY", True),
        ("343", "Nhận ký quỹ, ký cược", None, "LIABILITY", "CREDIT", "LONG_TERM_LIABILITY", True),
        ("344", "Thuế thu nhập hoãn lại phải trả", None, "LIABILITY", "CREDIT", "LONG_TERM_LIABILITY", True),
        ("347", "Dự phòng phải trả", None, "LIABILITY", "CREDIT", "LONG_TERM_LIABILITY", True),
        ("352", "Quỹ khen thưởng, phúc lợi", None, "LIABILITY", "CREDIT", "OTHER_LIABILITY", True),
        ("353", "Quỹ phát triển khoa học và công nghệ", None, "LIABILITY", "CREDIT", "OTHER_LIABILITY", True),

        # LOẠI 4: VỐN CHỦ SỞ HỮU
        ("411", "Vốn đầu tư của chủ sở hữu", None, "EQUITY", "CREDIT", "CAPITAL", True),
        ("412", "Thặng dư vốn cổ phần", None, "EQUITY", "CREDIT", "CAPITAL", True),
        ("413", "Quyền chọn chuyển đổi trái phiếu", None, "EQUITY", "CREDIT", "CAPITAL", True),
        ("414", "Vốn khác của chủ sở hữu", None, "EQUITY", "CREDIT", "CAPITAL", True),
        ("415", "Cổ phiếu quỹ", None, "EQUITY", "DEBIT", "CAPITAL", True),
        ("417", "Quỹ đầu tư phát triển", None, "EQUITY", "CREDIT", "RESERVE", True),
        ("418", "Quỹ hỗ trợ sắp xếp doanh nghiệp", None, "EQUITY", "CREDIT", "RESERVE", True),
        ("419", "Các quỹ khác thuộc vốn chủ sở hữu", None, "EQUITY", "CREDIT", "RESERVE", True),
        ("421", "Lợi nhuận sau thuế chưa phân phối", None, "EQUITY", "CREDIT", "RETAINED_EARNINGS", True),
        ("441", "Nguồn vốn đầu tư XDCB", None, "EQUITY", "CREDIT", "CAPITAL", True),

        # LOẠI 5: DOANH THU
        ("511", "Doanh thu bán hàng và cung cấp dịch vụ", None, "REVENUE", "CREDIT", "OPERATING_REVENUE", False),
        ("5111", "Doanh thu bán hàng hóa", "511", "REVENUE", "CREDIT", "OPERATING_REVENUE", True),
        ("5112", "Doanh thu bán thành phẩm", "511", "REVENUE", "CREDIT", "OPERATING_REVENUE", True),
        ("5113", "Doanh thu cung cấp dịch vụ", "511", "REVENUE", "CREDIT", "OPERATING_REVENUE", True),
        ("5114", "Doanh thu trợ cấp, trợ giá", "511", "REVENUE", "CREDIT", "OPERATING_REVENUE", True),
        ("5117", "Doanh thu kinh doanh bất động sản đầu tư", "511", "REVENUE", "CREDIT", "OPERATING_REVENUE", True),

        ("515", "Doanh thu hoạt động tài chính", None, "REVENUE", "CREDIT", "FINANCIAL_REVENUE", True),
        ("521", "Các khoản giảm trừ doanh thu", None, "REVENUE", "DEBIT", "OPERATING_REVENUE", True),

        # LOẠI 6: CHI PHÍ SẢN XUẤT, KINH DOANH
        ("611", "Mua hàng", None, "EXPENSE", "DEBIT", "COST_OF_SALES", True),
        ("621", "Chi phí nguyên liệu, vật liệu trực tiếp", None, "EXPENSE", "DEBIT", "COST_OF_SALES", True),
        ("622", "Chi phí nhân công trực tiếp", None, "EXPENSE", "DEBIT", "COST_OF_SALES", True),
        ("623", "Chi phí sử dụng máy thi công", None, "EXPENSE", "DEBIT", "COST_OF_SALES", True),
        ("627", "Chi phí sản xuất chung", None, "EXPENSE", "DEBIT", "COST_OF_SALES", True),
        ("631", "Giá thành sản xuất", None, "EXPENSE", "DEBIT", "COST_OF_SALES", True),
        ("632", "Giá vốn hàng bán", None, "EXPENSE", "DEBIT", "COST_OF_SALES", True),
        ("635", "Chi phí tài chính", None, "EXPENSE", "DEBIT", "FINANCIAL_EXPENSE", True),
        ("641", "Chi phí bán hàng", None, "EXPENSE", "DEBIT", "SELLING_EXPENSE", True),
        ("642", "Chi phí quản lý doanh nghiệp", None, "EXPENSE", "DEBIT", "ADMIN_EXPENSE", True),

        # LOẠI 7: THU NHẬP KHÁC
        ("711", "Thu nhập khác", None, "REVENUE", "CREDIT", "OTHER_INCOME", True),

        # LOẠI 8: CHI PHÍ KHÁC
        ("811", "Chi phí khác", None, "EXPENSE", "DEBIT", "OTHER_EXPENSE", True),
        ("821", "Chi phí thuế thu nhập doanh nghiệp", None, "EXPENSE", "DEBIT", "INCOME_TAX", True),

        # LOẠI 9: XÁC ĐỊNH KẾT QUẢ KINH DOANH
        ("911", "Xác định kết quả kinh doanh", None, "EQUITY", "NONE", "RESULT", True),
    ]

    # Create parent mapping
    account_map = {}

    for code, name, parent_code, classification, nature, category, allow_posting in accounts:
        parent_id = account_map.get(parent_code) if parent_code else None
        level = len(code) // 1 if len(code) <= 3 else (1 if len(code) == 3 else 2 if len(code) == 4 else 3)

        account = ChartOfAccounts(
            id=str(uuid4()),
            tenant_id=tenant_id,
            account_code=code,
            account_name=name,
            account_name_en=None,
            parent_id=parent_id,
            level=level,
            classification=classification,
            nature=nature,
            category=category,
            currency="VND",
            is_active=True,
            allow_posting=allow_posting,
            require_partner=code.startswith("131") or code.startswith("331"),
            require_cost_center=code.startswith("6"),
            require_project=False,
            notes=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(account)
        account_map[code] = account.id

    session.commit()
    print(f"Created {len(accounts)} chart of accounts")
    return account_map


def create_fiscal_year(session: Session, tenant_id: str):
    """Create fiscal year and periods"""

    existing = session.exec(
        select(FiscalYear).where(FiscalYear.tenant_id == tenant_id).limit(1)
    ).first()
    if existing:
        print("Fiscal Year already exists, skipping...")
        return existing.id

    year = datetime.now().year
    fy = FiscalYear(
        id=str(uuid4()),
        tenant_id=tenant_id,
        code=f"FY{year}",
        name=f"Năm tài chính {year}",
        start_date=datetime(year, 1, 1),
        end_date=datetime(year, 12, 31),
        status="OPEN",
        is_current=True,
        notes=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(fy)

    # Create 12 periods
    for month in range(1, 13):
        import calendar
        last_day = calendar.monthrange(year, month)[1]
        period = FiscalPeriod(
            id=str(uuid4()),
            tenant_id=tenant_id,
            fiscal_year_id=fy.id,
            period_number=month,
            name=f"Tháng {month}/{year}",
            start_date=datetime(year, month, 1),
            end_date=datetime(year, month, last_day),
            status="OPEN" if month <= datetime.now().month else "NOT_OPENED",
            is_adjustment=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(period)

    session.commit()
    print(f"Created fiscal year {year} with 12 periods")
    return fy.id


def create_bank_accounts(session: Session, tenant_id: str):
    """Create sample bank accounts"""

    existing = session.exec(
        select(BankAccount).where(BankAccount.tenant_id == tenant_id).limit(1)
    ).first()
    if existing:
        print("Bank accounts already exist, skipping...")
        return

    # Get account 1121 (Tiền gửi ngân hàng - VND)
    account_1121 = session.exec(
        select(ChartOfAccounts).where(
            ChartOfAccounts.tenant_id == tenant_id,
            ChartOfAccounts.account_code == "1121"
        )
    ).first()

    banks = [
        ("Vietcombank", "VCB", "0071001234567", "VND", 500000000),
        ("Techcombank", "TCB", "19031234567890", "VND", 250000000),
        ("BIDV", "BIDV", "31410001234567", "VND", 350000000),
        ("ACB", "ACB", "12345678901234", "VND", 150000000),
    ]

    for bank_name, short_name, account_number, currency, balance in banks:
        bank = BankAccount(
            id=str(uuid4()),
            tenant_id=tenant_id,
            bank_name=bank_name,
            bank_short_name=short_name,
            account_number=account_number,
            account_name="CÔNG TY TNHH ABC",
            branch="Chi nhánh TP.HCM",
            currency=currency,
            account_type="CHECKING",
            gl_account_id=account_1121.id if account_1121 else None,
            opening_balance=Decimal(str(balance)),
            current_balance=Decimal(str(balance)),
            is_active=True,
            is_default=bank_name == "Vietcombank",
            notes=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(bank)

    session.commit()
    print(f"Created {len(banks)} bank accounts")


def create_tax_rates(session: Session, tenant_id: str):
    """Create VAT tax rates"""

    existing = session.exec(
        select(TaxRate).where(TaxRate.tenant_id == tenant_id).limit(1)
    ).first()
    if existing:
        print("Tax rates already exist, skipping...")
        return

    rates = [
        ("VAT0", "VAT 0%", "VAT", Decimal("0"), True),
        ("VAT5", "VAT 5%", "VAT", Decimal("5"), True),
        ("VAT8", "VAT 8%", "VAT", Decimal("8"), True),
        ("VAT10", "VAT 10%", "VAT", Decimal("10"), True),
        ("NOTAX", "Không chịu thuế", "EXEMPT", Decimal("0"), True),
        ("WHT5", "Thuế nhà thầu 5%", "WITHHOLDING", Decimal("5"), True),
        ("WHT10", "Thuế nhà thầu 10%", "WITHHOLDING", Decimal("10"), True),
    ]

    for code, name, tax_type, rate, is_active in rates:
        tax_rate = TaxRate(
            id=str(uuid4()),
            tenant_id=tenant_id,
            code=code,
            name=name,
            tax_type=tax_type,
            rate=rate,
            is_active=is_active,
            is_default=code == "VAT10",
            effective_from=datetime(2024, 1, 1),
            effective_to=None,
            notes=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(tax_rate)

    session.commit()
    print(f"Created {len(rates)} tax rates")


def create_fixed_asset_categories(session: Session, tenant_id: str):
    """Create fixed asset categories"""

    existing = session.exec(
        select(FixedAssetCategory).where(FixedAssetCategory.tenant_id == tenant_id).limit(1)
    ).first()
    if existing:
        print("Fixed asset categories already exist, skipping...")
        return

    # Get GL accounts
    accounts = {}
    for code in ["2111", "2112", "2113", "2114", "2141", "6274"]:
        acc = session.exec(
            select(ChartOfAccounts).where(
                ChartOfAccounts.tenant_id == tenant_id,
                ChartOfAccounts.account_code == code
            )
        ).first()
        if acc:
            accounts[code] = acc.id

    categories = [
        ("BUILDING", "Nhà cửa, vật kiến trúc", "2111", "2141", "6274", 20, "STRAIGHT_LINE"),
        ("MACHINE", "Máy móc, thiết bị", "2112", "2141", "6274", 10, "STRAIGHT_LINE"),
        ("VEHICLE", "Phương tiện vận tải", "2113", "2141", "6274", 10, "STRAIGHT_LINE"),
        ("EQUIPMENT", "Thiết bị, dụng cụ quản lý", "2114", "2141", "6274", 5, "STRAIGHT_LINE"),
    ]

    for code, name, asset_acc, accum_acc, expense_acc, useful_life, method in categories:
        cat = FixedAssetCategory(
            id=str(uuid4()),
            tenant_id=tenant_id,
            code=code,
            name=name,
            asset_account_id=accounts.get(asset_acc),
            accumulated_depreciation_account_id=accounts.get(accum_acc),
            depreciation_expense_account_id=accounts.get(expense_acc),
            default_useful_life=useful_life,
            default_depreciation_method=method,
            is_active=True,
            notes=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(cat)

    session.commit()
    print(f"Created {len(categories)} fixed asset categories")


def create_sample_invoices(session: Session, tenant_id: str):
    """Create sample customer and vendor invoices"""

    existing = session.exec(
        select(CustomerInvoice).where(CustomerInvoice.tenant_id == tenant_id).limit(1)
    ).first()
    if existing:
        print("Invoices already exist, skipping...")
        return

    # Get GL accounts
    acc_131 = session.exec(select(ChartOfAccounts).where(
        ChartOfAccounts.tenant_id == tenant_id, ChartOfAccounts.account_code == "131"
    )).first()
    acc_5113 = session.exec(select(ChartOfAccounts).where(
        ChartOfAccounts.tenant_id == tenant_id, ChartOfAccounts.account_code == "5113"
    )).first()
    acc_3331 = session.exec(select(ChartOfAccounts).where(
        ChartOfAccounts.tenant_id == tenant_id, ChartOfAccounts.account_code == "3331"
    )).first()

    # Create customer invoices
    customers = [
        ("CUST001", "Công ty TNHH ABC", "0101234567"),
        ("CUST002", "Công ty CP XYZ", "0102345678"),
        ("CUST003", "Doanh nghiệp DEF", "0103456789"),
    ]

    for i, (cust_code, cust_name, tax_code) in enumerate(customers):
        for j in range(3):  # 3 invoices per customer
            subtotal = Decimal(str(random.randint(10, 100) * 1000000))
            vat = subtotal * Decimal("0.1")
            total = subtotal + vat

            invoice = CustomerInvoice(
                id=str(uuid4()),
                tenant_id=tenant_id,
                invoice_number=f"INV{datetime.now().year}{str(i*3+j+1).zfill(4)}",
                invoice_date=datetime.now() - timedelta(days=random.randint(1, 60)),
                due_date=datetime.now() + timedelta(days=random.randint(15, 45)),
                customer_id=None,
                customer_code=cust_code,
                customer_name=cust_name,
                customer_tax_code=tax_code,
                customer_address="TP. Hồ Chí Minh",
                currency="VND",
                exchange_rate=Decimal("1"),
                subtotal=subtotal,
                discount_amount=Decimal("0"),
                vat_amount=vat,
                total_amount=total,
                paid_amount=Decimal("0") if j == 0 else total,
                balance=total if j == 0 else Decimal("0"),
                status="OPEN" if j == 0 else "PAID",
                payment_terms="NET30",
                ar_account_id=acc_131.id if acc_131 else None,
                notes=None,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(invoice)

            # Create invoice line
            line = CustomerInvoiceLine(
                id=str(uuid4()),
                tenant_id=tenant_id,
                invoice_id=invoice.id,
                line_number=1,
                description="Dịch vụ vận tải hàng hóa",
                quantity=Decimal("1"),
                unit_price=subtotal,
                amount=subtotal,
                vat_rate=Decimal("10"),
                vat_amount=vat,
                total_amount=total,
                revenue_account_id=acc_5113.id if acc_5113 else None,
                vat_account_id=acc_3331.id if acc_3331 else None,
                cost_center_id=None,
                project_id=None,
                notes=None,
            )
            session.add(line)

    session.commit()
    print(f"Created {len(customers) * 3} customer invoices")


def create_sample_gl_entries(session: Session, tenant_id: str):
    """Create sample General Ledger entries for trial balance"""

    existing = session.exec(
        select(GeneralLedger).where(GeneralLedger.tenant_id == tenant_id).limit(1)
    ).first()
    if existing:
        print("GL entries already exist, skipping...")
        return

    # Get fiscal period
    current_period = session.exec(
        select(FiscalPeriod).where(
            FiscalPeriod.tenant_id == tenant_id,
            FiscalPeriod.period_number == datetime.now().month
        )
    ).first()

    # Get accounts
    accounts = {}
    codes = ["1111", "1121", "131", "152", "211", "214", "331", "333", "411", "421", "511", "632", "641", "642"]
    for code in codes:
        acc = session.exec(
            select(ChartOfAccounts).where(
                ChartOfAccounts.tenant_id == tenant_id,
                ChartOfAccounts.account_code == code
            )
        ).first()
        if acc:
            accounts[code] = acc

    # Sample GL entries (opening + transactions)
    gl_data = [
        # Opening balances
        ("1111", Decimal("50000000"), Decimal("0"), "Số dư đầu kỳ - Tiền mặt"),
        ("1121", Decimal("1250000000"), Decimal("0"), "Số dư đầu kỳ - Tiền gửi NH"),
        ("131", Decimal("350000000"), Decimal("0"), "Số dư đầu kỳ - Phải thu KH"),
        ("152", Decimal("120000000"), Decimal("0"), "Số dư đầu kỳ - Nguyên vật liệu"),
        ("211", Decimal("2500000000"), Decimal("0"), "Số dư đầu kỳ - TSCĐ"),
        ("214", Decimal("0"), Decimal("500000000"), "Số dư đầu kỳ - Hao mòn TSCĐ"),
        ("331", Decimal("0"), Decimal("280000000"), "Số dư đầu kỳ - Phải trả NCC"),
        ("333", Decimal("0"), Decimal("45000000"), "Số dư đầu kỳ - Thuế phải nộp"),
        ("411", Decimal("0"), Decimal("3000000000"), "Số dư đầu kỳ - Vốn CSH"),
        ("421", Decimal("0"), Decimal("445000000"), "Số dư đầu kỳ - LNST chưa PP"),

        # Transactions
        ("511", Decimal("0"), Decimal("850000000"), "Doanh thu tháng này"),
        ("632", Decimal("510000000"), Decimal("0"), "Giá vốn hàng bán"),
        ("641", Decimal("45000000"), Decimal("0"), "Chi phí bán hàng"),
        ("642", Decimal("85000000"), Decimal("0"), "Chi phí QLDN"),
    ]

    for account_code, debit, credit, description in gl_data:
        if account_code not in accounts:
            continue

        acc = accounts[account_code]
        gl = GeneralLedger(
            id=str(uuid4()),
            tenant_id=tenant_id,
            account_id=acc.id,
            fiscal_period_id=current_period.id if current_period else None,
            transaction_date=datetime.now().replace(day=1),
            document_type="OPENING" if "đầu kỳ" in description else "JOURNAL",
            document_number=f"GL{datetime.now().strftime('%Y%m')}{str(random.randint(1000, 9999))}",
            description=description,
            debit_amount=debit,
            credit_amount=credit,
            balance=debit - credit,
            currency="VND",
            exchange_rate=Decimal("1"),
            debit_amount_fc=debit,
            credit_amount_fc=credit,
            partner_id=None,
            partner_name=None,
            cost_center_id=None,
            project_id=None,
            journal_entry_id=None,
            source_type=None,
            source_id=None,
            is_opening=("đầu kỳ" in description),
            created_at=datetime.utcnow(),
        )
        session.add(gl)

    session.commit()
    print(f"Created {len(gl_data)} GL entries")


def seed_all():
    """Run all seed functions"""
    print("=" * 50)
    print("SEEDING ACCOUNTING DATA")
    print("=" * 50)

    with Session(engine) as session:
        tenant_id = get_tenant_id(session)
        print(f"Using tenant_id: {tenant_id}")
        print("-" * 50)

        create_chart_of_accounts(session, tenant_id)
        create_fiscal_year(session, tenant_id)
        create_bank_accounts(session, tenant_id)
        create_tax_rates(session, tenant_id)
        create_fixed_asset_categories(session, tenant_id)
        create_sample_invoices(session, tenant_id)
        create_sample_gl_entries(session, tenant_id)

    print("=" * 50)
    print("SEED COMPLETED!")
    print("=" * 50)


if __name__ == "__main__":
    seed_all()
