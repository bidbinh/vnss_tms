"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Search,
  Check,
  X,
  Save,
  Banknote,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import DataTable, { Column, TablePagination } from "@/components/DataTable";

interface AdvanceRequest {
  id: string;
  request_number: string;
  employee_id: string;
  employee: {
    id: string;
    employee_code: string;
    full_name: string;
  } | null;
  requested_amount: number;
  approved_amount: number;
  repaid_amount: number;
  remaining_amount: number;
  purpose: string | null;
  advance_type: string;
  request_date: string;
  status: string;
  approved_at: string | null;
  paid_date: string | null;
}

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface AdvanceListResponse {
  items: AdvanceRequest[];
  total: number;
  page: number;
  page_size: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_REPAID: "bg-purple-100 text-purple-700",
  FULLY_REPAID: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

// Format number with thousand separators
const formatNumberInput = (value: string): string => {
  const num = value.replace(/[^\d]/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(num));
};

// Parse formatted number back to raw number
const parseFormattedNumber = (value: string): string => {
  return value.replace(/[^\d]/g, "");
};

export default function AdvancesPage() {
  const t = useTranslations("hrm.advancesPage");
  const tCommon = useTranslations("common");

  const [advances, setAdvances] = useState<AdvanceRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: "",
    requested_amount: "",
    advance_type: "SALARY",
    purpose: "",
    needed_date: "",
    repayment_method: "SALARY_DEDUCTION",
    monthly_deduction_amount: "",
    notes: "",
  });

  // For approval modal
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceRequest | null>(null);
  const [approvalData, setApprovalData] = useState({
    approved_amount: "",
    notes: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAdvances();
  }, [page, pageSize, statusFilter]);

  const fetchEmployees = async () => {
    try {
      const firstPage = await apiFetch<{ items: Employee[]; total: number }>("/hrm/employees?page_size=200");
      let allEmployees = [...firstPage.items];
      const totalPages = Math.ceil((firstPage.total || 0) / 200);

      if (totalPages > 1) {
        const remaining = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            apiFetch<{ items: Employee[] }>(`/hrm/employees?page=${i + 2}&page_size=200`)
          )
        );
        remaining.forEach(p => { allEmployees = allEmployees.concat(p.items); });
      }
      setEmployees(allEmployees);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const fetchAdvances = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());
      if (statusFilter) params.set("status", statusFilter);

      const data = await apiFetch<AdvanceListResponse>(`/hrm/advances?${params.toString()}`);
      setAdvances(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Failed to fetch advances:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleOpenModal = () => {
    setFormData({
      employee_id: "",
      requested_amount: "",
      advance_type: "SALARY",
      purpose: "",
      needed_date: "",
      repayment_method: "SALARY_DEDUCTION",
      monthly_deduction_amount: "",
      notes: "",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Format money fields with thousand separators
    if (["requested_amount", "monthly_deduction_amount"].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: formatNumberInput(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        employee_id: formData.employee_id,
        requested_amount: Number(parseFormattedNumber(formData.requested_amount)) || 0,
        advance_type: formData.advance_type,
        purpose: formData.purpose || null,
        needed_date: formData.needed_date || null,
        repayment_method: formData.repayment_method,
        monthly_deduction_amount: formData.monthly_deduction_amount
          ? Number(parseFormattedNumber(formData.monthly_deduction_amount))
          : null,
        notes: formData.notes || null,
      };

      await apiFetch("/hrm/advances", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      handleCloseModal();
      fetchAdvances();
    } catch (error: any) {
      console.error("Failed to create advance:", error);
      alert(error.message || t("errors.createFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenApprovalModal = (advance: AdvanceRequest) => {
    setSelectedAdvance(advance);
    setApprovalData({
      approved_amount: formatNumberInput(advance.requested_amount.toString()),
      notes: "",
    });
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (!selectedAdvance) return;
    setSaving(true);

    try {
      await apiFetch(`/hrm/advances/${selectedAdvance.id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          approved_amount: Number(parseFormattedNumber(approvalData.approved_amount)) || 0,
          notes: approvalData.notes || null,
        }),
      });

      setShowApprovalModal(false);
      setSelectedAdvance(null);
      fetchAdvances();
    } catch (error: any) {
      console.error("Failed to approve:", error);
      alert(error.message || t("errors.approveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (advance: AdvanceRequest) => {
    const reason = prompt(t("prompts.rejectReason"));
    if (reason === null) return;

    try {
      await apiFetch(`/hrm/advances/${advance.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      fetchAdvances();
    } catch (error: any) {
      console.error("Failed to reject:", error);
      alert(error.message || t("errors.rejectFailed"));
    }
  };

  const handleDisburse = async (advance: AdvanceRequest) => {
    if (!confirm(t("confirmations.disburse", { amount: formatMoney(advance.approved_amount) }))) return;

    try {
      await apiFetch(`/hrm/advances/${advance.id}/disburse`, {
        method: "POST",
        body: JSON.stringify({
          payment_method: "CASH",
        }),
      });
      fetchAdvances();
    } catch (error: any) {
      console.error("Failed to disburse:", error);
      alert(error.message || t("errors.disburseFailed"));
    }
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  // Filter by search
  const filteredAdvances = advances.filter(
    (a) =>
      (a.employee?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      a.request_number.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / pageSize);

  // Define columns for DataTable
  const columns: Column<AdvanceRequest>[] = useMemo(
    () => [
      {
        key: "request_number",
        header: t("columns.requestNumber"),
        width: 130,
        minWidth: 100,
        sortable: true,
        render: (adv) => <span className="font-mono text-sm">{adv.request_number}</span>,
      },
      {
        key: "employee_name",
        header: t("columns.employee"),
        width: 200,
        minWidth: 150,
        sortable: true,
        render: (adv) =>
          adv.employee ? (
            <div>
              <div className="font-medium text-gray-900">{adv.employee.full_name}</div>
              <div className="text-sm text-gray-500">{adv.employee.employee_code}</div>
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          ),
      },
      {
        key: "advance_type",
        header: t("columns.type"),
        width: 100,
        minWidth: 80,
        sortable: true,
        render: (adv) => (
          <span className="text-sm text-gray-600">
            {t(`types.${adv.advance_type}`)}
          </span>
        ),
      },
      {
        key: "requested_amount",
        header: t("columns.amount"),
        width: 150,
        minWidth: 120,
        sortable: true,
        align: "right",
        render: (adv) => (
          <div className="text-sm">
            <div className="font-medium">{formatMoney(adv.requested_amount)}</div>
            {adv.approved_amount > 0 && adv.approved_amount !== adv.requested_amount && (
              <div className="text-green-600">{t("approved")}: {formatMoney(adv.approved_amount)}</div>
            )}
          </div>
        ),
      },
      {
        key: "remaining_amount",
        header: t("columns.remaining"),
        width: 130,
        minWidth: 100,
        sortable: true,
        align: "right",
        render: (adv) =>
          adv.remaining_amount > 0 ? (
            <span className="text-red-600 font-medium">{formatMoney(adv.remaining_amount)}</span>
          ) : (
            <span className="text-gray-400">-</span>
          ),
      },
      {
        key: "request_date",
        header: t("columns.requestDate"),
        width: 110,
        minWidth: 90,
        sortable: true,
        render: (adv) => <span className="text-sm text-gray-600">{formatDate(adv.request_date)}</span>,
      },
      {
        key: "status",
        header: t("columns.status"),
        width: 130,
        minWidth: 100,
        sortable: true,
        render: (adv) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              STATUS_COLORS[adv.status] || "bg-gray-100 text-gray-700"
            }`}
          >
            {t(`status.${adv.status}`)}
          </span>
        ),
      },
      {
        key: "actions",
        header: tCommon("actions"),
        width: 100,
        minWidth: 80,
        sortable: false,
        align: "right",
        render: (adv) => (
          <div className="flex items-center justify-end gap-1">
            {adv.status === "PENDING" && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenApprovalModal(adv);
                  }}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                  title={t("actions.approve")}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReject(adv);
                  }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  title={t("actions.reject")}
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
            {adv.status === "APPROVED" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDisburse(adv);
                }}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                title={t("actions.disburse")}
              >
                <Banknote className="w-4 h-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [t, tCommon]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {t("createRequest")}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("filters.allStatus")}</option>
            <option value="PENDING">{t("status.PENDING")}</option>
            <option value="APPROVED">{t("status.APPROVED")}</option>
            <option value="PAID">{t("status.PAID")}</option>
            <option value="PARTIALLY_REPAID">{t("status.PARTIALLY_REPAID")}</option>
            <option value="FULLY_REPAID">{t("status.FULLY_REPAID")}</option>
            <option value="REJECTED">{t("status.REJECTED")}</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-600">
        {tCommon("total")}: <span className="font-medium">{total}</span> {t("requests")}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredAdvances}
        loading={loading}
        emptyMessage={t("noData")}
        rowKey={(a) => a.id}
        maxHeight="calc(100vh - 380px)"
        stickyHeader
      />

      {/* Pagination */}
      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        itemName={t("requests")}
        pageSizeOptions={[50, 100, 200]}
      />

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{t("modal.createTitle")}</h2>
              <button onClick={handleCloseModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.employee")} *
                </label>
                <select
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t("modal.selectEmployee")}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("modal.requestedAmount")} *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="requested_amount"
                      value={formData.requested_amount}
                      onChange={handleChange}
                      placeholder="5,000,000"
                      className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">d</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("modal.advanceType")}
                  </label>
                  <select
                    name="advance_type"
                    value={formData.advance_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SALARY">{t("types.SALARY")}</option>
                    <option value="TRIP">{t("types.TRIP")}</option>
                    <option value="OTHER">{t("types.OTHER")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.purpose")}
                </label>
                <textarea
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  rows={2}
                  placeholder={t("modal.purposePlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("modal.neededDate")}
                  </label>
                  <input
                    type="date"
                    name="needed_date"
                    value={formData.needed_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("modal.repaymentMethod")}
                  </label>
                  <select
                    name="repayment_method"
                    value={formData.repayment_method}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SALARY_DEDUCTION">{t("repaymentMethods.SALARY_DEDUCTION")}</option>
                    <option value="CASH">{t("repaymentMethods.CASH")}</option>
                    <option value="TRANSFER">{t("repaymentMethods.TRANSFER")}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? tCommon("loading") : t("createRequest")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedAdvance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{t("approvalModal.title")}</h2>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">{t("approvalModal.employee")}</div>
                <div className="font-medium">{selectedAdvance.employee?.full_name}</div>
                <div className="text-sm text-gray-600 mt-2 mb-1">{t("approvalModal.requestedAmount")}</div>
                <div className="font-medium text-lg">
                  {formatMoney(selectedAdvance.requested_amount)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("approvalModal.approvedAmount")}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={approvalData.approved_amount}
                    onChange={(e) =>
                      setApprovalData((prev) => ({ ...prev, approved_amount: formatNumberInput(e.target.value) }))
                    }
                    className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">d</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("approvalModal.notes")}
                </label>
                <textarea
                  value={approvalData.notes}
                  onChange={(e) =>
                    setApprovalData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {saving ? tCommon("loading") : t("actions.approve")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
