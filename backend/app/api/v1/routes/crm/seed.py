"""
CRM - Seed Data API Routes
Generate sample CRM data for testing
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime, timedelta
import random

from app.db.session import get_session
from app.models import User
from app.models.crm.account import Account, CustomerGroup, AccountType, AccountStatus, AccountIndustry
from app.models.crm.contact import Contact, ContactStatus
from app.models.crm.lead import Lead, LeadStatus, LeadSource
from app.models.crm.opportunity import Opportunity, OpportunityStage
from app.models.crm.quote import Quote, QuoteItem, QuoteStatus
from app.models.crm.activity import Activity, ActivityType, ActivityStatus
from app.core.security import get_current_user

router = APIRouter(prefix="/seed", tags=["CRM - Seed"])


# Sample data
COMPANY_NAMES = [
    "Công ty TNHH Vận tải Sao Mai",
    "Tập đoàn Logistics Đông Á",
    "Công ty CP Xuất nhập khẩu Hải Phòng",
    "TNHH Thương mại Quốc tế ABC",
    "Công ty TNHH Sản xuất Dệt may Việt",
    "Tập đoàn Công nghệ VietTech",
    "Công ty CP Thép Miền Nam",
    "TNHH Thực phẩm Golden Food",
    "Công ty TNHH Nội thất Hoàng Gia",
    "Tập đoàn Xây dựng Thống Nhất",
    "Công ty CP Điện tử Samsung Việt Nam",
    "TNHH Dược phẩm Medipharm",
    "Công ty TNHH Ô tô Trường Hải",
    "Tập đoàn Vingroup",
    "Công ty CP FPT",
]

FIRST_NAMES = ["Minh", "Hùng", "Thành", "Phong", "Tuấn", "Dũng", "Quang", "Hoàng", "Việt", "Long",
               "Lan", "Hương", "Mai", "Hoa", "Linh", "Ngọc", "Thảo", "Trang", "Hạnh", "Yến"]

LAST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng"]

CITIES = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Bình Dương", "Đồng Nai", "Long An"]

SERVICES = ["FCL", "LCL", "AIR", "EXPRESS", "CUSTOMS", "WAREHOUSE", "TRUCKING", "CROSS_BORDER"]

ROUTES = [
    "HCM - Hải Phòng", "HCM - Đà Nẵng", "HCM - Hà Nội",
    "Hà Nội - HCM", "Hà Nội - Hải Phòng", "Đà Nẵng - HCM",
    "HCM - Singapore", "HCM - Shanghai", "HCM - Tokyo",
    "Hà Nội - Beijing", "Đà Nẵng - Seoul"
]


@router.post("")
def seed_crm_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Generate sample CRM data"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    created = {
        "customer_groups": 0,
        "accounts": 0,
        "contacts": 0,
        "leads": 0,
        "opportunities": 0,
        "quotes": 0,
        "activities": 0,
    }

    # 1. Create Customer Groups
    groups_data = [
        {"code": "VIP", "name": "Khách hàng VIP", "discount_percent": 15, "priority": 100},
        {"code": "GOLD", "name": "Khách hàng Vàng", "discount_percent": 10, "priority": 80},
        {"code": "SILVER", "name": "Khách hàng Bạc", "discount_percent": 5, "priority": 60},
        {"code": "STANDARD", "name": "Khách hàng Tiêu chuẩn", "discount_percent": 0, "priority": 40},
        {"code": "NEW", "name": "Khách hàng Mới", "discount_percent": 0, "priority": 20},
    ]

    groups = []
    for data in groups_data:
        existing = session.exec(
            select(CustomerGroup).where(
                CustomerGroup.tenant_id == tenant_id,
                CustomerGroup.code == data["code"]
            )
        ).first()

        if not existing:
            group = CustomerGroup(
                tenant_id=tenant_id,
                **data,
                created_by=user_id,
            )
            session.add(group)
            groups.append(group)
            created["customer_groups"] += 1
        else:
            groups.append(existing)

    session.commit()

    # 2. Create Accounts
    accounts = []
    for i, name in enumerate(COMPANY_NAMES):
        code = f"ACC-{datetime.now().year}-{(i + 1):04d}"

        existing = session.exec(
            select(Account).where(
                Account.tenant_id == tenant_id,
                Account.code == code
            )
        ).first()

        if existing:
            accounts.append(existing)
            continue

        city = random.choice(CITIES)
        group = random.choice(groups)

        account = Account(
            tenant_id=tenant_id,
            code=code,
            name=name,
            account_type=random.choice([AccountType.CUSTOMER.value, AccountType.BOTH.value]),
            status=random.choice([AccountStatus.ACTIVE.value, AccountStatus.ACTIVE.value, AccountStatus.PROSPECT.value]),
            industry=random.choice(list(AccountIndustry)).value,
            customer_group_id=group.id,
            tax_code=f"{random.randint(1000000000, 9999999999)}",
            address=f"Số {random.randint(1, 500)}, Đường {random.randint(1, 30)}, {city}",
            city=city,
            country="Vietnam",
            phone=f"0{random.randint(20, 99)}{random.randint(1000000, 9999999)}",
            email=f"contact@{name.lower().replace(' ', '').replace('.', '')[:20]}.vn",
            website=f"www.{name.lower().replace(' ', '').replace('.', '')[:20]}.vn",
            credit_limit=random.choice([50000000, 100000000, 200000000, 500000000, 1000000000]),
            credit_days=random.choice([15, 30, 45, 60]),
            commodity_types=random.choice(["Hàng tiêu dùng", "Điện tử", "Dệt may", "Thực phẩm", "Máy móc"]),
            created_by=user_id,
        )

        session.add(account)
        accounts.append(account)
        created["accounts"] += 1

    session.commit()

    # 3. Create Contacts for each Account
    for account in accounts:
        # Check if account already has contacts
        existing_contacts = session.exec(
            select(Contact).where(
                Contact.tenant_id == tenant_id,
                Contact.account_id == account.id
            )
        ).first()

        if existing_contacts:
            continue

        num_contacts = random.randint(1, 3)
        for j in range(num_contacts):
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)

            contact = Contact(
                tenant_id=tenant_id,
                account_id=account.id,
                first_name=first_name,
                last_name=last_name,
                full_name=f"{last_name} {first_name}",
                title=random.choice(["Giám đốc", "Phó Giám đốc", "Trưởng phòng", "Nhân viên", "Kế toán trưởng"]),
                department=random.choice(["Kinh doanh", "Kế toán", "Xuất nhập khẩu", "Logistics", "Mua hàng"]),
                email=f"{first_name.lower()}.{last_name.lower()}@company.vn",
                phone=f"0{random.randint(90, 99)}{random.randint(1000000, 9999999)}",
                is_primary=(j == 0),
                decision_maker=(j == 0),
                status=ContactStatus.ACTIVE.value,
                created_by=user_id,
            )

            session.add(contact)
            created["contacts"] += 1

    session.commit()

    # 4. Create Leads
    for i in range(10):
        code = f"LD-{datetime.now().year}-{(i + 1):04d}"

        existing = session.exec(
            select(Lead).where(
                Lead.tenant_id == tenant_id,
                Lead.code == code
            )
        ).first()

        if existing:
            continue

        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)

        lead = Lead(
            tenant_id=tenant_id,
            code=code,
            first_name=first_name,
            last_name=last_name,
            full_name=f"{last_name} {first_name}",
            company_name=f"Công ty {random.choice(['TNHH', 'CP', 'Cổ phần'])} {first_name} {last_name}",
            title=random.choice(["Giám đốc", "Quản lý", "Trưởng phòng"]),
            email=f"{first_name.lower()}@company.vn",
            phone=f"0{random.randint(90, 99)}{random.randint(1000000, 9999999)}",
            city=random.choice(CITIES),
            source=random.choice(list(LeadSource)).value,
            status=random.choice([LeadStatus.NEW.value, LeadStatus.CONTACTED.value, LeadStatus.QUALIFIED.value]),
            service_interest=random.choice(SERVICES),
            estimated_value=random.choice([10000000, 50000000, 100000000, 200000000]),
            created_by=user_id,
        )

        session.add(lead)
        created["leads"] += 1

    session.commit()

    # 5. Create Opportunities
    for i, account in enumerate(accounts[:8]):
        code = f"OPP-{datetime.now().year}-{(i + 1):04d}"

        existing = session.exec(
            select(Opportunity).where(
                Opportunity.tenant_id == tenant_id,
                Opportunity.code == code
            )
        ).first()

        if existing:
            continue

        stage = random.choice(list(OpportunityStage))
        probability_map = {
            "QUALIFICATION": 10,
            "NEEDS_ANALYSIS": 25,
            "PROPOSAL": 50,
            "NEGOTIATION": 75,
            "CLOSED_WON": 100,
            "CLOSED_LOST": 0,
        }

        opportunity = Opportunity(
            tenant_id=tenant_id,
            code=code,
            name=f"Hợp đồng vận chuyển - {account.name[:30]}",
            account_id=account.id,
            stage=stage.value,
            probability=probability_map.get(stage.value, 50),
            amount=random.choice([50000000, 100000000, 200000000, 500000000, 1000000000]),
            currency="VND",
            expected_close_date=(datetime.now() + timedelta(days=random.randint(7, 90))).strftime("%Y-%m-%d"),
            source=random.choice(list(LeadSource)).value,
            service_type=random.choice(SERVICES),
            origin=random.choice(CITIES),
            destination=random.choice(CITIES),
            created_by=user_id,
        )

        if stage.value in ["CLOSED_WON", "CLOSED_LOST"]:
            opportunity.actual_close_date = (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d")

        session.add(opportunity)
        created["opportunities"] += 1

    session.commit()

    # 6. Create Quotes
    opportunities = session.exec(
        select(Opportunity).where(
            Opportunity.tenant_id == tenant_id,
            Opportunity.stage.in_(["PROPOSAL", "NEGOTIATION", "CLOSED_WON"])
        )
    ).all()

    for i, opp in enumerate(opportunities[:5]):
        quote_number = f"QT-{datetime.now().year}-{(i + 1):04d}"

        existing = session.exec(
            select(Quote).where(
                Quote.tenant_id == tenant_id,
                Quote.quote_number == quote_number
            )
        ).first()

        if existing:
            continue

        quote = Quote(
            tenant_id=tenant_id,
            quote_number=quote_number,
            account_id=opp.account_id,
            opportunity_id=opp.id,
            status=QuoteStatus.SENT.value if opp.stage != "CLOSED_WON" else QuoteStatus.ACCEPTED.value,
            currency="VND",
            valid_until=(datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            payment_terms="Thanh toán trong vòng 30 ngày",
            created_by=user_id,
        )

        session.add(quote)
        session.commit()
        session.refresh(quote)

        # Add items
        subtotal = 0
        for j in range(random.randint(1, 3)):
            route = random.choice(ROUTES)
            unit_price = random.choice([5000000, 8000000, 12000000, 15000000, 20000000])
            quantity = random.randint(1, 10)

            item = QuoteItem(
                tenant_id=tenant_id,
                quote_id=quote.id,
                line_number=j + 1,
                service_type=random.choice(SERVICES),
                description=f"Vận chuyển {route}",
                route=route,
                container_type=random.choice(["20DC", "40DC", "40HC"]),
                quantity=quantity,
                unit="CONT",
                unit_price=unit_price,
                discount_percent=0,
            )
            session.add(item)
            subtotal += unit_price * quantity

        quote.subtotal = subtotal
        quote.tax_amount = subtotal * 0.1
        quote.total_amount = subtotal + quote.tax_amount
        session.add(quote)
        created["quotes"] += 1

    session.commit()

    # 7. Create Activities
    for i in range(20):
        existing_count = session.exec(
            select(func.count()).where(Activity.tenant_id == tenant_id)
        ).one()

        if existing_count >= 20:
            break

        account = random.choice(accounts)
        activity_type = random.choice(list(ActivityType))

        activity = Activity(
            tenant_id=tenant_id,
            activity_type=activity_type.value,
            subject=f"{activity_type.value}: {account.name[:30]}",
            description=f"Hoạt động với khách hàng {account.name}",
            account_id=account.id,
            status=random.choice([ActivityStatus.PLANNED.value, ActivityStatus.COMPLETED.value]),
            priority=random.choice(["LOW", "MEDIUM", "HIGH"]),
            start_date=(datetime.now() + timedelta(days=random.randint(-30, 30))).strftime("%Y-%m-%d"),
            start_time=f"{random.randint(8, 17)}:00",
            duration_minutes=random.choice([15, 30, 60, 90]),
            assigned_to=user_id,
            created_by=user_id,
        )

        if activity.status == ActivityStatus.COMPLETED.value:
            activity.completed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            activity.completed_by = user_id
            activity.outcome = "Đã hoàn thành"

        session.add(activity)
        created["activities"] += 1

    session.commit()

    return {
        "success": True,
        "message": "CRM seed data created successfully",
        "created": created,
    }


# Need to import func
from sqlmodel import func


@router.delete("")
def delete_crm_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete all CRM data for the tenant (USE WITH CAUTION)"""
    tenant_id = str(current_user.tenant_id)

    deleted = {
        "activities": 0,
        "quote_items": 0,
        "quotes": 0,
        "opportunities": 0,
        "leads": 0,
        "contacts": 0,
        "accounts": 0,
        "customer_groups": 0,
    }

    # Delete in reverse order of dependencies

    # Activities
    activities = session.exec(select(Activity).where(Activity.tenant_id == tenant_id)).all()
    for item in activities:
        session.delete(item)
        deleted["activities"] += 1

    # Quote Items
    quote_items = session.exec(select(QuoteItem).where(QuoteItem.tenant_id == tenant_id)).all()
    for item in quote_items:
        session.delete(item)
        deleted["quote_items"] += 1

    # Quotes
    quotes = session.exec(select(Quote).where(Quote.tenant_id == tenant_id)).all()
    for item in quotes:
        session.delete(item)
        deleted["quotes"] += 1

    # Opportunities
    opportunities = session.exec(select(Opportunity).where(Opportunity.tenant_id == tenant_id)).all()
    for item in opportunities:
        session.delete(item)
        deleted["opportunities"] += 1

    # Leads
    leads = session.exec(select(Lead).where(Lead.tenant_id == tenant_id)).all()
    for item in leads:
        session.delete(item)
        deleted["leads"] += 1

    # Contacts
    contacts = session.exec(select(Contact).where(Contact.tenant_id == tenant_id)).all()
    for item in contacts:
        session.delete(item)
        deleted["contacts"] += 1

    # Accounts
    accounts = session.exec(select(Account).where(Account.tenant_id == tenant_id)).all()
    for item in accounts:
        session.delete(item)
        deleted["accounts"] += 1

    # Customer Groups
    groups = session.exec(select(CustomerGroup).where(CustomerGroup.tenant_id == tenant_id)).all()
    for item in groups:
        session.delete(item)
        deleted["customer_groups"] += 1

    session.commit()

    return {
        "success": True,
        "message": "CRM data deleted successfully",
        "deleted": deleted,
    }
