"""
Greating Fortune Container - Invoice Automation
Website: http://gfortune.sangtaoketnoi.vn/

This is a Flutter Web app using CanvasKit renderer.
Traditional CSS selectors don't work - must use coordinate-based clicking.
"""
from .base import BaseDepotAutomation
from playwright.async_api import Page
import asyncio


# Coordinates for 1280x720 viewport
# These coordinates are specific to the Flutter Web app layout
COORDS = {
    # Landing page
    "continue_login_btn": (640, 463),  # "TIEP TUC DANG NHAP" button

    # Login page
    "email_field": (640, 406),
    "password_field": (640, 473),
    "login_btn": (640, 534),

    # Dashboard (after login, need to scroll)
    "invoice_mgmt_option": (640, 456),  # "Quan ly hoa don" after scrolling

    # Invoice list page
    "fab_add_btn": (1235, 675),  # "+" FAB button at bottom right

    # Invoice creation form - Step 1 (company info)
    "mst_field": (700, 146),         # Ma so thue (Tax code) field
    "mst_search_btn": (1205, 146),   # Search button next to MST
    "receipt_input_btn": (640, 456), # "Nhap so phieu thu" button

    # Invoice creation form - Step 2 (receipt dialog)
    "receipt_number_field": (640, 37),   # So phieu thu input
    "container_code_field": (640, 97),   # So container input
    "add_btn": (640, 218),               # "Them" button (blue)
    "cancel_btn": (640, 278),            # "Ngung" button (red)

    # After adding receipt - confirmation
    "create_invoice_btn": (640, 500),    # "Tao hoa don" button (need to verify)
    "confirm_ok_btn": (640, 400),        # OK confirmation button
}


class GreatingFortuneAutomation(BaseDepotAutomation):
    """
    Automation for Greating Fortune Container depot (Flutter Web app)

    Flow:
    1. Click "TIEP TUC DANG NHAP" on landing page
    2. Login with email/password
    3. Scroll and click "Quan ly hoa don Greating Fortune"
    4. Click "+" FAB button to create new invoice
    5. Enter MST (tax code) and click search - company info auto-fills
    6. Click "Nhap so phieu thu" button
    7. Enter receipt number (NH...)
    8. Enter container code
    9. Click "Them" button to add
    10. Click "Tao hoa don" then "OK"
    11. Invoice will be sent to email
    """

    async def _wait_for_flutter(self, seconds: float = 2):
        """Wait for Flutter to render"""
        await asyncio.sleep(seconds)

    async def _click(self, x: int, y: int, wait_after: float = 1):
        """Click at coordinates and wait"""
        await self.page.mouse.click(x, y)
        await self._wait_for_flutter(wait_after)

    async def _type_text(self, text: str, delay: int = 50):
        """Type text with delay between characters"""
        await self.page.keyboard.type(text, delay=delay)
        await self._wait_for_flutter(0.5)

    async def _take_screenshot(self, name: str):
        """Take a screenshot for debugging"""
        try:
            await self.page.screenshot(path=f"gfortune_{name}.png")
        except:
            pass

    async def login(self) -> bool:
        """Login to Greating Fortune website"""
        try:
            print("[GFORTUNE] Navigating to website...")
            await self.page.goto(self.config["url"], timeout=60000)
            await self._wait_for_flutter(5)  # Wait for Flutter to load
            await self.page.wait_for_load_state("networkidle", timeout=30000)
            await self._wait_for_flutter(2)

            # Click "TIEP TUC DANG NHAP" on landing page
            print("[GFORTUNE] Clicking continue to login...")
            await self._click(*COORDS["continue_login_btn"], wait_after=3)

            # Fill login form
            print("[GFORTUNE] Entering email...")
            await self._click(*COORDS["email_field"], wait_after=0.5)
            await self._type_text(self.config["username"])

            print("[GFORTUNE] Entering password...")
            await self._click(*COORDS["password_field"], wait_after=0.5)
            await self._type_text(self.config["password"])

            # Click login button
            print("[GFORTUNE] Clicking login button...")
            await self._click(*COORDS["login_btn"], wait_after=5)

            await self._take_screenshot("login_result")
            print("[GFORTUNE] Login completed")

            return True

        except Exception as e:
            print(f"[GFORTUNE] Login error: {e}")
            await self._take_screenshot("login_error")
            return False

    async def navigate_to_invoice_creation(self) -> bool:
        """Navigate to invoice creation page"""
        try:
            # Scroll down to see "Quan ly hoa don" option
            print("[GFORTUNE] Scrolling to find invoice management...")
            await self.page.mouse.wheel(0, 300)
            await self._wait_for_flutter(2)

            # Click on "Quan ly hoa don Greating Fortune"
            print("[GFORTUNE] Clicking invoice management option...")
            await self._click(*COORDS["invoice_mgmt_option"], wait_after=3)
            await self._take_screenshot("invoice_list")

            # Click "+" FAB button to create new
            print("[GFORTUNE] Clicking add button...")
            await self._click(*COORDS["fab_add_btn"], wait_after=3)
            await self._take_screenshot("invoice_form")

            print("[GFORTUNE] Invoice form page loaded")
            return True

        except Exception as e:
            print(f"[GFORTUNE] Navigation error: {e}")
            await self._take_screenshot("nav_error")
            return False

    async def fill_invoice_form(
        self,
        receipt_number: str,
        container_code: str,
        tax_code: str
    ) -> bool:
        """Fill in the invoice creation form"""
        try:
            # Step 1: Enter MST (tax code) and search
            print(f"[GFORTUNE] Entering tax code: {tax_code}")
            await self._click(*COORDS["mst_field"], wait_after=0.5)
            await self._type_text(tax_code)

            print("[GFORTUNE] Clicking search to lookup company info...")
            await self._click(*COORDS["mst_search_btn"], wait_after=3)
            await self._take_screenshot("after_mst_search")

            # Step 2: Click "Nhap so phieu thu" button to open receipt dialog
            print("[GFORTUNE] Clicking receipt input button...")
            await self._click(*COORDS["receipt_input_btn"], wait_after=2)
            await self._take_screenshot("receipt_dialog")

            # Step 3: Enter receipt number
            print(f"[GFORTUNE] Entering receipt number: {receipt_number}")
            await self._click(*COORDS["receipt_number_field"], wait_after=0.5)
            await self._type_text(receipt_number)

            # Step 4: Enter container code
            print(f"[GFORTUNE] Entering container code: {container_code}")
            await self._click(*COORDS["container_code_field"], wait_after=0.5)
            await self._type_text(container_code)

            # Step 5: Click "Them" (Add) button
            print("[GFORTUNE] Clicking add button...")
            await self._click(*COORDS["add_btn"], wait_after=3)
            await self._take_screenshot("after_add")

            print("[GFORTUNE] Form filled successfully")
            return True

        except Exception as e:
            print(f"[GFORTUNE] Form fill error: {e}")
            await self._take_screenshot("form_error")
            return False

    async def submit_invoice(self) -> bool:
        """Submit the invoice request"""
        try:
            # Click "Tao hoa don" button
            print("[GFORTUNE] Clicking create invoice button...")
            await self._click(*COORDS["create_invoice_btn"], wait_after=2)
            await self._take_screenshot("after_create_click")

            # Click "OK" on confirmation dialog
            print("[GFORTUNE] Clicking OK to confirm...")
            await self._click(*COORDS["confirm_ok_btn"], wait_after=3)
            await self._take_screenshot("submit_result")

            print("[GFORTUNE] Invoice submitted successfully")
            return True

        except Exception as e:
            print(f"[GFORTUNE] Submit error: {e}")
            await self._take_screenshot("submit_error")
            return False


# For testing/debugging - run with visible browser
async def debug_greating_fortune():
    """Debug function to run with visible browser"""
    from playwright.async_api import async_playwright

    config = {
        "code": "GFORTUNE",
        "url": "http://gfortune.sangtaoketnoi.vn/",
        "username": "ceo@tinhungplastic.com",
        "password": "!Tnt01087",
        "tax_code": "0308113486"
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # Visible browser
        page = await browser.new_page()

        automation = GreatingFortuneAutomation(page, config)

        # Test login
        print("Testing login...")
        success = await automation.login()
        print(f"Login: {'Success' if success else 'Failed'}")

        if success:
            print("\nTesting navigation...")
            nav_success = await automation.navigate_to_invoice_creation()
            print(f"Navigation: {'Success' if nav_success else 'Failed'}")

            if nav_success:
                print("\nTesting form fill (with test data)...")
                form_success = await automation.fill_invoice_form(
                    receipt_number="NH5932291",
                    container_code="JXLU6143159",
                    tax_code=config["tax_code"]
                )
                print(f"Form fill: {'Success' if form_success else 'Failed'}")

        # Keep browser open for inspection
        input("\nPress Enter to close browser...")

        await browser.close()


if __name__ == "__main__":
    import asyncio
    asyncio.run(debug_greating_fortune())
