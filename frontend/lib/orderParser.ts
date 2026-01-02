/**
 * Parse order text format:
 * "02x20 HIPS-KR 476L GR21; 19T/cont; xá; GREEN PORT - LIVABIN"
 * 
 * Returns array of parsed orders with:
 * - containerCount: number of containers
 * - containerSize: size (20 or 40)
 * - goodsInfo: goods description
 * - pickupLocation: pickup location name
 * - deliveryLocation: delivery location name
 */

export interface ParsedOrder {
  containerCount: number;
  containerSize: string;
  goodsInfo: string;
  pickupLocation: string;
  deliveryLocation: string;
}

export function parseOrderText(text: string): ParsedOrder[] {
  if (!text.trim()) return [];

  // Split by newline or semicolon to handle multiple orders
  const lines = text
    .split(/\n|;(?=\s*\d+x)/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  return lines.map(line => parseOrderLine(line)).filter(order => order !== null) as ParsedOrder[];
}

function parseOrderLine(line: string): ParsedOrder | null {
  try {
    // Pattern: "02x20 GOODS_INFO... PICKUP - DELIVERY"
    // Find container pattern: XxYY (e.g., 01x20, 02x40)
    const containerMatch = line.match(/(\d+)x(\d+)/);
    if (!containerMatch) return null;

    const containerCount = parseInt(containerMatch[1], 10);
    const containerSize = containerMatch[2];

    // Find location separator "-"
    const locationMatch = line.match(/(.+?)\s+-\s+(.+?)$/);
    if (!locationMatch) return null;

    const beforeLocation = locationMatch[1];
    const deliveryLocation = locationMatch[2].trim();

    // Extract goods info and pickup from beforeLocation
    // Format: "02x20 HIPS-KR 476L GR21; 19T/cont; xá; GREEN PORT"
    // Remove container pattern and extract goods + pickup
    const afterContainer = beforeLocation.replace(/^\d+x\d+\s+/, '').trim();

    // Last part before "-" is pickup location
    // Everything else is goods info
    const parts = afterContainer.split(/\s+(?=[A-Z][A-Z\s]*$)/);
    
    let goodsInfo = '';
    let pickupLocation = '';

    if (parts.length >= 2) {
      // Last part is likely pickup location
      pickupLocation = parts[parts.length - 1];
      goodsInfo = parts.slice(0, -1).join(' ');
    } else {
      goodsInfo = afterContainer;
      pickupLocation = 'Unknown';
    }

    // Clean up goods info - remove trailing dashes/semicolons
    goodsInfo = goodsInfo.replace(/[;\s-]+$/, '').trim();

    return {
      containerCount,
      containerSize,
      goodsInfo,
      pickupLocation,
      deliveryLocation,
    };
  } catch (error) {
    console.error('Failed to parse order line:', line, error);
    return null;
  }
}

/**
 * Find location ID from location name
 * This is a placeholder - should be replaced with actual API call
 */
export async function findLocationByName(
  locationName: string,
  locations: Array<{ id: string; name: string }>
): Promise<string | null> {
  const normalized = locationName.toLowerCase().trim();
  const found = locations.find(loc => 
    loc.name.toLowerCase().includes(normalized) || 
    normalized.includes(loc.name.toLowerCase())
  );
  return found?.id || null;
}
