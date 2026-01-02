"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Building,
  Briefcase,
  Phone,
  Mail,
  Database,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import DataTable, { Column, TablePagination, PageSizeSelector } from "@/components/DataTable";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  employee_type: string;
  status: string;
  join_date: string | null;
  department_name: string | null;
  position_name: string | null;
  branch_name: string | null;
}

interface EmployeeListResponse {
  items: Employee[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Đang làm việc", color: "bg-green-100 text-green-700" },
  PROBATION: { label: "Thử việc", color: "bg-blue-100 text-blue-700" },
  ON_LEAVE: { label: "Nghỉ phép", color: "bg-yellow-100 text-yellow-700" },
  SUSPENDED: { label: "Tạm đình chỉ", color: "bg-red-100 text-red-700" },
  RESIGNED: { label: "Đã nghỉ", color: "bg-gray-100 text-gray-700" },
  TERMINATED: { label: "Chấm dứt", color: "bg-gray-100 text-gray-700" },
};

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Toàn thời gian",
  PART_TIME: "Bán thời gian",
  CONTRACT: "Hợp đồng",
  INTERN: "Thực tập",
  FREELANCER: "CTV",
  DRIVER: "Tài xế",
};

function PageContent() {
  const searchParams = useSearchParams();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [page, pageSize, statusFilter, typeFilter]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("employee_type", typeFilter);

      const data = await apiFetch<EmployeeListResponse>(`/hrm/employees?${params.toString()}`);
      setEmployees(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchEmployees();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc muốn xóa nhân viên này?")) return;

    try {
      await apiFetch(`/hrm/employees/${id}`, { method: "DELETE" });
      fetchEmployees();
    } catch (error) {
      console.error("Failed to delete employee:", error);
      alert("Không thể xóa nhân viên");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const handleSeedData = async () => {
    if (!confirm("Tạo dữ liệu mẫu HRM đầy đủ:\n- 2 chi nhánh, 8 phòng ban, 7 chức vụ, 48 nhân viên\n- Chấm công, lương, đào tạo tháng 11 & 12/2024\n\nTiếp tục?")) return;

    setSeeding(true);
    try {
      // Step 1: Seed basic data (branches, departments, positions, employees)
      const result = await apiFetch<{ success: boolean; message: string; summary: any }>("/hrm/seed", {
        method: "POST",
      });

      // Step 2: Seed monthly data (attendance, payroll, training) for Nov & Dec
      const monthlyResult = await apiFetch<{ success: boolean; message: string; summary: any }>(
        "/hrm/seed/monthly-data?year=2024&months=11,12",
        { method: "POST" }
      );

      alert(
        `Thành công!\n\n` +
        `Dữ liệu cơ bản:\n` +
        `- ${result.summary.branches} chi nhánh\n` +
        `- ${result.summary.departments} phòng ban\n` +
        `- ${result.summary.positions} chức vụ\n` +
        `- ${result.summary.employees} nhân viên\n\n` +
        `Dữ liệu tháng 11 & 12:\n` +
        `- ${monthlyResult.summary.attendance_records} bản ghi chấm công\n` +
        `- ${monthlyResult.summary.payroll_periods} kỳ lương\n` +
        `- ${monthlyResult.summary.payroll_records} bảng lương\n` +
        `- ${monthlyResult.summary.training_sessions} khóa đào tạo\n` +
        `- ${monthlyResult.summary.training_participants} lượt tham gia`
      );
      fetchEmployees();
    } catch (error: any) {
      console.error("Failed to seed data:", error);
      alert(error.message || "Không thể tạo dữ liệu mẫu");
    } finally {
      setSeeding(false);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Define columns for DataTable
  const columns: Column<Employee>[] = useMemo(
    () => [
      {
        key: "full_name",
        header: "NHÂN VIÊN",
        width: 200,
        minWidth: 150,
        sortable: true,
        render: (emp) => (
          <div>
            <div className="font-medium text-gray-900">{emp.full_name}</div>
            <div className="text-sm text-gray-500">{emp.employee_code}</div>
          </div>
        ),
      },
      {
        key: "phone",
        header: "LIÊN HỆ",
        width: 180,
        minWidth: 120,
        sortable: true,
        render: (emp) => (
          <div className="text-sm">
            {emp.phone && (
              <div className="flex items-center gap-1 text-gray-600">
                <Phone className="w-3 h-3" />
                {emp.phone}
              </div>
            )}
            {emp.email && (
              <div className="flex items-center gap-1 text-gray-500">
                <Mail className="w-3 h-3" />
                {emp.email}
              </div>
            )}
            {!emp.phone && !emp.email && <span className="text-gray-400">-</span>}
          </div>
        ),
      },
      {
        key: "department_name",
        header: "PHÒNG BAN",
        width: 160,
        minWidth: 100,
        sortable: true,
        render: (emp) =>
          emp.department_name ? (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Building className="w-3 h-3" />
              {emp.department_name}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          ),
      },
      {
        key: "position_name",
        header: "CHỨC VỤ",
        width: 150,
        minWidth: 100,
        sortable: true,
        render: (emp) =>
          emp.position_name ? (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Briefcase className="w-3 h-3" />
              {emp.position_name}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          ),
      },
      {
        key: "employee_type",
        header: "LOẠI",
        width: 120,
        minWidth: 80,
        sortable: true,
        render: (emp) => (
          <span className="text-sm text-gray-600">
            {TYPE_LABELS[emp.employee_type] || emp.employee_type}
          </span>
        ),
      },
      {
        key: "status",
        header: "TRẠNG THÁI",
        width: 130,
        minWidth: 100,
        sortable: true,
        render: (emp) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              STATUS_LABELS[emp.status]?.color || "bg-gray-100 text-gray-700"
            }`}
          >
            {STATUS_LABELS[emp.status]?.label || emp.status}
          </span>
        ),
      },
      {
        key: "join_date",
        header: "NGÀY VÀO",
        width: 110,
        minWidth: 90,
        sortable: true,
        render: (emp) => (
          <span className="text-sm text-gray-600">{formatDate(emp.join_date)}</span>
        ),
      },
      {
        key: "actions",
        header: "THAO TÁC",
        width: 120,
        minWidth: 100,
        sortable: false,
        align: "right",
        render: (emp) => (
          <div className="flex items-center justify-end gap-1">
            <Link
              href={`/hrm/employees/${emp.id}`}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Xem chi tiết"
              onClick={(e) => e.stopPropagation()}
            >
              <Eye className="w-4 h-4" />
            </Link>
            <Link
              href={`/hrm/employees/${emp.id}/edit`}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
              title="Chỉnh sửa"
              onClick={(e) => e.stopPropagation()}
            >
              <Edit className="w-4 h-4" />
            </Link>
            <button
              onClick={(e) => handleDelete(emp.id, e)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
              title="Xóa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
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
          <h1 className="text-2xl font-bold text-gray-900">Danh sách nhân viên</h1>
          <p className="text-gray-600 mt-1">Quản lý thông tin nhân viên</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
            title="Tạo dữ liệu mẫu"
          >
            <Database className="w-4 h-4" />
            {seeding ? "Đang tạo..." : "Tạo dữ liệu mẫu"}
          </button>
          <Link
            href="/hrm/employees/new"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Thêm nhân viên
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã NV, điện thoại, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang làm việc</option>
            <option value="PROBATION">Thử việc</option>
            <option value="ON_LEAVE">Nghỉ phép</option>
            <option value="SUSPENDED">Tạm đình chỉ</option>
            <option value="RESIGNED">Đã nghỉ</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả loại</option>
            <option value="FULL_TIME">Toàn thời gian</option>
            <option value="PART_TIME">Bán thời gian</option>
            <option value="CONTRACT">Hợp đồng</option>
            <option value="INTERN">Thực tập</option>
            <option value="DRIVER">Tài xế</option>
            <option value="FREELANCER">Cộng tác viên</option>
          </select>

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-600">
        Tổng: <span className="font-medium">{total}</span> nhân viên
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={employees}
        loading={loading}
        emptyMessage="Không tìm thấy nhân viên nào"
        rowKey={(emp) => emp.id}
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
        itemName="nhân viên"
        pageSizeOptions={[50, 100, 200]}
      />
    </div>
  );
}

export default function EmployeeListPage() {
  return (
    <Suspense fallback={<div className="p-6">Đang tải...</div>}>
      <PageContent />
    </Suspense>
  );
}
