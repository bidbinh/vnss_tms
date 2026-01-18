"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { getDriverColor } from "@/lib/utils";
import { History } from "lucide-react";
import StatusLogModal from "@/components/tms/StatusLogModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// Sort configuration type
type SortField = 'order_code' | 'driver_id' | 'customer_requested_date' | 'pickup_site_name' | 'delivery_site_name' | 'container_code' | 'distance_km' | 'trips_per_day' | 'calculated_salary';
type SortDirection = 'asc' | 'desc';

// Column widths storage key
const COLUMN_WIDTHS_KEY = 'driver-salary-management-column-widths';

// Default column widths (in pixels)
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  order_code: 80,
  driver_id: 70,
  customer_requested_date: 100,
  pickup_site_name: 140,
  delivery_site_name: 200,
  container_code: 110,
  distance_km: 80,
  is_from_port: 70,
  is_flatbed: 70,
  is_internal_cargo: 70,
  is_holiday: 70,
  trips_per_day: 90,
  calculated_salary: 100,
};

interface Driver {
  id: string;
  name: string;
  code?: string;
  short_name?: string;
}

interface Adjustment {
  reason: string;
  amount: number;
}

interface Payroll {
  id: string;
  driver_id: string;
  driver_name: string | null;
  driver_code: string | null;
  year: number;
  month: number;
  status: string;
  trip_snapshot: any;
  adjustments: Adjustment[];
  total_trips: number;
  total_distance_km: number;
  total_trip_salary: number;
  total_adjustments: number;
  total_bonuses: number;
  total_deductions: number;
  net_salary: number;
  submitted_at: string | null;
  confirmed_by_driver_at: string | null;
  confirmed_by_hr_at: string | null;
  paid_at: string | null;
  notes: string | null;
  driver_notes: string | null;
  hr_notes: string | null;
  created_at: string;
  updated_at: string;
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
  trips: any[];
  trip_count: number;
  total_trip_salary: number;
  monthly_bonus: number;
  seniority_bonus: number;
  gross_salary: number;
  deductions: {
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
  };
  total_salary: number;
}

interface DriverSalaryTrip {
  id: string;
  order_code: string;
  customer_id: string;
  driver_id: string | null;
  pickup_text: string | null;
  delivery_text: string | null;
  pickup_site_id: string | null;
  delivery_site_id: string | null;
  pickup_site_name: string | null;
  delivery_site_name: string | null;
  equipment: string | null;
  qty: number;
  container_code: string | null;
  cargo_note: string | null;
  distance_km: number | null;

  // Editable flags
  is_flatbed: boolean | null;
  is_internal_cargo: boolean | null;
  is_holiday: boolean | null;

  // Auto-calculated fields
  customer_requested_date: string | null;  // Cust Date - Ngày giao hàng
  delivered_date: string | null;
  is_from_port: boolean | null;
  trips_per_day: number | null;
  trips_per_month: number | null;
  calculated_salary: number | null;
  salary_breakdown: {
    distance_salary: number;
    port_gate_fee: number;
    flatbed_tarp_fee: number;
    warehouse_bonus: number;
    daily_trip_bonus: number;
    holiday_multiplier: number;
    total: number;
  } | null;

  created_at: string | null;
  updated_at: string | null;
}

export default function DriverSalaryManagementPage() {
  const t = useTranslations("tms.driverSalaryPage");
  // Default to previous month (if current month is January, go to December of previous year)
  const [year, setYear] = useState(() => {
    const now = new Date();
    return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  });
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return now.getMonth() === 0 ? 12 : now.getMonth(); // getMonth() is 0-indexed
  });
  const [selectedDriver, setSelectedDriver] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<DriverSalaryTrip[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  // Payroll management state
  const [showPayrollPanel, setShowPayrollPanel] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [payrollNotes, setPayrollNotes] = useState("");
  const [generatingPayrolls, setGeneratingPayrolls] = useState(false);

  // Missing KM modal state
  const [showMissingKmModal, setShowMissingKmModal] = useState(false);
  const [missingKmData, setMissingKmData] = useState<{
    message: string;
    total_missing: number;
    missing_km_trips: Array<{
      driver_id: string;
      driver_name: string;
      driver_code: string | null;
      trips: Array<{
        order_id: string;
        order_code: string;
        pickup_site: string | null;
        delivery_site: string | null;
        delivered_date: string | null;
        container_code: string | null;
      }>;
    }>;
  } | null>(null);

  // Current user role
  const [userRole, setUserRole] = useState<string | null>(null);

  // Status Log Modal state
  const [statusLogModal, setStatusLogModal] = useState<{
    isOpen: boolean;
    orderId: string;
    orderCode: string;
  }>({ isOpen: false, orderId: "", orderCode: "" });

  // Sort state - default to customer_requested_date (Cust Date)
  const [sortField, setSortField] = useState<SortField>('customer_requested_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Column widths state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);

  // Resize state
  const [resizing, setResizing] = useState<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // Load column widths from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(COLUMN_WIDTHS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS, ...parsed });
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save column widths to localStorage
  const saveColumnWidths = useCallback((widths: Record<string, number>) => {
    localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(widths));
  }, []);

  // Handle column resize
  const handleResizeStart = useCallback((columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(columnKey);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidths[columnKey] || DEFAULT_COLUMN_WIDTHS[columnKey] || 100;
  }, [columnWidths]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing) return;

    const diff = e.clientX - resizeStartX.current;
    const newWidth = Math.max(50, resizeStartWidth.current + diff); // Min 50px

    setColumnWidths(prev => ({
      ...prev,
      [resizing]: newWidth
    }));
  }, [resizing]);

  const handleResizeEnd = useCallback(() => {
    if (resizing) {
      saveColumnWidths(columnWidths);
      setResizing(null);
    }
  }, [resizing, columnWidths, saveColumnWidths]);

  // Add global mouse event listeners for resize
  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing, handleResizeMove, handleResizeEnd]);

  // Get user role on mount
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserRole(userData.role);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    try {
      const res = await fetch(`${API_BASE_URL}/drivers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch drivers");
      const data = await res.json();
      setDrivers(data);
    } catch (err: any) {
      console.error(err);
    }
  }

  async function fetchTrips() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
      });

      if (selectedDriver) {
        params.append("driver_id", selectedDriver);
      }

      const res = await fetch(`${API_BASE_URL}/driver-salary-management/trips?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to fetch trips");
      }

      const data = await res.json();
      setTrips(data);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateTripFlags(tripId: string, field: string, value: boolean | null) {
    setSaving(tripId);
    try {
      const payload: any = {};
      payload[field] = value;

      const res = await fetch(`${API_BASE_URL}/driver-salary-management/trips/${tripId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to update trip");
      }

      const updated = await res.json();
      setTrips(trips.map(t => t.id === tripId ? updated : t));
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(null);
    }
  }

  async function fetchPayrolls() {
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
      });

      if (selectedDriver) {
        params.append("driver_id", selectedDriver);
      }

      // Fetch both payrolls and salary reports in parallel
      const [payrollsRes, salaryReportsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/driver-salary-management/payrolls?${params}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        }),
        fetch(`${API_BASE_URL}/driver-salary-reports/monthly?year=${year}&month=${month}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        }).catch(() => null)  // Fallback if salary reports fail
      ]);

      if (!payrollsRes.ok) return;
      const payrollsData: Payroll[] = await payrollsRes.json();

      // Parse salary reports if available
      let salaryReports: DriverSalaryReport[] = [];
      if (salaryReportsRes && salaryReportsRes.ok) {
        const reportData = await salaryReportsRes.json();
        salaryReports = reportData.drivers || [];
      }

      // Enrich payrolls with salary report data
      const enrichedPayrolls = payrollsData.map(payroll => {
        const report = salaryReports.find(r => String(r.driver_id) === String(payroll.driver_id));
        if (report) {
          return {
            ...payroll,
            base_salary: report.base_salary,
            seniority_bonus: report.seniority_bonus,
            total_insurance: report.deductions?.total_insurance || 0,
            income_tax: report.deductions?.income_tax || 0,
            advance_payment: report.deductions?.advance_payment || 0,
            gross_salary: report.gross_salary,
            final_net_salary: report.deductions?.net_salary || report.total_salary,
            // Also update trip salary and bonuses from report for consistency
            total_trip_salary: report.total_trip_salary,
            total_bonuses: report.monthly_bonus,
          };
        }
        return payroll;
      });

      setPayrolls(enrichedPayrolls);
    } catch (err) {
      console.error("Failed to fetch payrolls:", err);
    }
  }

  async function generateAllPayrolls() {
    if (!confirm(t("confirmGenerateAll"))) return;

    setGeneratingPayrolls(true);
    try {
      const res = await fetch(`${API_BASE_URL}/driver-salary-management/payrolls/generate-all?year=${year}&month=${month}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) {
        const error = await res.json();

        // Check if this is a MISSING_KM error
        if (error.detail && typeof error.detail === 'object' && error.detail.code === 'MISSING_KM') {
          setMissingKmData(error.detail);
          setShowMissingKmModal(true);
          return;
        }

        throw new Error(typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail) || "Failed to generate payrolls");
      }

      const result = await res.json();
      alert(result.message);
      fetchPayrolls();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setGeneratingPayrolls(false);
    }
  }

  async function createPayroll(driverId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/driver-salary-management/payrolls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          driver_id: driverId,
          year,
          month,
          adjustments: [],
          notes: "",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to create payroll");
      }

      const newPayroll = await res.json();
      setPayrolls([...payrolls, newPayroll]);
      setSelectedPayroll(newPayroll);
      setAdjustments(newPayroll.adjustments || []);
      setPayrollNotes(newPayroll.notes || "");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function updatePayroll() {
    if (!selectedPayroll) return;

    setSaving(selectedPayroll.id);
    try {
      const res = await fetch(`${API_BASE_URL}/driver-salary-management/payrolls/${selectedPayroll.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          adjustments,
          notes: payrollNotes,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to update payroll");
      }

      const updated = await res.json();
      setPayrolls(payrolls.map(p => p.id === updated.id ? updated : p));
      setSelectedPayroll(updated);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(null);
    }
  }

  async function submitPayroll(payrollId: string) {
    if (!confirm(t("confirmSubmit"))) return;

    try {
      const res = await fetch(`${API_BASE_URL}/driver-salary-management/payrolls/${payrollId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to submit payroll");
      }

      fetchPayrolls();
      alert(t("submitSuccess"));
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function confirmPayroll(payrollId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/driver-salary-management/payrolls/${payrollId}/confirm-driver`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to confirm payroll");
      }

      fetchPayrolls();
      alert(t("confirmSuccess"));
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function markPaid(payrollId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/driver-salary-management/payrolls/${payrollId}/mark-paid`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to mark as paid");
      }

      fetchPayrolls();
      alert(t("paidSuccess"));
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function deletePayroll(payrollId: string) {
    if (!confirm(t("confirmDelete"))) return;

    try {
      const res = await fetch(`${API_BASE_URL}/driver-salary-management/payrolls/${payrollId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to delete payroll");
      }

      setPayrolls(payrolls.filter(p => p.id !== payrollId));
      if (selectedPayroll?.id === payrollId) {
        setSelectedPayroll(null);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  function addAdjustment() {
    setAdjustments([...adjustments, { reason: "", amount: 0 }]);
  }

  function removeAdjustment(index: number) {
    setAdjustments(adjustments.filter((_, i) => i !== index));
  }

  function updateAdjustment(index: number, field: 'reason' | 'amount', value: string | number) {
    const updated = [...adjustments];
    if (field === 'amount') {
      updated[index].amount = typeof value === 'string' ? parseInt(value) || 0 : value;
    } else {
      updated[index].reason = value as string;
    }
    setAdjustments(updated);
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING_REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'PAID': return 'bg-blue-100 text-blue-800';
      case 'DISPUTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'DRAFT': return t("status.draft");
      case 'PENDING_REVIEW': return t("status.pendingReview");
      case 'CONFIRMED': return t("status.confirmed");
      case 'PAID': return t("status.paid");
      case 'DISPUTED': return t("status.disputed");
      default: return status;
    }
  }

  function formatCurrency(amount: number | null): string {
    if (amount === null) return "-";
    return amount.toLocaleString("vi-VN");
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  function getDriverInitials(driverId: string | null): string {
    if (!driverId) return "-";
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return "-";
    if (driver.short_name) return driver.short_name;
    const words = driver.name.trim().split(/\s+/);
    return words.map(w => w.charAt(0).toUpperCase()).join("");
  }


  function renderCheckbox(trip: DriverSalaryTrip, field: 'is_flatbed' | 'is_internal_cargo' | 'is_holiday') {
    const value = trip[field];
    const isSaving = saving === trip.id;

    let isChecked = value === true;
    if (value === null && trip.salary_breakdown) {
      if (field === 'is_holiday') {
        isChecked = trip.salary_breakdown.holiday_multiplier > 1;
      } else if (field === 'is_flatbed') {
        isChecked = trip.salary_breakdown.flatbed_tarp_fee > 0;
      } else if (field === 'is_internal_cargo') {
        isChecked = trip.salary_breakdown.warehouse_bonus > 0;
      }
    }

    return (
      <input
        type="checkbox"
        checked={isChecked}
        disabled={isSaving}
        onChange={(e) => {
          const newValue = e.target.checked ? true : false;
          updateTripFlags(trip.id, field, newValue);
        }}
        className="w-5 h-5 cursor-pointer"
      />
    );
  }

  // Sort function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(['customer_requested_date', 'distance_km', 'trips_per_day', 'calculated_salary'].includes(field) ? 'desc' : 'asc');
    }
  };

  // Sorted trips
  const sortedTrips = useMemo(() => {
    const sorted = [...trips].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'order_code':
          aVal = a.order_code || '';
          bVal = b.order_code || '';
          break;
        case 'driver_id':
          const driverA = drivers.find(d => d.id === a.driver_id);
          const driverB = drivers.find(d => d.id === b.driver_id);
          aVal = driverA?.name || '';
          bVal = driverB?.name || '';
          break;
        case 'customer_requested_date':
          aVal = a.customer_requested_date || '';
          bVal = b.customer_requested_date || '';
          break;
        case 'pickup_site_name':
          aVal = a.pickup_site_name || a.pickup_text || '';
          bVal = b.pickup_site_name || b.pickup_text || '';
          break;
        case 'delivery_site_name':
          aVal = a.delivery_site_name || a.delivery_text || '';
          bVal = b.delivery_site_name || b.delivery_text || '';
          break;
        case 'container_code':
          aVal = a.container_code || '';
          bVal = b.container_code || '';
          break;
        case 'distance_km':
          aVal = a.distance_km || 0;
          bVal = b.distance_km || 0;
          break;
        case 'trips_per_day':
          aVal = a.trips_per_day || 0;
          bVal = b.trips_per_day || 0;
          break;
        case 'calculated_salary':
          aVal = a.calculated_salary || 0;
          bVal = b.calculated_salary || 0;
          break;
        default:
          aVal = '';
          bVal = '';
      }

      if (typeof aVal === 'string') {
        const comparison = aVal.localeCompare(bVal, 'vi');
        return sortDirection === 'asc' ? comparison : -comparison;
      } else {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    return sorted;
  }, [trips, sortField, sortDirection, drivers]);

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-gray-300 ml-1">↕</span>;
    }
    return (
      <span className="text-blue-600 ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Resizable header component
  const ResizableHeader = ({
    columnKey,
    sortable = false,
    sortKey,
    children,
    className = ''
  }: {
    columnKey: string;
    sortable?: boolean;
    sortKey?: SortField;
    children: React.ReactNode;
    className?: string;
  }) => {
    const width = columnWidths[columnKey] || DEFAULT_COLUMN_WIDTHS[columnKey] || 100;

    return (
      <th
        className={`px-2 py-2 border border-gray-300 relative font-bold text-gray-700 ${sortable ? 'cursor-pointer hover:bg-gray-200' : ''} select-none ${className}`}
        style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
        onClick={sortable && sortKey ? () => handleSort(sortKey) : undefined}
      >
        <div className="flex items-center justify-center overflow-hidden">
          <span className="truncate">{children}</span>
          {sortable && sortKey && <SortIndicator field={sortKey} />}
        </div>
        {/* Resize handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10"
          onMouseDown={(e) => {
            e.stopPropagation();
            handleResizeStart(columnKey, e);
          }}
        />
      </th>
    );
  };

  const totalSalary = sortedTrips.reduce((sum, trip) => sum + (trip.calculated_salary || 0), 0);

  return (
    <div className="p-6 max-w-full overflow-x-hidden">
      <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("filters.driver")}</label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">{t("filters.allDrivers")}</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("filters.year")}</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("filters.month")}</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full border rounded px-3 py-2"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {t("filters.monthOption", { month: i + 1 })}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => { fetchTrips(); fetchPayrolls(); }}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? t("loading") : t("viewTrips")}
            </button>
            <button
              onClick={() => setShowPayrollPanel(!showPayrollPanel)}
              className={`px-4 py-2 rounded ${showPayrollPanel ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'} hover:bg-purple-700 hover:text-white`}
            >
              {t("payroll.toggle")}
            </button>
          </div>
        </div>
      </div>

      {/* Payroll Management Panel */}
      {showPayrollPanel && (
        <div className="bg-purple-50 p-4 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-purple-800">{t("payroll.title")}</h2>
            <button
              onClick={generateAllPayrolls}
              disabled={generatingPayrolls}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              {generatingPayrolls ? t("payroll.generating") : t("payroll.generateAll")}
            </button>
          </div>

          {/* Payrolls List */}
          {payrolls.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-purple-100">
                  <tr>
                    <th className="px-2 py-2 text-left border">Tài xế</th>
                    <th className="px-2 py-2 text-center border">Chuyến</th>
                    <th className="px-2 py-2 text-right border">Lương CB</th>
                    <th className="px-2 py-2 text-right border">Lương chuyến</th>
                    <th className="px-2 py-2 text-right border">Thưởng</th>
                    <th className="px-2 py-2 text-right border">Bảo hiểm</th>
                    <th className="px-2 py-2 text-right border">Thuế TNCN</th>
                    <th className="px-2 py-2 text-right border">Tạm ứng</th>
                    <th className="px-2 py-2 text-right border">Thực lĩnh</th>
                    <th className="px-2 py-2 text-center border">Trạng thái</th>
                    <th className="px-2 py-2 text-center border">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((p) => (
                    <tr key={p.id} className={`hover:bg-purple-50 ${selectedPayroll?.id === p.id ? 'bg-purple-100' : ''}`}>
                      <td className="px-2 py-2 border font-medium">{p.driver_name || p.driver_code}</td>
                      <td className="px-2 py-2 border text-center">{p.total_trips}</td>
                      <td className="px-2 py-2 border text-right">
                        {p.base_salary ? formatCurrency(p.base_salary) : "-"}
                      </td>
                      <td className="px-2 py-2 border text-right">{formatCurrency(p.total_trip_salary)}</td>
                      <td className="px-2 py-2 border text-right text-green-600">
                        {formatCurrency(p.total_bonuses + (p.seniority_bonus || 0))}
                      </td>
                      <td className="px-2 py-2 border text-right text-red-600">
                        {p.total_insurance ? `-${formatCurrency(p.total_insurance)}` : "-"}
                      </td>
                      <td className="px-2 py-2 border text-right text-red-600">
                        {p.income_tax ? `-${formatCurrency(p.income_tax)}` : "-"}
                      </td>
                      <td className="px-2 py-2 border text-right text-red-600">
                        {p.advance_payment ? `-${formatCurrency(p.advance_payment)}` : "-"}
                      </td>
                      <td className="px-2 py-2 border text-right font-bold text-blue-600">
                        {formatCurrency(p.final_net_salary ?? p.net_salary)}
                      </td>
                      <td className="px-2 py-2 border text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(p.status)}`}>
                          {getStatusLabel(p.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 border text-center">
                        <div className="flex gap-1 justify-center">
                          {p.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedPayroll(p);
                                  setAdjustments(p.adjustments || []);
                                  setPayrollNotes(p.notes || "");
                                }}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                {t("payroll.edit")}
                              </button>
                              <button
                                onClick={() => submitPayroll(p.id)}
                                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                {t("payroll.submit")}
                              </button>
                              <button
                                onClick={() => deletePayroll(p.id)}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                {t("payroll.delete")}
                              </button>
                            </>
                          )}
                          {p.status === 'PENDING_REVIEW' && (
                            <button
                              onClick={() => confirmPayroll(p.id)}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              {t("payroll.confirm")}
                            </button>
                          )}
                          {p.status === 'CONFIRMED' && (userRole === 'ACCOUNTANT' || userRole === 'ADMIN') && (
                            <button
                              onClick={() => markPaid(p.id)}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              title="Chỉ Kế toán mới được đánh dấu đã thanh toán"
                            >
                              {t("payroll.markPaid")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">{t("payroll.noPayrolls")}</p>
          )}

          {/* Edit Payroll Modal */}
          {selectedPayroll && selectedPayroll.status === 'DRAFT' && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
              <h3 className="font-bold mb-3">{t("payroll.editTitle", { name: selectedPayroll.driver_name })}</h3>

              {/* Adjustments */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-medium">{t("payroll.adjustmentsLabel")}</label>
                  <button
                    onClick={addAdjustment}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    + {t("payroll.addAdjustment")}
                  </button>
                </div>

                {adjustments.map((adj, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={adj.reason}
                      onChange={(e) => updateAdjustment(idx, 'reason', e.target.value)}
                      placeholder={t("payroll.reasonPlaceholder")}
                      className="flex-1 border rounded px-3 py-2"
                    />
                    <input
                      type="number"
                      value={adj.amount}
                      onChange={(e) => updateAdjustment(idx, 'amount', e.target.value)}
                      placeholder={t("payroll.amountPlaceholder")}
                      className="w-40 border rounded px-3 py-2"
                    />
                    <button
                      onClick={() => removeAdjustment(idx)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {adjustments.length === 0 && (
                  <p className="text-gray-400 text-sm">{t("payroll.noAdjustments")}</p>
                )}
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="font-medium block mb-2">{t("payroll.notesLabel")}</label>
                <textarea
                  value={payrollNotes}
                  onChange={(e) => setPayrollNotes(e.target.value)}
                  placeholder={t("payroll.notesPlaceholder")}
                  className="w-full border rounded px-3 py-2 h-20"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={updatePayroll}
                  disabled={saving === selectedPayroll.id}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saving === selectedPayroll.id ? t("saving") : t("payroll.save")}
                </button>
                <button
                  onClick={() => setSelectedPayroll(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  {t("payroll.cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {trips.length > 0 && (
        <div className="bg-green-50 p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-600">{t("summary.totalTrips")}</div>
              <div className="text-2xl font-bold">{trips.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">{t("summary.tripsThisMonth")}</div>
              <div className="text-2xl font-bold">{trips[0]?.trips_per_month || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">{t("summary.totalTripSalary")}</div>
              <div className="text-2xl font-bold">{formatCurrency(totalSalary)} {t("currency")}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">{t("summary.status")}</div>
              <div className="text-sm font-semibold text-blue-600">{saving ? t("saving") : t("saved")}</div>
            </div>
          </div>
        </div>
      )}

      {/* Trips Table */}
      {trips.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-auto max-h-[calc(100vh-380px)]">
          <table className="border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <ResizableHeader columnKey="order_code" sortable sortKey="order_code" className="text-left">{t("columns.orderCode")}</ResizableHeader>
                <ResizableHeader columnKey="driver_id" sortable sortKey="driver_id" className="text-center">{t("columns.driver")}</ResizableHeader>
                <ResizableHeader columnKey="customer_requested_date" sortable sortKey="customer_requested_date" className="text-left">{t("columns.deliveryDate")}</ResizableHeader>
                <ResizableHeader columnKey="pickup_site_name" sortable sortKey="pickup_site_name" className="text-left">{t("columns.pickupSite")}</ResizableHeader>
                <ResizableHeader columnKey="delivery_site_name" sortable sortKey="delivery_site_name" className="text-left">{t("columns.deliverySite")}</ResizableHeader>
                <ResizableHeader columnKey="container_code" sortable sortKey="container_code" className="text-center">{t("columns.container")}</ResizableHeader>
                <ResizableHeader columnKey="distance_km" sortable sortKey="distance_km" className="text-center">{t("columns.km")}</ResizableHeader>
                <ResizableHeader columnKey="is_from_port" className="text-center">{t("columns.fromPort")}</ResizableHeader>
                <ResizableHeader columnKey="is_flatbed" className="text-center">{t("columns.flatbed")}</ResizableHeader>
                <ResizableHeader columnKey="is_internal_cargo" className="text-center">{t("columns.internalCargo")}</ResizableHeader>
                <ResizableHeader columnKey="is_holiday" className="text-center">{t("columns.holiday")}</ResizableHeader>
                <ResizableHeader columnKey="trips_per_day" sortable sortKey="trips_per_day" className="text-center">{t("columns.tripsPerDay")}</ResizableHeader>
                <ResizableHeader columnKey="calculated_salary" sortable sortKey="calculated_salary" className="text-right">{t("columns.tripSalary")}</ResizableHeader>
              </tr>
            </thead>
            <tbody>
              {sortedTrips.map((trip) => {
                const breakdown = trip.salary_breakdown;
                return (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 border border-gray-300 overflow-hidden whitespace-nowrap" style={{ width: columnWidths.order_code, maxWidth: columnWidths.order_code }}>
                      <div className="flex items-center gap-1">
                        <span className="text-ellipsis overflow-hidden">{trip.order_code}</span>
                        <button
                          onClick={() => setStatusLogModal({ isOpen: true, orderId: trip.id, orderCode: trip.order_code })}
                          className="p-0.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded flex-shrink-0"
                          title="Xem lịch sử trạng thái"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center border border-gray-300 overflow-hidden whitespace-nowrap" style={{ width: columnWidths.driver_id, maxWidth: columnWidths.driver_id }}>
                      <span className={`font-semibold ${getDriverColor(trip.driver_id).bg} ${getDriverColor(trip.driver_id).text} px-2 py-1 rounded`}>
                        {getDriverInitials(trip.driver_id)}
                      </span>
                    </td>
                    <td className="px-2 py-2 border border-gray-300 overflow-hidden whitespace-nowrap" style={{ width: columnWidths.customer_requested_date, maxWidth: columnWidths.customer_requested_date }}>{formatDate(trip.customer_requested_date)}</td>
                    <td className="px-2 py-2 border border-gray-300 overflow-hidden whitespace-nowrap text-ellipsis" style={{ width: columnWidths.pickup_site_name, maxWidth: columnWidths.pickup_site_name }}>{trip.pickup_site_name || trip.pickup_text || "-"}</td>
                    <td className="px-2 py-2 border border-gray-300 overflow-hidden whitespace-nowrap text-ellipsis" style={{ width: columnWidths.delivery_site_name, maxWidth: columnWidths.delivery_site_name }}>{trip.delivery_site_name || trip.delivery_text || "-"}</td>
                    <td className="px-2 py-2 text-center border border-gray-300 overflow-hidden whitespace-nowrap text-ellipsis" style={{ width: columnWidths.container_code, maxWidth: columnWidths.container_code }}>{trip.container_code || "-"}</td>
                    <td className="px-2 py-2 text-center border border-gray-300 overflow-hidden whitespace-nowrap" style={{ width: columnWidths.distance_km, maxWidth: columnWidths.distance_km }}>
                      <div>{trip.distance_km || "-"}</div>
                      {breakdown && breakdown.distance_salary > 0 && (
                        <div className="text-green-600 font-semibold text-ellipsis overflow-hidden">+{formatCurrency(breakdown.distance_salary)}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center border border-gray-300 overflow-hidden whitespace-nowrap" style={{ width: columnWidths.is_from_port, maxWidth: columnWidths.is_from_port }}>
                      {trip.is_from_port && (
                        <>
                          <div>✓</div>
                          {breakdown && breakdown.port_gate_fee > 0 && (
                            <div className="text-green-600 font-semibold text-ellipsis overflow-hidden">+{formatCurrency(breakdown.port_gate_fee)}</div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center border border-gray-300 overflow-hidden whitespace-nowrap" style={{ width: columnWidths.is_flatbed, maxWidth: columnWidths.is_flatbed }}>
                      {renderCheckbox(trip, 'is_flatbed')}
                      {breakdown && breakdown.flatbed_tarp_fee > 0 && (
                        <div className="text-green-600 font-semibold text-ellipsis overflow-hidden">+{formatCurrency(breakdown.flatbed_tarp_fee)}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center border border-gray-300 overflow-hidden whitespace-nowrap" style={{ width: columnWidths.is_internal_cargo, maxWidth: columnWidths.is_internal_cargo }}>
                      {renderCheckbox(trip, 'is_internal_cargo')}
                      {breakdown && breakdown.warehouse_bonus > 0 && (
                        <div className="text-green-600 font-semibold text-ellipsis overflow-hidden">+{formatCurrency(breakdown.warehouse_bonus)}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center border border-gray-300 overflow-hidden whitespace-nowrap" style={{ width: columnWidths.is_holiday, maxWidth: columnWidths.is_holiday }}>
                      {renderCheckbox(trip, 'is_holiday')}
                      {breakdown && breakdown.holiday_multiplier > 1 && (
                        <div className="text-red-600 font-semibold">x{breakdown.holiday_multiplier}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center border border-gray-300 overflow-hidden whitespace-nowrap" style={{ width: columnWidths.trips_per_day, maxWidth: columnWidths.trips_per_day }}>
                      <div>{trip.trips_per_day || "-"}</div>
                      {breakdown && breakdown.daily_trip_bonus > 0 && (
                        <div className="text-green-600 font-semibold text-ellipsis overflow-hidden">+{formatCurrency(breakdown.daily_trip_bonus)}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right border border-gray-300 font-bold text-blue-600 overflow-hidden whitespace-nowrap" style={{ width: columnWidths.calculated_salary, maxWidth: columnWidths.calculated_salary }}>
                      {formatCurrency(trip.calculated_salary)} {t("currency")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td colSpan={12} className="px-2 py-2 text-right border border-gray-300">
                  {t("totalTripSalaryLabel")}
                </td>
                <td className="px-2 py-2 text-right border border-gray-300 text-blue-600">
                  {formatCurrency(totalSalary)} {t("currency")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {sortedTrips.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-12">
          {t("noData")}
        </div>
      )}

      {/* Missing KM Modal */}
      {showMissingKmModal && missingKmData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-red-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Không thể tạo bảng lương</h3>
                  <p className="text-sm text-red-600">Có {missingKmData.total_missing} chuyến thiếu thông tin Km</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMissingKmModal(false);
                  setMissingKmData(null);
                }}
                className="p-2 hover:bg-red-100 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  <strong>Lưu ý:</strong> Vui lòng cập nhật km cho các chuyến bên dưới trước khi tạo bảng lương.
                  Bạn có thể cập nhật km trong bảng Rates hoặc trực tiếp tại từng order.
                </p>
              </div>

              {/* Grouped by Driver */}
              <div className="space-y-6">
                {missingKmData.missing_km_trips.map((driverGroup) => (
                  <div key={driverGroup.driver_id} className="border rounded-lg overflow-hidden">
                    {/* Driver Header */}
                    <div className="bg-purple-100 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {driverGroup.driver_code || driverGroup.driver_name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-purple-900">{driverGroup.driver_name}</span>
                          {driverGroup.driver_code && (
                            <span className="text-sm text-purple-600 ml-2">({driverGroup.driver_code})</span>
                          )}
                        </div>
                      </div>
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                        {driverGroup.trips.length} chuyến thiếu km
                      </span>
                    </div>

                    {/* Trips Table */}
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Mã đơn</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Điểm lấy hàng</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Điểm giao hàng</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Cont/Xe</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Ngày giao</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {driverGroup.trips.map((trip) => (
                          <tr key={trip.order_id} className="hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <span className="font-mono text-blue-600">{trip.order_code}</span>
                            </td>
                            <td className="px-4 py-2 text-gray-700">
                              {trip.pickup_site || <span className="text-gray-400 italic">Chưa có</span>}
                            </td>
                            <td className="px-4 py-2 text-gray-700">
                              {trip.delivery_site || <span className="text-gray-400 italic">Chưa có</span>}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {trip.container_code || "-"}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {trip.delivered_date
                                ? new Date(trip.delivered_date).toLocaleDateString("vi-VN")
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowMissingKmModal(false);
                  setMissingKmData(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Đóng
              </button>
              <a
                href="/tms/rates"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Đi tới Bảng Rates
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Status Log Modal */}
      <StatusLogModal
        orderId={statusLogModal.orderId}
        orderCode={statusLogModal.orderCode}
        isOpen={statusLogModal.isOpen}
        onClose={() => setStatusLogModal({ isOpen: false, orderId: "", orderCode: "" })}
        onUpdated={() => {
          // Reload trips when status log is updated (affects trips_per_day calculation)
          fetchTrips();
        }}
      />
    </div>
  );
}
