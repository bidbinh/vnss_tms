"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import DataTable, { Column, TablePagination } from "@/components/DataTable";
import { Building2, Plus, Search, FileText } from "lucide-react";

// ============ Types ============
type Customer = {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  tax_code?: string | null;
  contacts_json?: string | null;
  created_at?: string;
  updated_at?: string;
};

type CustomerForm = {
  code: string;
  name: string;
  tax_code?: string;
  contacts_json?: string;
};

// ============ Stats Card Component ============
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
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
export default function CustomersPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CustomerForm>({
    code: "",
    name: "",
    tax_code: "",
    contacts_json: "",
  });

  // ============ Data Fetching ============
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Customer[]>("/api/v1/customers");
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
    const s = searchTerm.toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        (r.code || "").toLowerCase().includes(s) ||
        (r.name || "").toLowerCase().includes(s) ||
        (r.tax_code || "").toLowerCase().includes(s)
    );
  }, [rows, searchTerm]);

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
    const withTaxCode = rows.filter((r) => r.tax_code).length;
    const withContacts = rows.filter((r) => r.contacts_json).length;
    return { total: rows.length, withTaxCode, withContacts };
  }, [rows]);

  // ============ Modal Functions ============
  function openCreate() {
    setMode("create");
    setEditing(null);
    setForm({ code: "", name: "", tax_code: "", contacts_json: "" });
    setOpen(true);
  }

  function openEdit(row: Customer) {
    setMode("edit");
    setEditing(row);
    setForm({
      code: row.code || "",
      name: row.name || "",
      tax_code: row.tax_code || "",
      contacts_json: row.contacts_json || "",
    });
    setOpen(true);
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      if (!form.code.trim() || !form.name.trim()) {
        throw new Error("Code và Name là bắt buộc.");
      }

      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        tax_code: form.tax_code?.trim() ? form.tax_code.trim() : null,
        contacts_json: form.contacts_json?.trim() ? form.contacts_json.trim() : null,
      };

      if (mode === "create") {
        await apiFetch<Customer>("/api/v1/customers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!editing) throw new Error("Missing editing row");
        await apiFetch<Customer>(`/api/v1/customers/${editing.id}`, {
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
  const columns: Column<Customer>[] = [
    {
      key: "code",
      header: "Mã KH",
      width: 120,
      render: (r) => <span className="font-semibold text-blue-600">{r.code}</span>,
    },
    {
      key: "name",
      header: "Tên khách hàng",
      width: 300,
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "tax_code",
      header: "Mã số thuế",
      width: 150,
      render: (r) => r.tax_code || <span className="text-gray-400">-</span>,
    },
    {
      key: "contacts",
      header: "Liên hệ",
      width: 150,
      render: (r) => {
        if (!r.contacts_json) return <span className="text-gray-400">-</span>;
        try {
          const contacts = JSON.parse(r.contacts_json);
          if (Array.isArray(contacts) && contacts.length > 0) {
            return (
              <span className="text-sm text-gray-700">
                {contacts[0].name || contacts[0].phone || "Có thông tin"}
                {contacts.length > 1 && <span className="text-gray-400 ml-1">(+{contacts.length - 1})</span>}
              </span>
            );
          }
        } catch {
          return <span className="text-gray-400">-</span>;
        }
        return <span className="text-gray-400">-</span>;
      },
    },
    {
      key: "updated_at",
      header: "Cập nhật",
      width: 120,
      render: (r) =>
        r.updated_at ? (
          <span className="text-xs text-gray-500">{new Date(r.updated_at).toLocaleDateString("vi-VN")}</span>
        ) : (
          <span className="text-gray-400">-</span>
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
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Khách hàng</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý danh sách khách hàng (Master Data)</p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm khách hàng
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={Building2} label="Tổng khách hàng" value={stats.total} color="blue" />
          <StatCard icon={FileText} label="Có mã số thuế" value={stats.withTaxCode} color="green" />
          <StatCard icon={Building2} label="Có thông tin liên hệ" value={stats.withContacts} color="gray" />
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
                placeholder="Tìm theo mã, tên, mã số thuế..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm"
              />
            </div>
            <div className="text-sm text-gray-500">{loading ? "Đang tải..." : `${filteredRows.length} khách hàng`}</div>
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
                    Chưa có khách hàng nào
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
          itemName="khách hàng"
        />
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="font-semibold text-lg">
                {mode === "create" ? "Thêm khách hàng mới" : `Chỉnh sửa: ${editing?.code}`}
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black text-xl">
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Mã khách hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="ADG"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Mã số thuế</label>
                  <input
                    value={form.tax_code}
                    onChange={(e) => setForm((s) => ({ ...s, tax_code: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="010..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Tên khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="An Dương Group"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Contacts JSON (optional)</label>
                <textarea
                  value={form.contacts_json}
                  onChange={(e) => setForm((s) => ({ ...s, contacts_json: e.target.value }))}
                  className="w-full min-h-24 rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder='[{"name":"A","phone":"..."}]'
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-end gap-2">
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
