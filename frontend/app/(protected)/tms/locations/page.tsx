"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import DataTable, { Column, TablePagination } from "@/components/DataTable";
import { MapPin, Plus, Search, Factory, Building, Anchor, Warehouse, Trash2, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

// ============ Types ============
type Location = {
  id: string;
  code: string;
  name: string;
  type: string;
  ward?: string;
  district?: string;
  province?: string;
  note?: string;
  is_active: boolean;
  created_at: string;
};

type LocationForm = {
  code: string;
  name: string;
  type: string;
  ward: string;
  district: string;
  province: string;
  note: string;
};

// ============ Stats Card Component ============
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/60">
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

// ============ Type Label Config ============
const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  INDUSTRIAL_ZONE: { label: "KCN", icon: Factory, color: "bg-blue-100 text-blue-800" },
  WARD: { label: "Phường/Xã", icon: Building, color: "bg-gray-100 text-gray-800" },
  PORT: { label: "Cảng", icon: Anchor, color: "bg-green-100 text-green-800" },
  ICD: { label: "ICD", icon: Warehouse, color: "bg-purple-100 text-purple-800" },
  DEPOT: { label: "Bãi", icon: Warehouse, color: "bg-orange-100 text-orange-800" },
  WAREHOUSE: { label: "Kho", icon: Warehouse, color: "bg-yellow-100 text-yellow-800" },
};

// ============ Main Component ============
export default function LocationsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showInactive, setShowInactive] = useState(false);
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Location | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm: LocationForm = {
    code: "",
    name: "",
    type: "INDUSTRIAL_ZONE",
    ward: "",
    district: "",
    province: "",
    note: "",
  };

  const [form, setForm] = useState<LocationForm>(emptyForm);

  // Sorting
  const [sortField, setSortField] = useState<string>("code");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // ============ Data Fetching ============
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const url = showInactive ? "/api/v1/locations?include_inactive=true" : "/api/v1/locations";
      const data = await apiFetch<Location[]>(url);
      setRows(data);
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [showInactive]);

  // ============ Filtering & Pagination ============
  const filteredRows = useMemo(() => {
    let result = rows;

    // Filter by type
    if (filterType !== "ALL") {
      result = result.filter((r) => r.type === filterType);
    }

    // Filter by search term
    const s = searchTerm.toLowerCase();
    if (s) {
      result = result.filter(
        (r) =>
          (r.code || "").toLowerCase().includes(s) ||
          (r.name || "").toLowerCase().includes(s) ||
          (r.ward || "").toLowerCase().includes(s) ||
          (r.district || "").toLowerCase().includes(s) ||
          (r.province || "").toLowerCase().includes(s)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let aVal: any = (a as any)[sortField] || "";
      let bVal: any = (b as any)[sortField] || "";

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [rows, searchTerm, filterType, sortField, sortOrder]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, pageSize]);

  // ============ Stats ============
  const stats = useMemo(() => {
    const active = rows.filter((r) => r.is_active).length;
    const kcn = rows.filter((r) => r.type === "INDUSTRIAL_ZONE").length;
    const port = rows.filter((r) => r.type === "PORT").length;
    const icd = rows.filter((r) => r.type === "ICD").length;
    return { total: rows.length, active, kcn, port, icd };
  }, [rows]);

  // ============ Modal Functions ============
  function openCreate() {
    setMode("create");
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: Location) {
    setMode("edit");
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      type: row.type,
      ward: row.ward || "",
      district: row.district || "",
      province: row.province || "",
      note: row.note || "",
    });
    setOpen(true);
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      if (!form.code.trim() || !form.name.trim()) {
        throw new Error("Mã và Tên là bắt buộc.");
      }

      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
        ward: form.ward.trim() || null,
        district: form.district.trim() || null,
        province: form.province.trim() || null,
        note: form.note.trim() || null,
      };

      if (mode === "create") {
        await apiFetch<Location>("/api/v1/locations", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!editing) throw new Error("Missing editing row");
        await apiFetch<Location>(`/api/v1/locations/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      setOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc muốn xóa địa điểm này?")) return;

    try {
      await apiFetch(`/api/v1/locations/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  }

  async function handleRestore(id: string) {
    try {
      await apiFetch(`/api/v1/locations/${id}/restore`, { method: "PATCH" });
      await load();
    } catch (e: any) {
      alert(e?.message || "Restore failed");
    }
  }

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

  // ============ Table Column Definitions ============
  const columnDefs = [
    { key: "code", header: "Mã", width: 130, sortable: true },
    { key: "name", header: "Tên", width: 200, sortable: true },
    { key: "type", header: "Loại", width: 100, sortable: true },
    { key: "ward", header: "Xã/Phường", width: 120, sortable: true },
    { key: "district", header: "Quận/Huyện", width: 130, sortable: true },
    { key: "province", header: "Tỉnh/TP", width: 130, sortable: true },
    { key: "actions", header: "Thao tác", width: 100, sortable: false },
  ];

  function renderCell(row: Location, key: string) {
    switch (key) {
      case "code":
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{row.code}</span>
            {!row.is_active && (
              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">Đã xóa</span>
            )}
          </div>
        );
      case "name":
        return <span className={`font-medium ${!row.is_active ? "text-gray-400" : ""}`}>{row.name}</span>;
      case "type": {
        const config = TYPE_CONFIG[row.type] || { label: row.type, color: "bg-gray-100 text-gray-800" };
        return <span className={`px-2 py-1 rounded-lg text-xs font-medium ${config.color}`}>{config.label}</span>;
      }
      case "ward":
        return row.ward || <span className="text-gray-400">-</span>;
      case "district":
        return row.district || <span className="text-gray-400">-</span>;
      case "province":
        return row.province || <span className="text-gray-400">-</span>;
      case "actions":
        return row.is_active ? (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Sửa
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.id);
              }}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Xóa
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRestore(row.id);
            }}
            className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Khôi phục
          </button>
        );
      default:
        return (row as any)[key] ?? "-";
    }
  }

  // ============ Table Columns ============
  const columns: Column<Location>[] = [
    {
      key: "code",
      header: "Mã",
      width: 130,
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{r.code}</span>
          {!r.is_active && (
            <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">Đã xóa</span>
          )}
        </div>
      ),
    },
    {
      key: "name",
      header: "Tên",
      width: 200,
      render: (r) => <span className={`font-medium ${!r.is_active ? "text-gray-400" : ""}`}>{r.name}</span>,
    },
    {
      key: "type",
      header: "Loại",
      width: 100,
      render: (r) => {
        const config = TYPE_CONFIG[r.type] || { label: r.type, color: "bg-gray-100 text-gray-800" };
        return <span className={`px-2 py-1 rounded-lg text-xs font-medium ${config.color}`}>{config.label}</span>;
      },
    },
    {
      key: "ward",
      header: "Xã/Phường",
      width: 120,
      render: (r) => r.ward || <span className="text-gray-400">-</span>,
    },
    {
      key: "district",
      header: "Quận/Huyện",
      width: 130,
      render: (r) => r.district || <span className="text-gray-400">-</span>,
    },
    {
      key: "province",
      header: "Tỉnh/TP",
      width: 130,
      render: (r) => r.province || <span className="text-gray-400">-</span>,
    },
    {
      key: "actions",
      header: "Thao tác",
      width: 100,
      sortable: false,
      align: "center",
      render: (r) =>
        r.is_active ? (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEdit(r);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Sửa
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(r.id);
              }}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Xóa
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRestore(r.id);
            }}
            className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Khôi phục
          </button>
        ),
    },
  ];

  return (
    <div className="h-[calc(100vh-64px)] overflow-auto">
      {/* Phần 1: Header & Stats - Cuộn đi */}
      <div className="p-6 pb-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Locations</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý các vùng/khu vực vận chuyển</p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm Location
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={MapPin} label="Tổng locations" value={stats.total} color="blue" />
          <StatCard icon={MapPin} label="Đang hoạt động" value={stats.active} color="green" />
          <StatCard icon={Factory} label="KCN" value={stats.kcn} color="purple" />
          <StatCard icon={Anchor} label="Cảng" value={stats.port} color="orange" />
          <StatCard icon={Warehouse} label="ICD" value={stats.icd} color="gray" />
        </div>
      </div>

      {/* Phần 2: Filter & Search + Table Header - Sticky */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        {/* Filter Bar */}
        <div className="border-y border-gray-200 px-6 py-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              {/* Type Filter Tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                {[
                  { key: "ALL", label: "Tất cả" },
                  { key: "INDUSTRIAL_ZONE", label: "KCN" },
                  { key: "PORT", label: "Cảng" },
                  { key: "ICD", label: "ICD" },
                  { key: "DEPOT", label: "Bãi" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterType(tab.key)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      filterType === tab.key ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm mã, tên, tỉnh..."
                  className="pl-10 pr-4 py-2 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm w-64"
                />
              </div>

              {/* Show Inactive */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded"
                />
                Hiện đã xóa
              </label>
            </div>

            <div className="text-sm text-gray-500">{loading ? "Đang tải..." : `${filteredRows.length} locations`}</div>
          </div>

          {/* Error */}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mt-3">{error}</div>}
        </div>

        {/* Table Header - Sticky cùng filter */}
        <div className="px-6 pt-3 bg-white">
          <div className="border border-b-0 border-gray-200 rounded-t-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  {columnDefs.map((col) => (
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
                  <td colSpan={columnDefs.length} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Đang tải...
                    </div>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={columnDefs.length} className="px-4 py-8 text-center text-gray-500">
                    Chưa có location nào
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-gray-50">
                    {columnDefs.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-left"
                        style={{ width: col.width }}
                      >
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
          itemName="locations"
        />
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="font-semibold text-lg">
                {mode === "create" ? "Thêm Location mới" : `Chỉnh sửa: ${editing?.code}`}
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black text-xl">
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-600 rounded"></div>
                  Thông tin cơ bản
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Mã <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.code}
                      onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="VD: KCN_TB, PH_12_TB"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Loại <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="INDUSTRIAL_ZONE">KCN</option>
                      <option value="WARD">Phường/Xã</option>
                      <option value="PORT">Cảng</option>
                      <option value="ICD">ICD</option>
                      <option value="DEPOT">Bãi</option>
                      <option value="WAREHOUSE">Kho</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">
                      Tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="VD: KCN Tân Bình, Phường 12"
                    />
                  </div>
                </div>
              </div>

              {/* Geographic Info */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-green-600 rounded"></div>
                  Thông tin địa lý
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Xã/Phường</label>
                    <input
                      value={form.ward}
                      onChange={(e) => setForm((s) => ({ ...s, ward: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="VD: Phường 12"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Quận/Huyện</label>
                    <input
                      value={form.district}
                      onChange={(e) => setForm((s) => ({ ...s, district: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="VD: Quận Tân Bình"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Tỉnh/Thành phố</label>
                    <input
                      value={form.province}
                      onChange={(e) => setForm((s) => ({ ...s, province: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="VD: TP. Hồ Chí Minh"
                    />
                  </div>
                </div>
              </div>

              {/* Note */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-gray-600 rounded"></div>
                  Ghi chú
                </h3>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Ghi chú thêm..."
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setOpen(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                Hủy
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-60 hover:bg-blue-700"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
