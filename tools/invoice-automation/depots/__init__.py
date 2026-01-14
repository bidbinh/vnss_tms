"""
Depot automation implementations
"""
from .base import BaseDepotAutomation
from .greating_fortune import GreatingFortuneAutomation

# Registry of depot automations
DEPOT_AUTOMATIONS = {
    "GFORTUNE": GreatingFortuneAutomation,
}

__all__ = [
    "BaseDepotAutomation",
    "GreatingFortuneAutomation",
    "DEPOT_AUTOMATIONS",
]
