"""
Accounting - Tax Management Models
Quản lý thuế: VAT, PIT (TNCN), CIT (TNDN)
Theo quy định Việt Nam
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class TaxType(str, Enum):
    """Loại thuế"""
    VAT = "VAT"                         # Thuế GTGT
    PIT = "PIT"                         # Thuế TNCN (Personal Income Tax)
    CIT = "CIT"                         # Thuế TNDN (Corporate Income Tax)
    WITHHOLDING = "WITHHOLDING"         # Thuế nhà thầu
    IMPORT = "IMPORT"                   # Thuế nhập khẩu
    EXPORT = "EXPORT"                   # Thuế xuất khẩu
    SPECIAL = "SPECIAL"                 # Thuế tiêu thụ đặc biệt


class VATType(str, Enum):
    """Loại VAT"""
    OUTPUT = "OUTPUT"                   # VAT đầu ra (bán hàng)
    INPUT = "INPUT"                     # VAT đầu vào (mua hàng)


class VATRate(str, Enum):
    """Thuế suất VAT theo quy định VN"""
    RATE_0 = "0"                        # 0% - Xuất khẩu
    RATE_5 = "5"                        # 5% - Hàng thiết yếu
    RATE_8 = "8"                        # 8% - Tạm thời (2024-2026)
    RATE_10 = "10"                      # 10% - Thuế suất thông thường
    EXEMPT = "EXEMPT"                   # Không chịu thuế
    NON_DEDUCTIBLE = "NON_DEDUCTIBLE"  # Không được khấu trừ


class TaxDeclarationStatus(str, Enum):
    """Trạng thái tờ khai"""
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    PAID = "PAID"


class TaxRate(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Bảng thuế suất
    """
    __tablename__ = "acc_tax_rates"

    code: str = Field(index=True, nullable=False)               # VAT10, VAT5, VAT0
    name: str = Field(nullable=False)                           # Thuế GTGT 10%

    tax_type: str = Field(default=TaxType.VAT.value, index=True)

    # Rate
    rate: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)  # 10.00
    rate_type: str = Field(default="PERCENTAGE")                # PERCENTAGE, FIXED

    # For VAT
    vat_type: Optional[str] = Field(default=None)               # OUTPUT, INPUT

    # GL Accounts
    tax_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")  # TK 3331
    refund_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")

    # Validity
    effective_from: Optional[datetime] = Field(default=None)
    effective_to: Optional[datetime] = Field(default=None)

    is_active: bool = Field(default=True)
    is_default: bool = Field(default=False)                     # Thuế suất mặc định

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class VATTransaction(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Giao dịch VAT (Chi tiết thuế GTGT)
    """
    __tablename__ = "acc_vat_transactions"

    # Reference
    transaction_number: str = Field(index=True, nullable=False)
    transaction_date: datetime = Field(nullable=False, index=True)

    vat_type: str = Field(default=VATType.OUTPUT.value, index=True)

    # Tax rate
    tax_rate_id: str = Field(foreign_key="acc_tax_rates.id", nullable=False)
    tax_rate: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)

    # Invoice reference
    invoice_id: Optional[str] = Field(default=None)             # Customer/Vendor invoice ID
    invoice_number: str = Field(nullable=False)
    invoice_date: datetime = Field(nullable=False)
    invoice_series: Optional[str] = Field(default=None)         # Ký hiệu hóa đơn

    # Partner
    partner_id: str = Field(nullable=False, index=True)
    partner_code: Optional[str] = Field(default=None)
    partner_name: str = Field(nullable=False)
    partner_tax_code: Optional[str] = Field(default=None, index=True)
    partner_address: Optional[str] = Field(default=None)

    # Amounts
    goods_service_name: str = Field(nullable=False)             # Tên hàng hóa/dịch vụ
    base_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Giá trước thuế
    tax_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)   # Tiền thuế
    total_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2) # Tổng tiền

    currency: str = Field(default="VND")
    exchange_rate: Decimal = Field(default=Decimal("1"), max_digits=15, decimal_places=6)

    # Deductibility (for input VAT)
    is_deductible: bool = Field(default=True)
    non_deductible_reason: Optional[str] = Field(default=None)

    # VAT declaration
    declaration_id: Optional[str] = Field(default=None, foreign_key="acc_vat_declarations.id")
    declaration_period: Optional[str] = Field(default=None)     # 2024-01

    # Accounting
    journal_entry_id: Optional[str] = Field(default=None, foreign_key="acc_journal_entries.id")

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class VATDeclaration(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Tờ khai thuế GTGT
    """
    __tablename__ = "acc_vat_declarations"

    # Declaration identification
    declaration_number: str = Field(index=True, nullable=False)
    declaration_type: str = Field(default="MONTHLY")            # MONTHLY, QUARTERLY
    period: str = Field(nullable=False, index=True)             # 2024-01 or 2024-Q1

    period_from: datetime = Field(nullable=False)
    period_to: datetime = Field(nullable=False)

    # Output VAT (Thuế đầu ra)
    output_tax_base: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    output_tax_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Input VAT (Thuế đầu vào)
    input_tax_base: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    input_tax_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    non_deductible_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Calculation
    tax_payable: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)      # Thuế phải nộp
    tax_refundable: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)   # Thuế được hoàn
    carried_forward: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Chuyển kỳ sau

    # Adjustments
    previous_period_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    adjustments: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Final amount
    amount_due: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Status
    status: str = Field(default=TaxDeclarationStatus.DRAFT.value, index=True)

    # Submission
    submitted_at: Optional[datetime] = Field(default=None)
    submission_number: Optional[str] = Field(default=None)      # Số tiếp nhận từ cơ quan thuế

    # Payment
    paid_at: Optional[datetime] = Field(default=None)
    paid_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    payment_reference: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class PITBracket(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Biểu thuế lũy tiến TNCN
    Theo quy định Việt Nam
    """
    __tablename__ = "acc_pit_brackets"

    # Bracket range
    bracket_level: int = Field(nullable=False)                  # 1-7
    from_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    to_amount: Optional[Decimal] = Field(default=None, max_digits=20, decimal_places=2)  # NULL = unlimited

    # Rate
    rate: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)  # 5, 10, 15, 20, 25, 30, 35

    # For quick calculation
    quick_deduction: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Validity
    effective_from: datetime = Field(nullable=False)
    effective_to: Optional[datetime] = Field(default=None)

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)


class PITDeduction(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Giảm trừ TNCN
    """
    __tablename__ = "acc_pit_deductions"

    code: str = Field(index=True, nullable=False)               # PERSONAL, DEPENDENT
    name: str = Field(nullable=False)

    deduction_type: str = Field(default="PERSONAL")             # PERSONAL, DEPENDENT, INSURANCE, CHARITY

    # Amount
    amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    amount_type: str = Field(default="MONTHLY")                 # MONTHLY, YEARLY

    # Validity
    effective_from: datetime = Field(nullable=False)
    effective_to: Optional[datetime] = Field(default=None)

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)


class PITTransaction(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Giao dịch thuế TNCN (cho nhân viên)
    """
    __tablename__ = "acc_pit_transactions"

    # Employee
    employee_id: str = Field(nullable=False, index=True)
    employee_code: Optional[str] = Field(default=None)
    employee_name: str = Field(nullable=False)
    tax_code: Optional[str] = Field(default=None)               # MST cá nhân

    # Period
    period: str = Field(nullable=False, index=True)             # 2024-01
    payroll_id: Optional[str] = Field(default=None)             # Link to HRM payroll

    # Income
    gross_income: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    taxable_income: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Deductions
    personal_deduction: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Giảm trừ bản thân
    dependent_deduction: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Giảm trừ người phụ thuộc
    insurance_deduction: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # BHXH, BHYT, BHTN
    other_deductions: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Tax calculation
    tax_base: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Thu nhập chịu thuế
    tax_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Thuế TNCN

    # Status
    is_finalized: bool = Field(default=False)

    # Declaration
    declaration_id: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class CITDeclaration(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Tờ khai thuế TNDN (Corporate Income Tax)
    """
    __tablename__ = "acc_cit_declarations"

    declaration_number: str = Field(index=True, nullable=False)
    declaration_type: str = Field(default="QUARTERLY")          # QUARTERLY, ANNUAL

    fiscal_year_id: str = Field(foreign_key="acc_fiscal_years.id", nullable=False)
    period: str = Field(nullable=False, index=True)             # 2024-Q1 or 2024

    # Revenue
    total_revenue: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    deductible_expenses: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    non_deductible_expenses: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Taxable income
    accounting_profit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    adjustments: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    taxable_income: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Tax
    tax_rate: Decimal = Field(default=Decimal("20"), max_digits=5, decimal_places=2)  # 20% thông thường
    tax_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Incentives
    tax_incentive: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Final
    tax_payable: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    prepaid_tax: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    amount_due: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Status
    status: str = Field(default=TaxDeclarationStatus.DRAFT.value, index=True)

    # Submission
    submitted_at: Optional[datetime] = Field(default=None)
    submission_number: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class WithholdingTax(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Thuế nhà thầu nước ngoài
    """
    __tablename__ = "acc_withholding_taxes"

    # Reference
    transaction_number: str = Field(index=True, nullable=False)
    transaction_date: datetime = Field(nullable=False, index=True)

    # Foreign contractor
    contractor_id: Optional[str] = Field(default=None)
    contractor_name: str = Field(nullable=False)
    contractor_country: Optional[str] = Field(default=None)
    contractor_tax_code: Optional[str] = Field(default=None)

    # Contract/Invoice reference
    invoice_id: Optional[str] = Field(default=None)
    invoice_number: Optional[str] = Field(default=None)
    contract_number: Optional[str] = Field(default=None)

    # Service type
    service_type: Optional[str] = Field(default=None)           # Type of service provided

    # Amounts
    gross_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # VAT withholding
    vat_rate: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    vat_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # CIT withholding
    cit_rate: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    cit_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Total
    total_withholding: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    net_payment: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    currency: str = Field(default="VND")
    exchange_rate: Decimal = Field(default=Decimal("1"), max_digits=15, decimal_places=6)

    # Status
    status: str = Field(default="DRAFT")

    # Payment
    paid_at: Optional[datetime] = Field(default=None)
    payment_reference: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
