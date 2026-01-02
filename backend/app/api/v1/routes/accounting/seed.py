"""
Accounting Data Seeding API
Tạo dữ liệu mẫu cho module Kế toán
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from decimal import Decimal
from uuid import uuid4
import traceback

from app.db.session import get_session
from app.models import User
from app.models.accounting import (
    ChartOfAccounts, FiscalYear, FiscalPeriod,
    BankAccount, TaxRate, CustomerInvoice,
    GeneralLedger, CostCenter,
)
from app.core.security import get_current_user

router = APIRouter()


@router.post("/seed-data")
def seed_accounting_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Seed sample accounting data for the current tenant"""
    try:
        tenant_id = str(current_user.tenant_id)

        results = {
            "chart_of_accounts": 0,
            "cost_centers": 0,
            "fiscal_year": 0,
            "bank_accounts": 0,
            "tax_rates": 0,
            "customer_invoices": 0,
            "gl_entries": 0,
        }

        # 1. Chart of Accounts
        existing_coa = session.exec(
            select(ChartOfAccounts).where(ChartOfAccounts.tenant_id == tenant_id).limit(1)
        ).first()

        if not existing_coa:
            accounts = [
                # LOẠI 1: TÀI SẢN NGẮN HẠN
                ("111", "Tiền mặt", None, "ASSET", "DEBIT", "CURRENT_ASSET", False),
                ("1111", "Tiền Việt Nam", "111", "ASSET", "DEBIT", "CURRENT_ASSET", True),
                ("1112", "Ngoại tệ", "111", "ASSET", "DEBIT", "CURRENT_ASSET", True),
                ("112", "Tiền gửi ngân hàng", None, "ASSET", "DEBIT", "CURRENT_ASSET", False),
                ("1121", "Tiền Việt Nam", "112", "ASSET", "DEBIT", "CURRENT_ASSET", True),
                ("1122", "Ngoại tệ", "112", "ASSET", "DEBIT", "CURRENT_ASSET", True),
                ("131", "Phải thu của khách hàng", None, "ASSET", "DEBIT", "CURRENT_ASSET", True),
                ("133", "Thuế GTGT được khấu trừ", None, "ASSET", "DEBIT", "CURRENT_ASSET", False),
                ("1331", "Thuế GTGT được khấu trừ của HH, DV", "133", "ASSET", "DEBIT", "CURRENT_ASSET", True),
                ("141", "Tạm ứng", None, "ASSET", "DEBIT", "CURRENT_ASSET", True),
                ("152", "Nguyên liệu, vật liệu", None, "ASSET", "DEBIT", "INVENTORY", True),
                ("153", "Công cụ, dụng cụ", None, "ASSET", "DEBIT", "INVENTORY", True),
                ("156", "Hàng hóa", None, "ASSET", "DEBIT", "INVENTORY", True),

                # LOẠI 2: TÀI SẢN DÀI HẠN
                ("211", "Tài sản cố định hữu hình", None, "ASSET", "DEBIT", "FIXED_ASSET", False),
                ("2111", "Nhà cửa, vật kiến trúc", "211", "ASSET", "DEBIT", "FIXED_ASSET", True),
                ("2112", "Máy móc, thiết bị", "211", "ASSET", "DEBIT", "FIXED_ASSET", True),
                ("2113", "Phương tiện vận tải", "211", "ASSET", "DEBIT", "FIXED_ASSET", True),
                ("214", "Hao mòn TSCĐ", None, "ASSET", "CREDIT", "FIXED_ASSET", False),
                ("2141", "Hao mòn TSCĐ hữu hình", "214", "ASSET", "CREDIT", "FIXED_ASSET", True),
                ("242", "Chi phí trả trước", None, "ASSET", "DEBIT", "OTHER_ASSET", True),

                # LOẠI 3: NỢ PHẢI TRẢ
                ("331", "Phải trả cho người bán", None, "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
                ("333", "Thuế và các khoản phải nộp NN", None, "LIABILITY", "CREDIT", "CURRENT_LIABILITY", False),
                ("3331", "Thuế GTGT phải nộp", "333", "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
                ("3334", "Thuế TNDN", "333", "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
                ("3335", "Thuế TNCN", "333", "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
                ("334", "Phải trả người lao động", None, "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
                ("335", "Chi phí phải trả", None, "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
                ("338", "Phải trả, phải nộp khác", None, "LIABILITY", "CREDIT", "CURRENT_LIABILITY", True),
                ("341", "Vay và nợ thuê tài chính", None, "LIABILITY", "CREDIT", "LONG_TERM_LIABILITY", True),

                # LOẠI 4: VỐN CHỦ SỞ HỮU
                ("411", "Vốn đầu tư của chủ sở hữu", None, "EQUITY", "CREDIT", "CAPITAL", True),
                ("421", "Lợi nhuận sau thuế chưa phân phối", None, "EQUITY", "CREDIT", "RETAINED_EARNINGS", True),
                ("419", "Các quỹ khác", None, "EQUITY", "CREDIT", "RESERVE", True),

                # LOẠI 5: DOANH THU
                ("511", "Doanh thu bán hàng và cung cấp DV", None, "REVENUE", "CREDIT", "OPERATING_REVENUE", False),
                ("5111", "Doanh thu bán hàng hóa", "511", "REVENUE", "CREDIT", "OPERATING_REVENUE", True),
                ("5113", "Doanh thu cung cấp dịch vụ", "511", "REVENUE", "CREDIT", "OPERATING_REVENUE", True),
                ("515", "Doanh thu hoạt động tài chính", None, "REVENUE", "CREDIT", "FINANCIAL_REVENUE", True),

                # LOẠI 6: CHI PHÍ
                ("621", "Chi phí NVL trực tiếp", None, "EXPENSE", "DEBIT", "COST_OF_SALES", True),
                ("622", "Chi phí nhân công trực tiếp", None, "EXPENSE", "DEBIT", "COST_OF_SALES", True),
                ("627", "Chi phí sản xuất chung", None, "EXPENSE", "DEBIT", "COST_OF_SALES", True),
                ("632", "Giá vốn hàng bán", None, "EXPENSE", "DEBIT", "COST_OF_SALES", True),
                ("635", "Chi phí tài chính", None, "EXPENSE", "DEBIT", "FINANCIAL_EXPENSE", True),
                ("641", "Chi phí bán hàng", None, "EXPENSE", "DEBIT", "SELLING_EXPENSE", True),
                ("642", "Chi phí quản lý doanh nghiệp", None, "EXPENSE", "DEBIT", "ADMIN_EXPENSE", True),

                # LOẠI 7, 8
                ("711", "Thu nhập khác", None, "REVENUE", "CREDIT", "OTHER_INCOME", True),
                ("811", "Chi phí khác", None, "EXPENSE", "DEBIT", "OTHER_EXPENSE", True),
                ("821", "Chi phí thuế TNDN", None, "EXPENSE", "DEBIT", "INCOME_TAX", True),
            ]

            account_map = {}
            for code, name, parent_code, classification, nature, category, allow_posting in accounts:
                parent_id = account_map.get(parent_code) if parent_code else None
                level = 1 if len(code) == 3 else 2 if len(code) == 4 else 3

                account = ChartOfAccounts(
                    id=str(uuid4()),
                    tenant_id=tenant_id,
                    account_code=code,
                    account_name=name,
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
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                session.add(account)
                account_map[code] = account.id

            session.commit()
            results["chart_of_accounts"] = len(accounts)

        # 1.5. Cost Centers
        existing_cc = session.exec(
            select(CostCenter).where(CostCenter.tenant_id == tenant_id).limit(1)
        ).first()

        if not existing_cc:
            cost_centers_data = [
                ("CC-CORP", "Tập đoàn", None, Decimal("10000000000")),
                ("CC-OPS", "Khối Vận hành", "CC-CORP", Decimal("5000000000")),
                ("CC-OPS-FLEET", "Đội xe", "CC-OPS", Decimal("2000000000")),
                ("CC-OPS-DRIVER", "Lái xe", "CC-OPS", Decimal("1500000000")),
                ("CC-OPS-MAINT", "Bảo trì", "CC-OPS", Decimal("1000000000")),
                ("CC-SALES", "Khối Kinh doanh", "CC-CORP", Decimal("2000000000")),
                ("CC-SALES-DOM", "Kinh doanh nội địa", "CC-SALES", Decimal("1200000000")),
                ("CC-SALES-INT", "Kinh doanh quốc tế", "CC-SALES", Decimal("800000000")),
                ("CC-ADMIN", "Khối Hành chính", "CC-CORP", Decimal("1500000000")),
                ("CC-ADMIN-HR", "Nhân sự", "CC-ADMIN", Decimal("500000000")),
                ("CC-ADMIN-FIN", "Tài chính kế toán", "CC-ADMIN", Decimal("500000000")),
                ("CC-ADMIN-IT", "Công nghệ thông tin", "CC-ADMIN", Decimal("500000000")),
            ]

            cc_map = {}
            for code, name, parent_code, budget in cost_centers_data:
                parent_id = cc_map.get(parent_code) if parent_code else None
                cc = CostCenter(
                    id=str(uuid4()),
                    tenant_id=tenant_id,
                    code=code,
                    name=name,
                    parent_id=parent_id,
                    budget_amount=budget,
                    is_active=True,
                    created_by=str(current_user.id),
                )
                session.add(cc)
                session.flush()
                cc_map[code] = cc.id

            session.commit()
            results["cost_centers"] = len(cost_centers_data)

        # 2. Fiscal Year
        existing_fy = session.exec(
            select(FiscalYear).where(FiscalYear.tenant_id == tenant_id).limit(1)
        ).first()

        if not existing_fy:
            import calendar
            from sqlalchemy import text

            year = datetime.now().year
            fy_id = str(uuid4())
            now = datetime.utcnow()

            # Insert FiscalYear using raw SQL to avoid ORM issues
            session.execute(text("""
                INSERT INTO acc_fiscal_years (id, tenant_id, code, name, start_date, end_date, is_active, is_closed, created_at, updated_at)
                VALUES (:id, :tenant_id, :code, :name, :start_date, :end_date, :is_active, :is_closed, :created_at, :updated_at)
            """), {
                "id": fy_id,
                "tenant_id": tenant_id,
                "code": f"FY{year}",
                "name": f"Năm tài chính {year}",
                "start_date": datetime(year, 1, 1),
                "end_date": datetime(year, 12, 31),
                "is_active": True,
                "is_closed": False,
                "created_at": now,
                "updated_at": now,
            })
            session.commit()

            # Insert FiscalPeriods
            for month in range(1, 13):
                last_day = calendar.monthrange(year, month)[1]
                session.execute(text("""
                    INSERT INTO acc_fiscal_periods (id, tenant_id, fiscal_year_id, period_number, name, start_date, end_date, is_open, is_adjustment, created_at, updated_at)
                    VALUES (:id, :tenant_id, :fiscal_year_id, :period_number, :name, :start_date, :end_date, :is_open, :is_adjustment, :created_at, :updated_at)
                """), {
                    "id": str(uuid4()),
                    "tenant_id": tenant_id,
                    "fiscal_year_id": fy_id,
                    "period_number": month,
                    "name": f"Tháng {month}/{year}",
                    "start_date": datetime(year, month, 1),
                    "end_date": datetime(year, month, last_day),
                    "is_open": month <= datetime.now().month,
                    "is_adjustment": False,
                    "created_at": now,
                    "updated_at": now,
                })

            session.commit()
            results["fiscal_year"] = 1

        # 3. Bank Accounts
        existing_bank = session.exec(
            select(BankAccount).where(BankAccount.tenant_id == tenant_id).limit(1)
        ).first()

        if not existing_bank:
            acc_1121 = session.exec(
                select(ChartOfAccounts).where(
                    ChartOfAccounts.tenant_id == tenant_id,
                    ChartOfAccounts.account_code == "1121"
                )
            ).first()

            banks = [
                ("Vietcombank", "VCB", "0071001234567", 500000000),
                ("Techcombank", "TCB", "19031234567890", 250000000),
                ("BIDV", "BIDV", "31410001234567", 350000000),
            ]

            for bank_name, short_name, account_number, balance in banks:
                bank = BankAccount(
                    id=str(uuid4()),
                    tenant_id=tenant_id,
                    code=short_name,
                    name=f"TK {bank_name}",
                    bank_name=bank_name,
                    bank_branch="Chi nhánh TP.HCM",
                    account_number=account_number,
                    account_holder="CÔNG TY ABC",
                    currency="VND",
                    account_type="CURRENT",
                    gl_account_id=acc_1121.id if acc_1121 else None,
                    opening_balance=Decimal(str(balance)),
                    current_balance=Decimal(str(balance)),
                    available_balance=Decimal(str(balance)),
                    status="ACTIVE",
                    is_primary=bank_name == "Vietcombank",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                session.add(bank)

            session.commit()
            results["bank_accounts"] = len(banks)

        # 4. Tax Rates
        existing_tax = session.exec(
            select(TaxRate).where(TaxRate.tenant_id == tenant_id).limit(1)
        ).first()

        if not existing_tax:
            rates = [
                ("VAT0", "VAT 0%", "VAT", Decimal("0")),
                ("VAT5", "VAT 5%", "VAT", Decimal("5")),
                ("VAT8", "VAT 8%", "VAT", Decimal("8")),
                ("VAT10", "VAT 10%", "VAT", Decimal("10")),
            ]

            for code, name, tax_type, rate in rates:
                tax = TaxRate(
                    id=str(uuid4()),
                    tenant_id=tenant_id,
                    code=code,
                    name=name,
                    tax_type=tax_type,
                    rate=rate,
                    is_active=True,
                    is_default=code == "VAT10",
                    effective_from=datetime(2024, 1, 1),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                session.add(tax)

            session.commit()
            results["tax_rates"] = len(rates)

        # 5. Sample GL Entries (Số dư sổ cái tổng hợp)
        existing_gl = session.exec(
            select(GeneralLedger).where(GeneralLedger.tenant_id == tenant_id).limit(1)
        ).first()

        if not existing_gl:
            # Get accounts and fiscal data
            accounts_dict = {}
            for code in ["1111", "1121", "131", "152", "2113", "2141", "331", "3331", "411", "421", "5113", "632", "641", "642"]:
                acc = session.exec(
                    select(ChartOfAccounts).where(
                        ChartOfAccounts.tenant_id == tenant_id,
                        ChartOfAccounts.account_code == code
                    )
                ).first()
                if acc:
                    accounts_dict[code] = acc

            current_month = datetime.now().month
            fiscal_year = session.exec(
                select(FiscalYear).where(FiscalYear.tenant_id == tenant_id).limit(1)
            ).first()
            fiscal_period = session.exec(
                select(FiscalPeriod).where(
                    FiscalPeriod.tenant_id == tenant_id,
                    FiscalPeriod.period_number == current_month
                )
            ).first()

            if fiscal_year and fiscal_period:
                # GL entries với số dư tài khoản theo kỳ
                # (account_code, opening_debit, opening_credit, period_debit, period_credit)
                gl_entries = [
                    # Assets - Opening balances
                    ("1111", 50000000, 0, 15000000, 12000000),          # Tiền mặt
                    ("1121", 1250000000, 0, 350000000, 280000000),      # Tiền gửi NH
                    ("131", 350000000, 0, 850000000, 680000000),        # Phải thu KH
                    ("152", 120000000, 0, 45000000, 38000000),          # NVL
                    ("2113", 2500000000, 0, 0, 0),                      # PTVT (fixed asset)
                    ("2141", 0, 500000000, 0, 25000000),                # Hao mòn TSCĐ

                    # Liabilities - Opening balances
                    ("331", 0, 280000000, 450000000, 520000000),        # Phải trả NCC
                    ("3331", 0, 45000000, 85000000, 78000000),          # Thuế GTGT

                    # Equity
                    ("411", 0, 3000000000, 0, 0),                       # Vốn đầu tư
                    ("421", 0, 445000000, 210000000, 0),                # LNST chưa PP

                    # Revenue & Expenses - Period movements only
                    ("5113", 0, 0, 0, 850000000),                       # Doanh thu DV
                    ("632", 0, 0, 510000000, 0),                        # Giá vốn
                    ("641", 0, 0, 45000000, 0),                         # CP bán hàng
                    ("642", 0, 0, 85000000, 0),                         # CP QLDN
                ]

                for acc_code, open_dr, open_cr, period_dr, period_cr in gl_entries:
                    if acc_code not in accounts_dict:
                        continue

                    acc = accounts_dict[acc_code]
                    closing_dr = open_dr + period_dr - period_cr if (open_dr + period_dr) >= (open_cr + period_cr) else 0
                    closing_cr = open_cr + period_cr - period_dr if (open_cr + period_cr) > (open_dr + period_dr) else 0

                    gl = GeneralLedger(
                        id=str(uuid4()),
                        tenant_id=tenant_id,
                        account_id=acc.id,
                        account_code=acc_code,
                        fiscal_year_id=fiscal_year.id,
                        fiscal_period_id=fiscal_period.id,
                        opening_debit=Decimal(str(open_dr)),
                        opening_credit=Decimal(str(open_cr)),
                        period_debit=Decimal(str(period_dr)),
                        period_credit=Decimal(str(period_cr)),
                        closing_debit=Decimal(str(closing_dr)),
                        closing_credit=Decimal(str(closing_cr)),
                    )
                    session.add(gl)

                session.commit()
                results["gl_entries"] = len(gl_entries)

        return {
            "success": True,
            "message": "Seed data completed",
            "results": results,
        }

    except Exception as e:
        # Rollback on error
        session.rollback()
        error_detail = traceback.format_exc()
        print(f"Seed data error: {error_detail}")
        raise HTTPException(
            status_code=500,
            detail=f"Seed data failed: {str(e)}\n\nTraceback:\n{error_detail}"
        )


@router.delete("/seed-data")
def clear_accounting_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Clear all accounting data for current tenant (use with caution!)"""
    tenant_id = str(current_user.tenant_id)

    # Delete in correct order due to foreign keys
    session.exec(
        select(GeneralLedger).where(GeneralLedger.tenant_id == tenant_id)
    )
    for gl in session.exec(select(GeneralLedger).where(GeneralLedger.tenant_id == tenant_id)).all():
        session.delete(gl)

    for inv in session.exec(select(CustomerInvoice).where(CustomerInvoice.tenant_id == tenant_id)).all():
        session.delete(inv)

    for bank in session.exec(select(BankAccount).where(BankAccount.tenant_id == tenant_id)).all():
        session.delete(bank)

    for tax in session.exec(select(TaxRate).where(TaxRate.tenant_id == tenant_id)).all():
        session.delete(tax)

    for period in session.exec(select(FiscalPeriod).where(FiscalPeriod.tenant_id == tenant_id)).all():
        session.delete(period)

    for fy in session.exec(select(FiscalYear).where(FiscalYear.tenant_id == tenant_id)).all():
        session.delete(fy)

    for acc in session.exec(select(ChartOfAccounts).where(ChartOfAccounts.tenant_id == tenant_id)).all():
        session.delete(acc)

    session.commit()

    return {"success": True, "message": "All accounting data cleared"}
