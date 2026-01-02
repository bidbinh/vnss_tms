"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Nháp", color: "bg-gray-100 text-gray-700" },
  CALCULATED: { label: "Đã tính", color: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Đã duyệt", color: "bg-green-100 text-green-700" },
  PAID: { label: "Đã chi", color: "bg-purple-100 text-purple-700" },
  CLOSED: { label: "Đã khóa", color: "bg-gray-100 text-gray-700" },
};

export default function PayrollPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Modal for new period
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    start_date: "",
    end_date: "",
    payment_date: "",
  });

  useEffect(() => {
    fetchPeriods();
  }, [selectedYear]);

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
      alert(error.message || "Không thể tạo kỳ lương");
    }
  };

  const handleCalculate = async (periodId: string) => {
    if (!confirm("Bạn có chắc muốn tính lương cho kỳ này?")) return;

    try {
      const result = await apiFetch<{ message: string; created: number; errors: string[] }>(
        `/hrm/payroll/periods/${periodId}/calculate`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      alert(`${result.message}\n${result.errors.length > 0 ? `Lỗi: ${result.errors.join(", ")}` : ""}`);
      fetchPeriods();
    } catch (error: any) {
      console.error("Failed to calculate payroll:", error);
      alert(error.message || "Không thể tính lương");
    }
  };

  const handleClose = async (periodId: string) => {
    if (!confirm("Sau khi khóa sẽ không thể chỉnh sửa. Bạn có chắc?")) return;

    try {
      await apiFetch(`/hrm/payroll/periods/${periodId}/close`, { method: "POST" });
      fetchPeriods();
    } catch (error: any) {
      console.error("Failed to close period:", error);
      alert(error.message || "Không thể khóa kỳ lương");
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý lương</h1>
          <p className="text-gray-600 mt-1">Tính toán và quản lý bảng lương</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            {[2023, 2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                Năm {year}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              updateDefaultDates(new Date().getMonth() + 1, new Date().getFullYear());
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Tạo kỳ lương
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Số kỳ lương</div>
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
              <div className="text-sm text-gray-600">Tổng phiếu lương</div>
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
              <div className="text-sm text-gray-600">Tổng lương năm {selectedYear}</div>
              <div className="text-xl font-bold text-purple-600">{formatCurrency(totalNetSalary)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Periods List */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold">Các kỳ lương năm {selectedYear}</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : periods.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            Chưa có kỳ lương nào cho năm {selectedYear}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {periods.map((period) => {
              const statusConfig = STATUS_CONFIG[period.status] || STATUS_CONFIG.DRAFT;

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
                        <div className="text-sm text-gray-500">Số phiếu</div>
                        <div className="font-medium">{period.record_count}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-500">Tổng lương</div>
                        <div className="font-medium text-green-600">
                          {formatCurrency(period.total_net_salary)}
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>

                      <div className="flex items-center gap-2">
                        {period.status === "DRAFT" && (
                          <button
                            onClick={() => handleCalculate(period.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            <Play className="w-4 h-4" />
                            Tính lương
                          </button>
                        )}

                        {(period.status === "CALCULATED" || period.status === "APPROVED") && (
                          <>
                            <Link
                              href={`/hrm/payroll/${period.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              <Eye className="w-4 h-4" />
                              Xem
                            </Link>
                            <button
                              onClick={() => handleClose(period.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                            >
                              <Lock className="w-4 h-4" />
                              Khóa
                            </button>
                          </>
                        )}

                        {period.status === "CLOSED" && (
                          <Link
                            href={`/hrm/payroll/${period.id}`}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            <Eye className="w-4 h-4" />
                            Xem
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
              <div className="font-medium text-gray-900">Cơ cấu lương</div>
              <div className="text-sm text-gray-500">Quản lý các khoản lương</div>
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
              <div className="font-medium text-gray-900">Tạm ứng</div>
              <div className="text-sm text-gray-500">Quản lý tạm ứng lương</div>
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
              <div className="font-medium text-gray-900">Báo cáo lương</div>
              <div className="text-sm text-gray-500">Xuất báo cáo bảng lương</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>
      </div>

      {/* Create Period Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Tạo kỳ lương mới</h2>
            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
                  <select
                    value={formData.month}
                    onChange={(e) => updateDefaultDates(parseInt(e.target.value), formData.year)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        Tháng {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
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
                  Ngày chi lương
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
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Tạo kỳ lương
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
