"""
Configuration for Invoice Automation Tool
"""
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class DepotConfig(BaseModel):
    """Base configuration for a depot"""
    name: str
    code: str
    url: str
    username: str
    password: str
    tax_code: str  # MST của công ty mình

class GreatingFortuneConfig(DepotConfig):
    """Greating Fortune Container specific config"""
    name: str = "Greating Fortune Container"
    code: str = "GFORTUNE"
    url: str = "http://gfortune.sangtaoketnoi.vn/"
    username: str = os.getenv("GFORTUNE_USERNAME", "")
    password: str = os.getenv("GFORTUNE_PASSWORD", "")
    tax_code: str = "0308113486"  # MST ADG

class InvoiceRequest(BaseModel):
    """Request to create an invoice"""
    depot_code: str
    receipt_number: str  # Số phiếu thu: NH20251229-01074
    container_code: str  # Số container: JXLU6143159
    bill_number: Optional[str] = None  # Bill: ZIMU TAI9679209
    amount: Optional[float] = None  # Số tiền: 1,620,000

# Depot registry
DEPOT_CONFIGS = {
    "GFORTUNE": GreatingFortuneConfig,
}
