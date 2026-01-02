"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import DataTable, { Column, TablePagination } from "@/components/DataTable";
import { Truck, Plus, Search, CheckCircle, XCircle, Wrench, Calendar } from "lucide-react";

// ============ Types ============
type Vehicle = {
  id: string;
  tenant_id: string;
  code?: string;
  plate_no: string;
  type: string;
  vehicle_type_name?: string;
  manufacturer?: string;
  model?: string;
  country_of_origin?: string;
  year_of_manufacture?: number;
  chassis_number?: string;
  engine_number?: string;
  curb_weight?: number;
  payload_capacity?: number;
  gross_weight?: number;
  dimensions?: string;
  registration_expiry?: string;
  status: string;
  inactive_reason?: string;
  created_at?: string;
  updated_at?: string;
};

type VehicleForm = {
  code: string;
  plate_no: string;
  type: string;
  vehicle_type_name: string;
  manufacturer: string;
  model: string;
  country_of_origin: string;
  year_of_manufacture: string;
  chassis_number: string;
  engine_number: string;
  curb_weight: string;
  payload_capacity: string;
  gross_weight: string;
  dimensions: string;
  registration_expiry: string;
  status: string;
  inactive_reason: string;
};

// ============ Stats Card Component ============
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
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

// ============ Main Component ============
export default function VehiclesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm: VehicleForm = {
    code: "",
    plate_no: "",
    type: "TRACTOR",
    vehicle_type_name: "",
    manufacturer: "",
    model: "",
    country_of_origin: "",
    year_of_manufacture: "",
    chassis_number: "",
    engine_number: "",
    curb_weight: "",
    payload_capacity: "",
    gross_weight: "",
    dimensions: "",
    registration_expiry: "",
    status: "ACTIVE",
    inactive_reason: "",
  };

  const [form, setForm] = useState<VehicleForm>(emptyForm);

  // ============ Data Fetching ============
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Vehicle[]>("/api/v1/vehicles");
      setRows(data);
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
      result = result.filter((r) => r.type === filterType);
    }

    // Filter by search term
    const s = searchTerm.toLowerCase();
    if (s) {
      result = result.filter(
        (r) =>
          (r.plate_no || "").toLowerCase().includes(s) ||
          (r.code || "").toLowerCase().includes(s) ||
          (r.manufacturer || "").toLowerCase().includes(s) ||
          (r.model || "").toLowerCase().includes(s)
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
    const tractors = rows.filter((r) => r.type === "TRACTOR").length;
    const trailers = rows.filter((r) => r.type === "TRAILER").length;
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const maintenance = rows.filter((r) => r.status === "MAINTENANCE").length;
    const inactive = rows.filter((r) => r.status === "INACTIVE").length;

    // Vehicles with registration expiring soon (within 30 days)
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringRegistration = rows.filter((r) => {
      if (!r.registration_expiry) return false;
      const expiry = new Date(r.registration_expiry);
      return expiry <= thirtyDaysLater && expiry >= today;
    }).length;

    return { total: rows.length, tractors, trailers, active, maintenance, inactive, expiringRegistration };
  }, [rows]);

  // ============ Modal Functions ============
  function openCreate() {
    setMode("create");
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: Vehicle) {
    setMode("edit");
    setEditing(row);
    setForm({
      code: row.code || "",
      plate_no: row.plate_no || "",
      type: row.type || "TRACTOR",
      vehicle_type_name: row.vehicle_type_name || "",
      manufacturer: row.manufacturer || "",
      model: row.model || "",
      country_of_origin: row.country_of_origin || "",
      year_of_manufacture: row.year_of_manufacture?.toString() || "",
      chassis_number: row.chassis_number || "",
      engine_number: row.engine_number || "",
      curb_weight: row.curb_weight?.toString() || "",
      payload_capacity: row.payload_capacity?.toString() || "",
      gross_weight: row.gross_weight?.toString() || "",
      dimensions: row.dimensions || "",
      registration_expiry: row.registration_expiry ? new Date(row.registration_expiry).toISOString().split("T")[0] : "",
      status: row.status || "ACTIVE",
      inactive_reason: row.inactive_reason || "",
    });
    setOpen(true);
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      if (!form.plate_no.trim()) {
        throw new Error("Biển số xe là bắt buộc.");
      }

      const payload: any = {
        code: form.code.trim() || null,
        plate_no: form.plate_no.trim(),
        type: form.type.trim(),
        vehicle_type_name: form.vehicle_type_name.trim() || null,
        manufacturer: form.manufacturer.trim() || null,
        model: form.model.trim() || null,
        country_of_origin: form.country_of_origin.trim() || null,
        year_of_manufacture: form.year_of_manufacture ? parseInt(form.year_of_manufacture) : null,
        chassis_number: form.chassis_number.trim() || null,
        engine_number: form.engine_number.trim() || null,
        curb_weight: form.curb_weight ? parseInt(form.curb_weight) : null,
        payload_capacity: form.payload_capacity ? parseInt(form.payload_capacity) : null,
        gross_weight: form.gross_weight ? parseInt(form.gross_weight) : null,
        dimensions: form.dimensions.trim() || null,
        registration_expiry: form.registration_expiry || null,
        status: form.status.trim(),
        inactive_reason: form.inactive_reason.trim() || null,
      };

      if (mode === "create") {
        await apiFetch<Vehicle>("/api/v1/vehicles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!editing) throw new Error("Missing editing row");
        await apiFetch<Vehicle>(`/api/v1/vehicles/${editing.id}`, {
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

  // ============ Table Columns ============
  const columns: Column<Vehicle>[] = [
    {
      key: "code",
      header: "Mã",
      width: 80,
      render: (r) => <span className="font-medium">{r.code || "-"}</span>,
    },
    {
      key: "plate_no",
      header: "Biển số",
      width: 120,
      render: (r) => <span className="font-semibold text-gray-900">{r.plate_no}</span>,
    },
    {
      key: "type",
      header: "Loại",
      width: 110,
      render: (r) => (
        <span
          className={`px-2 py-1 rounded-lg text-xs font-medium ${
            r.type === "TRACTOR" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
          }`}
        >
          {r.type === "TRACTOR" ? "Đầu kéo" : "Rơ mooc"}
        </span>
      ),
    },
    {
      key: "manufacturer",
      header: "Hãng xe",
      width: 120,
      render: (r) => r.manufacturer || <span className="text-gray-400">-</span>,
    },
    {
      key: "model",
      header: "Dòng xe",
      width: 100,
      render: (r) => r.model || <span className="text-gray-400">-</span>,
    },
    {
      key: "year_of_manufacture",
      header: "Năm SX",
      width: 80,
      render: (r) => r.year_of_manufacture || <span className="text-gray-400">-</span>,
    },
    {
      key: "registration_expiry",
      header: "Đăng kiểm",
      width: 110,
      render: (r) => {
        if (!r.registration_expiry) return <span className="text-gray-400">-</span>;
        const expiry = new Date(r.registration_expiry);
        const today = new Date();
        const isExpired = expiry < today;
        const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const isExpiringSoon = expiry <= thirtyDaysLater && !isExpired;

        return (
          <span
            className={`text-xs ${isExpired ? "text-red-600 font-medium" : isExpiringSoon ? "text-orange-600 font-medium" : "text-gray-700"}`}
          >
            {expiry.toLocaleDateString("vi-VN")}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      width: 100,
      render: (r) => (
        <span
          className={`px-2 py-1 rounded-lg text-xs font-semibold ${
            r.status === "ACTIVE"
              ? "bg-green-100 text-green-800"
              : r.status === "MAINTENANCE"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {r.status === "ACTIVE" ? "Hoạt động" : r.status === "MAINTENANCE" ? "Bảo trì" : "Ngừng"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      width: 80,
      sortable: false,
      align: "center",
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEdit(r);
          }}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Sửa
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
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Phương tiện</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý xe đầu kéo và rơ mooc</p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm phương tiện
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={Truck} label="Tổng phương tiện" value={stats.total} color="blue" />
          <StatCard icon={Truck} label="Đầu kéo" value={stats.tractors} color="blue" />
          <StatCard icon={Truck} label="Rơ mooc" value={stats.trailers} color="purple" />
          <StatCard icon={CheckCircle} label="Đang hoạt động" value={stats.active} color="green" />
          <StatCard icon={Calendar} label="Sắp hết hạn ĐK" value={stats.expiringRegistration} color="yellow" />
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
                  { key: "TRACTOR", label: "Đầu kéo" },
                  { key: "TRAILER", label: "Rơ mooc" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterType(tab.key)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
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
                  placeholder="Tìm biển số, hãng xe..."
                  className="pl-10 pr-4 py-2 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm w-64"
                />
              </div>
            </div>

            <div className="text-sm text-gray-500">{loading ? "Đang tải..." : `${filteredRows.length} phương tiện`}</div>
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
                    Chưa có phương tiện nào
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
          itemName="phương tiện"
        />
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="font-semibold text-lg">
                {mode === "create" ? "Thêm phương tiện mới" : `Chỉnh sửa: ${editing?.plate_no}`}
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black text-xl">
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-600 rounded"></div>
                  Thông tin cơ bản
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Mã phương tiện</label>
                    <input
                      value={form.code}
                      onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="R01, T01, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Biển số xe <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.plate_no}
                      onChange={(e) => setForm((s) => ({ ...s, plate_no: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="51C-12345"
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
                      <option value="TRACTOR">TRACTOR (Đầu kéo)</option>
                      <option value="TRAILER">TRAILER (Rơ mooc)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tên loại phương tiện</label>
                    <input
                      value={form.vehicle_type_name}
                      onChange={(e) => setForm((s) => ({ ...s, vehicle_type_name: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Romooc, Đầu kéo"
                    />
                  </div>
                </div>
              </div>

              {/* Manufacturer Info */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-purple-600 rounded"></div>
                  Thông tin nhà sản xuất
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hãng xe</label>
                    <input
                      value={form.manufacturer}
                      onChange={(e) => setForm((s) => ({ ...s, manufacturer: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Hyundai"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Dòng xe</label>
                    <input
                      value={form.model}
                      onChange={(e) => setForm((s) => ({ ...s, model: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="HD700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Nước sản xuất</label>
                    <input
                      value={form.country_of_origin}
                      onChange={(e) => setForm((s) => ({ ...s, country_of_origin: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="VN, HQ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Năm sản xuất</label>
                    <input
                      type="number"
                      value={form.year_of_manufacture}
                      onChange={(e) => setForm((s) => ({ ...s, year_of_manufacture: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="2015"
                    />
                  </div>
                </div>
              </div>

              {/* Technical Specifications */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-green-600 rounded"></div>
                  Thông số kỹ thuật
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Số khung</label>
                    <input
                      value={form.chassis_number}
                      onChange={(e) => setForm((s) => ({ ...s, chassis_number: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="RPUF403V2F3000004"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Số máy</label>
                    <input
                      value={form.engine_number}
                      onChange={(e) => setForm((s) => ({ ...s, engine_number: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="D6ACF1279583"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Khối lượng bản thân (kg)</label>
                    <input
                      type="number"
                      value={form.curb_weight}
                      onChange={(e) => setForm((s) => ({ ...s, curb_weight: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="7020"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Khối lượng hàng (kg)</label>
                    <input
                      type="number"
                      value={form.payload_capacity}
                      onChange={(e) => setForm((s) => ({ ...s, payload_capacity: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="32790"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Khối lượng toàn bộ (kg)</label>
                    <input
                      type="number"
                      value={form.gross_weight}
                      onChange={(e) => setForm((s) => ({ ...s, gross_weight: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="39810"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Kích thước bao (mm)</label>
                    <input
                      value={form.dimensions}
                      onChange={(e) => setForm((s) => ({ ...s, dimensions: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="12310x2500x1490"
                    />
                  </div>
                </div>
              </div>

              {/* Registration & Status */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-yellow-600 rounded"></div>
                  Đăng kiểm & Trạng thái
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hạn đăng kiểm</label>
                    <input
                      type="date"
                      value={form.registration_expiry}
                      onChange={(e) => setForm((s) => ({ ...s, registration_expiry: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Trạng thái <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="ACTIVE">ACTIVE - Hoạt động</option>
                      <option value="INACTIVE">INACTIVE - Ngừng hoạt động</option>
                      <option value="MAINTENANCE">MAINTENANCE - Bảo trì</option>
                    </select>
                  </div>
                  {form.status === "INACTIVE" && (
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Lý do ngừng hoạt động</label>
                      <textarea
                        value={form.inactive_reason}
                        onChange={(e) => setForm((s) => ({ ...s, inactive_reason: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        rows={2}
                        placeholder="Nhập lý do..."
                      />
                    </div>
                  )}
                </div>
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
