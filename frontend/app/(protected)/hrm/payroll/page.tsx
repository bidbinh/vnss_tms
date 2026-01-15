"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  DollarSign,
  Calendar,
  Users,
  FileText,
  Plus,
  Play,
  Lock,
  Eye,
  Download,
  ChevronRight,
  Truck,
  Building2,
  X,
  Calculator,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface PayrollPeriod {
  id: string;
  name: string;
  month: number;
  year: number;
  start_date: string;
  end_date: string;
  payment_date: string | null;
  status: string;
  record_count: number;
  total_net_salary: number;
}

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
  // Extended fields from salary report
  base_salary?: number;
  seniority_bonus?: number;
  total_insurance?: number;
  income_tax?: number;
  advance_payment?: number;
  gross_salary?: number;
  final_net_salary?: number;
}

interface Driver {
  id: string;
  name: string;
  short_name?: string;
}

interface TripSnapshot {
  order_id: string;
  order_code: string;
  delivered_date: string | null;
  pickup_site_name: string | null;
  delivery_site_name: string | null;
  container_code: string | null;
  equipment: string | null;
  distance_km: number | null;
  is_from_port: boolean | null;
  is_flatbed: boolean;
  is_internal_cargo: boolean;
  is_holiday: boolean;
  trip_salary: number;  // Backend uses trip_salary instead of calculated_salary
  breakdown: {
    distance_salary: number;
    port_gate_fee: number;
    flatbed_tarp_fee: number;
    warehouse_bonus: number;
    daily_trip_bonus: number;
    holiday_multiplier: number;
    total: number;
  } | null;
}

interface DriverPayrollDetail {
  id: string;
  driver_id: string;
  driver_name: string | null;
  year: number;
  month: number;
  status: string;
  total_trips: number;
  total_distance_km: number;
  total_trip_salary: number;
  total_adjustments: number;
  total_bonuses: number;
  total_deductions: number;
  net_salary: number;
  trip_snapshot: { trips: TripSnapshot[] };
  adjustments: Array<{ type: string; amount: number; description: string }>;
  notes: string | null;
  hr_notes: string | null;
  created_at: string;
}

// Full salary report with deductions from /driver-salary-reports/monthly
interface SalaryDeductions {
  gross_income: number;
  social_insurance: number;
  health_insurance: number;
  unemployment_insurance: number;
  total_insurance: number;
  personal_deduction: number;
  dependent_deduction: number;
  total_deduction: number;
  taxable_income: number;
  income_tax: number;
  advance_payment: number;
  total_deductions: number;
  net_salary: number;
}

interface TripDetail {
  order_id: string;
  order_code: string;
  delivered_date: string;
  pickup_site_code?: string;
  delivery_site_code?: string;
  distance_km?: number;
  is_holiday: boolean;
  trip_number_in_day: number;
  distance_salary: number;
  port_gate_fee: number;
  flatbed_tarp_fee: number;
  warehouse_bonus: number;
  daily_trip_bonus: number;
  holiday_multiplier: number;
  total: number;
}

interface DriverSalaryReport {
  driver_id: string;
  driver_name: string;
  base_salary: number;
  trips: TripDetail[];
  trip_count: number;
  total_trip_salary: number;
  monthly_bonus: number;
  seniority_bonus: number;
  gross_salary: number;
  deductions: SalaryDeductions;
  total_salary: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CALCULATED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  PAID: "bg-purple-100 text-purple-700",
  CLOSED: "bg-gray-100 text-gray-700",
};

const DRIVER_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700", label: "Nháp" },
  PENDING_REVIEW: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Chờ xác nhận" },
  CONFIRMED: { bg: "bg-green-100", text: "text-green-700", label: "Đã xác nhận" },
  PAID: { bg: "bg-purple-100", text: "text-purple-700", label: "Đã thanh toán" },
  DISPUTED: { bg: "bg-red-100", text: "text-red-700", label: "Khiếu nại" },
};

export default function PayrollPage() {
  const t = useTranslations("hrm.payrollPage");
  const tCommon = useTranslations("common");

  // Current user role
  const [userRole, setUserRole] = useState<string | null>(null);

  // Tab state: "office" or "driver"
  const [activeTab, setActiveTab] = useState<"office" | "driver">("office");

  // Office staff payroll state
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Driver payroll state - default to previous month
  const [driverPayrolls, setDriverPayrolls] = useState<DriverPayroll[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverLoading, setDriverLoading] = useState(false);
  // Default to previous month (if current month is January, go to December of previous year)
  const [driverYear, setDriverYear] = useState(() => {
    const now = new Date();
    return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.getMonth() === 0 ? 12 : now.getMonth(); // getMonth() is 0-indexed, so this gives previous month
  });
  const [selectedDriverFilter, setSelectedDriverFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPayrollDetail, setSelectedPayrollDetail] = useState<DriverPayrollDetail | null>(null);
  const [selectedSalaryReport, setSelectedSalaryReport] = useState<DriverSalaryReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modal for new period
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    start_date: "",
    end_date: "",
    payment_date: "",
  });

  // Get user role on mount
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      setUserRole(userData.role);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "office") {
      fetchPeriods();
    } else {
      fetchDrivers();
      fetchDriverPayrolls();
    }
  }, [selectedYear, activeTab]);

  useEffect(() => {
    if (activeTab === "driver") {
      fetchDriverPayrolls();
    }
  }, [driverYear, selectedMonth, selectedDriverFilter, selectedStatusFilter]);

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<PayrollPeriod[]>(`/hrm/payroll/periods?year=${selectedYear}`);
      setPeriods(data);
    } catch (error) {
      console.error("Failed to fetch payroll periods:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const data = await apiFetch<Driver[]>("/drivers");
      setDrivers(data);
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
    }
  };

  const fetchDriverPayrolls = async () => {
    setDriverLoading(true);
    try {
      const params = new URLSearchParams({
        year: driverYear.toString(),
        month: selectedMonth.toString(),
      });
      if (selectedDriverFilter) params.append("driver_id", selectedDriverFilter);
      if (selectedStatusFilter) params.append("status", selectedStatusFilter);

      // Fetch both payrolls and salary reports in parallel
      const [payrollsData, salaryReportsData] = await Promise.all([
        apiFetch<DriverPayroll[]>(`/driver-salary-management/payrolls?${params.toString()}`),
        apiFetch<{ drivers: DriverSalaryReport[] }>(
          `/driver-salary-reports/monthly?year=${driverYear}&month=${selectedMonth}`
        ).catch(() => ({ drivers: [] })) // Fallback if salary reports fail
      ]);

      // Merge salary report data into payrolls
      // Salary report contains real-time calculation from delivered orders
      // Payroll contains snapshot at creation time
      const enrichedPayrolls = payrollsData.map(payroll => {
        // Find matching report - compare string IDs
        const report = salaryReportsData.drivers?.find(
          r => String(r.driver_id) === String(payroll.driver_id)
        );
        if (report) {
          return {
            ...payroll,
            base_salary: report.base_salary,
            seniority_bonus: report.seniority_bonus,
            total_insurance: report.deductions?.total_insurance || 0,
            income_tax: report.deductions?.income_tax || 0,
            advance_payment: report.deductions?.advance_payment || 0,
            gross_salary: report.gross_salary,
            // Use salary report's net_salary for accurate calculation with deductions
            final_net_salary: report.deductions?.net_salary || report.total_salary,
            // Override trip salary from report for consistency
            total_trip_salary: report.total_trip_salary,
            total_bonuses: report.monthly_bonus,
          };
        }
        return payroll;
      });

      setDriverPayrolls(enrichedPayrolls);
    } catch (error) {
      console.error("Failed to fetch driver payrolls:", error);
    } finally {
      setDriverLoading(false);
    }
  };

  const handleSubmitForReview = async (payrollId: string, closeModal = false) => {
    if (!confirm("Gửi bảng lương để xem xét?")) return;
    try {
      await apiFetch(`/driver-salary-management/payrolls/${payrollId}/submit`, {
        method: "POST",
      });
      fetchDriverPayrolls();
      if (closeModal) {
        setShowDetailModal(false);
        setSelectedPayrollDetail(null);
        setSelectedSalaryReport(null);
      }
    } catch (error: any) {
      const msg = error.detail || error.message || "Không thể gửi bảng lương";
      alert(msg);
    }
  };

  const handleConfirmDriverPayroll = async (payrollId: string, closeModal = false) => {
    if (!confirm("Xác nhận bảng lương này?")) return;
    try {
      await apiFetch(`/driver-salary-management/payrolls/${payrollId}/confirm-driver`, {
        method: "POST",
      });
      fetchDriverPayrolls();
      if (closeModal) {
        setShowDetailModal(false);
        setSelectedPayrollDetail(null);
        setSelectedSalaryReport(null);
      }
    } catch (error: any) {
      const msg = error.detail || error.message || "Không thể xác nhận bảng lương";
      alert(msg);
    }
  };

  const handleMarkDriverPaid = async (payrollId: string, closeModal = false) => {
    if (!confirm("Đánh dấu đã thanh toán?")) return;
    try {
      await apiFetch(`/driver-salary-management/payrolls/${payrollId}/mark-paid`, {
        method: "POST",
      });
      fetchDriverPayrolls();
      if (closeModal) {
        setShowDetailModal(false);
        setSelectedPayrollDetail(null);
        setSelectedSalaryReport(null);
      }
    } catch (error: any) {
      const msg = error.detail || error.message || "Không thể đánh dấu thanh toán";
      alert(msg);
    }
  };

  const fetchPayrollDetail = async (payrollId: string, driverId: string, year: number, month: number) => {
    setDetailLoading(true);
    try {
      // Fetch both: payroll snapshot and full salary report with deductions
      const [payrollData, reportResponse] = await Promise.all([
        apiFetch<DriverPayrollDetail>(`/driver-salary-management/payrolls/${payrollId}`),
        apiFetch<{ drivers: DriverSalaryReport[] }>(
          `/driver-salary-reports/monthly?year=${year}&month=${month}&driver_id=${driverId}`
        )
      ]);

      setSelectedPayrollDetail(payrollData);

      // Find the driver's report from the response
      const driverReport = reportResponse.drivers?.find(d => d.driver_id === driverId);
      setSelectedSalaryReport(driverReport || null);

      setShowDetailModal(true);
    } catch (error: any) {
      console.error("Failed to fetch payroll detail:", error);
      alert(error.message || "Không thể tải chi tiết bảng lương");
    } finally {
      setDetailLoading(false);
    }
  };

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await apiFetch("/hrm/payroll/periods", {
        method: "POST",
        body: JSON.stringify({
          name: `Bảng lương T${formData.month}/${formData.year}`,
          ...formData,
        }),
      });
      setShowModal(false);
      fetchPeriods();
    } catch (error: any) {
      console.error("Failed to create period:", error);
      alert(error.message || t("errors.createFailed"));
    }
  };

  const handleCalculate = async (periodId: string) => {
    if (!confirm(t("confirmations.calculate"))) return;

    try {
      const result = await apiFetch<{ message: string; created: number; errors: string[] }>(
        `/hrm/payroll/periods/${periodId}/calculate`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      alert(`${result.message}\n${result.errors.length > 0 ? `Errors: ${result.errors.join(", ")}` : ""}`);
      fetchPeriods();
    } catch (error: any) {
      console.error("Failed to calculate payroll:", error);
      alert(error.message || t("errors.calculateFailed"));
    }
  };

  const handleClose = async (periodId: string) => {
    if (!confirm(t("confirmations.close"))) return;

    try {
      await apiFetch(`/hrm/payroll/periods/${periodId}/close`, { method: "POST" });
      fetchPeriods();
    } catch (error: any) {
      console.error("Failed to close period:", error);
      alert(error.message || t("errors.closeFailed"));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  // Generate default dates when month/year changes
  const updateDefaultDates = (month: number, year: number) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const paymentDate = new Date(year, month, 5);

    setFormData({
      ...formData,
      month,
      year,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      payment_date: paymentDate.toISOString().split("T")[0],
    });
  };

  const totalNetSalary = periods.reduce((sum, p) => sum + p.total_net_salary, 0);
  const totalRecords = periods.reduce((sum, p) => sum + p.record_count, 0);

  const getDriverStatusConfig = (status: string) => {
    return DRIVER_STATUS_CONFIG[status] || DRIVER_STATUS_CONFIG.DRAFT;
  };

  const driverTotalSalary = driverPayrolls.reduce((sum, p) => sum + p.net_salary, 0);
  const driverTotalTrips = driverPayrolls.reduce((sum, p) => sum + p.total_trips, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            {[2023, 2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {t("year")} {year}
              </option>
            ))}
          </select>
          {activeTab === "office" && (
            <button
              onClick={() => {
                updateDefaultDates(new Date().getMonth() + 1, new Date().getFullYear());
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              {t("createPeriod")}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("office")}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === "office"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Building2 className="w-5 h-5" />
            Nhân viên văn phòng
          </button>
          <button
            onClick={() => setActiveTab("driver")}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === "driver"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Truck className="w-5 h-5" />
            Tài xế
          </button>
        </nav>
      </div>

      {/* Office Staff Tab Content */}
      {activeTab === "office" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t("stats.totalPeriods")}</div>
                  <div className="text-xl font-bold text-gray-900">{periods.length}</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t("stats.totalPayslips")}</div>
                  <div className="text-xl font-bold text-gray-900">{totalRecords}</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 col-span-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t("stats.totalSalary")} {selectedYear}</div>
                  <div className="text-xl font-bold text-purple-600">{formatCurrency(totalNetSalary)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Periods List */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold">{t("periodsList")} {selectedYear}</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : periods.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                {t("noPeriods")} {selectedYear}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {periods.map((period) => {
                  const statusColor = STATUS_COLORS[period.status] || STATUS_COLORS.DRAFT;

                  return (
                    <div key={period.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gray-100 rounded-lg">
                            <Calendar className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{period.name}</div>
                            <div className="text-sm text-gray-500">
                              {formatDate(period.start_date)} - {formatDate(period.end_date)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-sm text-gray-500">{t("columns.payslipCount")}</div>
                            <div className="font-medium">{period.record_count}</div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm text-gray-500">{t("columns.totalSalary")}</div>
                            <div className="font-medium text-green-600">
                              {formatCurrency(period.total_net_salary)}
                            </div>
                          </div>

                          <span
                            className={`px-3 py-1 text-sm font-medium rounded-full ${statusColor}`}
                          >
                            {t(`status.${period.status}`)}
                          </span>

                          <div className="flex items-center gap-2">
                            {period.status === "DRAFT" && (
                              <button
                                onClick={() => handleCalculate(period.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                <Play className="w-4 h-4" />
                                {t("actions.calculate")}
                              </button>
                            )}

                            {(period.status === "CALCULATED" || period.status === "APPROVED") && (
                              <>
                                <Link
                                  href={`/hrm/payroll/${period.id}`}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                >
                                  <Eye className="w-4 h-4" />
                                  {t("actions.view")}
                                </Link>
                                <button
                                  onClick={() => handleClose(period.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                                >
                                  <Lock className="w-4 h-4" />
                                  {t("actions.close")}
                                </button>
                              </>
                            )}

                            {period.status === "CLOSED" && (
                              <Link
                                href={`/hrm/payroll/${period.id}`}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              >
                                <Eye className="w-4 h-4" />
                                {t("actions.view")}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/hrm/salary-structure"
              className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{t("quickLinks.salaryStructure")}</div>
                  <div className="text-sm text-gray-500">{t("quickLinks.salaryStructureDesc")}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            <Link
              href="/hrm/advances"
              className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{t("quickLinks.advances")}</div>
                  <div className="text-sm text-gray-500">{t("quickLinks.advancesDesc")}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            <Link
              href="/hrm/reports/payroll"
              className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Download className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{t("quickLinks.reports")}</div>
                  <div className="text-sm text-gray-500">{t("quickLinks.reportsDesc")}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </>
      )}

      {/* Driver Tab Content */}
      {activeTab === "driver" && (
        <>
          {/* Driver Filters */}
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
                <select
                  value={driverYear}
                  onChange={(e) => setDriverYear(parseInt(e.target.value))}
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
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tài xế</label>
                <select
                  value={selectedDriverFilter}
                  onChange={(e) => setSelectedDriverFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Tất cả</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.short_name || d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Tất cả</option>
                  <option value="DRAFT">Nháp</option>
                  <option value="PENDING_REVIEW">Chờ xác nhận</option>
                  <option value="CONFIRMED">Đã xác nhận</option>
                  <option value="PAID">Đã thanh toán</option>
                  <option value="DISPUTED">Khiếu nại</option>
                </select>
              </div>
              <div className="flex items-end">
                <Link
                  href="/tms/driver-salary-management"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Truck className="w-4 h-4" />
                  Quản lý chi tiết
                </Link>
              </div>
            </div>
          </div>

          {/* Driver Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Số tài xế</div>
                  <div className="text-xl font-bold text-gray-900">{driverPayrolls.length}</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Tổng chuyến</div>
                  <div className="text-xl font-bold text-gray-900">{driverTotalTrips}</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 col-span-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Tổng lương T{selectedMonth}/{driverYear}</div>
                  <div className="text-xl font-bold text-purple-600">{formatCurrency(driverTotalSalary)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Payroll List */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold">Bảng lương tài xế T{selectedMonth}/{driverYear}</h2>
            </div>

            {driverLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : driverPayrolls.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                Chưa có bảng lương tài xế nào trong tháng này
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tài xế</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">Chuyến</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Lương CB</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Lương chuyến</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thưởng</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Bảo hiểm</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thuế TNCN</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tạm ứng</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thực lĩnh</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {driverPayrolls.map((payroll) => {
                      const statusConfig = getDriverStatusConfig(payroll.status);
                      return (
                        <tr key={payroll.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{payroll.driver_name || payroll.driver_code}</div>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-center">{payroll.total_trips}</td>
                          <td className="px-2 py-2 whitespace-nowrap text-right">
                            {payroll.base_salary ? formatCurrency(payroll.base_salary) : "-"}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-right">{formatCurrency(payroll.total_trip_salary)}</td>
                          <td className="px-2 py-2 whitespace-nowrap text-right text-green-600">
                            {formatCurrency(payroll.total_bonuses + (payroll.seniority_bonus || 0))}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-right text-red-600">
                            {payroll.total_insurance ? `-${formatCurrency(payroll.total_insurance)}` : "-"}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-right text-red-600">
                            {payroll.income_tax ? `-${formatCurrency(payroll.income_tax)}` : "-"}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-right text-red-600">
                            {payroll.advance_payment ? `-${formatCurrency(payroll.advance_payment)}` : "-"}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-right font-bold text-blue-600">
                            {formatCurrency(payroll.final_net_salary ?? payroll.net_salary)}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => fetchPayrollDetail(payroll.id, payroll.driver_id, payroll.year, payroll.month)}
                                disabled={detailLoading}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              {payroll.status === "DRAFT" && (
                                <button
                                  onClick={() => handleSubmitForReview(payroll.id)}
                                  className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                                >
                                  Gửi duyệt
                                </button>
                              )}
                              {payroll.status === "PENDING_REVIEW" && (
                                <button
                                  onClick={() => handleConfirmDriverPayroll(payroll.id)}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                >
                                  Xác nhận
                                </button>
                              )}
                              {payroll.status === "CONFIRMED" && (userRole === "ACCOUNTANT" || userRole === "ADMIN") && (
                                <button
                                  onClick={() => handleMarkDriverPaid(payroll.id)}
                                  className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                                  title="Chỉ Kế toán mới được đánh dấu đã thanh toán"
                                >
                                  Đã TT
                                </button>
                              )}
                              {payroll.status === "PAID" && (
                                <span className="text-xs text-gray-500">
                                  {payroll.paid_at ? formatDate(payroll.paid_at) : "Đã TT"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Period Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{t("modal.createTitle")}</h2>
            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.month")}</label>
                  <select
                    value={formData.month}
                    onChange={(e) => updateDefaultDates(parseInt(e.target.value), formData.year)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        {t("modal.month")} {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.year")}</label>
                  <select
                    value={formData.year}
                    onChange={(e) => updateDefaultDates(formData.month, parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {[2023, 2024, 2025, 2026].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.startDate")}</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.endDate")}</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.paymentDate")}
                </label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  {t("modal.cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  {t("modal.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver Payroll Detail Modal */}
      {showDetailModal && selectedPayrollDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-green-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Chi tiết lương tài xế - T{selectedPayrollDetail.month}/{selectedPayrollDetail.year}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedPayrollDetail.driver_name} • {selectedPayrollDetail.total_trips} chuyến
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPayrollDetail(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Trip List */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Chi tiết chuyến đi ({selectedPayrollDetail.total_trips} chuyến)
                </h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-center w-10">STT</th>
                        <th className="px-2 py-2 text-left">Ngày</th>
                        <th className="px-2 py-2 text-left">Mã ĐH</th>
                        <th className="px-2 py-2 text-left">Điểm lấy</th>
                        <th className="px-2 py-2 text-left">Điểm giao</th>
                        <th className="px-2 py-2 text-center">Km</th>
                        <th className="px-2 py-2 text-right">Lương KM</th>
                        <th className="px-2 py-2 text-right">Vé cổng</th>
                        <th className="px-2 py-2 text-right">Bạt</th>
                        <th className="px-2 py-2 text-right">Hàng xá</th>
                        <th className="px-2 py-2 text-right">Thưởng</th>
                        <th className="px-2 py-2 text-center">Ngày lễ</th>
                        <th className="px-2 py-2 text-right font-bold">Tổng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedPayrollDetail.trip_snapshot?.trips?.map((trip, idx) => {
                        const b = trip.breakdown;
                        return (
                          <tr key={trip.order_id} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5 text-center">{idx + 1}</td>
                            <td className="px-2 py-1.5">{formatShortDate(trip.delivered_date)}</td>
                            <td className="px-2 py-1.5 font-mono text-xs">{trip.order_code}</td>
                            <td className="px-2 py-1.5 max-w-24 truncate" title={trip.pickup_site_name || "-"}>
                              {trip.pickup_site_name || "-"}
                            </td>
                            <td className="px-2 py-1.5 max-w-24 truncate" title={trip.delivery_site_name || "-"}>
                              {trip.delivery_site_name || "-"}
                            </td>
                            <td className="px-2 py-1.5 text-center">{trip.distance_km || "-"}</td>
                            <td className="px-2 py-1.5 text-right">
                              {b ? formatCurrency(b.distance_salary) : "-"}
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              {b && b.port_gate_fee > 0 ? formatCurrency(b.port_gate_fee) : "-"}
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              {b && b.flatbed_tarp_fee > 0 ? formatCurrency(b.flatbed_tarp_fee) : "-"}
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              {b && b.warehouse_bonus > 0 ? formatCurrency(b.warehouse_bonus) : "-"}
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              {b && b.daily_trip_bonus > 0 ? formatCurrency(b.daily_trip_bonus) : "-"}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {trip.is_holiday ? (
                                <span className="text-red-600 font-bold">{b?.holiday_multiplier || 1.5}x</span>
                              ) : "-"}
                            </td>
                            <td className="px-2 py-1.5 text-right font-semibold text-green-700">
                              {formatCurrency(trip.trip_salary)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-yellow-50 font-semibold">
                      <tr>
                        <td colSpan={6} className="px-2 py-2 text-right">
                          Tổng cộng ({selectedPayrollDetail.total_trips} chuyến):
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(
                            selectedPayrollDetail.trip_snapshot?.trips?.reduce(
                              (sum, t) => sum + (t.breakdown?.distance_salary || 0), 0
                            ) || 0
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(
                            selectedPayrollDetail.trip_snapshot?.trips?.reduce(
                              (sum, t) => sum + (t.breakdown?.port_gate_fee || 0), 0
                            ) || 0
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(
                            selectedPayrollDetail.trip_snapshot?.trips?.reduce(
                              (sum, t) => sum + (t.breakdown?.flatbed_tarp_fee || 0), 0
                            ) || 0
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(
                            selectedPayrollDetail.trip_snapshot?.trips?.reduce(
                              (sum, t) => sum + (t.breakdown?.warehouse_bonus || 0), 0
                            ) || 0
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(
                            selectedPayrollDetail.trip_snapshot?.trips?.reduce(
                              (sum, t) => sum + (t.breakdown?.daily_trip_bonus || 0), 0
                            ) || 0
                          )}
                        </td>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2 text-right text-green-700">
                          {formatCurrency(selectedPayrollDetail.total_trip_salary)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Salary Breakdown - Use data from salary report API if available */}
              <div className="grid grid-cols-2 gap-6">
                {/* Income */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Thu nhập
                  </h4>
                  <div className="space-y-2 text-sm">
                    {selectedSalaryReport ? (
                      <>
                        <div className="flex justify-between">
                          <span>Lương cơ bản:</span>
                          <span className="font-medium">{formatCurrency(selectedSalaryReport.base_salary)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lương chuyến:</span>
                          <span className="font-medium">{formatCurrency(selectedSalaryReport.total_trip_salary)}</span>
                        </div>
                        {selectedSalaryReport.seniority_bonus > 0 && (
                          <div className="flex justify-between">
                            <span>Thưởng thâm niên:</span>
                            <span className="font-medium">{formatCurrency(selectedSalaryReport.seniority_bonus)}</span>
                          </div>
                        )}
                        {selectedSalaryReport.monthly_bonus > 0 && (
                          <div className="flex justify-between">
                            <span>Thưởng sản lượng ({selectedSalaryReport.trip_count} chuyến):</span>
                            <span className="font-medium">{formatCurrency(selectedSalaryReport.monthly_bonus)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-green-200 font-semibold">
                          <span>Tổng thu nhập:</span>
                          <span className="text-green-700">{formatCurrency(selectedSalaryReport.gross_salary)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>Lương chuyến:</span>
                          <span className="font-medium">{formatCurrency(selectedPayrollDetail.total_trip_salary)}</span>
                        </div>
                        {selectedPayrollDetail.total_bonuses > 0 && (
                          <div className="flex justify-between">
                            <span>Thưởng sản lượng:</span>
                            <span className="font-medium text-green-600">+{formatCurrency(selectedPayrollDetail.total_bonuses)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-green-200 font-semibold">
                          <span>Tổng thu nhập:</span>
                          <span className="text-green-700">
                            {formatCurrency(selectedPayrollDetail.total_trip_salary + selectedPayrollDetail.total_bonuses)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Deductions */}
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-red-600" />
                    Khấu trừ
                  </h4>
                  <div className="space-y-2 text-sm">
                    {selectedSalaryReport?.deductions ? (
                      <>
                        <div className="flex justify-between">
                          <span>BHXH, BHYT, BHTN:</span>
                          <span className="font-medium text-red-600">{formatCurrency(selectedSalaryReport.deductions.total_insurance)}</span>
                        </div>
                        <div className="text-xs text-gray-500 ml-2 space-y-0.5">
                          <div className="flex justify-between">
                            <span>- BHXH (8%):</span>
                            <span>{formatCurrency(selectedSalaryReport.deductions.social_insurance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>- BHYT (1.5%):</span>
                            <span>{formatCurrency(selectedSalaryReport.deductions.health_insurance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>- BHTN (1%):</span>
                            <span>{formatCurrency(selectedSalaryReport.deductions.unemployment_insurance)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span>Thuế TNCN:</span>
                          <span className={selectedSalaryReport.deductions.income_tax > 0 ? "font-medium text-red-600" : "text-gray-500"}>
                            {selectedSalaryReport.deductions.income_tax > 0 ? formatCurrency(selectedSalaryReport.deductions.income_tax) : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tạm ứng:</span>
                          <span className={selectedSalaryReport.deductions.advance_payment > 0 ? "font-medium text-red-600" : "text-gray-500"}>
                            {selectedSalaryReport.deductions.advance_payment > 0 ? formatCurrency(selectedSalaryReport.deductions.advance_payment) : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-red-200 font-semibold">
                          <span>Tổng khấu trừ:</span>
                          <span className="text-red-700">({formatCurrency(selectedSalaryReport.deductions.total_deductions)})</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {selectedPayrollDetail.total_deductions > 0 ? (
                          <div className="flex justify-between">
                            <span>Tổng khấu trừ:</span>
                            <span className="font-medium text-red-600">-{formatCurrency(selectedPayrollDetail.total_deductions)}</span>
                          </div>
                        ) : (
                          <div className="text-gray-500 italic">Không có khấu trừ</div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-red-200 font-semibold">
                          <span>Tổng khấu trừ:</span>
                          <span className="text-red-700">({formatCurrency(selectedPayrollDetail.total_deductions)})</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Adjustments List */}
              {selectedPayrollDetail.adjustments && selectedPayrollDetail.adjustments.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Điều chỉnh</h4>
                  <div className="space-y-2">
                    {selectedPayrollDetail.adjustments.map((adj, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{adj.description || adj.type}</span>
                        <span className={adj.amount >= 0 ? "text-green-600" : "text-red-600"}>
                          {adj.amount >= 0 ? "+" : ""}{formatCurrency(adj.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Net Salary */}
              <div className="bg-gradient-to-r from-green-100 to-green-200 rounded-lg p-4 flex justify-between items-center">
                <span className="font-bold text-lg text-gray-800">THỰC LĨNH:</span>
                <span className="font-bold text-2xl text-green-700">
                  {formatCurrency(selectedSalaryReport?.total_salary ?? selectedPayrollDetail.net_salary)} VNĐ
                </span>
              </div>

              {/* Notes */}
              {(selectedPayrollDetail.notes || selectedPayrollDetail.hr_notes) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Ghi chú</h4>
                  {selectedPayrollDetail.notes && (
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Ghi chú:</strong> {selectedPayrollDetail.notes}
                    </p>
                  )}
                  {selectedPayrollDetail.hr_notes && (
                    <p className="text-sm text-gray-600">
                      <strong>Ghi chú HR:</strong> {selectedPayrollDetail.hr_notes}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between px-6 py-4 border-t bg-gray-50">
              <div className="flex items-center gap-2">
                {/* Status badge */}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDriverStatusConfig(selectedPayrollDetail.status).bg} ${getDriverStatusConfig(selectedPayrollDetail.status).text}`}>
                  {getDriverStatusConfig(selectedPayrollDetail.status).label}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedPayrollDetail(null);
                    setSelectedSalaryReport(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
                >
                  Đóng
                </button>
                {/* Action buttons based on status */}
                {selectedPayrollDetail.status === "DRAFT" && (
                  <button
                    onClick={() => handleSubmitForReview(selectedPayrollDetail.id, true)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Gửi duyệt
                  </button>
                )}
                {selectedPayrollDetail.status === "PENDING_REVIEW" && (
                  <button
                    onClick={() => handleConfirmDriverPayroll(selectedPayrollDetail.id, true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Xác nhận
                  </button>
                )}
                {selectedPayrollDetail.status === "CONFIRMED" && (userRole === "ACCOUNTANT" || userRole === "ADMIN") && (
                  <button
                    onClick={() => handleMarkDriverPaid(selectedPayrollDetail.id, true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    title="Chỉ Kế toán mới được đánh dấu đã thanh toán"
                  >
                    <DollarSign className="w-4 h-4" />
                    Đánh dấu đã thanh toán
                  </button>
                )}
                {selectedPayrollDetail.status !== "PAID" && (
                  <Link
                    href={`/tms/driver-salary-management?payroll_id=${selectedPayrollDetail.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Chỉnh sửa chi tiết
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
