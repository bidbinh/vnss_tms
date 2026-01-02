"""
Seed data for Billing System
- Transaction Types (6 tiers)
- Billing Plans (FREE, STARTER, PRO, ENTERPRISE)
"""
import json
from decimal import Decimal
from sqlmodel import Session, select
from app.models.billing import TransactionType, BillingPlan


# ==================== TRANSACTION TYPES ====================

TRANSACTION_TYPES_DATA = [
    {
        "code": "BASIC",
        "name": "Giao dịch cơ bản",
        "description": "CRUD đơn giản cho master data: khách hàng, địa điểm, xe, tài xế",
        "tier": 1,
        "unit_price": Decimal("200"),
        "document_types": [
            "CUSTOMER", "LOCATION", "SITE", "DRIVER", "VEHICLE", "TRAILER",
            "ACCOUNT", "CONTACT", "LEAD",  # CRM
            "EMPLOYEE", "DEPARTMENT", "POSITION",  # HRM
            "WAREHOUSE", "ZONE", "PRODUCT",  # WMS
            "COST_CENTER", "PROFIT_CENTER",  # Controlling
        ],
        "has_file_upload": False,
        "has_ai_processing": False,
        "complexity_score": 1,
        "sort_order": 1,
    },
    {
        "code": "STANDARD",
        "name": "Giao dịch nghiệp vụ",
        "description": "Đơn hàng, chuyến xe, hợp đồng - có workflow và validation",
        "tier": 2,
        "unit_price": Decimal("500"),
        "document_types": [
            "ORDER", "TRIP", "SHIPMENT", "EMPTY_RETURN",  # TMS
            "SALES_ORDER", "CONTRACT", "OPPORTUNITY", "QUOTE",  # CRM
            "LEAVE_REQUEST", "OVERTIME_REQUEST", "ADVANCE_REQUEST",  # HRM
            "FMS_SHIPMENT", "FMS_QUOTATION", "CONSOLIDATION",  # FMS
            "INTERNAL_ORDER",  # Controlling
            "PROJECT", "TASK", "MILESTONE",  # Project
            "WORKFLOW_INSTANCE", "APPROVAL_REQUEST",  # Workflow
        ],
        "has_file_upload": False,
        "has_ai_processing": False,
        "complexity_score": 3,
        "sort_order": 2,
    },
    {
        "code": "ADVANCED",
        "name": "Giao dịch kế toán",
        "description": "Hóa đơn, phiếu thu chi, bút toán - tính toán phức tạp, ảnh hưởng sổ sách",
        "tier": 3,
        "unit_price": Decimal("1000"),
        "document_types": [
            "CUSTOMER_INVOICE", "VENDOR_INVOICE",  # AR/AP
            "PAYMENT_RECEIPT", "PAYMENT_VOUCHER",  # Payments
            "CREDIT_NOTE", "DEBIT_NOTE",  # Adjustments
            "JOURNAL_ENTRY",  # General Ledger
            "BANK_TRANSACTION", "BANK_RECONCILIATION",  # Banking
            "PAYROLL_RUN", "PAYROLL_RECORD",  # Payroll
            "CUSTOMS_DECLARATION", "BILL_OF_LADING", "AIRWAY_BILL",  # FMS
            "BUDGET", "BUDGET_TRANSFER",  # Budgeting
        ],
        "has_file_upload": False,
        "has_ai_processing": False,
        "complexity_score": 5,
        "sort_order": 3,
    },
    {
        "code": "WAREHOUSE",
        "name": "Giao dịch kho",
        "description": "Nhập xuất kho có tracking lot/serial, nhiều dòng chi tiết",
        "tier": 4,
        "unit_price": Decimal("1500"),
        "document_types": [
            "GOODS_RECEIPT", "DELIVERY_ORDER", "STOCK_TRANSFER",  # WMS Core
            "PUTAWAY_TASK", "PICKING_TASK", "PACKING_TASK",  # WMS Tasks
            "INVENTORY_COUNT", "STOCK_ADJUSTMENT",  # Inventory
            "PRODUCT_LOT", "STOCK_MOVE",  # Stock tracking
        ],
        "has_file_upload": False,
        "has_ai_processing": False,
        "complexity_score": 6,
        "sort_order": 4,
    },
    {
        "code": "AI_POWERED",
        "name": "Giao dịch AI",
        "description": "Xử lý AI/OCR: nhận dạng chứng từ, phân tích dữ liệu, chatbot",
        "tier": 5,
        "unit_price": Decimal("3000"),
        "document_types": [
            "AI_DOCUMENT_ANALYSIS",  # OCR invoice/receipt
            "AI_CHAT_QUERY",  # AI Assistant query
            "AI_DATA_EXTRACTION",  # Extract data from docs
            "AI_REPORT_GENERATION",  # AI-generated reports
        ],
        "has_file_upload": True,
        "has_ai_processing": True,
        "complexity_score": 9,
        "sort_order": 5,
    },
    {
        "code": "STORAGE",
        "name": "Lưu trữ file",
        "description": "Upload ảnh, tài liệu đính kèm - tính theo MB",
        "tier": 6,
        "unit_price": Decimal("50"),  # Per MB
        "document_types": [
            "ORDER_DOCUMENT", "TRIP_DOCUMENT",  # TMS attachments
            "FMS_DOCUMENT",  # FMS attachments
            "EMPLOYEE_DOCUMENT",  # HRM attachments
            "DMS_DOCUMENT", "DMS_VERSION",  # Document Management
            "ATTACHMENT",  # Generic attachment
        ],
        "has_file_upload": True,
        "has_ai_processing": False,
        "complexity_score": 2,
        "sort_order": 6,
    },
]


# ==================== BILLING PLANS ====================

BILLING_PLANS_DATA = [
    {
        "code": "FREE",
        "name": "Gói Miễn phí",
        "description": "Dùng thử miễn phí, giới hạn 50,000 credits/tháng",
        "price_per_month": Decimal("0"),
        "price_per_year": Decimal("0"),
        "monthly_credits": 50000,
        "overage_discount": Decimal("0"),  # No discount, block instead
        "grace_percent": 10,  # Allow 10% overage before block
        "max_users": 3,
        "max_storage_gb": Decimal("1"),
        "features": {
            "api_access": False,
            "ai_enabled": False,
            "support_priority": "community",
            "custom_domain": False,
            "sso": False,
            "audit_log": False,
        },
        "is_public": True,
        "sort_order": 1,
    },
    {
        "code": "STARTER",
        "name": "Gói Khởi nghiệp",
        "description": "Phù hợp doanh nghiệp nhỏ, 300,000 credits/tháng",
        "price_per_month": Decimal("500000"),
        "price_per_year": Decimal("5000000"),  # ~2 months free
        "monthly_credits": 300000,
        "overage_discount": Decimal("20"),  # 20% discount on overage
        "grace_percent": 0,  # No grace, charge overage
        "max_users": 10,
        "max_storage_gb": Decimal("10"),
        "features": {
            "api_access": True,
            "ai_enabled": False,
            "support_priority": "email",
            "custom_domain": False,
            "sso": False,
            "audit_log": True,
        },
        "is_public": True,
        "sort_order": 2,
    },
    {
        "code": "PRO",
        "name": "Gói Chuyên nghiệp",
        "description": "Dành cho doanh nghiệp vừa, 1,500,000 credits/tháng",
        "price_per_month": Decimal("2000000"),
        "price_per_year": Decimal("20000000"),  # ~2 months free
        "monthly_credits": 1500000,
        "overage_discount": Decimal("30"),  # 30% discount on overage
        "grace_percent": 0,
        "max_users": 50,
        "max_storage_gb": Decimal("50"),
        "features": {
            "api_access": True,
            "ai_enabled": True,
            "support_priority": "priority",
            "custom_domain": True,
            "sso": False,
            "audit_log": True,
        },
        "is_public": True,
        "sort_order": 3,
    },
    {
        "code": "ENTERPRISE",
        "name": "Gói Doanh nghiệp",
        "description": "Không giới hạn, hỗ trợ 24/7, tùy chỉnh theo yêu cầu",
        "price_per_month": Decimal("5000000"),
        "price_per_year": Decimal("50000000"),
        "monthly_credits": 0,  # Unlimited
        "overage_discount": Decimal("0"),  # N/A
        "grace_percent": 0,
        "max_users": 0,  # Unlimited
        "max_storage_gb": Decimal("0"),  # Unlimited
        "features": {
            "api_access": True,
            "ai_enabled": True,
            "support_priority": "dedicated",
            "custom_domain": True,
            "sso": True,
            "audit_log": True,
            "dedicated_support": True,
            "on_premise_option": True,
        },
        "is_public": True,
        "sort_order": 4,
    },
]


def seed_transaction_types(session: Session) -> list[TransactionType]:
    """Seed transaction types if not exist"""
    created = []

    for data in TRANSACTION_TYPES_DATA:
        # Check if exists
        existing = session.exec(
            select(TransactionType).where(TransactionType.code == data["code"])
        ).first()

        if existing:
            # Update existing
            existing.name = data["name"]
            existing.description = data["description"]
            existing.tier = data["tier"]
            existing.unit_price = data["unit_price"]
            existing.document_types_json = json.dumps(data["document_types"])
            existing.has_file_upload = data["has_file_upload"]
            existing.has_ai_processing = data["has_ai_processing"]
            existing.complexity_score = data["complexity_score"]
            existing.sort_order = data["sort_order"]
            existing.is_active = True
            session.add(existing)
            created.append(existing)
        else:
            # Create new
            tx_type = TransactionType(
                code=data["code"],
                name=data["name"],
                description=data["description"],
                tier=data["tier"],
                unit_price=data["unit_price"],
                document_types_json=json.dumps(data["document_types"]),
                has_file_upload=data["has_file_upload"],
                has_ai_processing=data["has_ai_processing"],
                complexity_score=data["complexity_score"],
                sort_order=data["sort_order"],
                is_active=True,
            )
            session.add(tx_type)
            created.append(tx_type)

    session.commit()
    return created


def seed_billing_plans(session: Session) -> list[BillingPlan]:
    """Seed billing plans if not exist"""
    created = []

    for data in BILLING_PLANS_DATA:
        # Check if exists
        existing = session.exec(
            select(BillingPlan).where(BillingPlan.code == data["code"])
        ).first()

        if existing:
            # Update existing
            existing.name = data["name"]
            existing.description = data["description"]
            existing.price_per_month = data["price_per_month"]
            existing.price_per_year = data["price_per_year"]
            existing.monthly_credits = data["monthly_credits"]
            existing.overage_discount = data["overage_discount"]
            existing.grace_percent = data["grace_percent"]
            existing.max_users = data["max_users"]
            existing.max_storage_gb = data["max_storage_gb"]
            existing.features_json = json.dumps(data["features"])
            existing.is_public = data["is_public"]
            existing.sort_order = data["sort_order"]
            existing.is_active = True
            session.add(existing)
            created.append(existing)
        else:
            # Create new
            plan = BillingPlan(
                code=data["code"],
                name=data["name"],
                description=data["description"],
                price_per_month=data["price_per_month"],
                price_per_year=data["price_per_year"],
                monthly_credits=data["monthly_credits"],
                overage_discount=data["overage_discount"],
                grace_percent=data["grace_percent"],
                max_users=data["max_users"],
                max_storage_gb=data["max_storage_gb"],
                features_json=json.dumps(data["features"]),
                is_public=data["is_public"],
                sort_order=data["sort_order"],
                is_active=True,
            )
            session.add(plan)
            created.append(plan)

    session.commit()
    return created


def seed_billing_data(session: Session) -> dict:
    """Seed all billing data"""
    tx_types = seed_transaction_types(session)
    plans = seed_billing_plans(session)

    return {
        "transaction_types": len(tx_types),
        "billing_plans": len(plans),
    }
