"""
Service for parsing customer order text into structured order data.

Supports formats like:
- "02x20 CARGO_NOTE; PICKUP - DELIVERY"
- "01x40 LLDPE-VN L1210F; 27T/cont; pallet; CHÙA VẼ - LIVABIN (note...)"
"""
import re
from typing import List, Dict, Any


def parse_order_line(line: str) -> List[Dict[str, Any]]:
    """
    Parse a single order line into one or more order dictionaries.

    Format: "{qty}x{size} CARGO_NOTE; PICKUP - DELIVERY"

    Returns a list because qty>1 will create multiple orders.
    """
    line = line.strip()
    if not line:
        return []

    # Extract quantity and equipment size (e.g., "02x20" or "1x40")
    qty_match = re.match(r'^(\d+)x(\d+)', line)
    if not qty_match:
        # No qty prefix, try to find " - " separator anyway
        qty = 1
        equipment = None
        rest = line
    else:
        qty = int(qty_match.group(1))
        equipment = qty_match.group(2)  # "20", "40", "45"
        rest = line[qty_match.end():].strip()

    # Find the " - " separator between pickup and delivery
    # This is tricky because there might be multiple " - " in the text
    # We assume the LAST " - " is the pickup/delivery separator
    separator_idx = rest.rfind(" - ")

    if separator_idx == -1:
        # No separator found, treat entire rest as cargo note
        cargo_note = rest
        pickup_text = None
        delivery_text = None
    else:
        # Split by the LAST " - "
        cargo_note = rest[:separator_idx].strip()
        location_part = rest[separator_idx + 3:].strip()  # +3 to skip " - "

        # Now split location_part to get pickup and delivery
        # Look for first " - " in location_part (this should be pickup-delivery separator)
        loc_sep = location_part.find(" - ")
        if loc_sep == -1:
            # No second separator, treat all as pickup
            pickup_text = location_part
            delivery_text = None
        else:
            pickup_text = location_part[:loc_sep].strip()
            delivery_text = location_part[loc_sep + 3:].strip()

    # Extract empty return note from cargo_note if exists (format: "(...)")
    empty_return_note = None
    if cargo_note:
        paren_match = re.search(r'\(([^)]+)\)', cargo_note)
        if paren_match:
            empty_return_note = paren_match.group(1)
            # Keep the parentheses in cargo_note for now

    # Create qty number of orders
    orders = []
    for _ in range(qty):
        order_data = {
            "equipment": equipment,
            "qty": 1,  # Each order is for 1 unit
            "cargo_note": cargo_note or None,
            "pickup_text": pickup_text or None,
            "delivery_text": delivery_text or None,
            "empty_return_note": empty_return_note,
        }
        orders.append(order_data)

    return orders


def parse_order_text(text: str) -> List[Dict[str, Any]]:
    """
    Parse multi-line order text into a list of order dictionaries.

    Each line can create 1 or more orders depending on quantity.
    """
    lines = text.strip().split('\n')
    all_orders = []

    for line in lines:
        orders = parse_order_line(line)
        all_orders.extend(orders)

    return all_orders
