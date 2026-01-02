"""
CRM - Dashboard API Routes
Dashboard summaries and KPIs for CRM
"""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from typing import Optional
from datetime import datetime, timedelta

from app.db.session import get_session
from app.models import User
from app.models.crm.account import Account, AccountStatus
from app.models.crm.contact import Contact
from app.models.crm.lead import Lead, LeadStatus
from app.models.crm.opportunity import Opportunity, OpportunityStage
from app.models.crm.quote import Quote, QuoteStatus
from app.models.crm.activity import Activity, ActivityStatus
from app.core.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["CRM - Dashboard"])


@router.get("/stats")
@router.get("/summary")
def get_dashboard_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get CRM dashboard summary"""
    tenant_id = str(current_user.tenant_id)

    # Accounts
    total_accounts = session.exec(
        select(func.count()).where(Account.tenant_id == tenant_id)
    ).one()

    active_accounts = session.exec(
        select(func.count()).where(
            Account.tenant_id == tenant_id,
            Account.status == AccountStatus.ACTIVE.value
        )
    ).one()

    # Contacts
    total_contacts = session.exec(
        select(func.count()).where(Contact.tenant_id == tenant_id)
    ).one()

    # Leads
    total_leads = session.exec(
        select(func.count()).where(Lead.tenant_id == tenant_id)
    ).one()

    new_leads = session.exec(
        select(func.count()).where(
            Lead.tenant_id == tenant_id,
            Lead.status == LeadStatus.NEW.value
        )
    ).one()

    qualified_leads = session.exec(
        select(func.count()).where(
            Lead.tenant_id == tenant_id,
            Lead.status == LeadStatus.QUALIFIED.value
        )
    ).one()

    # Opportunities
    open_opportunities = session.exec(
        select(func.count()).where(
            Opportunity.tenant_id == tenant_id,
            Opportunity.stage.not_in([OpportunityStage.CLOSED_WON.value, OpportunityStage.CLOSED_LOST.value])
        )
    ).one()

    # Pipeline value
    pipeline_opps = session.exec(
        select(Opportunity).where(
            Opportunity.tenant_id == tenant_id,
            Opportunity.stage.not_in([OpportunityStage.CLOSED_WON.value, OpportunityStage.CLOSED_LOST.value])
        )
    ).all()

    pipeline_value = sum(o.amount for o in pipeline_opps)
    weighted_pipeline = sum(o.amount * (o.probability / 100) for o in pipeline_opps)

    # Won this month
    first_day_of_month = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    won_opps = session.exec(
        select(Opportunity).where(
            Opportunity.tenant_id == tenant_id,
            Opportunity.stage == OpportunityStage.CLOSED_WON.value,
            Opportunity.actual_close_date >= first_day_of_month
        )
    ).all()

    won_value_this_month = sum(o.amount for o in won_opps)
    won_count_this_month = len(won_opps)

    # Quotes
    pending_quotes = session.exec(
        select(func.count()).where(
            Quote.tenant_id == tenant_id,
            Quote.status.in_([QuoteStatus.DRAFT.value, QuoteStatus.SENT.value])
        )
    ).one()

    # Activities
    today = datetime.now().strftime("%Y-%m-%d")
    overdue_activities = session.exec(
        select(func.count()).where(
            Activity.tenant_id == tenant_id,
            Activity.status.in_([ActivityStatus.PLANNED.value, ActivityStatus.IN_PROGRESS.value]),
            Activity.end_date < today
        )
    ).one()

    today_activities = session.exec(
        select(func.count()).where(
            Activity.tenant_id == tenant_id,
            Activity.status.in_([ActivityStatus.PLANNED.value, ActivityStatus.IN_PROGRESS.value]),
            Activity.start_date == today
        )
    ).one()

    return {
        "accounts": {
            "total": total_accounts,
            "active": active_accounts,
        },
        "contacts": {
            "total": total_contacts,
        },
        "leads": {
            "total": total_leads,
            "new": new_leads,
            "qualified": qualified_leads,
        },
        "opportunities": {
            "open": open_opportunities,
            "pipeline_value": pipeline_value,
            "weighted_pipeline": weighted_pipeline,
            "won_this_month": won_count_this_month,
            "won_value_this_month": won_value_this_month,
        },
        "quotes": {
            "pending": pending_quotes,
        },
        "activities": {
            "overdue": overdue_activities,
            "today": today_activities,
        },
    }


@router.get("/pipeline")
def get_pipeline_overview(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get sales pipeline overview"""
    tenant_id = str(current_user.tenant_id)

    stages = []
    for stage in OpportunityStage:
        opps = session.exec(
            select(Opportunity).where(
                Opportunity.tenant_id == tenant_id,
                Opportunity.stage == stage.value
            )
        ).all()

        total_value = sum(o.amount for o in opps)
        weighted_value = sum(o.amount * (o.probability / 100) for o in opps)

        stages.append({
            "stage": stage.value,
            "count": len(opps),
            "total_value": total_value,
            "weighted_value": weighted_value,
        })

    return {"stages": stages}


@router.get("/lead-conversion")
def get_lead_conversion_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    period_days: int = Query(30, ge=7, le=365),
):
    """Get lead conversion statistics"""
    tenant_id = str(current_user.tenant_id)
    start_date = (datetime.now() - timedelta(days=period_days)).strftime("%Y-%m-%d")

    # Get leads created in period
    leads = session.exec(
        select(Lead).where(
            Lead.tenant_id == tenant_id,
        )
    ).all()

    total_leads = len(leads)
    converted_leads = len([l for l in leads if l.status == LeadStatus.CONVERTED.value])
    lost_leads = len([l for l in leads if l.status == LeadStatus.LOST.value])
    open_leads = total_leads - converted_leads - lost_leads

    conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0

    # By source
    by_source = {}
    for lead in leads:
        source = lead.source or "UNKNOWN"
        if source not in by_source:
            by_source[source] = {"total": 0, "converted": 0}
        by_source[source]["total"] += 1
        if lead.status == LeadStatus.CONVERTED.value:
            by_source[source]["converted"] += 1

    source_stats = [
        {
            "source": source,
            "total": data["total"],
            "converted": data["converted"],
            "rate": (data["converted"] / data["total"] * 100) if data["total"] > 0 else 0,
        }
        for source, data in by_source.items()
    ]

    return {
        "total_leads": total_leads,
        "converted": converted_leads,
        "lost": lost_leads,
        "open": open_leads,
        "conversion_rate": round(conversion_rate, 2),
        "by_source": source_stats,
    }


@router.get("/win-rate")
def get_opportunity_win_rate(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    period_days: int = Query(90, ge=30, le=365),
):
    """Get opportunity win rate statistics"""
    tenant_id = str(current_user.tenant_id)
    start_date = (datetime.now() - timedelta(days=period_days)).strftime("%Y-%m-%d")

    # Get closed opportunities
    closed_opps = session.exec(
        select(Opportunity).where(
            Opportunity.tenant_id == tenant_id,
            Opportunity.stage.in_([OpportunityStage.CLOSED_WON.value, OpportunityStage.CLOSED_LOST.value]),
            Opportunity.actual_close_date >= start_date
        )
    ).all()

    won = [o for o in closed_opps if o.stage == OpportunityStage.CLOSED_WON.value]
    lost = [o for o in closed_opps if o.stage == OpportunityStage.CLOSED_LOST.value]

    total_closed = len(closed_opps)
    win_count = len(won)
    win_rate = (win_count / total_closed * 100) if total_closed > 0 else 0

    won_value = sum(o.amount for o in won)
    lost_value = sum(o.amount for o in lost)
    avg_deal_size = won_value / win_count if win_count > 0 else 0

    return {
        "total_closed": total_closed,
        "won": win_count,
        "lost": len(lost),
        "win_rate": round(win_rate, 2),
        "won_value": won_value,
        "lost_value": lost_value,
        "average_deal_size": avg_deal_size,
    }


@router.get("/activity-summary")
def get_activity_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    period_days: int = Query(30, ge=7, le=90),
):
    """Get activity summary"""
    tenant_id = str(current_user.tenant_id)
    start_date = (datetime.now() - timedelta(days=period_days)).strftime("%Y-%m-%d")

    activities = session.exec(
        select(Activity).where(
            Activity.tenant_id == tenant_id,
        )
    ).all()

    # By type
    by_type = {}
    for act in activities:
        act_type = act.activity_type
        if act_type not in by_type:
            by_type[act_type] = {"total": 0, "completed": 0}
        by_type[act_type]["total"] += 1
        if act.status == ActivityStatus.COMPLETED.value:
            by_type[act_type]["completed"] += 1

    type_stats = [
        {
            "type": t,
            "total": data["total"],
            "completed": data["completed"],
            "completion_rate": round((data["completed"] / data["total"] * 100) if data["total"] > 0 else 0, 2),
        }
        for t, data in by_type.items()
    ]

    # Overall stats
    total = len(activities)
    completed = len([a for a in activities if a.status == ActivityStatus.COMPLETED.value])
    pending = len([a for a in activities if a.status in [ActivityStatus.PLANNED.value, ActivityStatus.IN_PROGRESS.value]])

    return {
        "total": total,
        "completed": completed,
        "pending": pending,
        "completion_rate": round((completed / total * 100) if total > 0 else 0, 2),
        "by_type": type_stats,
    }


@router.get("/top-accounts")
def get_top_accounts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    limit: int = Query(10, ge=5, le=50),
):
    """Get top accounts by opportunity value"""
    tenant_id = str(current_user.tenant_id)

    # Get won opportunities
    won_opps = session.exec(
        select(Opportunity).where(
            Opportunity.tenant_id == tenant_id,
            Opportunity.stage == OpportunityStage.CLOSED_WON.value
        )
    ).all()

    # Aggregate by account
    account_values = {}
    for opp in won_opps:
        if opp.account_id not in account_values:
            account_values[opp.account_id] = 0
        account_values[opp.account_id] += opp.amount

    # Sort and get top
    sorted_accounts = sorted(account_values.items(), key=lambda x: x[1], reverse=True)[:limit]

    result = []
    for account_id, total_value in sorted_accounts:
        account = session.get(Account, account_id)
        if account:
            result.append({
                "id": account.id,
                "code": account.code,
                "name": account.name,
                "total_value": total_value,
            })

    return {"items": result}


@router.get("/recent-activities")
def get_recent_activities(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    limit: int = Query(10, ge=5, le=50),
):
    """Get recent activities"""
    tenant_id = str(current_user.tenant_id)

    activities = session.exec(
        select(Activity).where(
            Activity.tenant_id == tenant_id
        ).order_by(Activity.created_at.desc()).limit(limit)
    ).all()

    items = []
    for act in activities:
        account = session.get(Account, act.account_id) if act.account_id else None

        items.append({
            "id": act.id,
            "activity_type": act.activity_type,
            "subject": act.subject,
            "status": act.status,
            "account": {
                "id": account.id,
                "name": account.name,
            } if account else None,
            "created_at": str(act.created_at) if act.created_at else None,
        })

    return {"items": items}
