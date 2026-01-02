"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import DataTable, { Column, TablePagination } from "@/components/DataTable";
import { MapPin, Plus, Search, Building2, Anchor, Phone, RotateCcw } from "lucide-react";

// ============ Types ============
type Location = {
  id: string;
  code: string;
  name: string;
  type: string;
};

type Site = {
  id: string;
  tenant_id: string;
  code?: string;
  location_id: string;
  location_name?: string;
  location_code?: string;
  company_name: string;
  site_type: string;
  detailed_address: string;
  contact_name?: string;
  contact_phone?: string;
  note?: string;
  status: string;
  created_at?: string;
};

type SiteForm = {
  code: string;
  location_id: string;
  company_name: string;
  site_type: string;
  detailed_address: string;
  contact_name: string;
  contact_phone: string;
  note: string;
  status: string;
};

// ============ Stats Card Component ============
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
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
const SITE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  CUSTOMER: { label: "Khách hàng", color: "bg-blue-100 text-blue-800" },
  PORT: { label: "Cảng", color: "bg-green-100 text-green-800" },
  WAREHOUSE: { label: "Kho", color: "bg-purple-100 text-purple-800" },
};

// ============ Main Component ============
export default function SitesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Site[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Site | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm: SiteForm = {
    code: "",
    location_id: "",
    company_name: "",
    site_type: "CUSTOMER",
    detailed_address: "",
    contact_name: "",
    contact_phone: "",
    note: "",
    status: "ACTIVE",
  };

  const [form, setForm] = useState<SiteForm>(emptyForm);

  // ============ Data Fetching ============
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [sitesData, locationsData] = await Promise.all([
        apiFetch<Site[]>("/api/v1/sites"),
        apiFetch<Location[]>("/api/v1/locations"),
      ]);
      setRows(sitesData);
      setLocations(locationsData);
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ============ Filtering & Pagination ============
  const filteredRows = useMemo(() => {
    let result = rows;

    // Filter by type
    if (filterType !== "ALL") {
      result = result.filter((r) => r.site_type === filterType);
    }

    // Filter by search term
    const s = searchTerm.toLowerCase();
    if (s) {
      result = result.filter(
        (r) =>
          (r.code || "").toLowerCase().includes(s) ||
          (r.company_name || "").toLowerCase().includes(s) ||
          (r.location_name || "").toLowerCase().includes(s) ||
          (r.detailed_address || "").toLowerCase().includes(s) ||
          (r.contact_name || "").toLowerCase().includes(s)
      );
    }

    return result;
  }, [rows, searchTerm, filterType]);

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
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const customers = rows.filter((r) => r.site_type === "CUSTOMER").length;
    const ports = rows.filter((r) => r.site_type === "PORT").length;
    const warehouses = rows.filter((r) => r.site_type === "WAREHOUSE").length;
    return { total: rows.length, active, customers, ports, warehouses };
  }, [rows]);

  // ============ Modal Functions ============
  function openCreate() {
    setMode("create");
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: Site) {
    setMode("edit");
    setEditing(row);
    setForm({
      code: row.code || "",
      location_id: row.location_id || "",
      company_name: row.company_name || "",
      site_type: row.site_type || "CUSTOMER",
      detailed_address: row.detailed_address || "",
      contact_name: row.contact_name || "",
      contact_phone: row.contact_phone || "",
      note: row.note || "",
      status: row.status || "ACTIVE",
    });
    setOpen(true);
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      if (!form.company_name.trim() || !form.location_id) {
        throw new Error("Tên công ty và Location là bắt buộc.");
      }

      const payload = {
        code: form.code.trim() || null,
        location_id: form.location_id,
        company_name: form.company_name.trim(),
        site_type: form.site_type,
        detailed_address: form.detailed_address.trim(),
        contact_name: form.contact_name.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        note: form.note.trim() || null,
        status: form.status,
      };

      if (mode === "create") {
        await apiFetch<Site>("/api/v1/sites", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!editing) throw new Error("Missing editing row");
        await apiFetch<Site>(`/api/v1/sites/${editing.id}`, {
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
    if (!confirm("Bạn có chắc muốn xóa site này?")) return;

    try {
      await apiFetch(`/api/v1/sites/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  }

  // ============ Table Columns ============
  const columns: Column<Site>[] = [
    {
      key: "code",
      header: "Mã",
      width: 100,
      render: (r) => <span className="font-semibold text-gray-900">{r.code || "-"}</span>,
    },
    {
      key: "company_name",
      header: "Tên công ty",
      width: 200,
      render: (r) => <span className="font-medium">{r.company_name}</span>,
    },
    {
      key: "site_type",
      header: "Loại",
      width: 100,
      render: (r) => {
        const config = SITE_TYPE_CONFIG[r.site_type] || { label: r.site_type, color: "bg-gray-100 text-gray-800" };
        return <span className={`px-2 py-1 rounded-lg text-xs font-medium ${config.color}`}>{config.label}</span>;
      },
    },
    {
      key: "location",
      header: "Location",
      width: 150,
      render: (r) => (
        <div>
          <div className="font-medium text-sm">{r.location_name || "-"}</div>
          {r.location_code && <div className="text-xs text-gray-500">{r.location_code}</div>}
        </div>
      ),
    },
    {
      key: "detailed_address",
      header: "Địa chỉ",
      width: 200,
      render: (r) => r.detailed_address || <span className="text-gray-400">-</span>,
    },
    {
      key: "contact",
      header: "Liên hệ",
      width: 130,
      render: (r) =>
        r.contact_name ? (
          <div>
            <div className="text-sm">{r.contact_name}</div>
            {r.contact_phone && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {r.contact_phone}
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "status",
      header: "TT",
      width: 80,
      render: (r) => (
        <span
          className={`px-2 py-1 rounded-lg text-xs font-semibold ${
            r.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }`}
        >
          {r.status === "ACTIVE" ? "On" : "Off"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      width: 100,
      sortable: false,
      align: "center",
      render: (r) => (
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
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Sites</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý các điểm giao/nhận hàng cụ thể</p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm Site
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={MapPin} label="Tổng sites" value={stats.total} color="blue" />
          <StatCard icon={MapPin} label="Đang hoạt động" value={stats.active} color="green" />
          <StatCard icon={Building2} label="Khách hàng" value={stats.customers} color="purple" />
          <StatCard icon={Anchor} label="Cảng" value={stats.ports} color="orange" />
          <StatCard icon={Building2} label="Kho" value={stats.warehouses} color="gray" />
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
                  { key: "CUSTOMER", label: "KH" },
                  { key: "PORT", label: "Cảng" },
                  { key: "WAREHOUSE", label: "Kho" },
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
                  placeholder="Tìm mã, tên, địa chỉ..."
                  className="pl-10 pr-4 py-2 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm w-64"
                />
              </div>
            </div>

            <div className="text-sm text-gray-500">{loading ? "Đang tải..." : `${filteredRows.length} sites`}</div>
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
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 font-bold text-${col.align || "left"}`}
                      style={{ width: col.width }}
                    >
                      {col.header}
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
                    Chưa có site nào
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rowIndex) => (
                  <tr key={row.id} className="border-t hover:bg-gray-50">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-${col.align || "left"}`}
                        style={{ width: col.width }}
                      >
                        {col.render ? col.render(row, rowIndex) : (row as any)[col.key] ?? "-"}
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
          itemName="sites"
        />
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="font-semibold text-lg">
                {mode === "create" ? "Thêm Site mới" : `Chỉnh sửa: ${editing?.company_name}`}
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
                      Location <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.location_id}
                      onChange={(e) => setForm((s) => ({ ...s, location_id: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">-- Chọn location --</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.code} - {loc.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Location dùng để tính giá cước</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Mã site</label>
                    <input
                      value={form.code}
                      onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Tự động nếu để trống"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">
                      Tên công ty <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.company_name}
                      onChange={(e) => setForm((s) => ({ ...s, company_name: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="VD: Công ty TNHH ABC"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Phân loại <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.site_type}
                      onChange={(e) => setForm((s) => ({ ...s, site_type: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="CUSTOMER">Khách hàng</option>
                      <option value="PORT">Cảng</option>
                      <option value="WAREHOUSE">Kho nội bộ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Trạng thái</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Address Info */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-green-600 rounded"></div>
                  Địa chỉ chi tiết
                </h3>
                <textarea
                  value={form.detailed_address}
                  onChange={(e) => setForm((s) => ({ ...s, detailed_address: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="VD: Số 123, Đường ABC, Phường XYZ, Quận ABC"
                />
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-orange-600 rounded"></div>
                  Thông tin liên hệ
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tên người liên hệ</label>
                    <input
                      value={form.contact_name}
                      onChange={(e) => setForm((s) => ({ ...s, contact_name: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="VD: Nguyễn Văn A"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Số điện thoại</label>
                    <input
                      value={form.contact_phone}
                      onChange={(e) => setForm((s) => ({ ...s, contact_phone: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="VD: 0909123456"
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
