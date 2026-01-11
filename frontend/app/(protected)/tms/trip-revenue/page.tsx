"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

interface Customer {
  id: string;
  code: string;
  name: string;
}

interface OrderRevenueItem {
  id: string;
  order_code: string;
  order_date: string | null;
  customer_id: string;
  customer_name: string | null;
  customer_code: string | null;
  pickup_site_name: string | null;
  delivery_site_name: string | null;
  pickup_location_name: string | null;
  delivery_location_name: string | null;
  equipment: string | null;
  container_code: string | null;
  status: string;
  driver_name: string | null;
  driver_short_name: string | null;
  freight_charge: number | null;
  suggested_freight: number | null;
  rate_matched: boolean;
  distance_km: number | null;
  toll_stations: number | null;
}

interface RevenueSummary {
  total_orders: number;
  orders_with_freight: number;
  orders_without_freight: number;
  total_revenue: number;
  potential_revenue: number;
  coverage_percent: number;
}

interface PaginatedResponse {
  items: OrderRevenueItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// STATUS_LABELS will be defined inside component using t() calls

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-gray-100 text-gray-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_TRANSIT: "bg-yellow-100 text-yellow-700",
  DELIVERED: "bg-green-100 text-green-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  EMPTY_RETURN: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
};

type SortField = "order_code" | "order_date" | "customer_code" | "status" | "freight_charge" | "suggested_freight" | "distance_km";
type SortDirection = "asc" | "desc";

export default function TripRevenuePage() {
  const t = useTranslations("tms.tripRevenuePage");
  const tCommon = useTranslations("common");

  const STATUS_LABELS: Record<string, string> = {
    NEW: t("statusLabels.new"),
    ASSIGNED: t("statusLabels.assigned"),
    IN_TRANSIT: t("statusLabels.inTransit"),
    DELIVERED: t("statusLabels.delivered"),
    COMPLETED: t("statusLabels.completed"),
    EMPTY_RETURN: t("statusLabels.emptyReturn"),
    CANCELLED: t("statusLabels.cancelled"),
    REJECTED: t("statusLabels.rejected"),
  };

  const [orders, setOrders] = useState<OrderRevenueItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [customerId, setCustomerId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [hasFreight, setHasFreight] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Edit modal
  const [editingOrder, setEditingOrder] = useState<OrderRevenueItem | null>(null);
  const [editFreight, setEditFreight] = useState<string>("");

  // Processing state
  const [processing, setProcessing] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("order_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchSummary();
  }, [page, pageSize, customerId, status, hasFreight, startDate, endDate]);

  async function fetchCustomers() {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  }

  async function fetchOrders() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());
      if (customerId) params.set("customer_id", customerId);
      if (status) params.set("status", status);
      if (hasFreight) params.set("has_freight", hasFreight);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await fetch(`${API_BASE_URL}/trip-revenue/list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) {
        throw new Error(t("errors.loadOrdersFailed"));
      }
      const data: PaginatedResponse = await res.json();
      setOrders(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (err: any) {
      setError(err.message || t("errors.genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary() {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await fetch(`${API_BASE_URL}/trip-revenue/summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
    }
  }

  function formatCurrency(amount: number | null): string {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("vi-VN").format(Math.round(amount));
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      const newSelected = new Set<string>();
      orders.forEach(o => {
        if (!o.freight_charge && o.rate_matched) {
          newSelected.add(o.id);
        }
      });
      setSelectedIds(newSelected);
      setSelectAll(true);
    }
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function getSortedOrders() {
    // Filter by search term first
    let filtered = orders;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = orders.filter(o =>
        o.order_code?.toLowerCase().includes(term) ||
        o.container_code?.toLowerCase().includes(term) ||
        o.driver_name?.toLowerCase().includes(term) ||
        o.driver_short_name?.toLowerCase().includes(term) ||
        o.pickup_site_name?.toLowerCase().includes(term) ||
        o.delivery_site_name?.toLowerCase().includes(term)
      );
    }

    // Then sort
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";

      // Convert to lowercase only if both are strings
      if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-300">↕</span>;
    }
    return <span className="ml-1 text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>;
  }

  async function applyFreight(orderId: string) {
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trip-revenue/apply-suggested/${orderId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) {
        throw new Error(t("errors.applyFreightFailed"));
      }
      setSuccessMsg(t("messages.freightApplied"));
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchOrders();
      fetchSummary();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  async function bulkApply() {
    if (selectedIds.size === 0) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trip-revenue/bulk-apply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order_ids: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        throw new Error(t("errors.bulkApplyFailed"));
      }
      const result = await res.json();
      setSuccessMsg(t("messages.bulkFreightApplied", { count: result.updated }));
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchOrders();
      fetchSummary();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  async function saveEditFreight() {
    if (!editingOrder) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trip-revenue/${editingOrder.id}/freight`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ freight_charge: parseInt(editFreight) || 0 }),
      });
      if (!res.ok) {
        throw new Error(t("errors.updateFreightFailed"));
      }
      setSuccessMsg(t("messages.freightUpdated"));
      setTimeout(() => setSuccessMsg(null), 3000);
      setEditingOrder(null);
      fetchOrders();
      fetchSummary();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  async function recalculateAll() {
    if (!confirm(t("confirmations.recalculateAll"))) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trip-revenue/recalculate-all?overwrite=false`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) {
        throw new Error(t("errors.recalculateFailed"));
      }
      const result = await res.json();
      setSuccessMsg(t("messages.recalculateComplete", { updated: result.updated, skipped: result.skipped }));
      setTimeout(() => setSuccessMsg(null), 5000);
      fetchOrders();
      fetchSummary();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  const sortedOrders = getSortedOrders();

  // Fetch all orders for export (fetch multiple pages)
  async function fetchAllOrdersForExport(): Promise<OrderRevenueItem[]> {
    const allItems: OrderRevenueItem[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("page_size", "200"); // Max allowed by API
      if (customerId) params.set("customer_id", customerId);
      if (status) params.set("status", status);
      if (hasFreight) params.set("has_freight", hasFreight);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await fetch(`${API_BASE_URL}/trip-revenue/list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) throw new Error("Không thể tải dữ liệu");
      const data: PaginatedResponse = await res.json();

      allItems.push(...data.items);

      if (currentPage >= data.total_pages) {
        hasMore = false;
      } else {
        currentPage++;
      }
    }

    return allItems;
  }

  // Export to Excel - Format theo mẫu Bảng kê vận chuyển
  async function exportToExcel() {
    setProcessing(true);
    try {
      const allOrders = await fetchAllOrdersForExport();

      // Get selected customer name if filtering by single customer
      const selectedCustomer = customerId ? customers.find(c => c.id === customerId) : null;
      const companyName = selectedCustomer ? selectedCustomer.name : "";

      // Get month/year from date range or current date
      const reportDate = startDate ? new Date(startDate) : new Date();
      const monthYear = `${reportDate.getMonth() + 1}/${reportDate.getFullYear()}`;

      // Build CSV content (Excel compatible)
      const headerRows: string[][] = [];

      // Title row
      headerRows.push([`BẢNG KÊ VẬN CHUYỂN THÁNG ${monthYear}`]);
      headerRows.push([]); // Empty row

      // Company info - left side (Đơn vị vận chuyển)
      headerRows.push(["Đơn vị vận chuyển"]);
      headerRows.push(["CÔNG TY TNHH MTV NHỰA TÍN HƯNG"]);
      headerRows.push([]); // Empty row

      // If customer selected, show customer info - right side (Đơn vị thuê vận chuyển)
      if (companyName) {
        headerRows.push(["Đơn vị thuê vận chuyển"]);
        headerRows.push([companyName]);
        headerRows.push([]); // Empty row
      }

      // Table headers - match the template columns
      const headers = [
        "STT",
        "NGÀY",
        "Mã Đơn hàng",
        "Số XE",
        "Tên tài xế",
        "SỐ CONT",
        "NHẬN",
        "ĐĐ",
        "Địa chỉ giao",
        "HẠ",
        "ĐVT",
        "SL",
        "CƯỚC VẬN CHUYỂN",
        "PHỤ THU HẠ XA",
        "KHÁC",
        "NEO XE",
        "GHI CHÚ"
      ];

      const rows = allOrders.map((order, index) => [
        index + 1, // STT
        order.order_date ? new Date(order.order_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "",
        order.order_code || "",
        "", // Số xe - không có trong data hiện tại
        order.driver_short_name || order.driver_name || "",
        order.container_code || "",
        order.pickup_location_name || "", // NHẬN (location)
        order.pickup_site_name || "", // ĐĐ (site/company)
        order.delivery_site_name || "", // Địa chỉ giao
        order.delivery_location_name || "", // HẠ
        order.equipment ? `Cont ${order.equipment}` : "", // ĐVT
        1, // SL
        order.freight_charge || "", // CƯỚC VẬN CHUYỂN
        "", // PHỤ THU HẠ XA
        "", // KHÁC
        "", // NEO XE
        "", // GHI CHÚ
      ]);

      // Calculate totals
      const totalFreight = allOrders.reduce((sum, o) => sum + (o.freight_charge || 0), 0);
      const vatRate = 0.08; // 8% VAT
      const vatAmount = Math.round(totalFreight * vatRate);
      const totalWithVat = totalFreight + vatAmount;

      // Summary rows
      rows.push([]); // Empty row
      rows.push(["", "", "", "", "", "", "", "", "", "", "", "", "Cộng chi tiết nội dung:", "", "", "", totalFreight]);
      rows.push(["", "", "", "", "", "", "", "", "", "", "", "", "Tổng giá trị(Chưa VAT):", "", "", "", totalFreight]);
      rows.push(["", "", "", "", "", "", "", "", "", "", "", "", "VAT(8%):", "", "", "", vatAmount]);
      rows.push(["", "", "", "", "", "", "", "", "", "", "", "", "Tổng giá trị(gồm VAT):", "", "", "", totalWithVat]);

      // Convert to CSV with BOM for Excel Vietnamese support
      const csvContent = "\uFEFF" + [...headerRows, headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      // Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const customerStr = selectedCustomer ? `_${selectedCustomer.code}` : "";
      const dateStr = startDate && endDate ? `_${startDate}_${endDate}` : "";
      link.download = `bang_ke_van_chuyen${customerStr}${dateStr}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      setSuccessMsg(`Đã xuất ${allOrders.length} đơn hàng ra Excel`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Không thể xuất Excel");
    } finally {
      setProcessing(false);
    }
  }

  // Export to PDF - Format theo mẫu Bảng kê vận chuyển
  async function exportToPDF() {
    setProcessing(true);
    try {
      const allOrders = await fetchAllOrdersForExport();
      const totalFreight = allOrders.reduce((sum, o) => sum + (o.freight_charge || 0), 0);
      const vatRate = 0.08; // 8% VAT
      const vatAmount = Math.round(totalFreight * vatRate);
      const totalWithVat = totalFreight + vatAmount;

      // Get selected customer name if filtering by single customer
      const selectedCustomer = customerId ? customers.find(c => c.id === customerId) : null;
      const companyName = selectedCustomer ? selectedCustomer.name : "";

      // Get month/year from date range or current date
      const reportDate = startDate ? new Date(startDate) : new Date();
      const monthYear = `${reportDate.getMonth() + 1}/${reportDate.getFullYear()}`;

      // Create printable HTML - Format theo mẫu Bảng kê vận chuyển
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Bảng kê vận chuyển tháng ${monthYear}</title>
          <style>
            body { font-family: 'Times New Roman', serif; font-size: 11px; margin: 10px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .header-left, .header-right { width: 48%; font-size: 11px; }
            .header-left .label, .header-right .label { font-style: italic; }
            .header-left .company, .header-right .company { font-weight: bold; color: blue; }
            .title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
            .doc-info { font-style: italic; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #000; padding: 4px 6px; }
            th { background-color: #e0e0e0; font-weight: bold; text-align: center; }
            td { vertical-align: top; }
            .center { text-align: center; }
            .right { text-align: right; }
            .number { text-align: right; font-family: Arial, sans-serif; }
            .summary-row td { font-weight: bold; border-top: 2px solid #000; }
            .summary-label { text-align: right; padding-right: 10px; }
            .footer { margin-top: 30px; display: flex; justify-content: flex-start; }
            .signature-box { width: 300px; }
            .signature-box .title { font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 5px; }
            .signature-box .company { font-weight: bold; color: blue; text-align: center; }
            @media print {
              body { margin: 0; }
              @page { margin: 10mm; size: landscape; }
            }
          </style>
        </head>
        <body>
          <div class="title">BẢNG KÊ VẬN CHUYỂN THÁNG ${monthYear}</div>

          <div class="header">
            <div class="header-left">
              <div class="label">Đơn vị vận chuyển</div>
              <div class="company">CÔNG TY TNHH MTV NHỰA TÍN HƯNG</div>
            </div>
            ${companyName ? `
            <div class="header-right">
              <div class="label">Đơn vị thuê vận chuyển</div>
              <div class="company">${companyName}</div>
            </div>
            ` : ""}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px">STT</th>
                <th style="width: 45px">NGÀY</th>
                <th style="width: 55px">Mã Đơn hàng</th>
                <th style="width: 45px">Số XE</th>
                <th style="width: 90px">Tên tài xế</th>
                <th style="width: 85px">SỐ CONT</th>
                <th colspan="3">TUYẾN VẬN CHUYỂN</th>
                <th style="width: 55px">ĐVT</th>
                <th style="width: 25px">SL</th>
                <th style="width: 80px">CƯỚC VẬN CHUYỂN</th>
                <th style="width: 65px">PHỤ THU HẠ XA</th>
                <th style="width: 45px">KHÁC</th>
                <th style="width: 45px">NEO XE</th>
                <th style="width: 50px">GHI CHÚ</th>
              </tr>
              <tr>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th>NHẬN</th>
                <th>ĐĐ</th>
                <th>Địa chỉ giao / HẠ</th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${allOrders.map((order, index) => `
                <tr>
                  <td class="center">${index + 1}</td>
                  <td class="center">${order.order_date ? new Date(order.order_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : ""}</td>
                  <td class="center">${order.order_code || ""}</td>
                  <td class="center"></td>
                  <td>${order.driver_short_name || order.driver_name || ""}</td>
                  <td>${order.container_code || ""}</td>
                  <td>${order.pickup_location_name || ""}</td>
                  <td>${order.pickup_site_name || ""}</td>
                  <td>${order.delivery_site_name || ""}, ${order.delivery_location_name || ""}</td>
                  <td class="center">${order.equipment ? `Cont ${order.equipment}` : ""}</td>
                  <td class="center">1</td>
                  <td class="number">${order.freight_charge ? new Intl.NumberFormat("vi-VN").format(order.freight_charge) : ""}</td>
                  <td class="number"></td>
                  <td class="number"></td>
                  <td class="number"></td>
                  <td></td>
                </tr>
              `).join("")}
              <tr class="summary-row">
                <td colspan="11" class="summary-label">Cộng chi tiết nội dung:</td>
                <td class="number">${new Intl.NumberFormat("vi-VN").format(totalFreight)}</td>
                <td colspan="4"></td>
              </tr>
              <tr>
                <td colspan="11" class="summary-label">Tổng giá trị(Chưa VAT):</td>
                <td class="number">${new Intl.NumberFormat("vi-VN").format(totalFreight)}</td>
                <td colspan="4"></td>
              </tr>
              <tr>
                <td colspan="11" class="summary-label">VAT(8%):</td>
                <td class="number">${new Intl.NumberFormat("vi-VN").format(vatAmount)}</td>
                <td colspan="4"></td>
              </tr>
              <tr class="summary-row">
                <td colspan="11" class="summary-label">Tổng giá trị(gồm VAT):</td>
                <td class="number">${new Intl.NumberFormat("vi-VN").format(totalWithVat)}</td>
                <td colspan="4"></td>
              </tr>
            </tbody>
          </table>

          ${companyName ? `
          <div class="footer">
            <div class="signature-box">
              <div class="title">Xác nhận của đơn vị thuê vận chuyển</div>
              <div class="company">${companyName}</div>
            </div>
          </div>
          ` : ""}
        </body>
        </html>
      `;

      // Open print dialog
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }

      setSuccessMsg(`Đã xuất ${allOrders.length} đơn hàng ra PDF`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Không thể xuất PDF");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="p-6 max-w-full overflow-x-hidden bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
      </div>

      {/* Success/Error Messages */}
      {successMsg && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-500 underline">
            {tCommon("close")}
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white rounded-lg shadow border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">{t("summary.totalOrders")}</div>
            <div className="text-2xl font-bold text-gray-900">{summary.total_orders}</div>
          </div>
          <div className="p-4 bg-white rounded-lg shadow border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">{t("summary.withFreight")}</div>
            <div className="text-2xl font-bold text-green-600">{summary.orders_with_freight}</div>
          </div>
          <div className="p-4 bg-white rounded-lg shadow border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">{t("summary.withoutFreight")}</div>
            <div className="text-2xl font-bold text-orange-600">{summary.orders_without_freight}</div>
          </div>
          <div className="p-4 bg-white rounded-lg shadow border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">{t("summary.totalRevenue")}</div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.total_revenue)} đ</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow border border-gray-100">
        {/* Search row */}
        <div className="mb-4">
          <input
            type="text"
            placeholder={t("filters.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-4 py-2"
          />
        </div>
        {/* Filter row */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("filters.customer")}</label>
            <select
              value={customerId}
              onChange={(e) => { setCustomerId(e.target.value); setPage(1); }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">{tCommon("all")}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("filters.status")}</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">{tCommon("all")}</option>
              <option value="DELIVERED">{t("statusLabels.delivered")}</option>
              <option value="COMPLETED">{t("statusLabels.completed")}</option>
              <option value="EMPTY_RETURN">{t("statusLabels.emptyReturn")}</option>
              <option value="IN_TRANSIT">{t("statusLabels.inTransit")}</option>
              <option value="ASSIGNED">{t("statusLabels.assigned")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("filters.freight")}</label>
            <select
              value={hasFreight}
              onChange={(e) => { setHasFreight(e.target.value); setPage(1); }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">{tCommon("all")}</option>
              <option value="true">{t("summary.withFreight")}</option>
              <option value="false">{t("summary.withoutFreight")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("filters.fromDate")}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("filters.toDate")}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("filters.rowCount")}</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setCustomerId("");
                setStatus("");
                setHasFreight("");
                setStartDate("");
                setEndDate("");
                setSearchTerm("");
                setPage(1);
              }}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              {t("filters.clearFilters")}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <button
          onClick={bulkApply}
          disabled={selectedIds.size === 0 || processing}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("buttons.applyFreight")} ({selectedIds.size} {t("buttons.ordersSelected")})
        </button>
        <button
          onClick={recalculateAll}
          disabled={processing}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {t("buttons.recalculateAll")}
        </button>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {tCommon("refresh")}
        </button>
        <div className="border-l border-gray-300 h-6 mx-2"></div>
        <button
          onClick={exportToExcel}
          disabled={processing || total === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {t("buttons.exportExcel")}
        </button>
        <button
          onClick={exportToPDF}
          disabled={processing || total === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {t("buttons.exportPdf")}
        </button>
        <span className="text-sm text-gray-500">
          {tCommon("total")}: {total} {t("ordersCount")}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">{tCommon("loading")}</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b-2 border-gray-200">
                  <th className="px-3 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th
                    className="px-3 py-3 text-left font-bold text-gray-700 cursor-pointer hover:bg-gray-100 min-w-[70px]"
                    onClick={() => handleSort("order_date")}
                  >
                    {t("columns.date")}<SortIcon field="order_date" />
                  </th>
                  <th
                    className="px-3 py-3 text-left font-bold text-gray-700 cursor-pointer hover:bg-gray-100 min-w-[100px]"
                    onClick={() => handleSort("order_code")}
                  >
                    {t("columns.orderCode")}<SortIcon field="order_code" />
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-700 min-w-[80px]">{t("columns.driver")}</th>
                  <th className="px-3 py-3 text-left font-bold text-gray-700 min-w-[200px]">{t("columns.route")}</th>
                  <th className="px-3 py-3 text-left font-bold text-gray-700 min-w-[120px]">{t("columns.containerNo")}</th>
                  <th className="px-3 py-3 text-center font-bold text-gray-700 min-w-[50px]">{t("columns.cont")}</th>
                  <th
                    className="px-3 py-3 text-left font-bold text-gray-700 cursor-pointer hover:bg-gray-100 min-w-[60px]"
                    onClick={() => handleSort("customer_code")}
                  >
                    {t("columns.customer")}<SortIcon field="customer_code" />
                  </th>
                  <th className="px-3 py-3 text-center font-bold text-gray-700 min-w-[50px]">{t("columns.km")}</th>
                  <th className="px-3 py-3 text-center font-bold text-gray-700 min-w-[50px]">{t("columns.tollStations")}</th>
                  <th
                    className="px-3 py-3 text-center font-bold text-gray-700 cursor-pointer hover:bg-gray-100 min-w-[100px]"
                    onClick={() => handleSort("status")}
                  >
                    {t("columns.status")}<SortIcon field="status" />
                  </th>
                  <th
                    className="px-3 py-3 text-right font-bold text-gray-700 cursor-pointer hover:bg-gray-100 min-w-[120px]"
                    onClick={() => handleSort("freight_charge")}
                  >
                    {t("columns.currentFreight")}<SortIcon field="freight_charge" />
                  </th>
                  <th
                    className="px-3 py-3 text-right font-bold text-gray-700 cursor-pointer hover:bg-gray-100 min-w-[120px]"
                    onClick={() => handleSort("suggested_freight")}
                  >
                    {t("columns.rateFreight")}<SortIcon field="suggested_freight" />
                  </th>
                  <th className="px-3 py-3 text-center font-bold text-gray-700 min-w-[120px]">{tCommon("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        disabled={order.freight_charge !== null || !order.rate_matched}
                        className="rounded border-gray-300 disabled:opacity-30"
                      />
                    </td>
                    <td className="px-3 py-3 text-gray-600">{formatDate(order.order_date)}</td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-gray-900">{order.order_code}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-gray-900">{order.driver_short_name || order.driver_name || "-"}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs">
                        <div className="text-gray-900 font-medium">{order.pickup_site_name || order.pickup_location_name || "-"}</div>
                        <div className="text-gray-400">→</div>
                        <div className="text-gray-900 font-medium">{order.delivery_site_name || order.delivery_location_name || "-"}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-gray-900">{order.container_code || "-"}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {order.equipment && (
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 rounded">
                          {order.equipment}ft
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-gray-900">{order.customer_code}</span>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">
                      {order.distance_km || "-"}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">
                      {order.toll_stations || "-"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${STATUS_COLORS[order.status] || "bg-gray-100"}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {order.freight_charge ? (
                        <span className="font-bold text-green-600">{formatCurrency(order.freight_charge)} đ</span>
                      ) : (
                        <span className="text-orange-500">{t("noFreight")}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {order.rate_matched ? (
                        <span className="font-medium text-blue-600">{formatCurrency(order.suggested_freight)} đ</span>
                      ) : (
                        <span className="text-gray-400 text-xs">{t("noRateFound")}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {order.rate_matched && !order.freight_charge && (
                          <button
                            onClick={() => applyFreight(order.id)}
                            disabled={processing}
                            className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {t("buttons.apply")}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingOrder(order);
                            setEditFreight(order.freight_charge?.toString() || order.suggested_freight?.toString() || "");
                          }}
                          className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          {tCommon("edit")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {tCommon("page")} {page} / {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                >
                  {tCommon("previous")}
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                >
                  {tCommon("next")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("emptyState.title")}</h3>
          <p className="text-gray-600">{t("emptyState.description")}</p>
        </div>
      )}

      {/* Edit Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t("modal.updateFreight")} - {editingOrder.order_code}
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.freightAmount")}
                </label>
                <input
                  type="number"
                  value={editFreight}
                  onChange={(e) => setEditFreight(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-lg"
                  placeholder={t("modal.freightPlaceholder")}
                />
                {editingOrder.suggested_freight && (
                  <p className="mt-2 text-sm text-gray-500">
                    {t("modal.suggestedFromRate")}: {formatCurrency(editingOrder.suggested_freight)} đ
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  onClick={saveEditFreight}
                  disabled={processing}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {tCommon("save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
