/**
 * Format số tiền VNĐ với dấu phẩy ngăn cách hàng nghìn
 * @param value - Giá trị số hoặc string
 * @param showCurrency - Có hiển thị "đ" hay không (default: true)
 * @returns Chuỗi đã format, ví dụ: "1,234,567 đ" hoặc "1,234,567"
 */
export function formatCurrency(value: number | string | null | undefined, showCurrency: boolean = true): string {
  if (value === null || value === undefined || value === "") {
    return showCurrency ? "0 đ" : "0";
  }

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) {
    return showCurrency ? "0 đ" : "0";
  }

  const formatted = num.toLocaleString("vi-VN");
  return showCurrency ? `${formatted} đ` : formatted;
}

/**
 * Format số với dấu phẩy ngăn cách hàng nghìn
 * @param value - Giá trị số hoặc string
 * @returns Chuỗi đã format, ví dụ: "1,234,567"
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "0";
  }

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) {
    return "0";
  }

  return num.toLocaleString("vi-VN");
}

/**
 * Parse số từ chuỗi có format (bỏ dấu phẩy, đ, khoảng trắng)
 * @param value - Chuỗi số có format
 * @returns Số nguyên
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;
  // Remove currency symbol, commas, dots (as thousand separator), and spaces
  const cleaned = value.replace(/[đ\s,\.]/g, "").trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Format ngày tháng theo định dạng Việt Nam (dd/mm/yyyy)
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN");
  } catch {
    return "-";
  }
}

/**
 * Format ngày giờ theo định dạng Việt Nam
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString("vi-VN");
  } catch {
    return "-";
  }
}

/**
 * Bảng màu cố định cho tài xế - 10 màu khác nhau
 * Mỗi tài xế sẽ có 1 màu cố định dựa trên ID
 */
export const DRIVER_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-800", bgHex: "#dbeafe" },
  { bg: "bg-green-100", text: "text-green-800", bgHex: "#dcfce7" },
  { bg: "bg-yellow-100", text: "text-yellow-800", bgHex: "#fef9c3" },
  { bg: "bg-purple-100", text: "text-purple-800", bgHex: "#f3e8ff" },
  { bg: "bg-pink-100", text: "text-pink-800", bgHex: "#fce7f3" },
  { bg: "bg-indigo-100", text: "text-indigo-800", bgHex: "#e0e7ff" },
  { bg: "bg-red-100", text: "text-red-800", bgHex: "#fee2e2" },
  { bg: "bg-orange-100", text: "text-orange-800", bgHex: "#ffedd5" },
  { bg: "bg-teal-100", text: "text-teal-800", bgHex: "#ccfbf1" },
  { bg: "bg-cyan-100", text: "text-cyan-800", bgHex: "#cffafe" },
];

/**
 * Lấy màu cố định cho tài xế dựa trên ID
 * Cùng 1 driver ID sẽ luôn trả về cùng 1 màu
 * @param driverId - ID của tài xế (number hoặc string)
 * @returns Object chứa bg class, text class và bgHex
 */
export function getDriverColor(driverId: number | string | null | undefined): typeof DRIVER_COLORS[0] {
  if (!driverId) return DRIVER_COLORS[0];

  // Convert to string for hashing
  const idStr = String(driverId);

  // Simple hash function - consistent for same ID
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    const char = idStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % DRIVER_COLORS.length;
  return DRIVER_COLORS[index];
}
