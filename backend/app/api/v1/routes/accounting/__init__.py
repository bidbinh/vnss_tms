"""
Accounting API Routes
Module kế toán đầy đủ theo chuẩn VAS
"""
from fastapi import APIRouter
from app.api.v1.routes.accounting import (
    chart_of_accounts,
    journals,
    bank_accounts,
    accounts_receivable,
    accounts_payable,
    tax,
    fixed_assets,
    reports,
    seed,
)

router = APIRouter(prefix="/accounting", tags=["Accounting"])

# Chart of Accounts, Fiscal Years, Cost Centers
router.include_router(chart_of_accounts.router, tags=["Chart of Accounts"])

# Journals & General Ledger
router.include_router(journals.router, tags=["Journal Entries"])

# Banking
router.include_router(bank_accounts.router, tags=["Banking"])

# Accounts Receivable (AR)
router.include_router(accounts_receivable.router, tags=["Accounts Receivable"])

# Accounts Payable (AP)
router.include_router(accounts_payable.router, tags=["Accounts Payable"])

# Tax Management
router.include_router(tax.router, tags=["Tax"])

# Fixed Assets
router.include_router(fixed_assets.router, tags=["Fixed Assets"])

# Financial Reports
router.include_router(reports.router, tags=["Reports"])

# Seed Data (Dev only)
router.include_router(seed.router, tags=["Seed Data"])
