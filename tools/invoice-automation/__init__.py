"""
Invoice Automation Tool
Automates VAT invoice retrieval from various depot websites
"""
from .config import DepotConfig, InvoiceRequest, DEPOT_CONFIGS
from .depots import DEPOT_AUTOMATIONS, BaseDepotAutomation

__all__ = [
    "DepotConfig",
    "InvoiceRequest",
    "DEPOT_CONFIGS",
    "DEPOT_AUTOMATIONS",
    "BaseDepotAutomation",
]
