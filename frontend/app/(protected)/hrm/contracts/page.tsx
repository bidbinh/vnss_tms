"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Search,
  Edit,
  FileText,
  Calendar,
  AlertTriangle,
  X,
  Save,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import DataTable, { Column, TablePagination } from "@/components/DataTable";

interface Contract {
  id: string;
  contract_number: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  basic_salary: number;
  status: string;
  created_at: string;
}

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  branch_id?: string;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

interface ContractListResponse {
  items: Contract[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const CONTRACT_TYPES = [
  { value: "PROBATION", label: "Thử việc" },
  { value: "DEFINITE_1Y", label: "Xác định 1 năm" },
  { value: "DEFINITE_2Y", label: "Xác định 2 năm" },
  { value: "DEFINITE_3Y", label: "Xác định 3 năm" },
  { value: "INDEFINITE", label: "Không xác định thời hạn" },
  { value: "SEASONAL", label: "Thời vụ" },
  { value: "PART_TIME", label: "Bán thời gian" },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Nháp", color: "bg-gray-100 text-gray-700" },
  ACTIVE: { label: "Hiệu lực", color: "bg-green-100 text-green-700" },
  EXPIRED: { label: "Hết hạn", color: "bg-yellow-100 text-yellow-700" },
  TERMINATED: { label: "Chấm dứt", color: "bg-red-100 text-red-700" },
  RENEWED: { label: "Đã gia hạn", color: "bg-blue-100 text-blue-700" },
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

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: "",
    contract_type: "PROBATION",
    start_date: "",
    end_date: "",
    basic_salary: "",
    insurance_salary: "",
    allowances: "",
    probation_salary_percent: "85",
    work_location: "",
    job_description: "",
    notes: "",
  });

  useEffect(() => {
    fetchEmployees();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await apiFetch<Branch[]>("/hrm/branches");
      setBranches(data);
    } catch (error) {
      console.error("Failed to fetch branches:", error);
    }
  };

  useEffect(() => {
    fetchContracts();
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

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const data = await apiFetch<ContractListResponse>(`/hrm/contracts?${params.toString()}`);
      setContracts(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (error) {
      console.error("Failed to fetch contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchContracts();
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleOpenModal = (contract?: Contract) => {
    if (contract) {
      setEditingContract(contract);
      setFormData({
        employee_id: contract.employee_id,
        contract_type: contract.contract_type,
        start_date: contract.start_date,
        end_date: contract.end_date || "",
        basic_salary: formatNumberInput(contract.basic_salary.toString()),
        insurance_salary: "",
        allowances: "",
        probation_salary_percent: "85",
        work_location: "",
        job_description: "",
        notes: "",
      });
    } else {
      setEditingContract(null);
      setFormData({
        employee_id: "",
        contract_type: "PROBATION",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        basic_salary: "",
        insurance_salary: "",
        allowances: "",
        probation_salary_percent: "85",
        work_location: branches.length > 0 ? branches[0].id : "",
        job_description: "",
        notes: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingContract(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Format money fields with thousand separators
    if (["basic_salary", "insurance_salary", "allowances"].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: formatNumberInput(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Get branch name for work_location
      const selectedBranch = branches.find(b => b.id === formData.work_location);
      const workLocationName = selectedBranch ? `Chi nhánh ${selectedBranch.name}` : null;

      const payload = {
        employee_id: formData.employee_id,
        contract_type: formData.contract_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        basic_salary: Number(parseFormattedNumber(formData.basic_salary)) || 0,
        insurance_salary: formData.insurance_salary ? Number(parseFormattedNumber(formData.insurance_salary)) : null,
        allowances_json: formData.allowances ? JSON.stringify({ total: Number(parseFormattedNumber(formData.allowances)) }) : null,
        probation_salary_percent: Number(formData.probation_salary_percent) || 85,
        work_location: workLocationName,
        job_description: formData.job_description || null,
        notes: formData.notes || null,
      };

      if (editingContract) {
        await apiFetch(`/hrm/contracts/${editingContract.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/hrm/contracts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      handleCloseModal();
      fetchContracts();
    } catch (error: any) {
      console.error("Failed to save contract:", error);
      alert(error.message || "Không thể lưu hợp đồng");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const isExpiringSoon = (endDate: string | null) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  };

  // Define columns for DataTable
  const columns: Column<Contract>[] = useMemo(
    () => [
      {
        key: "contract_number",
        header: "SỐ HĐ",
        width: 140,
        minWidth: 100,
        sortable: true,
        render: (contract) => (
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{contract.contract_number}</span>
          </div>
        ),
      },
      {
        key: "employee_name",
        header: "NHÂN VIÊN",
        width: 200,
        minWidth: 150,
        sortable: true,
        render: (contract) => (
          <div>
            <div className="font-medium text-gray-900">{contract.employee_name}</div>
            <div className="text-sm text-gray-500">{contract.employee_code}</div>
          </div>
        ),
      },
      {
        key: "contract_type",
        header: "LOẠI HĐ",
        width: 160,
        minWidth: 120,
        sortable: true,
        render: (contract) => (
          <span className="text-sm text-gray-600">
            {CONTRACT_TYPES.find((t) => t.value === contract.contract_type)?.label ||
              contract.contract_type}
          </span>
        ),
      },
      {
        key: "start_date",
        header: "THỜI HẠN",
        width: 200,
        minWidth: 150,
        sortable: true,
        render: (contract) => (
          <div className="text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <Calendar className="w-3 h-3" />
              {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
            </div>
            {isExpiringSoon(contract.end_date) && (
              <div className="flex items-center gap-1 text-orange-500 text-xs mt-1">
                <AlertTriangle className="w-3 h-3" />
                Sắp hết hạn
              </div>
            )}
          </div>
        ),
      },
      {
        key: "basic_salary",
        header: "LƯƠNG CƠ BẢN",
        width: 140,
        minWidth: 100,
        sortable: true,
        align: "right",
        render: (contract) => (
          <span className="text-sm text-gray-900">{formatMoney(contract.basic_salary)}</span>
        ),
      },
      {
        key: "status",
        header: "TRẠNG THÁI",
        width: 120,
        minWidth: 90,
        sortable: true,
        render: (contract) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              STATUS_MAP[contract.status]?.color || "bg-gray-100 text-gray-700"
            }`}
          >
            {STATUS_MAP[contract.status]?.label || contract.status}
          </span>
        ),
      },
      {
        key: "actions",
        header: "THAO TÁC",
        width: 100,
        minWidth: 80,
        sortable: false,
        align: "right",
        render: (contract) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal(contract);
            }}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Sửa"
          >
            <Edit className="w-4 h-4" />
          </button>
        ),
      },
    ],
    []
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hợp đồng lao động</h1>
          <p className="text-gray-600 mt-1">Quản lý hợp đồng nhân viên</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tạo hợp đồng
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo số HĐ, tên nhân viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
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
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hiệu lực</option>
            <option value="EXPIRED">Hết hạn</option>
            <option value="DRAFT">Nháp</option>
            <option value="TERMINATED">Chấm dứt</option>
          </select>

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-600">
        Tổng: <span className="font-medium">{total}</span> hợp đồng
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={contracts}
        loading={loading}
        emptyMessage="Không tìm thấy hợp đồng nào"
        rowKey={(c) => c.id}
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
        itemName="hợp đồng"
        pageSizeOptions={[50, 100, 200]}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingContract ? "Sửa hợp đồng" : "Tạo hợp đồng mới"}
              </h2>
              <button onClick={handleCloseModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhân viên *
                  </label>
                  <select
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} ({e.employee_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại hợp đồng *
                  </label>
                  <select
                    name="contract_type"
                    value={formData.contract_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {CONTRACT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lương cơ bản *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="basic_salary"
                      value={formData.basic_salary}
                      onChange={handleChange}
                      placeholder="10,000,000"
                      className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày bắt đầu *
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lương đóng bảo hiểm
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="insurance_salary"
                      value={formData.insurance_salary}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phụ cấp
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="allowances"
                      value={formData.allowances}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    % lương thử việc
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="probation_salary_percent"
                      value={formData.probation_salary_percent}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nơi làm việc (Chi nhánh)
                </label>
                <select
                  name="work_location"
                  value={formData.work_location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn chi nhánh --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả công việc
                </label>
                <textarea
                  name="job_description"
                  value={formData.job_description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
