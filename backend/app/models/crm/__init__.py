"""
CRM Models
Customer Relationship Management module
"""
from app.models.crm.account import (
    Account,
    AccountType,
    AccountStatus,
    AccountIndustry,
    CustomerGroup,
)
from app.models.crm.contact import Contact, ContactStatus
from app.models.crm.lead import Lead, LeadStatus, LeadSource
from app.models.crm.opportunity import Opportunity, OpportunityStage
from app.models.crm.quote import Quote, QuoteItem, QuoteStatus
from app.models.crm.activity import Activity, ActivityType, ActivityStatus
from app.models.crm.contract import Contract, ContractStatus, ContractType
from app.models.crm.sales_order import SalesOrder, SalesOrderItem, SalesOrderStatus, SalesOrderPaymentStatus
from app.models.crm.activity_log import ActivityLog, ActivityLogAction, ActivityLogEntityType
from app.models.crm.chat import (
    # Enums
    ChannelType,
    ChannelStatus,
    ConversationStatus,
    MessageDirection,
    MessageType,
    MessageStatus,
    InsightType,
    # Models
    ChatChannel,
    Conversation,
    Message,
    CustomerInsight,
    QuickReply,
    ChatTemplate,
    AutoReplyRule,
)

__all__ = [
    # Account
    "Account",
    "AccountType",
    "AccountStatus",
    "AccountIndustry",
    "CustomerGroup",
    # Contact
    "Contact",
    "ContactStatus",
    # Lead
    "Lead",
    "LeadStatus",
    "LeadSource",
    # Opportunity
    "Opportunity",
    "OpportunityStage",
    # Quote
    "Quote",
    "QuoteItem",
    "QuoteStatus",
    # Activity
    "Activity",
    "ActivityType",
    "ActivityStatus",
    # Contract
    "Contract",
    "ContractStatus",
    "ContractType",
    # Sales Order
    "SalesOrder",
    "SalesOrderItem",
    "SalesOrderStatus",
    "SalesOrderPaymentStatus",
    # Activity Log
    "ActivityLog",
    "ActivityLogAction",
    "ActivityLogEntityType",
    # Chat - Enums
    "ChannelType",
    "ChannelStatus",
    "ConversationStatus",
    "MessageDirection",
    "MessageType",
    "MessageStatus",
    "InsightType",
    # Chat - Models
    "ChatChannel",
    "Conversation",
    "Message",
    "CustomerInsight",
    "QuickReply",
    "ChatTemplate",
    "AutoReplyRule",
]
