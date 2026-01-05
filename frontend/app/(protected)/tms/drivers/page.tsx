"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { TablePagination } from "@/components/DataTable";
import Link from "next/link";
import { Users, Truck, RefreshCw, Plus, Search, UserCheck, UserX, Edit2, Eye, X, Save, Award, CreditCard, Calendar, Phone, Mail, Building2, User, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

// ============ Types ============
type Vehicle = {
  id: string;
  plate_no: string;
  type: string;
  status: string;
};

type HRMEmployee = {
  id: string;
  employee_code: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  id_number?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_bin?: string | null;
  license_number?: string | null;
  license_class?: string | null;
  license_expiry?: string | null;
  status?: string | null;
};

type Driver = {
  id: string;
  tenant_id: string;
  name: string;
  short_name?: string | null;
  phone?: string | null;
  citizen_id?: string | null;
  license_no?: string | null;
  license_class?: string | null;
  license_expiry?: string | null;
  certificate_no?: string | null;
  certificate_expiry?: string | null;
  tractor_id?: string | null;
  trailer_id?: string | null;
  tractor?: Vehicle | null;
  trailer?: Vehicle | null;
  status: string;
  employee_id?: string | null;
  employee?: HRMEmployee | null;
};

// ============ Stats Card Component ============
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-white/60`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs opacity-80">{label}</div>
        </div>
      </div>
    </div>
  );
}

// ============ Format Helpers ============
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isExpiringSoon(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const expiry = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 30 && diffDays > 0;
}

function isExpired(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// ============ Main Component ============
export default function DriversPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Detail/Edit modal
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    short_name: "",
    license_no: "",
    license_class: "",
    license_expiry: "",
    certificate_no: "",
    certificate_expiry: "",
    tractor_id: "",
    trailer_id: "",
    status: "ACTIVE",
  });
  const [saving, setSaving] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // ============ Data Fetching ============
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Driver[]>("/api/v1/drivers");
      setRows(data);
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadVehicles() {
    try {
      const vehiclesData = await apiFetch<Vehicle[]>("/api/v1/vehicles");
      setVehicles(vehiclesData);
    } catch (e: any) {
      console.error("Failed to load vehicles:", e);
    }
  }

  useEffect(() => {
    load();
    loadVehicles();
  }, []);

  async function syncToHRM() {
    setSyncing(true);
    setError(null);
    try {
      const result = await apiFetch<{ message: string; synced: number; errors: any[] }>(
        "/api/v1/drivers/sync-to-hrm",
        { method: "POST" }
      );
      alert(`${result.message}\nSynced: ${result.synced} drivers${result.errors?.length ? `\nErrors: ${result.errors.length}` : ""}`);
      await load();
    } catch (e: any) {
      setError(e?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  // ============ Filtering & Pagination ============
  const filteredRows = useMemo(() => {
    const s = searchTerm.toLowerCase();
    let result = rows;

    if (s) {
      result = result.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(s) ||
          (r.short_name || "").toLowerCase().includes(s) ||
          (r.phone || "").toLowerCase().includes(s) ||
          (r.citizen_id || "").toLowerCase().includes(s) ||
          (r.employee?.employee_code || "").toLowerCase().includes(s)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let aVal: any = "";
      let bVal: any = "";

      switch (sortField) {
        case "employee_code":
          aVal = a.employee?.employee_code || "";
          bVal = b.employee?.employee_code || "";
          break;
        case "license_expiry":
          aVal = a.license_expiry ? new Date(a.license_expiry).getTime() : 0;
          bVal = b.license_expiry ? new Date(b.license_expiry).getTime() : 0;
          break;
        case "tractor":
          aVal = a.tractor?.plate_no || "";
          bVal = b.tractor?.plate_no || "";
          break;
        case "trailer":
          aVal = a.trailer?.plate_no || "";
          bVal = b.trailer?.plate_no || "";
          break;
        default:
          aVal = (a as any)[sortField] || "";
          bVal = (b as any)[sortField] || "";
      }

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [rows, searchTerm, sortField, sortOrder]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  // ============ Stats ============
  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const inactive = rows.filter((r) => r.status !== "ACTIVE").length;
    const withTractor = rows.filter((r) => r.tractor_id).length;
    const withTrailer = rows.filter((r) => r.trailer_id).length;
    return { total: rows.length, active, inactive, withTractor, withTrailer };
  }, [rows]);

  // ============ Modal Functions ============
  function openDetail(driver: Driver) {
    setSelectedDriver(driver);
    setEditForm({
      short_name: driver.short_name || "",
      license_no: driver.license_no || "",
      license_class: driver.license_class || "",
      license_expiry: driver.license_expiry || "",
      certificate_no: driver.certificate_no || "",
      certificate_expiry: driver.certificate_expiry || "",
      tractor_id: driver.tractor_id || "",
      trailer_id: driver.trailer_id || "",
      status: driver.status || "ACTIVE",
    });
    setIsEditing(false);
  }

  function closeModal() {
    setSelectedDriver(null);
    setIsEditing(false);
    setError(null);
  }

  async function handleSave() {
    if (!selectedDriver) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/drivers/${selectedDriver.id}`, {
        method: "PUT",
        body: JSON.stringify({
          short_name: editForm.short_name || null,
          license_no: editForm.license_no || null,
          license_class: editForm.license_class || null,
          license_expiry: editForm.license_expiry || null,
          certificate_no: editForm.certificate_no || null,
          certificate_expiry: editForm.certificate_expiry || null,
          tractor_id: editForm.tractor_id || null,
          trailer_id: editForm.trailer_id || null,
          status: editForm.status,
        }),
      });
      await load();
      setIsEditing(false);
      // Update selectedDriver with new data
      const updatedDriver = rows.find((r) => r.id === selectedDriver.id);
      if (updatedDriver) setSelectedDriver(updatedDriver);
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Get available tractors/trailers (excluding already assigned to other drivers)
  const assignedTractorIds = rows.filter((d) => d.id !== selectedDriver?.id && d.tractor_id).map((d) => d.tractor_id);
  const availableTractors = vehicles.filter((v) => v.type === "TRACTOR" && v.status === "ACTIVE" && !assignedTractorIds.includes(v.id));
  const assignedTrailerIds = rows.filter((d) => d.id !== selectedDriver?.id && d.trailer_id).map((d) => d.trailer_id);
  const availableTrailers = vehicles.filter((v) => v.type === "TRAILER" && v.status === "ACTIVE" && !assignedTrailerIds.includes(v.id));

  // ============ Sorting Functions ============
  function handleSort(field: string) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  function getSortIcon(field: string) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  }

  // ============ Table Columns ============
  const columns = [
    { key: "employee_code", header: "Mã NV", width: 90, sortable: true },
    { key: "name", header: "Họ và Tên", width: 160, sortable: true },
    { key: "short_name", header: "Tên tắt", width: 80, sortable: true },
    { key: "phone", header: "SĐT", width: 110, sortable: true },
    { key: "license", header: "Bằng lái", width: 130, sortable: false },
    { key: "tractor", header: "Đầu kéo", width: 100, sortable: true },
    { key: "trailer", header: "Rơ mooc", width: 100, sortable: true },
    { key: "status", header: "Trạng thái", width: 90, sortable: true },
    { key: "actions", header: "", width: 80, sortable: false },
  ];

  function renderCell(row: Driver, colKey: string) {
    switch (colKey) {
      case "employee_code":
        return row.employee?.employee_code ? (
          <span className="text-blue-600 font-medium">{row.employee.employee_code}</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      case "name":
        return <span className="font-medium">{row.name}</span>;
      case "short_name":
        return row.short_name ? (
          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">{row.short_name}</span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        );
      case "phone":
        return row.phone || <span className="text-gray-400">-</span>;
      case "license":
        if (!row.license_no) return <span className="text-gray-400 text-xs">Chưa có</span>;
        const expired = isExpired(row.license_expiry);
        const expiring = isExpiringSoon(row.license_expiry);
        return (
          <div className="text-xs">
            <div className="font-medium">{row.license_no}</div>
            {row.license_class && <span className="text-gray-500">Hạng {row.license_class}</span>}
            {expired && <span className="ml-1 text-red-600">(Hết hạn)</span>}
            {expiring && <span className="ml-1 text-orange-600">(Sắp hết)</span>}
          </div>
        );
      case "tractor":
        return row.tractor?.plate_no ? (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium">{row.tractor.plate_no}</span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        );
      case "trailer":
        return row.trailer?.plate_no ? (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-medium">{row.trailer.plate_no}</span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        );
      case "status":
        return (
          <span
            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
              row.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }`}
          >
            {row.status === "ACTIVE" ? "Hoạt động" : "Ngừng"}
          </span>
        );
      case "actions":
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDetail(row);
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600"
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4" />
          </button>
        );
      default:
        return (row as any)[colKey] ?? "-";
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] overflow-auto">
      {/* Phần 1: Header & Stats - Cuộn đi */}
      <div className="p-6 pb-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Tài xế</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý thông tin tài xế và phân công xe</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={syncToHRM}
              disabled={syncing}
              className="rounded-xl border border-gray-300 text-gray-600 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Đang đồng bộ..." : "Sync HRM"}
            </button>
            <Link
              href="/hrm/employees?type=DRIVER"
              className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Thêm tài xế
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Tổng tài xế" value={stats.total} color="blue" />
          <StatCard icon={UserCheck} label="Đang hoạt động" value={stats.active} color="green" />
          <StatCard icon={Truck} label="Đã phân đầu kéo" value={stats.withTractor} color="purple" />
          <StatCard icon={UserX} label="Ngừng hoạt động" value={stats.inactive} color="gray" />
        </div>

        {/* Info Banner */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <strong>Lưu ý:</strong> Thông tin cá nhân (Họ tên, SĐT, CCCD, Ngân hàng...) được quản lý từ{" "}
          <Link href="/hrm/employees" className="underline font-medium">
            HRM &rarr; Nhân viên
          </Link>
          . Tại đây chỉ quản lý thông tin nghiệp vụ vận tải: Tên viết tắt, Bằng lái, Chứng chỉ, Phân xe.
        </div>
      </div>

      {/* Phần 2: Filter & Search + Table Header - Sticky */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        {/* Search Bar */}
        <div className="border-y border-gray-200 px-6 py-3">
          <div className="flex items-center gap-3 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên, mã NV, SĐT, CCCD..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm"
              />
            </div>
            <div className="text-sm text-gray-500">
              {loading ? "Đang tải..." : `${filteredRows.length} tài xế`}
            </div>
          </div>

          {/* Error */}
          {error && !selectedDriver && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mt-3">{error}</div>
          )}
        </div>

        {/* Table Header - Sticky cùng filter */}
        <div className="px-6 pt-3 bg-white">
          <div className="border border-b-0 border-gray-200 rounded-t-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 font-bold text-left ${col.sortable ? "cursor-pointer select-none hover:bg-gray-100" : ""}`}
                      style={{ width: col.width }}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.header}
                        {col.sortable && getSortIcon(col.key)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
        </div>
      </div>

      {/* Phần 3: Data Table Body */}
      <div className="px-6 pb-4">
        <div className="border border-t-0 border-gray-200 rounded-b-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Đang tải...
                    </div>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                    Chưa có tài xế nào
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => openDetail(row)}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3" style={{ width: col.width }}>
                        {renderCell(row, col.key)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phần 4: Pagination - Sticky bottom */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredRows.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="tài xế"
        />
      </div>

      {/* Detail/Edit Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
              <div>
                <div className="font-bold text-lg text-gray-900">{selectedDriver.name}</div>
                <div className="text-sm text-gray-500">
                  {selectedDriver.employee?.employee_code || "Chưa liên kết HRM"}
                  {selectedDriver.short_name && <span className="ml-2 px-2 py-0.5 bg-gray-200 rounded text-xs">{selectedDriver.short_name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Chỉnh sửa
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "Đang lưu..." : "Lưu"}
                    </button>
                  </>
                )}
                <button onClick={closeModal} className="text-gray-500 hover:text-black text-xl ml-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Error */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              {/* Section 1: Thông tin từ HR (chỉ xem) */}
              <div className="border rounded-xl p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-800">Thông tin nhân viên</h3>
                  <span className="text-xs text-gray-500 ml-auto">Từ HRM - Chỉ xem</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-500 text-xs">Mã nhân viên</label>
                    <div className="font-medium">{selectedDriver.employee?.employee_code || "-"}</div>
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs">Họ và tên</label>
                    <div className="font-medium">{selectedDriver.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-gray-500 text-xs">Số điện thoại</label>
                      <div className="font-medium">{selectedDriver.phone || selectedDriver.employee?.phone || "-"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-gray-500 text-xs">Email</label>
                      <div className="font-medium">{selectedDriver.employee?.email || "-"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-gray-500 text-xs">CCCD/CMND</label>
                      <div className="font-medium">{selectedDriver.citizen_id || selectedDriver.employee?.id_number || "-"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-gray-500 text-xs">Ngày sinh</label>
                      <div className="font-medium">{formatDate(selectedDriver.employee?.date_of_birth)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-gray-500 text-xs">Ngân hàng</label>
                      <div className="font-medium">{selectedDriver.employee?.bank_name || "-"}</div>
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs">Số tài khoản</label>
                    <div className="font-medium font-mono">{selectedDriver.employee?.bank_account || "-"}</div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <Link
                    href={`/hrm/employees?id=${selectedDriver.employee_id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Xem chi tiết trong HRM &rarr;
                  </Link>
                </div>
              </div>

              {/* Section 2: Thông tin TMS (có thể sửa) */}
              <div className="border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">Thông tin vận tải</h3>
                  <span className="text-xs text-blue-600 ml-auto">TMS - Có thể chỉnh sửa</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {/* Tên viết tắt */}
                  <div>
                    <label className="text-gray-600 text-xs font-medium mb-1 block">Tên viết tắt</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.short_name}
                        onChange={(e) => setEditForm({ ...editForm, short_name: e.target.value })}
                        placeholder="VD: Đ. Vụ"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    ) : (
                      <div className="font-medium py-2">{selectedDriver.short_name || <span className="text-gray-400">Chưa có</span>}</div>
                    )}
                  </div>

                  {/* Trạng thái */}
                  <div>
                    <label className="text-gray-600 text-xs font-medium mb-1 block">Trạng thái</label>
                    {isEditing ? (
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="INACTIVE">Ngừng hoạt động</option>
                      </select>
                    ) : (
                      <div className="py-2">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                            selectedDriver.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {selectedDriver.status === "ACTIVE" ? "Hoạt động" : "Ngừng"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bằng lái */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Bằng lái xe</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="text-gray-600 text-xs font-medium mb-1 block">Số bằng lái</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.license_no}
                          onChange={(e) => setEditForm({ ...editForm, license_no: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      ) : (
                        <div className="font-medium py-2">{selectedDriver.license_no || "-"}</div>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-600 text-xs font-medium mb-1 block">Hạng</label>
                      {isEditing ? (
                        <select
                          value={editForm.license_class}
                          onChange={(e) => setEditForm({ ...editForm, license_class: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="">-- Chọn --</option>
                          <option value="B2">B2</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                          <option value="E">E</option>
                          <option value="FC">FC</option>
                          <option value="FD">FD</option>
                          <option value="FE">FE</option>
                        </select>
                      ) : (
                        <div className="font-medium py-2">{selectedDriver.license_class || "-"}</div>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-600 text-xs font-medium mb-1 block">Ngày hết hạn</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.license_expiry}
                          onChange={(e) => setEditForm({ ...editForm, license_expiry: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      ) : (
                        <div className={`font-medium py-2 ${isExpired(selectedDriver.license_expiry) ? "text-red-600" : isExpiringSoon(selectedDriver.license_expiry) ? "text-orange-600" : ""}`}>
                          {formatDate(selectedDriver.license_expiry)}
                          {isExpired(selectedDriver.license_expiry) && <span className="ml-1 text-xs">(Hết hạn)</span>}
                          {isExpiringSoon(selectedDriver.license_expiry) && <span className="ml-1 text-xs">(Sắp hết)</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chứng chỉ nghề */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Chứng chỉ nghề</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-gray-600 text-xs font-medium mb-1 block">Số chứng chỉ</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.certificate_no}
                          onChange={(e) => setEditForm({ ...editForm, certificate_no: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      ) : (
                        <div className="font-medium py-2">{selectedDriver.certificate_no || "-"}</div>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-600 text-xs font-medium mb-1 block">Ngày hết hạn</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.certificate_expiry}
                          onChange={(e) => setEditForm({ ...editForm, certificate_expiry: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      ) : (
                        <div className={`font-medium py-2 ${isExpired(selectedDriver.certificate_expiry) ? "text-red-600" : isExpiringSoon(selectedDriver.certificate_expiry) ? "text-orange-600" : ""}`}>
                          {formatDate(selectedDriver.certificate_expiry)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phân xe */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Phân công xe</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-gray-600 text-xs font-medium mb-1 block">Xe đầu kéo</label>
                      {isEditing ? (
                        <select
                          value={editForm.tractor_id}
                          onChange={(e) => setEditForm({ ...editForm, tractor_id: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="">-- Không phân xe --</option>
                          {selectedDriver.tractor && (
                            <option value={selectedDriver.tractor.id}>{selectedDriver.tractor.plate_no} (đang dùng)</option>
                          )}
                          {availableTractors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.plate_no}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="py-2">
                          {selectedDriver.tractor?.plate_no ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium">
                              {selectedDriver.tractor.plate_no}
                            </span>
                          ) : (
                            <span className="text-gray-400">Chưa phân</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-600 text-xs font-medium mb-1 block">Rơ mooc</label>
                      {isEditing ? (
                        <select
                          value={editForm.trailer_id}
                          onChange={(e) => setEditForm({ ...editForm, trailer_id: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="">-- Không phân rơ mooc --</option>
                          {selectedDriver.trailer && (
                            <option value={selectedDriver.trailer.id}>{selectedDriver.trailer.plate_no} (đang dùng)</option>
                          )}
                          {availableTrailers.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.plate_no}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="py-2">
                          {selectedDriver.trailer?.plate_no ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-medium">
                              {selectedDriver.trailer.plate_no}
                            </span>
                          ) : (
                            <span className="text-gray-400">Chưa phân</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
