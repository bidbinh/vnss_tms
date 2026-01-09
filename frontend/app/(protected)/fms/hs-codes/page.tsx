"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  BookOpen,
  Download,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  CloudUpload,
  RefreshCw,
  Save,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { usePageTranslations } from "@/hooks/usePageTranslations";

interface HSCode {
  id: string;
  hs_code: string;
  description: string;
  description_vi?: string;
  description_en?: string;
  product_code?: string;
  chapter?: string;
  heading?: string;
  subheading?: string;
  import_duty_rate?: number;
  export_duty_rate?: number;
  vat_rate?: number;
  special_tax_rate?: number;
  unit?: string;
  unit_code?: string;
  unit_name?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  imported_count: number;
  skipped_count: number;
  errors: string[];
}

type SortField = "product_code" | "hs_code" | "description_vi";
type SortOrder = "asc" | "desc";

// Default column widths
const DEFAULT_COLUMN_WIDTHS = {
  product_code: 120,
  hs_code: 120,
  description_vi: 400,
  actions: 100,
};

// Get API base URL - handle different env var names
const getApiBase = () => {
  if (typeof window !== "undefined") {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (apiUrl) return apiUrl;
    if (apiBaseUrl) return apiBaseUrl.replace("/api/v1", "");
    return "http://localhost:8000";
  }
  return "http://localhost:8000";
};

export default function HSCodesPage() {
  const { t, tCommon } = usePageTranslations("fms.hsCodesPage");

  const [hsCodes, setHsCodes] = useState<HSCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedHSCode, setSelectedHSCode] = useState<HSCode | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fixing, setFixing] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("product_code");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Column widths state (for resizing)
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const API_BASE = getApiBase();

  // Handle column resize
  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setResizingColumn(column);
    startX.current = e.clientX;
    startWidth.current = columnWidths[column as keyof typeof columnWidths];
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColumn) {
        const diff = e.clientX - startX.current;
        const newWidth = Math.max(60, startWidth.current + diff);
        setColumnWidths((prev) => ({
          ...prev,
          [resizingColumn]: newWidth,
        }));
      }
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingColumn]);

  // Fix swapped columns
  const handleFixColumns = async () => {
    if (
      !confirm(
        `${t("fixColumns.confirmTitle")}\n\n${t("fixColumns.confirmMessage")}`
      )
    ) {
      return;
    }

    setFixing(true);
    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(
        `${API_BASE}/api/v1/fms/master-data/hs-codes/fix-columns`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        alert(`${t("fixColumns.fixed")} ${data.updated} ${t("fixColumns.of")} ${data.total_processed} ${t("fixColumns.entries")}`);
        fetchHSCodes();
      } else {
        const data = await res.json();
        alert(data.detail || "Error fixing data");
      }
    } catch (error) {
      console.error("Error fixing columns:", error);
      alert("Error occurred");
    } finally {
      setFixing(false);
    }
  };

  const fetchHSCodes = useCallback(async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || localStorage.getItem("access_token");
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });

      if (search) params.append("search", search);

      const res = await fetch(
        `${API_BASE}/api/v1/fms/master-data/hs-codes?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setHsCodes(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error loading HS codes:", error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, API_BASE]);

  useEffect(() => {
    fetchHSCodes();
  }, [fetchHSCodes]);

  // Sort data
  const sortedHsCodes = useMemo(() => {
    return [...hsCodes].sort((a, b) => {
      let aVal = "";
      let bVal = "";

      if (sortField === "product_code") {
        aVal = a.product_code || "";
        bVal = b.product_code || "";
      } else if (sortField === "hs_code") {
        aVal = a.hs_code || "";
        bVal = b.hs_code || "";
      } else if (sortField === "description_vi") {
        aVal = a.description_vi || a.description || "";
        bVal = b.description_vi || b.description || "";
      }

      const comparison = aVal.localeCompare(bVal, "vi");
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [hsCodes, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleSearch = () => {
    setPage(1);
  };

  // Action handlers
  const handleView = (hs: HSCode) => {
    setSelectedHSCode(hs);
    setShowViewModal(true);
  };

  const handleEdit = (hs: HSCode) => {
    setSelectedHSCode(hs);
    setShowEditModal(true);
  };

  const handleDeleteClick = (hs: HSCode) => {
    setSelectedHSCode(hs);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!selectedHSCode) return;

    setDeleting(true);
    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(
        `${API_BASE}/api/v1/fms/master-data/hs-codes/${selectedHSCode.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        setShowDeleteConfirm(false);
        setSelectedHSCode(null);
        fetchHSCodes();
      } else {
        const data = await res.json();
        alert(data.detail || "Cannot delete HS code");
      }
    } catch (error) {
      console.error("Error deleting HS code:", error);
      alert("Error occurred while deleting");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="w-3 h-3 text-gray-300" />;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="w-3 h-3 text-blue-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-600" />
    );
  };

  if (loading) return <div className="p-8 text-sm">{tCommon("loading")}</div>;

  return (
    <div className="h-[calc(100vh-64px)] overflow-auto">
      {/* Header */}
      <div className="p-6 pb-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">{t("title")}</h1>
            <p className="text-xs text-gray-500">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleFixColumns}
              disabled={fixing}
              className="px-3 py-1.5 text-xs border border-orange-300 text-orange-600 rounded hover:bg-orange-50 disabled:opacity-50"
              title={t("fixData")}
            >
              <RefreshCw className={`w-4 h-4 inline mr-1 ${fixing ? "animate-spin" : ""}`} />
              {fixing ? t("fixing") : t("fixData")}
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              <Upload className="w-4 h-4 inline mr-1" />
              {t("importExcel")}
            </button>
            <button className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">
              <Download className="w-4 h-4 inline mr-1" />
              {t("exportExcel")}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              {t("addProduct")}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky: Search + Table Header */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        {/* Search Bar */}
        <div className="border-y border-gray-200 px-6">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700"
              >
                {tCommon("search")}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">{t("pagination.rowsPerPage")}:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="text-xs border rounded px-2 py-1"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        <style jsx>{`
          .resizable-th {
            position: relative;
            user-select: none;
          }
          .resize-handle {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 5px;
            cursor: col-resize;
            background: transparent;
          }
          .resize-handle:hover {
            background: #3b82f6;
          }
        `}</style>

        {/* Table Header */}
        <div className="px-6 pt-3 bg-white">
          <div className="border border-b-0 border-gray-200 rounded-t-xl overflow-hidden">
            <table className="text-xs" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="resizable-th px-2 py-2 text-left font-bold text-gray-700 cursor-pointer"
                    style={{ width: columnWidths.product_code }}
                    onClick={() => handleSort("product_code")}
                  >
                    <div className="flex items-center gap-1">
                      {t("columns.productCode")}
                      <SortIcon field="product_code" />
                    </div>
                    <div
                      className="resize-handle"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown(e, "product_code");
                      }}
                    />
                  </th>
                  <th
                    className="resizable-th px-2 py-2 text-left font-bold text-gray-700 cursor-pointer"
                    style={{ width: columnWidths.hs_code }}
                    onClick={() => handleSort("hs_code")}
                  >
                    <div className="flex items-center gap-1">
                      {t("columns.hsCode")}
                      <SortIcon field="hs_code" />
                    </div>
                    <div
                      className="resize-handle"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown(e, "hs_code");
                      }}
                    />
                  </th>
                  <th
                    className="resizable-th px-2 py-2 text-left font-bold text-gray-700 cursor-pointer"
                    style={{ width: columnWidths.description_vi }}
                    onClick={() => handleSort("description_vi")}
                  >
                    <div className="flex items-center gap-1">
                      {t("columns.descriptionVi")}
                      <SortIcon field="description_vi" />
                    </div>
                    <div
                      className="resize-handle"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown(e, "description_vi");
                      }}
                    />
                  </th>
                  <th
                    className="px-2 py-2 text-left font-bold text-gray-700"
                    style={{ width: columnWidths.actions }}
                  >
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
            </table>
          </div>
        </div>
      </div>

      {/* Data Table Body */}
      <div className="px-6 pb-4">
        <div className="border border-t-0 border-gray-200 rounded-b-xl overflow-hidden bg-white">
          <table className="text-xs" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
            <tbody className="divide-y divide-gray-100">
              {sortedHsCodes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-8 text-center text-gray-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">{t("noData")}</p>
                    <p className="text-xs text-gray-400">{t("noDataHint")}</p>
                  </td>
                </tr>
              ) : (
                sortedHsCodes.map((hs) => (
                  <tr key={hs.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2" style={{ width: columnWidths.product_code }}>
                      <span className="font-medium text-blue-600">{hs.product_code || "-"}</span>
                    </td>
                    <td className="px-2 py-2" style={{ width: columnWidths.hs_code }}>
                      <span className="font-mono">{hs.hs_code}</span>
                    </td>
                    <td className="px-2 py-2" style={{ width: columnWidths.description_vi }}>
                      <span className="line-clamp-2">{hs.description_vi || hs.description || "-"}</span>
                    </td>
                    <td className="px-2 py-2" style={{ width: columnWidths.actions }}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(hs)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title={t("tooltips.view")}
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleEdit(hs)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title={t("tooltips.edit")}
                        >
                          <Edit className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(hs)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title={t("tooltips.delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
            <p>
              {t("pagination.showing")} {(page - 1) * pageSize + 1} {t("pagination.to")}{" "}
              {Math.min(page * pageSize, total)} {t("pagination.of")} {total} {t("pagination.items")}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                {t("pagination.previous")}
              </button>
              <span className="px-2 py-1">
                {t("pagination.page")} {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                {t("pagination.next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateHSCodeModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchHSCodes();
          }}
          t={t}
          tCommon={tCommon}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportExcelModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            fetchHSCodes();
          }}
          t={t}
          tCommon={tCommon}
        />
      )}

      {/* View Modal */}
      {showViewModal && selectedHSCode && (
        <ViewHSCodeModal
          hsCode={selectedHSCode}
          onClose={() => {
            setShowViewModal(false);
            setSelectedHSCode(null);
          }}
          t={t}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedHSCode && (
        <EditHSCodeModal
          hsCode={selectedHSCode}
          onClose={() => {
            setShowEditModal(false);
            setSelectedHSCode(null);
          }}
          onUpdated={() => {
            setShowEditModal(false);
            setSelectedHSCode(null);
            fetchHSCodes();
          }}
          t={t}
          tCommon={tCommon}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedHSCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-sm font-bold mb-2">{t("delete.title")}</h3>
            <p className="text-xs text-gray-600 mb-4">
              {t("delete.message")} <strong>{selectedHSCode.product_code}</strong> ({t("delete.hsLabel")}: {selectedHSCode.hs_code})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedHSCode(null);
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                disabled={deleting}
              >
                {t("delete.cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? t("delete.deleting") : t("delete.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateHSCodeModal({
  onClose,
  onCreated,
  t,
  tCommon,
}: {
  onClose: () => void;
  onCreated: () => void;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}) {
  const [formData, setFormData] = useState({
    product_code: "",
    hs_code: "",
    description: "",
    description_vi: "",
    description_en: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const API_BASE = getApiBase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/v1/fms/master-data/hs-codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          description: formData.description_vi,
        }),
      });

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.detail || "Cannot create HS code");
      }
    } catch (err) {
      setError("Error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-bold">{t("modal.createTitle")}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2 bg-red-50 text-red-600 rounded text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                {t("modal.productCode")} *
              </label>
              <input
                type="text"
                value={formData.product_code}
                onChange={(e) =>
                  setFormData({ ...formData, product_code: e.target.value })
                }
                placeholder={t("modal.productCodePlaceholder")}
                className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                {t("modal.hsCode")} *
              </label>
              <input
                type="text"
                value={formData.hs_code}
                onChange={(e) =>
                  setFormData({ ...formData, hs_code: e.target.value })
                }
                placeholder={t("modal.hsCodePlaceholder")}
                className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              {t("modal.descriptionVi")} *
            </label>
            <textarea
              value={formData.description_vi}
              onChange={(e) =>
                setFormData({ ...formData, description_vi: e.target.value })
              }
              rows={2}
              placeholder={t("modal.descriptionViPlaceholder")}
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              {t("modal.descriptionEn")}
            </label>
            <textarea
              value={formData.description_en}
              onChange={(e) =>
                setFormData({ ...formData, description_en: e.target.value })
              }
              rows={2}
              placeholder={t("modal.descriptionEnPlaceholder")}
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              {t("modal.notes")}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              {t("modal.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t("modal.creating") : t("modal.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Import Excel Modal Component
function ImportExcelModal({
  onClose,
  onImported,
  t,
  tCommon,
}: {
  onClose: () => void;
  onImported: () => void;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column configuration - default: U=HS Code, V=Product Code, W=Description
  const [hsCodeColumn, setHsCodeColumn] = useState("U");
  const [descriptionColumn, setDescriptionColumn] = useState("W");
  const [productCodeColumn, setProductCodeColumn] = useState("V");
  const [headerRow, setHeaderRow] = useState(1);

  const columnLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const API_BASE = getApiBase();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setImportResult(null);

    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("hs_code_column", hsCodeColumn);
      formData.append("description_column", descriptionColumn);
      formData.append("product_code_column", productCodeColumn);
      formData.append("header_row", String(headerRow));

      const response = await fetch(
        `${API_BASE}/api/v1/fms/customs/hs-codes/import-excel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setImportResult({
          success: false,
          message: result.detail || "Import failed",
          imported_count: 0,
          skipped_count: 0,
          errors: [result.detail || "Unknown error"],
        });
      } else {
        setImportResult(result);
        if (result.success) {
          onImported();
        }
      }
    } catch (err) {
      setImportResult({
        success: false,
        message: err instanceof Error ? err.message : "Import failed",
        imported_count: 0,
        skipped_count: 0,
        errors: [err instanceof Error ? err.message : "Unknown error"],
      });
    } finally {
      setImporting(false);
    }
  };

  const resetFile = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">{t("import.title")}</h2>
            <p className="text-xs text-gray-600 mt-0.5">{t("import.subtitle")}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-blue-500 bg-blue-50"
                : selectedFile
                ? "border-green-500 bg-green-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
            {selectedFile ? (
              <div className="space-y-1">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                <p className="text-xs font-medium text-green-700">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetFile();
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  {t("import.removeFile")}
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <CloudUpload className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-xs font-medium text-gray-700">
                  {t("import.dragDropText")}
                </p>
                <p className="text-xs text-gray-500">
                  {t("import.orClickText")} ({t("import.supportedFormats")})
                </p>
              </div>
            )}
          </div>

          {/* Column Configuration */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-xs font-medium mb-2">{t("import.columnConfig")}</h3>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  {t("import.hsCodeColumn")}
                </label>
                <select
                  value={hsCodeColumn}
                  onChange={(e) => setHsCodeColumn(e.target.value)}
                  className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {columnLetters.map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  {t("import.productCodeColumn")}
                </label>
                <select
                  value={productCodeColumn}
                  onChange={(e) => setProductCodeColumn(e.target.value)}
                  className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {columnLetters.map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  {t("import.descriptionColumn")}
                </label>
                <select
                  value={descriptionColumn}
                  onChange={(e) => setDescriptionColumn(e.target.value)}
                  className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {columnLetters.map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  {t("import.headerRow")}
                </label>
                <input
                  type="number"
                  value={headerRow}
                  onChange={(e) => setHeaderRow(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t("import.defaultConfig")}
            </p>
          </div>

          {/* Import Result */}
          {importResult && (
            <div
              className={`rounded-lg p-3 ${
                importResult.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-start gap-2">
                {importResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-xs font-medium ${
                      importResult.success ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {importResult.message}
                  </p>
                  {importResult.success && (
                    <p className="text-xs text-green-700 mt-1">
                      {t("import.imported")}: <strong>{importResult.imported_count}</strong> |{" "}
                      {t("import.skipped")}: <strong>{importResult.skipped_count}</strong>
                    </p>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {importResult.errors.slice(0, 5).map((err, idx) => (
                        <p key={idx} className="text-xs text-red-700">
                          - {err}
                        </p>
                      ))}
                      {importResult.errors.length > 5 && (
                        <p className="text-xs text-red-700">
                          ... and {importResult.errors.length - 5} more errors
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
          >
            {t("import.close")}
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile || importing}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                {t("import.importing")}
              </>
            ) : (
              <>
                <Upload className="w-3 h-3" />
                {t("import.importButton")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// View Modal Component
function ViewHSCodeModal({
  hsCode,
  onClose,
  t,
}: {
  hsCode: HSCode;
  onClose: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-bold">{t("modal.viewTitle")}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">
                {t("modal.productCode")}
              </label>
              <p className="text-xs font-medium text-blue-600">
                {hsCode.product_code || "-"}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">
                {t("modal.hsCode")}
              </label>
              <p className="text-xs font-mono">{hsCode.hs_code}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">
              {t("modal.descriptionVi")}
            </label>
            <p className="text-xs font-medium">
              {hsCode.description_vi || hsCode.description || "-"}
            </p>
          </div>
          {hsCode.description_en && (
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">
                {t("modal.descriptionEn")}
              </label>
              <p className="text-xs text-gray-700">{hsCode.description_en}</p>
            </div>
          )}
          {hsCode.notes && (
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">
                {t("modal.notes")}
              </label>
              <p className="text-xs text-gray-700">{hsCode.notes}</p>
            </div>
          )}
          <div className="pt-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                hsCode.is_active
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {hsCode.is_active ? t("status.active") : t("status.inactive")}
            </span>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            {t("modal.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Modal Component
function EditHSCodeModal({
  hsCode,
  onClose,
  onUpdated,
  t,
  tCommon,
}: {
  hsCode: HSCode;
  onClose: () => void;
  onUpdated: () => void;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}) {
  const [formData, setFormData] = useState({
    product_code: hsCode.product_code || "",
    hs_code: hsCode.hs_code || "",
    description_vi: hsCode.description_vi || hsCode.description || "",
    description_en: hsCode.description_en || "",
    notes: hsCode.notes || "",
    is_active: hsCode.is_active,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = getApiBase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(
        `${API_BASE}/api/v1/fms/master-data/hs-codes/${hsCode.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            description: formData.description_vi,
          }),
        }
      );

      if (res.ok) {
        onUpdated();
      } else {
        const data = await res.json();
        setError(data.detail || "Cannot update HS code");
      }
    } catch (err) {
      setError("Error occurred while updating");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-bold">{t("modal.editTitle")}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2 bg-red-50 text-red-600 rounded text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                {t("modal.productCode")} *
              </label>
              <input
                type="text"
                value={formData.product_code}
                onChange={(e) =>
                  setFormData({ ...formData, product_code: e.target.value })
                }
                placeholder={t("modal.productCodePlaceholder")}
                className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                {t("modal.hsCode")} *
              </label>
              <input
                type="text"
                value={formData.hs_code}
                onChange={(e) =>
                  setFormData({ ...formData, hs_code: e.target.value })
                }
                placeholder={t("modal.hsCodePlaceholder")}
                className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              {t("modal.descriptionVi")} *
            </label>
            <textarea
              value={formData.description_vi}
              onChange={(e) =>
                setFormData({ ...formData, description_vi: e.target.value })
              }
              rows={2}
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              {t("modal.descriptionEn")}
            </label>
            <textarea
              value={formData.description_en}
              onChange={(e) =>
                setFormData({ ...formData, description_en: e.target.value })
              }
              rows={2}
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              {t("modal.notes")}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="w-3.5 h-3.5 rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-xs">
              {t("modal.isActive")}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              {t("modal.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {loading ? t("modal.saving") : t("modal.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
