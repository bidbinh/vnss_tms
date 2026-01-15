"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Truck,
  Calendar,
  Users,
  FileText,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Lock,
  Download,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface DriverPayrollListItem {
  id: string;
  driver_id: string;
  driver_name: string | null;
  year: number;
  month: number;
  status: string;
  total_trips: number;
  total_distance_km: number;
  net_salary: number;
  created_at: string;
  confirmed_by_driver_at: string | null;
  paid_at: string | null;
}

interface Driver {
  id: string;
  name: string;
  short_name?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700", icon: FileText },
  PENDING_HR_REVIEW: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
  PENDING_DRIVER_CONFIRM: { bg: "bg-blue-100", text: "text-blue-700", icon: AlertCircle },
  CONFIRMED: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
  PAID: { bg: "bg-purple-100", text: "text-purple-700", icon: DollarSign },
  REJECTED: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
};

export default function DriverPayrollPage() {
  const t = useTranslations("hrm.driverPayroll");
  const tCommon = useTranslations("common");

  const [payrolls, setPayrolls] = useState<DriverPayrollListItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | "">("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Create payroll modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    driver_id: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    notes: "",
  });
  const [creating, setCreating] = useState(false);

  // View detail modal
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    fetchPayrolls();
  }, [selectedYear, selectedMonth, selectedDriver, selectedStatus]);

  const fetchDrivers = async () => {
    try {
      const data = await apiFetch<Driver[]>("/drivers");
      setDrivers(data);
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
    }
  };

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append("year", selectedYear.toString());
      if (selectedMonth) params.append("month", selectedMonth.toString());
      if (selectedDriver) params.append("driver_id", selectedDriver);
      if (selectedStatus) params.append("status", selectedStatus);

      const data = await apiFetch<DriverPayrollListItem[]>(
        `/hrm/driver-payroll?${params.toString()}`
      );
      setPayrolls(data);
    } catch (error) {
      console.error("Failed to fetch payrolls:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createFormData.driver_id) {
      alert("Vui lòng chọn tài xế");
      return;
    }

    setCreating(true);
    try {
      await apiFetch("/hrm/driver-payroll/create", {
        method: "POST",
        body: JSON.stringify(createFormData),
      });

      alert("Tạo bảng lương thành công!");
      setShowCreateModal(false);
      setCreateFormData({
        driver_id: "",
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        notes: "",
      });
      fetchPayrolls();
    } catch (error: any) {
      console.error("Failed to create payroll:", error);
      alert(error.message || "Không thể tạo bảng lương. Vui lòng thử lại.");
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetail = async (payrollId: string) => {
    try {
      const data = await apiFetch(`/hrm/driver-payroll/${payrollId}`);
      setSelectedPayroll(data);
      setShowDetailModal(true);
    } catch (error) {
      console.error("Failed to fetch payroll detail:", error);
      alert("Không thể tải chi tiết bảng lương");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const getStatusConfig = (status: string) => {
    return STATUS_COLORS[status] || STATUS_COLORS.DRAFT;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="h-8 w-8" />
              Quản Lý Bảng Lương Tài Xế
            </h1>
            <p className="text-gray-600 mt-1">
              Tạo và theo dõi bảng lương tài xế theo tháng
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Tạo Bảng Lương
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Năm
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tháng
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : "")}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Tất cả</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tài xế
            </label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Tất cả</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.short_name || d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Tất cả</option>
              <option value="DRAFT">Nháp</option>
              <option value="PENDING_HR_REVIEW">Chờ HR duyệt</option>
              <option value="PENDING_DRIVER_CONFIRM">Chờ tài xế xác nhận</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="PAID">Đã trả lương</option>
              <option value="REJECTED">Bị từ chối</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payroll List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : payrolls.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có bảng lương nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tháng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tài xế
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số chuyến
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng KM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lương thực nhận
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrolls.map((payroll) => {
                  const statusConfig = getStatusConfig(payroll.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={payroll.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payroll.month}/{payroll.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payroll.driver_name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payroll.total_trips}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payroll.total_distance_km.toLocaleString()} km
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(payroll.net_salary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {payroll.status === "CONFIRMED" && <Lock className="h-3 w-3" />}
                          {payroll.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payroll.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetail(payroll.id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1 ml-auto"
                        >
                          <Eye className="h-4 w-4" />
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Payroll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Tạo Bảng Lương Mới</h2>
            <form onSubmit={handleCreatePayroll}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tài xế <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createFormData.driver_id}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, driver_id: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">-- Chọn tài xế --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.short_name || d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tháng
                    </label>
                    <select
                      value={createFormData.month}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, month: Number(e.target.value) })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          Tháng {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Năm
                    </label>
                    <select
                      value={createFormData.year}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, year: Number(e.target.value) })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      {[2024, 2025, 2026].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    value={createFormData.notes}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, notes: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    placeholder="Ghi chú (tùy chọn)"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={creating}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "Đang tạo..." : "Tạo bảng lương"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                Chi Tiết Bảng Lương - {selectedPayroll.driver_name} ({selectedPayroll.month}/{selectedPayroll.year})
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Tổng số chuyến</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedPayroll.total_trips}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Tổng KM</div>
                  <div className="text-2xl font-bold text-green-600">
                    {selectedPayroll.total_distance_km.toLocaleString()}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Lương thực nhận</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(selectedPayroll.net_salary)}
                  </div>
                </div>
              </div>

              {/* Trip Details */}
              <div className="mb-4">
                <h3 className="font-semibold text-lg mb-2">Chi tiết các chuyến</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Mã ĐH
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Ngày giao
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Từ
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Đến
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          KM
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          Lương
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedPayroll.trip_snapshot?.trips?.map((trip: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{trip.order_code}</td>
                          <td className="px-4 py-2 text-sm">
                            {trip.delivered_date ? formatDate(trip.delivered_date) : "-"}
                          </td>
                          <td className="px-4 py-2 text-sm">{trip.pickup_site_name || "-"}</td>
                          <td className="px-4 py-2 text-sm">{trip.delivery_site_name || "-"}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {trip.distance_km || 0}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-semibold">
                            {formatCurrency(trip.calculated_salary || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
