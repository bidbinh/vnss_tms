"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  DollarSign,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Eye,
  X,
  Truck,
  CreditCard,
  Download,
  Filter,
  CheckSquare,
  Square,
  Banknote,
  QrCode,
  FileSpreadsheet,
  Zap,
  Settings,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import * as XLSX from "xlsx";

interface DriverPayroll {
  id: string;
  driver_id: string;
  driver_name: string | null;
  driver_code: string | null;
  year: number;
  month: number;
  status: string;
  total_trips: number;
  total_distance_km: number;
  total_trip_salary: number;
  total_adjustments: number;
  total_bonuses: number;
  net_salary: number;
  submitted_at: string | null;
  confirmed_by_driver_at: string | null;
  paid_at: string | null;
  created_at: string;
  // Driver bank info
  bank_account?: string;
  bank_name?: string;
  bank_bin?: string;
  // Extended fields from salary report
  base_salary?: number;
  seniority_bonus?: number;
  total_insurance?: number;
  income_tax?: number;
  advance_payment?: number;
  gross_salary?: number;
  final_net_salary?: number;  // Net salary after all deductions
}

interface DriverSalaryReport {
  driver_id: string;
  driver_name: string;
  base_salary: number;
  total_trip_salary: number;
  monthly_bonus: number;
  seniority_bonus: number;
  gross_salary: number;
  deductions: {
    total_insurance: number;
    income_tax: number;
    advance_payment: number;
    total_deductions: number;
    net_salary: number;
  };
  total_salary: number;
}

interface Driver {
  id: string;
  name: string;
  short_name?: string;
  bank_account?: string;
  bank_name?: string;
  bank_bin?: string;
}

interface PayrollSummary {
  total_confirmed: number;
  total_amount: number;
  driver_count: number;
}

interface PaymentConfig {
  provider: string;
  sepay_configured: boolean;
  casso_configured: boolean;
  mb_configured: boolean;
}

interface PaymentResult {
  payroll_id: string;
  driver_name: string;
  amount: number;
  status: string;
  transaction_id?: string;
  message?: string;
}

interface BatchPaymentResponse {
  total: number;
  processing: number;
  success: number;
  failed: number;
  results: PaymentResult[];
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700", label: "Nháp" },
  PENDING_REVIEW: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Chờ xác nhận" },
  CONFIRMED: { bg: "bg-green-100", text: "text-green-700", label: "Đã xác nhận" },
  PAID: { bg: "bg-purple-100", text: "text-purple-700", label: "Đã thanh toán" },
  DISPUTED: { bg: "bg-red-100", text: "text-red-700", label: "Khiếu nại" },
};

export default function PayrollPaymentsPage() {
  // Default to previous month
  const [year, setYear] = useState(() => {
    const now = new Date();
    return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  });
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return now.getMonth() === 0 ? 12 : now.getMonth();
  });

  const [payrolls, setPayrolls] = useState<DriverPayroll[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("CONFIRMED"); // Default to show confirmed (pending payment)
  const [searchKeyword, setSearchKeyword] = useState("");

  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<DriverPayroll | null>(null);

  // QR Payment modal
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrPayroll, setQrPayroll] = useState<DriverPayroll | null>(null);

  // Auto Payment state
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [showPaymentConfigModal, setShowPaymentConfigModal] = useState(false);
  const [autoPaymentProcessing, setAutoPaymentProcessing] = useState(false);
  const [paymentResults, setPaymentResults] = useState<BatchPaymentResponse | null>(null);
  const [showPaymentResultModal, setShowPaymentResultModal] = useState(false);

  useEffect(() => {
    fetchDrivers();
    fetchPaymentConfig();
  }, []);

  useEffect(() => {
    fetchPayrolls();
  }, [year, month]);

  async function fetchDrivers() {
    try {
      const data = await apiFetch<Driver[]>("/drivers");
      setDrivers(data);
    } catch (err) {
      console.error("Failed to fetch drivers:", err);
    }
  }

  async function fetchPaymentConfig() {
    try {
      const config = await apiFetch<PaymentConfig>("/bank-payment/config");
      setPaymentConfig(config);
    } catch (err) {
      console.error("Failed to fetch payment config:", err);
      // Default to manual if not configured
      setPaymentConfig({
        provider: "manual",
        sepay_configured: false,
        casso_configured: false,
        mb_configured: false,
      });
    }
  }

  async function initiateAutoPayment() {
    // Get payrolls to pay - either selected or all confirmed
    const payrollsToPay = selectedIds.size > 0
      ? filteredPayrolls.filter(p => selectedIds.has(p.id) && p.status === "CONFIRMED")
      : filteredPayrolls.filter(p => p.status === "CONFIRMED");

    if (payrollsToPay.length === 0) {
      alert("Không có bảng lương nào ở trạng thái 'Đã xác nhận' để thanh toán");
      return;
    }

    // Check if driver has bank info
    const missingBankInfo = payrollsToPay.filter(p => {
      const driver = drivers.find(d => d.id === p.driver_id);
      return !driver?.bank_account;
    });

    if (missingBankInfo.length > 0) {
      const names = missingBankInfo.map(p => p.driver_name).join(", ");
      alert(`Các tài xế sau chưa có thông tin ngân hàng: ${names}`);
      return;
    }

    const totalAmount = payrollsToPay.reduce((sum, p) => sum + (p.final_net_salary ?? p.net_salary), 0);

    if (!confirm(
      `Bạn sắp thanh toán tự động cho ${payrollsToPay.length} tài xế.\n` +
      `Tổng số tiền: ${formatCurrency(totalAmount)}\n\n` +
      `Provider: ${paymentConfig?.provider?.toUpperCase() || "MANUAL"}\n\n` +
      `Tiếp tục?`
    )) {
      return;
    }

    setAutoPaymentProcessing(true);

    try {
      const response = await apiFetch<BatchPaymentResponse>("/bank-payment/pay-payrolls", {
        method: "POST",
        body: JSON.stringify({
          payroll_ids: payrollsToPay.map(p => p.id),
          provider: paymentConfig?.provider || "manual",
        }),
      });

      setPaymentResults(response);
      setShowPaymentResultModal(true);

      // Refresh payrolls to update status
      fetchPayrolls();
      setSelectedIds(new Set());

    } catch (err: any) {
      alert(`Lỗi thanh toán: ${err.detail || err.message || "Unknown error"}`);
    } finally {
      setAutoPaymentProcessing(false);
    }
  }

  async function fetchPayrolls() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
      });

      // Fetch both payrolls and salary reports in parallel
      const [payrollsData, salaryReportsData] = await Promise.all([
        apiFetch<DriverPayroll[]>(`/driver-salary-management/payrolls?${params}`),
        apiFetch<{ drivers: DriverSalaryReport[] }>(
          `/driver-salary-reports/monthly?year=${year}&month=${month}`
        ).catch(() => ({ drivers: [] }))  // Fallback if salary reports fail
      ]);

      // Enrich with driver bank info and salary report data
      const enrichedPayrolls = payrollsData.map(p => {
        const driver = drivers.find(d => d.id === p.driver_id);
        const report = salaryReportsData.drivers?.find(
          r => String(r.driver_id) === String(p.driver_id)
        );

        return {
          ...p,
          bank_account: driver?.bank_account,
          bank_name: driver?.bank_name,
          bank_bin: driver?.bank_bin,
          // Add salary report data
          base_salary: report?.base_salary,
          seniority_bonus: report?.seniority_bonus,
          total_insurance: report?.deductions?.total_insurance || 0,
          income_tax: report?.deductions?.income_tax || 0,
          advance_payment: report?.deductions?.advance_payment || 0,
          gross_salary: report?.gross_salary,
          final_net_salary: report?.deductions?.net_salary || report?.total_salary,
          // Override trip salary and bonuses from report for consistency
          total_trip_salary: report?.total_trip_salary || p.total_trip_salary,
          total_bonuses: report?.monthly_bonus || p.total_bonuses,
        };
      });

      setPayrolls(enrichedPayrolls);
      setSelectedIds(new Set()); // Clear selection on new fetch
    } catch (err: any) {
      console.error("Failed to fetch payrolls:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filtered payrolls
  const filteredPayrolls = useMemo(() => {
    let result = payrolls;

    // Filter by status
    if (statusFilter) {
      result = result.filter(p => p.status === statusFilter);
    }

    // Filter by search keyword
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim();
      result = result.filter(p =>
        p.driver_name?.toLowerCase().includes(keyword) ||
        p.driver_code?.toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [payrolls, statusFilter, searchKeyword]);

  // Summary calculations - use final_net_salary for accurate total
  const summary = useMemo((): PayrollSummary => {
    const confirmed = payrolls.filter(p => p.status === "CONFIRMED");
    return {
      total_confirmed: confirmed.length,
      total_amount: confirmed.reduce((sum, p) => sum + (p.final_net_salary ?? p.net_salary), 0),
      driver_count: confirmed.length,
    };
  }, [payrolls]);

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    const confirmedPayrolls = filteredPayrolls.filter(p => p.status === "CONFIRMED");
    if (selectedIds.size === confirmedPayrolls.length && confirmedPayrolls.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(confirmedPayrolls.map(p => p.id)));
    }
  };

  // Mark single payroll as paid
  async function markAsPaid(payrollId: string) {
    if (!confirm("Xác nhận đã thanh toán lương cho tài xế này?")) return;

    setProcessing(true);
    try {
      await apiFetch(`/driver-salary-management/payrolls/${payrollId}/mark-paid`, {
        method: "POST",
      });
      fetchPayrolls();
      setShowDetailModal(false);
      setSelectedPayroll(null);
    } catch (err: any) {
      alert(err.detail || err.message || "Không thể đánh dấu đã thanh toán");
    } finally {
      setProcessing(false);
    }
  }

  // Mark multiple payrolls as paid
  async function markSelectedAsPaid() {
    if (selectedIds.size === 0) {
      alert("Vui lòng chọn ít nhất một bảng lương để thanh toán");
      return;
    }

    const selectedPayrolls = filteredPayrolls.filter(p => selectedIds.has(p.id) && p.status === "CONFIRMED");
    const totalAmount = selectedPayrolls.reduce((sum, p) => sum + (p.final_net_salary ?? p.net_salary), 0);

    if (!confirm(`Xác nhận đã thanh toán cho ${selectedPayrolls.length} tài xế?\nTổng số tiền: ${formatCurrency(totalAmount)}`)) {
      return;
    }

    setProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const payrollId of selectedIds) {
      try {
        await apiFetch(`/driver-salary-management/payrolls/${payrollId}/mark-paid`, {
          method: "POST",
        });
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    setProcessing(false);
    alert(`Đã thanh toán: ${successCount}\nThất bại: ${failCount}`);
    fetchPayrolls();
  }

  // Generate VietQR URL
  function generateVietQRUrl(payroll: DriverPayroll): string {
    const driver = drivers.find(d => d.id === payroll.driver_id);
    if (!driver?.bank_bin || !driver?.bank_account) {
      return "";
    }

    const amount = payroll.final_net_salary ?? payroll.net_salary;
    const description = encodeURIComponent(`Luong T${payroll.month}/${payroll.year} - ${driver.name}`);

    // VietQR format: https://img.vietqr.io/image/{bank_bin}-{account_no}-{template}.png?amount={amount}&addInfo={description}
    return `https://img.vietqr.io/image/${driver.bank_bin}-${driver.bank_account}-compact2.png?amount=${amount}&addInfo=${description}&accountName=${encodeURIComponent(driver.name)}`;
  }

  // Export Excel for bank batch transfer
  function exportExcelForBank(type: "vcb" | "mb" | "general") {
    // Get payrolls to export - either selected or all confirmed
    let payrollsToExport = selectedIds.size > 0
      ? filteredPayrolls.filter(p => selectedIds.has(p.id))
      : filteredPayrolls.filter(p => p.status === "CONFIRMED");

    if (payrollsToExport.length === 0) {
      alert("Không có bảng lương nào để xuất. Vui lòng chọn hoặc có bảng lương trạng thái 'Đã xác nhận'.");
      return;
    }

    const exportData = payrollsToExport.map((p, index) => {
      const driver = drivers.find(d => d.id === p.driver_id);
      const amount = p.final_net_salary ?? p.net_salary;
      const description = `Luong T${p.month}/${p.year} ${driver?.name || p.driver_name}`;

      if (type === "vcb") {
        // VCB-iB@nking batch transfer format
        return {
          "STT": index + 1,
          "Số tài khoản": driver?.bank_account || "",
          "Tên người nhận": driver?.name || p.driver_name || "",
          "Ngân hàng": driver?.bank_name || "",
          "Chi nhánh": "",
          "Số tiền": amount,
          "Nội dung": description,
          "Mã BIN": driver?.bank_bin || "",
        };
      } else if (type === "mb") {
        // MB Bank batch transfer format
        return {
          "STT": index + 1,
          "Số tài khoản người nhận": driver?.bank_account || "",
          "Tên người nhận": driver?.name || p.driver_name || "",
          "Ngân hàng người nhận": driver?.bank_name || "",
          "Số tiền": amount,
          "Nội dung chuyển khoản": description,
          "Mã ngân hàng (BIN)": driver?.bank_bin || "",
        };
      } else {
        // General format with all info
        return {
          "STT": index + 1,
          "Mã tài xế": p.driver_code || "",
          "Tên tài xế": driver?.name || p.driver_name || "",
          "Tháng/Năm": `${p.month}/${p.year}`,
          "Số chuyến": p.total_trips,
          "Lương cơ bản": p.base_salary || 0,
          "Lương chuyến": p.total_trip_salary,
          "Thưởng": p.total_bonuses,
          "Bảo hiểm": p.total_insurance || 0,
          "Thuế TNCN": p.income_tax || 0,
          "Tạm ứng": p.advance_payment || 0,
          "Thực lĩnh": amount,
          "Ngân hàng": driver?.bank_name || "",
          "Số tài khoản": driver?.bank_account || "",
          "Mã BIN": driver?.bank_bin || "",
          "Trạng thái": STATUS_CONFIG[p.status]?.label || p.status,
        };
      }
    });

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Thanh toan luong");

    // Set column widths
    const colWidths = type === "general"
      ? [5, 12, 25, 10, 8, 15, 15, 12, 12, 12, 12, 15, 20, 18, 10, 15]
      : [5, 18, 25, 25, 15, 15, 35, 12];
    ws["!cols"] = colWidths.map(w => ({ wch: w }));

    // Generate filename
    const typeLabel = type === "vcb" ? "VCB" : type === "mb" ? "MB" : "ChiTiet";
    const filename = `ThanhToanLuong_${typeLabel}_T${month}_${year}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
  }

  // Show export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  }

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  };

  // Calculate selected total - use final_net_salary
  const selectedTotal = useMemo(() => {
    return filteredPayrolls
      .filter(p => selectedIds.has(p.id))
      .reduce((sum, p) => sum + (p.final_net_salary ?? p.net_salary), 0);
  }, [filteredPayrolls, selectedIds]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thanh toán lương tài xế</h1>
          <p className="text-gray-600 mt-1">Quản lý và xác nhận thanh toán lương cho tài xế</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto Payment Button */}
          <button
            onClick={initiateAutoPayment}
            disabled={autoPaymentProcessing || summary.total_confirmed === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
            title={paymentConfig?.provider === "manual" ? "Chế độ thủ công - Cấu hình API để tự động hóa" : `Provider: ${paymentConfig?.provider}`}
          >
            {autoPaymentProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {autoPaymentProcessing ? "Đang xử lý..." : "Thanh toán tự động"}
          </button>

          {/* Payment Config Button */}
          <button
            onClick={() => setShowPaymentConfigModal(true)}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Cấu hình thanh toán"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>

          {/* Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Xuất Excel
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      exportExcelForBank("vcb");
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <span className="w-8 h-5 bg-green-700 text-white text-xs rounded flex items-center justify-center">VCB</span>
                    Format VCB-iB@nking
                  </button>
                  <button
                    onClick={() => {
                      exportExcelForBank("mb");
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <span className="w-8 h-5 bg-purple-700 text-white text-xs rounded flex items-center justify-center">MB</span>
                    Format MB Bank
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      exportExcelForBank("general");
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-gray-500" />
                    Chi tiết đầy đủ
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/hrm/payroll"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            HRM Payroll
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Chờ thanh toán</div>
              <div className="text-xl font-bold text-gray-900">{summary.total_confirmed} tài xế</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 col-span-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng tiền cần thanh toán T{month}/{year}</div>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(summary.total_amount)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đã thanh toán</div>
              <div className="text-xl font-bold text-purple-600">
                {payrolls.filter(p => p.status === "PAID").length} tài xế
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {[2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Tất cả</option>
              <option value="CONFIRMED">Chờ thanh toán</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="PENDING_REVIEW">Chờ xác nhận</option>
              <option value="DRAFT">Nháp</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tên tài xế..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchPayrolls}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Đang tải..." : "Xem danh sách"}
            </button>
          </div>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-blue-700 font-medium">
              Đã chọn: {selectedIds.size} tài xế
            </span>
            <span className="text-blue-600">
              Tổng tiền: <strong>{formatCurrency(selectedTotal)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
            >
              Bỏ chọn
            </button>
            <button
              onClick={markSelectedAsPaid}
              disabled={processing}
              className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Banknote className="w-4 h-4" />
              {processing ? "Đang xử lý..." : "Đánh dấu đã thanh toán"}
            </button>
          </div>
        </div>
      )}

      {/* Payroll List */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold">Danh sách lương T{month}/{year}</h2>
          <div className="text-sm text-gray-500">
            {filteredPayrolls.length} bản ghi
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredPayrolls.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            Không có bảng lương nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-center w-12">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Chọn tất cả"
                    >
                      {selectedIds.size === filteredPayrolls.filter(p => p.status === "CONFIRMED").length &&
                       filteredPayrolls.filter(p => p.status === "CONFIRMED").length > 0 ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tài xế</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Chuyến</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lương chuyến</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thưởng</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thực lĩnh</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngân hàng</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayrolls.map((payroll) => {
                  const statusConfig = getStatusConfig(payroll.status);
                  const driver = drivers.find(d => d.id === payroll.driver_id);
                  const canSelect = payroll.status === "CONFIRMED";

                  return (
                    <tr key={payroll.id} className={`hover:bg-gray-50 ${selectedIds.has(payroll.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-3 py-3 text-center">
                        {canSelect ? (
                          <button
                            onClick={() => toggleSelect(payroll.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {selectedIds.has(payroll.id) ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900">
                          {payroll.driver_name || payroll.driver_code}
                        </div>
                        {payroll.driver_code && payroll.driver_name && (
                          <div className="text-xs text-gray-500">{payroll.driver_code}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">{payroll.total_trips}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(payroll.total_trip_salary)}</td>
                      <td className="px-3 py-3 text-right text-green-600">
                        +{formatCurrency(payroll.total_bonuses)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-blue-600">
                        {formatCurrency(payroll.final_net_salary ?? payroll.net_salary)}
                      </td>
                      <td className="px-3 py-3">
                        {driver?.bank_account ? (
                          <div className="text-xs">
                            <div className="font-medium">{driver.bank_name || "-"}</div>
                            <div className="text-gray-500">{driver.bank_account}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Chưa có TK</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.label}
                        </span>
                        {payroll.paid_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(payroll.paid_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedPayroll(payroll);
                              setShowDetailModal(true);
                            }}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {payroll.status === "CONFIRMED" && driver?.bank_bin && driver?.bank_account && (
                            <button
                              onClick={() => {
                                setQrPayroll(payroll);
                                setShowQRModal(true);
                              }}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              title="Mã QR chuyển khoản"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {payroll.status === "CONFIRMED" && (
                            <button
                              onClick={() => markAsPaid(payroll.id)}
                              disabled={processing}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:bg-gray-100"
                              title="Đánh dấu đã thanh toán"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-right">Tổng cộng:</td>
                  <td className="px-3 py-3 text-right text-blue-600">
                    {formatCurrency(filteredPayrolls.reduce((sum, p) => sum + (p.final_net_salary ?? p.net_salary), 0))}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Chi tiết lương tài xế</h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPayroll(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-lg">{selectedPayroll.driver_name}</div>
                  <div className="text-sm text-gray-500">T{selectedPayroll.month}/{selectedPayroll.year}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-gray-500">Số chuyến</div>
                  <div className="font-semibold text-lg">{selectedPayroll.total_trips}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-gray-500">Tổng km</div>
                  <div className="font-semibold text-lg">{selectedPayroll.total_distance_km} km</div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Lương chuyến:</span>
                  <span className="font-medium">{formatCurrency(selectedPayroll.total_trip_salary)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Thưởng:</span>
                  <span className="font-medium text-green-600">+{formatCurrency(selectedPayroll.total_bonuses)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Điều chỉnh:</span>
                  <span className={`font-medium ${selectedPayroll.total_adjustments >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedPayroll.total_adjustments >= 0 ? '+' : ''}{formatCurrency(selectedPayroll.total_adjustments)}
                  </span>
                </div>
                <div className="flex justify-between py-3 bg-blue-50 px-3 rounded-lg">
                  <span className="font-semibold">Thực lĩnh:</span>
                  <span className="font-bold text-blue-600 text-lg">{formatCurrency(selectedPayroll.final_net_salary ?? selectedPayroll.net_salary)}</span>
                </div>
              </div>

              {/* Bank Info */}
              {(() => {
                const driver = drivers.find(d => d.id === selectedPayroll.driver_id);
                if (driver?.bank_account) {
                  return (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">Thông tin chuyển khoản</div>
                      <div className="font-medium">{driver.bank_name}</div>
                      <div className="text-gray-600">{driver.bank_account}</div>
                      <div className="text-gray-600">{driver.name}</div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Trạng thái:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(selectedPayroll.status).bg} ${getStatusConfig(selectedPayroll.status).text}`}>
                  {getStatusConfig(selectedPayroll.status).label}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPayroll(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Đóng
              </button>
              {selectedPayroll.status === "CONFIRMED" && (
                <button
                  onClick={() => markAsPaid(selectedPayroll.id)}
                  disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  <Banknote className="w-4 h-4" />
                  {processing ? "Đang xử lý..." : "Đánh dấu đã thanh toán"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && qrPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Mã QR chuyển khoản</h3>
              <button
                onClick={() => {
                  setShowQRModal(false);
                  setQrPayroll(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="text-gray-600">
                {qrPayroll.driver_name} - T{qrPayroll.month}/{qrPayroll.year}
              </div>

              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(qrPayroll.final_net_salary ?? qrPayroll.net_salary)}
              </div>

              {/* QR Code Image */}
              <div className="flex justify-center">
                <img
                  src={generateVietQRUrl(qrPayroll)}
                  alt="VietQR"
                  className="max-w-full h-auto rounded-lg border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Bank Info */}
              {(() => {
                const driver = drivers.find(d => d.id === qrPayroll.driver_id);
                if (driver) {
                  return (
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Ngân hàng:</strong> {driver.bank_name}</div>
                      <div><strong>Số TK:</strong> {driver.bank_account}</div>
                      <div><strong>Chủ TK:</strong> {driver.name}</div>
                    </div>
                  );
                }
                return null;
              })()}

              <p className="text-xs text-gray-500">
                Quét mã QR bằng ứng dụng ngân hàng để chuyển khoản
              </p>
            </div>

            <div className="flex justify-between gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowQRModal(false);
                  setQrPayroll(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  markAsPaid(qrPayroll.id);
                  setShowQRModal(false);
                  setQrPayroll(null);
                }}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Đã chuyển khoản
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Config Modal */}
      {showPaymentConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Cấu hình thanh toán tự động</h3>
              <button
                onClick={() => setShowPaymentConfigModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Current Status */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Trạng thái hiện tại</span>
                </div>
                <div className="text-sm text-gray-600">
                  Provider: <strong className="text-blue-600">{paymentConfig?.provider?.toUpperCase() || "MANUAL"}</strong>
                </div>
              </div>

              {/* Provider Options */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Các nhà cung cấp hỗ trợ:</h4>

                <div className={`p-4 border rounded-lg ${paymentConfig?.provider === "sepay" ? "border-purple-500 bg-purple-50" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">SePay</div>
                      <div className="text-sm text-gray-500">Đối tác Open Banking chính thức của MB Bank</div>
                    </div>
                    {paymentConfig?.sepay_configured ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Đã cấu hình</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Chưa cấu hình</span>
                    )}
                  </div>
                  <a href="https://sepay.vn" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-2 block">
                    sepay.vn →
                  </a>
                </div>

                <div className={`p-4 border rounded-lg ${paymentConfig?.provider === "casso" ? "border-purple-500 bg-purple-50" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Casso</div>
                      <div className="text-sm text-gray-500">Hỗ trợ nhiều ngân hàng (VCB, MB, TCB...)</div>
                    </div>
                    {paymentConfig?.casso_configured ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Đã cấu hình</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Chưa cấu hình</span>
                    )}
                  </div>
                  <a href="https://casso.vn" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-2 block">
                    casso.vn →
                  </a>
                </div>

                <div className={`p-4 border rounded-lg ${paymentConfig?.provider === "mb_direct" ? "border-purple-500 bg-purple-50" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">MB Bank Direct API</div>
                      <div className="text-sm text-gray-500">Tích hợp trực tiếp - Tự động hóa hoàn toàn</div>
                    </div>
                    {paymentConfig?.mb_configured ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Đã cấu hình</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Chưa cấu hình</span>
                    )}
                  </div>
                  <a href="https://developer.mbbank.com.vn" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-2 block">
                    developer.mbbank.com.vn →
                  </a>
                </div>

                <div className={`p-4 border rounded-lg ${paymentConfig?.provider === "manual" ? "border-purple-500 bg-purple-50" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Thủ công / Xuất Excel</div>
                      <div className="text-sm text-gray-500">Xuất file Excel để import vào Internet Banking</div>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Mặc định</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium mb-1">Hướng dẫn cấu hình:</p>
                  <p>Liên hệ Admin để cấu hình API key cho nhà cung cấp thanh toán. Thông tin sẽ được lưu an toàn trong hệ thống.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setShowPaymentConfigModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Results Modal */}
      {showPaymentResultModal && paymentResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Kết quả thanh toán</h3>
              <button
                onClick={() => {
                  setShowPaymentResultModal(false);
                  setPaymentResults(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-900">{paymentResults.total}</div>
                  <div className="text-xs text-gray-500">Tổng</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{paymentResults.processing}</div>
                  <div className="text-xs text-gray-500">Đang xử lý</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{paymentResults.success}</div>
                  <div className="text-xs text-gray-500">Thành công</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{paymentResults.failed}</div>
                  <div className="text-xs text-gray-500">Thất bại</div>
                </div>
              </div>

              {/* Results Table */}
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Tài xế</th>
                    <th className="px-3 py-2 text-right">Số tiền</th>
                    <th className="px-3 py-2 text-center">Trạng thái</th>
                    <th className="px-3 py-2 text-left">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paymentResults.results.map((result, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{result.driver_name}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(result.amount)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          result.status === "success" ? "bg-green-100 text-green-700" :
                          result.status === "processing" ? "bg-blue-100 text-blue-700" :
                          result.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {result.status === "success" ? "Thành công" :
                           result.status === "processing" ? "Đang xử lý" :
                           result.status === "pending" ? "Chờ xử lý" : "Thất bại"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {result.transaction_id && <div>ID: {result.transaction_id}</div>}
                        {result.message && <div>{result.message}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {paymentResults.processing > 0 && (
                <div className="mt-4 bg-blue-50 p-4 rounded-lg flex gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Có {paymentResults.processing} giao dịch đang xử lý</p>
                    <p>Hệ thống sẽ tự động cập nhật trạng thái khi ngân hàng xác nhận.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowPaymentResultModal(false);
                  setPaymentResults(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
