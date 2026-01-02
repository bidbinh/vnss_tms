"use client";

import { useEffect, useState } from "react";
import {
  Percent,
  Plus,
  Search,
  DollarSign,
  Users,
  Calendar,
  Trash2,
  Power,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface Deduction {
  id: string;
  employee_id: string;
  employee?: Employee;
  deduction_type: string;
  description: string;
  total_amount: number;
  remaining_amount: number;
  monthly_deduction: number;
  start_date: string;
  end_date?: string;
  interest_rate?: number;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

interface DeductionListResponse {
  items: Deduction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const DEDUCTION_TYPES = [
  { value: "INSURANCE_EMPLOYEE", label: "BHXH/BHYT/BHTN", color: "bg-green-100 text-green-700" },
  { value: "TAX", label: "Thuế TNCN", color: "bg-yellow-100 text-yellow-700" },
  { value: "ADVANCE", label: "Tạm ứng", color: "bg-blue-100 text-blue-700" },
  { value: "LOAN", label: "Khoản vay", color: "bg-purple-100 text-purple-700" },
  { value: "PENALTY", label: "Phạt vi phạm", color: "bg-red-100 text-red-700" },
  { value: "OTHER", label: "Khác", color: "bg-gray-100 text-gray-700" },
];

export default function DeductionsPage() {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState({
    employee_id: "",
    deduction_type: "ADVANCE",
    description: "",
    total_amount: 0,
    monthly_deduction: 0,
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    interest_rate: 0,
    notes: "",
  });

  useEffect(() => {
    fetchDeductions();
    fetchEmployees();
  }, [page, filterType, filterActive]);

  const fetchDeductions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", "50");
      if (filterType) params.set("deduction_type", filterType);
      if (filterActive === "active") params.set("is_active", "true");
      if (filterActive === "inactive") params.set("is_active", "false");

      const data = await apiFetch<DeductionListResponse>(`/hrm/deductions?${params.toString()}`);
      setDeductions(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch deductions:", error);
      setDeductions([]);
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
    if (!form.employee_id || !form.total_amount || !form.description) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    try {
      const payload: any = {
        employee_id: form.employee_id,
        deduction_type: form.deduction_type,
        description: form.description,
        total_amount: form.total_amount,
        monthly_deduction: form.monthly_deduction,
        start_date: form.start_date,
        notes: form.notes || undefined,
      };
      if (form.end_date) payload.end_date = form.end_date;
      if (form.interest_rate) payload.interest_rate = form.interest_rate;

      await apiFetch("/hrm/deductions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setShowModal(false);
      setForm({
        employee_id: "",
        deduction_type: "ADVANCE",
        description: "",
        total_amount: 0,
        monthly_deduction: 0,
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        interest_rate: 0,
        notes: "",
      });
      fetchDeductions();
    } catch (error: any) {
      alert(error?.message || "Tạo khấu trừ thất bại");
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Xác nhận kết thúc khoản khấu trừ này?")) return;
    try {
      await apiFetch(`/hrm/deductions/${id}/deactivate`, { method: "POST" });
      fetchDeductions();
    } catch (error: any) {
      alert(error?.message || "Kết thúc khấu trừ thất bại");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xác nhận xóa khoản khấu trừ này?")) return;
    try {
      await apiFetch(`/hrm/deductions/${id}`, { method: "DELETE" });
      fetchDeductions();
    } catch (error: any) {
      alert(error?.message || "Xóa khấu trừ thất bại");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredDeductions = deductions.filter((ded) => {
    const matchesSearch =
      !searchTerm ||
      ded.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ded.employee?.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ded.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalRemaining = filteredDeductions.reduce((sum, d) => sum + (d.remaining_amount || 0), 0);
  const totalMonthly = filteredDeductions
    .filter((d) => d.is_active)
    .reduce((sum, d) => sum + (d.monthly_deduction || 0), 0);
  const activeCount = filteredDeductions.filter((d) => d.is_active).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý khấu trừ</h1>
          <p className="text-gray-600 mt-1">Tạm ứng, khoản vay, phạt vi phạm và các khoản khấu trừ khác</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm khấu trừ
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Còn phải thu</div>
              <div className="text-xl font-bold text-red-600">{formatCurrency(totalRemaining)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Trừ hàng tháng</div>
              <div className="text-xl font-bold text-yellow-600">{formatCurrency(totalMonthly)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Percent className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đang hoạt động</div>
              <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng số</div>
              <div className="text-2xl font-bold text-purple-600">{total}</div>
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
              placeholder="Tìm theo tên, mã NV, mô tả..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
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
            {DEDUCTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={filterActive}
            onChange={(e) => {
              setFilterActive(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã hoàn thành</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredDeductions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có dữ liệu khấu trừ
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nhân viên
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Loại
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mô tả
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Tổng số
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Còn lại
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Trừ/tháng
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
              {filteredDeductions.map((ded) => {
                const typeConfig = DEDUCTION_TYPES.find((t) => t.value === ded.deduction_type);
                const progress =
                  ded.total_amount > 0
                    ? ((ded.total_amount - (ded.remaining_amount || 0)) / ded.total_amount) * 100
                    : 100;

                return (
                  <tr key={ded.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {ded.employee?.full_name || "-"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {ded.employee?.employee_code || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${typeConfig?.color || "bg-gray-100"}`}>
                        {typeConfig?.label || ded.deduction_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                      {ded.description}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(ded.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-red-600">
                        {formatCurrency(ded.remaining_amount || 0)}
                      </div>
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1 ml-auto">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-yellow-600">
                      {formatCurrency(ded.monthly_deduction || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ded.is_active ? (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          Đang trừ
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                          Hoàn thành
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {ded.is_active && (
                          <button
                            onClick={() => handleDeactivate(ded.id)}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                            title="Kết thúc"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(ded.id)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
              <h3 className="text-lg font-semibold">Thêm khấu trừ</h3>
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
                    Loại khấu trừ
                  </label>
                  <select
                    value={form.deduction_type}
                    onChange={(e) => setForm({ ...form, deduction_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {DEDUCTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tổng số tiền <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.total_amount}
                    onChange={(e) => setForm({ ...form, total_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trừ hàng tháng
                  </label>
                  <input
                    type="number"
                    value={form.monthly_deduction}
                    onChange={(e) => setForm({ ...form, monthly_deduction: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả khoản khấu trừ..."
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
                disabled={!form.employee_id || !form.total_amount || !form.description}
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
