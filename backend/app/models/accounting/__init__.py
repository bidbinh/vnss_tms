"""
Accounting Module Models
Hệ thống kế toán theo chuẩn VAS (Thông tư 200/2014/TT-BTC)
"""

# Chart of Accounts
from app.models.accounting.chart_of_accounts import (
    ChartOfAccounts,
    AccountClassification,
    AccountNature,
    AccountCategory,
    FiscalYear,
    FiscalPeriod,
    CostCenter,
    AccountingProject,
)

# Journal & General Ledger
from app.models.accounting.journal import (
    Journal,
    JournalType,
    JournalEntry,
    JournalEntryStatus,
    JournalEntryLine,
    GeneralLedger,
    AccountBalance,
)

# Accounts Receivable
from app.models.accounting.accounts_receivable import (
    CustomerInvoice,
    CustomerInvoiceLine,
    InvoiceType,
    InvoiceStatus,
    PaymentReceipt,
    PaymentReceiptStatus,
    PaymentReceiptAllocation,
    CreditNote,
    ARAgingSnapshot,
)

# Accounts Payable
from app.models.accounting.accounts_payable import (
    VendorInvoice,
    VendorInvoiceLine,
    VendorInvoiceType,
    VendorInvoiceStatus,
    PaymentVoucher,
    PaymentVoucherStatus,
    PaymentVoucherAllocation,
    DebitNote,
    APAgingSnapshot,
)

# Banking
from app.models.accounting.banking import (
    BankAccount,
    BankAccountType,
    BankAccountStatus,
    BankTransaction,
    TransactionType,
    TransactionStatus,
    BankStatement,
    BankStatementLine,
    BankReconciliation,
    ReconciliationStatus,
    BankTransfer,
    CashCount,
)

# Tax
from app.models.accounting.tax import (
    TaxRate,
    TaxType,
    VATType,
    VATRate,
    VATTransaction,
    VATDeclaration,
    TaxDeclarationStatus,
    PITBracket,
    PITDeduction,
    PITTransaction,
    CITDeclaration,
    WithholdingTax,
)

# Fixed Assets
from app.models.accounting.fixed_assets import (
    FixedAssetCategory,
    FixedAsset,
    AssetCategory,
    AssetStatus,
    DepreciationMethod,
    AssetDepreciation,
    AssetRevaluation,
    AssetDisposal,
    DisposalType,
    AssetTransfer,
    AssetMaintenance,
)

# Reports
from app.models.accounting.reports import (
    FinancialReportTemplate,
    FinancialReportLine,
    GeneratedReport,
    ReportType,
    ReportStatus,
    TrialBalanceReport,
    BudgetPeriod,
    BudgetLine,
    BudgetVsActual,
    CurrencyRate,
    AuditLog,
)

__all__ = [
    # Chart of Accounts
    "ChartOfAccounts",
    "AccountClassification",
    "AccountNature",
    "AccountCategory",
    "FiscalYear",
    "FiscalPeriod",
    "CostCenter",
    "AccountingProject",
    # Journal & GL
    "Journal",
    "JournalType",
    "JournalEntry",
    "JournalEntryStatus",
    "JournalEntryLine",
    "GeneralLedger",
    "AccountBalance",
    # AR
    "CustomerInvoice",
    "CustomerInvoiceLine",
    "InvoiceType",
    "InvoiceStatus",
    "PaymentReceipt",
    "PaymentReceiptStatus",
    "PaymentReceiptAllocation",
    "CreditNote",
    "ARAgingSnapshot",
    # AP
    "VendorInvoice",
    "VendorInvoiceLine",
    "VendorInvoiceType",
    "VendorInvoiceStatus",
    "PaymentVoucher",
    "PaymentVoucherStatus",
    "PaymentVoucherAllocation",
    "DebitNote",
    "APAgingSnapshot",
    # Banking
    "BankAccount",
    "BankAccountType",
    "BankAccountStatus",
    "BankTransaction",
    "TransactionType",
    "TransactionStatus",
    "BankStatement",
    "BankStatementLine",
    "BankReconciliation",
    "ReconciliationStatus",
    "BankTransfer",
    "CashCount",
    # Tax
    "TaxRate",
    "TaxType",
    "VATType",
    "VATRate",
    "VATTransaction",
    "VATDeclaration",
    "TaxDeclarationStatus",
    "PITBracket",
    "PITDeduction",
    "PITTransaction",
    "CITDeclaration",
    "WithholdingTax",
    # Fixed Assets
    "FixedAssetCategory",
    "FixedAsset",
    "AssetCategory",
    "AssetStatus",
    "DepreciationMethod",
    "AssetDepreciation",
    "AssetRevaluation",
    "AssetDisposal",
    "DisposalType",
    "AssetTransfer",
    "AssetMaintenance",
    # Reports
    "FinancialReportTemplate",
    "FinancialReportLine",
    "GeneratedReport",
    "ReportType",
    "ReportStatus",
    "TrialBalanceReport",
    "BudgetPeriod",
    "BudgetLine",
    "BudgetVsActual",
    "CurrencyRate",
    "AuditLog",
]
