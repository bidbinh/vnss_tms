"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import DataTable, { Column, TablePagination } from "@/components/DataTable";

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

function PageContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("hrm.employeesPage");
  const tStatus = useTranslations("hrm.employeesPage.status");
  const tTypes = useTranslations("hrm.employeesPage.types");
  const tColumns = useTranslations("hrm.employeesPage.columns");
  const tFilters = useTranslations("hrm.employeesPage.filters");
  const tCommon = useTranslations("common");

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    PROBATION: "bg-blue-100 text-blue-700",
    ON_LEAVE: "bg-yellow-100 text-yellow-700",
    SUSPENDED: "bg-red-100 text-red-700",
    RESIGNED: "bg-gray-100 text-gray-700",
    TERMINATED: "bg-gray-100 text-gray-700",
  };

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
    if (!confirm(t("confirmDelete"))) return;

    try {
      await apiFetch(`/hrm/employees/${id}`, { method: "DELETE" });
      fetchEmployees();
    } catch (error) {
      console.error("Failed to delete employee:", error);
      alert(t("deleteError"));
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN");
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
        header: tColumns("employee"),
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
        header: tColumns("contact"),
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
        header: tColumns("department"),
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
        header: tColumns("position"),
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
        header: tColumns("type"),
        width: 120,
        minWidth: 80,
        sortable: true,
        render: (emp) => (
          <span className="text-sm text-gray-600">
            {tTypes(emp.employee_type)}
          </span>
        ),
      },
      {
        key: "status",
        header: tColumns("status"),
        width: 130,
        minWidth: 100,
        sortable: true,
        render: (emp) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              STATUS_COLORS[emp.status] || "bg-gray-100 text-gray-700"
            }`}
          >
            {tStatus(emp.status)}
          </span>
        ),
      },
      {
        key: "join_date",
        header: tColumns("joinDate"),
        width: 110,
        minWidth: 90,
        sortable: true,
        render: (emp) => (
          <span className="text-sm text-gray-600">{formatDate(emp.join_date)}</span>
        ),
      },
      {
        key: "actions",
        header: tColumns("actions"),
        width: 120,
        minWidth: 100,
        sortable: false,
        align: "right",
        render: (emp) => (
          <div className="flex items-center justify-end gap-1">
            <Link
              href={`/hrm/employees/${emp.id}`}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
              title={tCommon("view")}
              onClick={(e) => e.stopPropagation()}
            >
              <Eye className="w-4 h-4" />
            </Link>
            <Link
              href={`/hrm/employees/${emp.id}/edit`}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
              title={tCommon("edit")}
              onClick={(e) => e.stopPropagation()}
            >
              <Edit className="w-4 h-4" />
            </Link>
            <button
              onClick={(e) => handleDelete(emp.id, e)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
              title={tCommon("delete")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    [tColumns, tStatus, tTypes, tCommon]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/hrm/employees/new"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {t("addEmployee")}
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
              placeholder={tFilters("searchPlaceholder")}
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
            <option value="">{tFilters("allStatus")}</option>
            <option value="ACTIVE">{tStatus("ACTIVE")}</option>
            <option value="PROBATION">{tStatus("PROBATION")}</option>
            <option value="ON_LEAVE">{tStatus("ON_LEAVE")}</option>
            <option value="SUSPENDED">{tStatus("SUSPENDED")}</option>
            <option value="RESIGNED">{tStatus("RESIGNED")}</option>
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
            <option value="">{tFilters("allTypes")}</option>
            <option value="FULL_TIME">{tTypes("FULL_TIME")}</option>
            <option value="PART_TIME">{tTypes("PART_TIME")}</option>
            <option value="CONTRACT">{tTypes("CONTRACT")}</option>
            <option value="INTERN">{tTypes("INTERN")}</option>
            <option value="DRIVER">{tTypes("DRIVER")}</option>
            <option value="FREELANCER">{tTypes("FREELANCER")}</option>
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
        {tCommon("total")}: <span className="font-medium">{total}</span> {t("employees")}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={employees}
        loading={loading}
        emptyMessage={t("noEmployees")}
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
        itemName={t("employees")}
        pageSizeOptions={[50, 100, 200]}
      />
    </div>
  );
}

export default function EmployeeListPage() {
  const t = useTranslations("common");
  return (
    <Suspense fallback={<div className="p-6">{t("loading")}</div>}>
      <PageContent />
    </Suspense>
  );
}
