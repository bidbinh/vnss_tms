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
