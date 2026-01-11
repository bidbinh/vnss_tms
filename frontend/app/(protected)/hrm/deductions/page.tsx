"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

const DEDUCTION_TYPE_COLORS: Record<string, string> = {
  INSURANCE_EMPLOYEE: "bg-green-100 text-green-700",
  TAX: "bg-yellow-100 text-yellow-700",
  ADVANCE: "bg-blue-100 text-blue-700",
  LOAN: "bg-purple-100 text-purple-700",
  PENALTY: "bg-red-100 text-red-700",
  OTHER: "bg-gray-100 text-gray-700",
};

export default function DeductionsPage() {
  const t = useTranslations("hrm.deductionsPage");
  const tCommon = useTranslations("common");

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
      alert(t("errors.fillRequired"));
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
      alert(error?.message || t("errors.createFailed"));
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm(t("confirmations.deactivate"))) return;
    try {
      await apiFetch(`/hrm/deductions/${id}/deactivate`, { method: "POST" });
      fetchDeductions();
    } catch (error: any) {
      alert(error?.message || t("errors.deactivateFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmations.delete"))) return;
    try {
      await apiFetch(`/hrm/deductions/${id}`, { method: "DELETE" });
      fetchDeductions();
    } catch (error: any) {
      alert(error?.message || t("errors.deleteFailed"));
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
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {t("addDeduction")}
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
              <div className="text-sm text-gray-600">{t("stats.remaining")}</div>
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
              <div className="text-sm text-gray-600">{t("stats.monthlyDeduction")}</div>
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
              <div className="text-sm text-gray-600">{t("stats.active")}</div>
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
              <div className="text-sm text-gray-600">{t("stats.total")}</div>
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
              placeholder={t("searchPlaceholder")}
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
            <option value="">{t("filters.allTypes")}</option>
            <option value="INSURANCE_EMPLOYEE">{t("deductionTypes.INSURANCE_EMPLOYEE")}</option>
            <option value="TAX">{t("deductionTypes.TAX")}</option>
            <option value="ADVANCE">{t("deductionTypes.ADVANCE")}</option>
            <option value="LOAN">{t("deductionTypes.LOAN")}</option>
            <option value="PENALTY">{t("deductionTypes.PENALTY")}</option>
            <option value="OTHER">{t("deductionTypes.OTHER")}</option>
          </select>
          <select
            value={filterActive}
            onChange={(e) => {
              setFilterActive(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">{t("filters.allStatus")}</option>
            <option value="active">{t("filters.active")}</option>
            <option value="inactive">{t("filters.completed")}</option>
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
            {t("noData")}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t("columns.employee")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t("columns.type")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t("columns.description")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("columns.totalAmount")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("columns.remaining")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("columns.monthlyDeduction")}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  {t("columns.status")}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  {tCommon("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDeductions.map((ded) => {
                const typeColor = DEDUCTION_TYPE_COLORS[ded.deduction_type] || "bg-gray-100";
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
                      <span className={`px-2 py-1 text-xs rounded ${typeColor}`}>
                        {t(`deductionTypes.${ded.deduction_type}`)}
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
                          {t("status.active")}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                          {t("status.completed")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {ded.is_active && (
                          <button
                            onClick={() => handleDeactivate(ded.id)}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                            title={t("actions.deactivate")}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(ded.id)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                          title={tCommon("delete")}
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
              <h3 className="text-lg font-semibold">{t("modal.title")}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.employee")} <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">{t("modal.selectEmployee")}</option>
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
                    {t("modal.deductionType")}
                  </label>
                  <select
                    value={form.deduction_type}
                    onChange={(e) => setForm({ ...form, deduction_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="INSURANCE_EMPLOYEE">{t("deductionTypes.INSURANCE_EMPLOYEE")}</option>
                    <option value="TAX">{t("deductionTypes.TAX")}</option>
                    <option value="ADVANCE">{t("deductionTypes.ADVANCE")}</option>
                    <option value="LOAN">{t("deductionTypes.LOAN")}</option>
                    <option value="PENALTY">{t("deductionTypes.PENALTY")}</option>
                    <option value="OTHER">{t("deductionTypes.OTHER")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("modal.startDate")}
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
                    {t("modal.totalAmount")} <span className="text-red-500">*</span>
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
                    {t("modal.monthlyDeduction")}
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
                  {t("modal.description")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("modal.descriptionPlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.notes")}</label>
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
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.employee_id || !form.total_amount || !form.description}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {tCommon("create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
