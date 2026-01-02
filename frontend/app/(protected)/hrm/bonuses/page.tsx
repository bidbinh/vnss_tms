"use client";

import { useEffect, useState } from "react";
import {
  Award,
  Plus,
  Search,
  DollarSign,
  Users,
  TrendingUp,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface Bonus {
  id: string;
  employee_id: string;
  employee?: Employee;
  bonus_type: string;
  amount: number;
  reason: string;
  effective_date: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
}

interface BonusListResponse {
  items: Bonus[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const BONUS_TYPES = [
  { value: "PERFORMANCE", label: "Thưởng hiệu suất", color: "bg-green-100 text-green-700" },
  { value: "PROJECT", label: "Thưởng dự án", color: "bg-blue-100 text-blue-700" },
  { value: "HOLIDAY", label: "Thưởng lễ/tết", color: "bg-red-100 text-red-700" },
  { value: "REFERRAL", label: "Thưởng giới thiệu", color: "bg-purple-100 text-purple-700" },
  { value: "ATTENDANCE", label: "Thưởng chuyên cần", color: "bg-yellow-100 text-yellow-700" },
  { value: "OTHER", label: "Khác", color: "bg-gray-100 text-gray-700" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chờ duyệt", color: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Đã duyệt", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Từ chối", color: "bg-red-100 text-red-700" },
  PAID: { label: "Đã chi", color: "bg-blue-100 text-blue-700" },
};

export default function BonusesPage() {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState({
    employee_id: "",
    bonus_type: "PERFORMANCE",
    amount: 0,
    reason: "",
    effective_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    fetchBonuses();
    fetchEmployees();
  }, [page, filterType, filterStatus]);

  const fetchBonuses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", "50");
      if (filterType) params.set("bonus_type", filterType);
      if (filterStatus) params.set("status", filterStatus);

      const data = await apiFetch<BonusListResponse>(`/hrm/bonuses?${params.toString()}`);
      setBonuses(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch bonuses:", error);
      setBonuses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await apiFetch<{ items: Employee[] }>("/hrm/employees?page_size=200&status=ACTIVE");
      setEmployees(data.items || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const handleCreate = async () => {
    if (!form.employee_id || !form.amount || !form.reason) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    try {
      await apiFetch("/hrm/bonuses", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setShowModal(false);
      setForm({
        employee_id: "",
        bonus_type: "PERFORMANCE",
        amount: 0,
        reason: "",
        effective_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      fetchBonuses();
    } catch (error: any) {
      alert(error?.message || "Tạo thưởng thất bại");
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Xác nhận duyệt khoản thưởng này?")) return;
    try {
      await apiFetch(`/hrm/bonuses/${id}/approve`, { method: "POST" });
      fetchBonuses();
    } catch (error: any) {
      alert(error?.message || "Duyệt thưởng thất bại");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Xác nhận từ chối khoản thưởng này?")) return;
    try {
      await apiFetch(`/hrm/bonuses/${id}/reject`, { method: "POST" });
      fetchBonuses();
    } catch (error: any) {
      alert(error?.message || "Từ chối thưởng thất bại");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xác nhận xóa khoản thưởng này?")) return;
    try {
      await apiFetch(`/hrm/bonuses/${id}`, { method: "DELETE" });
      fetchBonuses();
    } catch (error: any) {
      alert(error?.message || "Xóa thưởng thất bại");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredBonuses = bonuses.filter((bonus) => {
    const matchesSearch =
      !searchTerm ||
      bonus.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bonus.employee?.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bonus.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalAmount = filteredBonuses.reduce((sum, b) => sum + b.amount, 0);
  const pendingCount = filteredBonuses.filter((b) => b.status === "PENDING").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý thưởng</h1>
          <p className="text-gray-600 mt-1">Thưởng hiệu suất, dự án, lễ tết và các khoản thưởng khác</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm thưởng
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng thưởng</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Số lượng</div>
              <div className="text-2xl font-bold text-blue-600">{total}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Chờ duyệt</div>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Nhân viên</div>
              <div className="text-2xl font-bold text-purple-600">
                {new Set(filteredBonuses.map((b) => b.employee_id)).size}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên, mã NV, lý do..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Tất cả loại</option>
            {BONUS_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredBonuses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có dữ liệu thưởng
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nhân viên
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Loại thưởng
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Lý do
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Số tiền
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Ngày hiệu lực
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBonuses.map((bonus) => {
                const typeConfig = BONUS_TYPES.find((t) => t.value === bonus.bonus_type);
                const statusConfig = STATUS_CONFIG[bonus.status];

                return (
                  <tr key={bonus.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {bonus.employee?.full_name || "-"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {bonus.employee?.employee_code || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${typeConfig?.color || "bg-gray-100"}`}>
                        {typeConfig?.label || bonus.bonus_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                      {bonus.reason}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      {formatCurrency(bonus.amount)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {bonus.effective_date ? new Date(bonus.effective_date).toLocaleDateString("vi-VN") : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded ${statusConfig?.color || "bg-gray-100"}`}>
                        {statusConfig?.label || bonus.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {bonus.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleApprove(bonus.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Duyệt"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(bonus.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Từ chối"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {bonus.status !== "PAID" && (
                          <button
                            onClick={() => handleDelete(bonus.id)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Thêm thưởng</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nhân viên <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_code} - {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại thưởng
                  </label>
                  <select
                    value={form.bonus_type}
                    onChange={(e) => setForm({ ...form, bonus_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {BONUS_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số tiền <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày hiệu lực
                </label>
                <input
                  type="date"
                  value={form.effective_date}
                  onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lý do <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Lý do thưởng..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.employee_id || !form.amount || !form.reason}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Tạo mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
