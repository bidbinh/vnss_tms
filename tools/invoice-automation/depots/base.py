"""
Base class for depot invoice automation
"""
from abc import ABC, abstractmethod
from playwright.async_api import Page, Browser
from typing import Optional
import asyncio

class BaseDepotAutomation(ABC):
    """Abstract base class for depot automation"""

    def __init__(self, page: Page, config: dict):
        self.page = page
        self.config = config
        self.logged_in = False

    @abstractmethod
    async def login(self) -> bool:
        """Login to the depot website"""
        pass

    @abstractmethod
    async def navigate_to_invoice_creation(self) -> bool:
        """Navigate to the invoice creation page"""
        pass

    @abstractmethod
    async def fill_invoice_form(
        self,
        receipt_number: str,
        container_code: str,
        tax_code: str
    ) -> bool:
        """Fill in the invoice creation form"""
        pass

    @abstractmethod
    async def submit_invoice(self) -> bool:
        """Submit the invoice request"""
        pass

    async def create_invoice(
        self,
        receipt_number: str,
        container_code: str,
        tax_code: str
    ) -> dict:
        """Full workflow to create an invoice"""
        result = {
            "success": False,
            "message": "",
            "receipt_number": receipt_number,
            "container_code": container_code
        }

        try:
            # Step 1: Login
            if not self.logged_in:
                print(f"[{self.config['code']}] Logging in...")
                if not await self.login():
                    result["message"] = "Login failed"
                    return result
                self.logged_in = True

            # Step 2: Navigate to invoice creation
            print(f"[{self.config['code']}] Navigating to invoice creation...")
            if not await self.navigate_to_invoice_creation():
                result["message"] = "Failed to navigate to invoice creation"
                return result

            # Step 3: Fill form
            print(f"[{self.config['code']}] Filling invoice form...")
            if not await self.fill_invoice_form(receipt_number, container_code, tax_code):
                result["message"] = "Failed to fill invoice form"
                return result

            # Step 4: Submit
            print(f"[{self.config['code']}] Submitting invoice...")
            if not await self.submit_invoice():
                result["message"] = "Failed to submit invoice"
                return result

            result["success"] = True
            result["message"] = "Invoice created successfully. Check email for PDF."

        except Exception as e:
            result["message"] = f"Error: {str(e)}"

        return result
