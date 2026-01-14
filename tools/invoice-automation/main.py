"""
Invoice Automation CLI
Usage: python main.py --depot GFORTUNE --receipt NH5932291 --container JXLU6143159
"""
import argparse
import asyncio
from playwright.async_api import async_playwright

from config import DEPOT_CONFIGS, InvoiceRequest
from depots import DEPOT_AUTOMATIONS


async def create_invoice(
    depot_code: str,
    receipt_number: str,
    container_code: str,
    headless: bool = True
) -> dict:
    """Create an invoice for the given depot"""

    # Get depot config
    if depot_code not in DEPOT_CONFIGS:
        return {"success": False, "message": f"Unknown depot: {depot_code}"}

    config_class = DEPOT_CONFIGS[depot_code]
    config = config_class()

    # Get automation class
    if depot_code not in DEPOT_AUTOMATIONS:
        return {"success": False, "message": f"No automation for depot: {depot_code}"}

    automation_class = DEPOT_AUTOMATIONS[depot_code]

    # Run automation
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        page = await browser.new_page()

        try:
            automation = automation_class(page, config.model_dump())
            result = await automation.create_invoice(
                receipt_number=receipt_number,
                container_code=container_code,
                tax_code=config.tax_code
            )
        finally:
            await browser.close()

    return result


async def debug_mode(depot_code: str):
    """Run in debug mode with visible browser"""

    if depot_code not in DEPOT_CONFIGS:
        print(f"Unknown depot: {depot_code}")
        return

    config_class = DEPOT_CONFIGS[depot_code]
    config = config_class()

    if depot_code not in DEPOT_AUTOMATIONS:
        print(f"No automation for depot: {depot_code}")
        return

    automation_class = DEPOT_AUTOMATIONS[depot_code]

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        automation = automation_class(page, config.model_dump())

        print(f"[{depot_code}] Testing login...")
        success = await automation.login()
        print(f"Login: {'Success' if success else 'Failed'}")

        if success:
            print(f"[{depot_code}] Testing navigation...")
            nav_success = await automation.navigate_to_invoice_creation()
            print(f"Navigation: {'Success' if nav_success else 'Failed'}")

        # Keep browser open for inspection
        input("\nPress Enter to close browser...")

        await browser.close()


def main():
    parser = argparse.ArgumentParser(description="Invoice Automation Tool")
    parser.add_argument("--depot", "-d", required=True, help="Depot code (e.g., GFORTUNE)")
    parser.add_argument("--receipt", "-r", help="Receipt number (e.g., NH5932291)")
    parser.add_argument("--container", "-c", help="Container code (e.g., JXLU6143159)")
    parser.add_argument("--debug", action="store_true", help="Run in debug mode with visible browser")
    parser.add_argument("--headless", action="store_true", default=True, help="Run headless (default)")

    args = parser.parse_args()

    if args.debug:
        asyncio.run(debug_mode(args.depot))
    else:
        if not args.receipt or not args.container:
            parser.error("--receipt and --container are required for invoice creation")

        result = asyncio.run(create_invoice(
            depot_code=args.depot,
            receipt_number=args.receipt,
            container_code=args.container,
            headless=args.headless
        ))

        print(f"\nResult: {result}")


if __name__ == "__main__":
    main()
