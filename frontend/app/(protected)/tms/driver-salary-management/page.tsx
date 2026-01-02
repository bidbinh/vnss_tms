"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";

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
  short_name?: string;
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
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<DriverSalaryTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

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

  useEffect(() => {
    fetchDrivers();
    fetchTrips();
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

  function getDriverColor(driverId: string | null): string {
    if (!driverId) return "bg-gray-100";
    const colors = [
      "bg-blue-100", "bg-green-100", "bg-yellow-100", "bg-purple-100", "bg-pink-100",
      "bg-indigo-100", "bg-red-100", "bg-orange-100", "bg-teal-100", "bg-cyan-100",
    ];
    const index = drivers.findIndex(d => d.id === driverId);
    return colors[index % colors.length];
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
      <h1 className="text-3xl font-bold mb-6">Quản lý lương tài xế</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tài xế</label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Tất cả tài xế</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Năm</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tháng</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full border rounded px-3 py-2"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Tháng {i + 1}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchTrips}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Đang tải..." : "Xem chuyến"}
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      {trips.length > 0 && (
        <div className="bg-green-50 p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-600">Tổng số chuyến</div>
              <div className="text-2xl font-bold">{trips.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng chuyến trong tháng</div>
              <div className="text-2xl font-bold">{trips[0]?.trips_per_month || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng lương chuyến</div>
              <div className="text-2xl font-bold">{formatCurrency(totalSalary)} đ</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Trạng thái</div>
              <div className="text-sm font-semibold text-blue-600">{saving ? "Đang lưu..." : "Đã lưu"}</div>
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
                <ResizableHeader columnKey="order_code" sortable sortKey="order_code" className="text-left">Mã đơn</ResizableHeader>
                <ResizableHeader columnKey="driver_id" sortable sortKey="driver_id" className="text-center">Tài xế</ResizableHeader>
                <ResizableHeader columnKey="customer_requested_date" sortable sortKey="customer_requested_date" className="text-left">Ngày giao hàng</ResizableHeader>
                <ResizableHeader columnKey="pickup_site_name" sortable sortKey="pickup_site_name" className="text-left">Điểm lấy</ResizableHeader>
                <ResizableHeader columnKey="delivery_site_name" sortable sortKey="delivery_site_name" className="text-left">Điểm giao</ResizableHeader>
                <ResizableHeader columnKey="container_code" sortable sortKey="container_code" className="text-center">Cont</ResizableHeader>
                <ResizableHeader columnKey="distance_km" sortable sortKey="distance_km" className="text-center">Km</ResizableHeader>
                <ResizableHeader columnKey="is_from_port" className="text-center">Từ cảng</ResizableHeader>
                <ResizableHeader columnKey="is_flatbed" className="text-center">Mooc sàn</ResizableHeader>
                <ResizableHeader columnKey="is_internal_cargo" className="text-center">Hàng xá</ResizableHeader>
                <ResizableHeader columnKey="is_holiday" className="text-center">Ngày lễ</ResizableHeader>
                <ResizableHeader columnKey="trips_per_day" sortable sortKey="trips_per_day" className="text-center">Chuyến/ngày</ResizableHeader>
                <ResizableHeader columnKey="calculated_salary" sortable sortKey="calculated_salary" className="text-right">Lương chuyến</ResizableHeader>
              </tr>
            </thead>
            <tbody>
              {sortedTrips.map((trip) => {
                const breakdown = trip.salary_breakdown;
                return (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 border border-gray-300 overflow-hidden whitespace-nowrap text-ellipsis" style={{ width: columnWidths.order_code, maxWidth: columnWidths.order_code }}>{trip.order_code}</td>
                    <td className="px-2 py-2 text-center border border-gray-300 overflow-hidden whitespace-nowrap" style={{ width: columnWidths.driver_id, maxWidth: columnWidths.driver_id }}>
                      <span className={`font-semibold ${getDriverColor(trip.driver_id)} px-2 py-1 rounded`}>
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
                      {formatCurrency(trip.calculated_salary)} đ
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td colSpan={12} className="px-2 py-2 text-right border border-gray-300">
                  TỔNG LƯƠNG CHUYẾN:
                </td>
                <td className="px-2 py-2 text-right border border-gray-300 text-blue-600">
                  {formatCurrency(totalSalary)} đ
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {sortedTrips.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-12">
          Không có dữ liệu chuyến hàng trong tháng này
        </div>
      )}
    </div>
  );
}
