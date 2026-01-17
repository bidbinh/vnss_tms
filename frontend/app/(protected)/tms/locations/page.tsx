"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import DataTable, { Column, TablePagination } from "@/components/DataTable";
import { MapPin, Plus, Search, Factory, Building, Anchor, Warehouse, Trash2, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Pencil } from "lucide-react";

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
// Separated for i18n - keys map to translation keys, colors/icons are static
const TYPE_KEYS: Record<string, string> = {
  INDUSTRIAL_ZONE: "industrialZone",
  WARD: "ward",
  PORT: "port",
  ICD: "icd",
  DEPOT: "depot",
  WAREHOUSE: "warehouse",
};

const TYPE_ICONS: Record<string, any> = {
  INDUSTRIAL_ZONE: Factory,
  WARD: Building,
  PORT: Anchor,
  ICD: Warehouse,
  DEPOT: Warehouse,
  WAREHOUSE: Warehouse,
};

const TYPE_COLORS: Record<string, string> = {
  INDUSTRIAL_ZONE: "bg-blue-100 text-blue-800",
  WARD: "bg-gray-100 text-gray-800",
  PORT: "bg-green-100 text-green-800",
  ICD: "bg-purple-100 text-purple-800",
  DEPOT: "bg-orange-100 text-orange-800",
  WAREHOUSE: "bg-yellow-100 text-yellow-800",
};

// ============ Main Component ============
export default function LocationsPage() {
  const t = useTranslations("tms.locationsPage");
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
        throw new Error(t("errors.codeAndNameRequired"));
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
    if (!confirm(t("confirmations.deleteLocation"))) return;

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
    { key: "code", header: t("columns.code"), width: 130, sortable: true },
    { key: "name", header: t("columns.name"), width: 200, sortable: true },
    { key: "type", header: t("columns.type"), width: 100, sortable: true },
    { key: "ward", header: t("columns.ward"), width: 120, sortable: true },
    { key: "district", header: t("columns.district"), width: 130, sortable: true },
    { key: "province", header: t("columns.province"), width: 130, sortable: true },
    { key: "actions", header: t("columns.actions"), width: 100, sortable: false },
  ];

  function renderCell(row: Location, key: string) {
    switch (key) {
      case "code":
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{row.code}</span>
            {!row.is_active && (
              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">{t("status.deleted")}</span>
            )}
          </div>
        );
      case "name":
        return <span className={`font-medium ${!row.is_active ? "text-gray-400" : ""}`}>{row.name}</span>;
      case "type": {
        const typeKey = TYPE_KEYS[row.type] || row.type;
        const color = TYPE_COLORS[row.type] || "bg-gray-100 text-gray-800";
        return <span className={`px-2 py-1 rounded-lg text-xs font-medium ${color}`}>{t(`types.${typeKey}`)}</span>;
      }
      case "ward":
        return row.ward || <span className="text-gray-400">-</span>;
      case "district":
        return row.district || <span className="text-gray-400">-</span>;
      case "province":
        return row.province || <span className="text-gray-400">-</span>;
      case "actions":
        return row.is_active ? (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row);
              }}
              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition-colors"
              title={t("actions.edit")}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.id);
              }}
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors"
              title={t("actions.delete")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRestore(row.id);
            }}
            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 hover:text-green-800 transition-colors"
            title={t("actions.restore")}
          >
            <RotateCcw className="w-4 h-4" />
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
      header: t("columns.code"),
      width: 130,
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{r.code}</span>
          {!r.is_active && (
            <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">{t("status.deleted")}</span>
          )}
        </div>
      ),
    },
    {
      key: "name",
      header: t("columns.name"),
      width: 200,
      render: (r) => <span className={`font-medium ${!r.is_active ? "text-gray-400" : ""}`}>{r.name}</span>,
    },
    {
      key: "type",
      header: t("columns.type"),
      width: 100,
      render: (r) => {
        const typeKey = TYPE_KEYS[r.type] || r.type;
        const color = TYPE_COLORS[r.type] || "bg-gray-100 text-gray-800";
        return <span className={`px-2 py-1 rounded-lg text-xs font-medium ${color}`}>{t(`types.${typeKey}`)}</span>;
      },
    },
    {
      key: "ward",
      header: t("columns.ward"),
      width: 120,
      render: (r) => r.ward || <span className="text-gray-400">-</span>,
    },
    {
      key: "district",
      header: t("columns.district"),
      width: 130,
      render: (r) => r.district || <span className="text-gray-400">-</span>,
    },
    {
      key: "province",
      header: t("columns.province"),
      width: 130,
      render: (r) => r.province || <span className="text-gray-400">-</span>,
    },
    {
      key: "actions",
      header: t("columns.actions"),
      width: 100,
      sortable: false,
      align: "center",
      render: (r) =>
        r.is_active ? (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEdit(r);
              }}
              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition-colors"
              title={t("actions.edit")}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(r.id);
              }}
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors"
              title={t("actions.delete")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRestore(r.id);
            }}
            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 hover:text-green-800 transition-colors"
            title={t("actions.restore")}
          >
            <RotateCcw className="w-4 h-4" />
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
            <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
            <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("addLocation")}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={MapPin} label={t("stats.totalLocations")} value={stats.total} color="blue" />
          <StatCard icon={MapPin} label={t("stats.active")} value={stats.active} color="green" />
          <StatCard icon={Factory} label={t("stats.industrialZone")} value={stats.kcn} color="purple" />
          <StatCard icon={Anchor} label={t("stats.port")} value={stats.port} color="orange" />
          <StatCard icon={Warehouse} label={t("stats.icd")} value={stats.icd} color="gray" />
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
                  { key: "ALL", labelKey: "filters.all" },
                  { key: "INDUSTRIAL_ZONE", labelKey: "filters.industrialZone" },
                  { key: "PORT", labelKey: "filters.port" },
                  { key: "ICD", labelKey: "filters.icd" },
                  { key: "DEPOT", labelKey: "filters.depot" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterType(tab.key)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      filterType === tab.key ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {t(tab.labelKey)}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("search.placeholder")}
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
                {t("search.showDeleted")}
              </label>
            </div>

            <div className="text-sm text-gray-500">{loading ? t("search.loading") : `${filteredRows.length} ${t("search.locations")}`}</div>
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
                      {t("table.loading")}
                    </div>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={columnDefs.length} className="px-4 py-8 text-center text-gray-500">
                    {t("table.noData")}
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
          itemName={t("pagination.locations")}
        />
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="font-semibold text-lg">
                {mode === "create" ? t("modal.createTitle") : t("modal.editTitle", { code: editing?.code || "" })}
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
                  {t("modal.basicInfo")}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      {t("modal.code")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.code}
                      onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder={t("modal.codePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      {t("modal.type")} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="INDUSTRIAL_ZONE">{t("types.industrialZone")}</option>
                      <option value="WARD">{t("types.ward")}</option>
                      <option value="PORT">{t("types.port")}</option>
                      <option value="ICD">{t("types.icd")}</option>
                      <option value="DEPOT">{t("types.depot")}</option>
                      <option value="WAREHOUSE">{t("types.warehouse")}</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">
                      {t("modal.name")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder={t("modal.namePlaceholder")}
                    />
                  </div>
                </div>
              </div>

              {/* Geographic Info */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-green-600 rounded"></div>
                  {t("modal.geographicInfo")}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t("modal.ward")}</label>
                    <input
                      value={form.ward}
                      onChange={(e) => setForm((s) => ({ ...s, ward: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder={t("modal.wardPlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t("modal.district")}</label>
                    <input
                      value={form.district}
                      onChange={(e) => setForm((s) => ({ ...s, district: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder={t("modal.districtPlaceholder")}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">{t("modal.province")}</label>
                    <input
                      value={form.province}
                      onChange={(e) => setForm((s) => ({ ...s, province: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder={t("modal.provincePlaceholder")}
                    />
                  </div>
                </div>
              </div>

              {/* Note */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-gray-600 rounded"></div>
                  {t("modal.noteSection")}
                </h3>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder={t("modal.notePlaceholder")}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setOpen(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                {t("modal.cancel")}
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-60 hover:bg-blue-700"
              >
                {saving ? t("modal.saving") : t("modal.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
