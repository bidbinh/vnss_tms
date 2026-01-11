"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Eye,
  Edit,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Upload,
  FileUp,
  Download,
  ChevronUp,
  ChevronDown,
  Trash2,
  GripVertical,
} from "lucide-react";
import { usePageTranslations } from "@/hooks/usePageTranslations";

interface CustomsDeclaration {
  id: string;
  declaration_no?: string;
  declaration_type: string;
  status: string;
  shipment_id: string;
  trader_name?: string;
  trader_tax_code?: string;
  customs_office?: string;
  invoice_no?: string;
  invoice_date?: string;
  bl_no?: string;
  foreign_partner_name?: string;
  foreign_partner_country?: string;
  currency_code?: string;
  total_value?: number;
  total_taxes?: number;
  submission_date?: string;
  registration_date?: string;
  release_date?: string;
  inspection_required: boolean;
  created_at: string;
}

// Default column widths
const DEFAULT_COLUMN_WIDTHS = {
  declarationNo: 130,
  invoiceNo: 120,
  blNo: 140,
  type: 70,
  exporter: 180,
  trader: 180,
  registeredDate: 100,
  status: 100,
  actions: 80,
};

type SortField = "declaration_no" | "invoice_no" | "bl_no" | "declaration_type" | "foreign_partner_name" | "trader_name" | "registration_date" | "status";
type SortOrder = "asc" | "desc";

// Column definition for drag & drop
type ColumnKey = "declarationNo" | "invoiceNo" | "blNo" | "type" | "exporter" | "trader" | "registeredDate" | "status" | "actions";
const DEFAULT_COLUMN_ORDER: ColumnKey[] = ["declarationNo", "invoiceNo", "blNo", "type", "exporter", "trader", "registeredDate", "status", "actions"];

export default function CustomsPage() {
  const { t } = usePageTranslations("fms.customsPage");
  const router = useRouter();
  const [declarations, setDeclarations] = useState<CustomsDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Column resize
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [resizing, setResizing] = useState<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Column drag & drop reorder
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [draggingColumn, setDraggingColumn] = useState<ColumnKey | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnKey | null>(null);

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchDeclarations();
  }, [page, pageSize, filterType, filterStatus]);

  const fetchDeclarations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (filterType) params.append("declaration_type", filterType);
      if (filterStatus) params.append("status", filterStatus);

      const res = await fetch(
        `/api/v1/fms/customs?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setDeclarations(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error loading declarations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    );
  };

  // Sorted declarations
  const sortedDeclarations = [...declarations].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField] ?? "";
    const bVal = b[sortField] ?? "";
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Filtered declarations
  const filteredDeclarations = sortedDeclarations.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.declaration_no?.toLowerCase().includes(q) ||
      d.trader_name?.toLowerCase().includes(q) ||
      d.invoice_no?.toLowerCase().includes(q)
    );
  });

  // Column resize handlers
  const handleMouseDown = (col: string, e: React.MouseEvent) => {
    setResizing(col);
    startX.current = e.clientX;
    startWidth.current = columnWidths[col as keyof typeof columnWidths];
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(50, startWidth.current + diff);
      setColumnWidths((prev) => ({ ...prev, [resizing]: newWidth }));
    };
    const handleMouseUp = () => setResizing(null);
    if (resizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-800";
      case "SUBMITTED": return "bg-blue-100 text-blue-800";
      case "REGISTERED": return "bg-indigo-100 text-indigo-800";
      case "INSPECTION": return "bg-orange-100 text-orange-800";
      case "RELEASED": return "bg-green-100 text-green-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      DRAFT: t("filters.draft"),
      SUBMITTED: t("filters.submitted"),
      REGISTERED: t("filters.registered"),
      INSPECTION: t("filters.inspection"),
      RELEASED: t("filters.released"),
      CANCELLED: t("filters.cancelled"),
    };
    return statusMap[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      IMPORT: t("filters.import"),
      EXPORT: t("filters.export"),
      TRANSIT: t("filters.transit"),
    };
    return typeMap[type] || type;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "RELEASED": return <CheckCircle className="w-3 h-3 text-green-600" />;
      case "INSPECTION": return <AlertTriangle className="w-3 h-3 text-orange-600" />;
      default: return <Clock className="w-3 h-3 text-gray-600" />;
    }
  };

  const formatCurrency = (amount: number | undefined, currency?: string) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleViewDeclaration = (id: string) => {
    router.push(`/fms/customs/${id}`);
  };

  const handleEditDeclaration = (id: string) => {
    router.push(`/fms/customs/${id}/edit`);
  };

  const handleSubmitDeclaration = async (id: string) => {
    if (!confirm(t("confirmSubmit"))) return;

    setSubmitting(id);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/customs/${id}/submit`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        alert(t("submitSuccess"));
        fetchDeclarations();
      } else {
        const data = await res.json();
        alert(`${t("submitError")}: ${data.detail || ""}`);
      }
    } catch (error) {
      alert(t("errors.generalError"));
    } finally {
      setSubmitting(null);
    }
  };

  const handleExportXML = async (id: string, declarationNo?: string) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/customs/${id}/export/xml`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `customs_${declarationNo || id}.xml`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await res.json();
        alert(`${t("exportError")}: ${data.detail || ""}`);
      }
    } catch (error) {
      alert(t("errors.generalError"));
    }
  };

  // Delete declaration
  const handleDeleteDeclaration = async (id: string, declarationNo?: string) => {
    if (!confirm(t("confirmDelete") || `Bạn có chắc chắn muốn xóa tờ khai ${declarationNo || id}?`)) return;

    setDeleting(id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/v1/fms/customs/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        fetchDeclarations();
      } else {
        const data = await res.json();
        alert(`${t("deleteError") || "Lỗi xóa"}: ${data.detail || ""}`);
      }
    } catch (error) {
      alert(t("errors.generalError"));
    } finally {
      setDeleting(null);
    }
  };

  // Column drag & drop handlers
  const handleDragStart = (col: ColumnKey) => {
    setDraggingColumn(col);
  };

  const handleDragOver = (e: React.DragEvent, col: ColumnKey) => {
    e.preventDefault();
    if (col !== draggingColumn && col !== "actions") {
      setDragOverColumn(col);
    }
  };

  const handleDragEnd = () => {
    if (draggingColumn && dragOverColumn && draggingColumn !== dragOverColumn) {
      const newOrder = [...columnOrder];
      const fromIndex = newOrder.indexOf(draggingColumn);
      const toIndex = newOrder.indexOf(dragOverColumn);
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, draggingColumn);
      setColumnOrder(newOrder);
    }
    setDraggingColumn(null);
    setDragOverColumn(null);
  };

  // Column config mapping
  const columnConfig: Record<ColumnKey, { sortField?: SortField; label: string }> = {
    declarationNo: { sortField: "declaration_no", label: t("columns.declarationNo") },
    invoiceNo: { sortField: "invoice_no", label: t("columns.invoiceNo") },
    blNo: { sortField: "bl_no", label: t("columns.blNo") },
    type: { sortField: "declaration_type", label: t("columns.type") },
    exporter: { sortField: "foreign_partner_name", label: t("columns.exporter") },
    trader: { sortField: "trader_name", label: t("columns.trader") },
    registeredDate: { sortField: "registration_date", label: t("columns.registeredDate") },
    status: { sortField: "status", label: t("columns.status") },
    actions: { label: t("columns.actions") },
  };

  // Render header cell
  const renderHeaderCell = (col: ColumnKey) => {
    const config = columnConfig[col];
    const isActions = col === "actions";
    const isDragging = draggingColumn === col;
    const isDragOver = dragOverColumn === col;

    return (
      <th
        key={col}
        style={{ width: columnWidths[col] }}
        className={`text-left px-2 py-2 font-bold text-gray-700 ${
          config.sortField ? "cursor-pointer hover:bg-gray-100" : ""
        } ${isDragging ? "opacity-50" : ""} ${isDragOver ? "bg-blue-50 border-l-2 border-blue-500" : ""}`}
        onClick={() => config.sortField && handleSort(config.sortField)}
        draggable={!isActions}
        onDragStart={() => handleDragStart(col)}
        onDragOver={(e) => handleDragOver(e, col)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-center gap-1">
          {!isActions && (
            <GripVertical className="w-3 h-3 text-gray-400 cursor-grab" />
          )}
          <span className={isActions ? "ml-auto" : ""}>{config.label}</span>
          {config.sortField && <SortIcon field={config.sortField} />}
        </div>
        <div
          className={`resize-handle ${resizing === col ? "active" : ""}`}
          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(col, e); }}
        />
      </th>
    );
  };

  // Render body cell
  const renderBodyCell = (col: ColumnKey, declaration: CustomsDeclaration) => {
    switch (col) {
      case "declarationNo":
        return (
          <td key={col} style={{ width: columnWidths.declarationNo }} className="px-2 py-1.5">
            <p className="font-medium text-blue-600 truncate">
              {declaration.declaration_no || t("filters.draft")}
            </p>
          </td>
        );
      case "invoiceNo":
        return (
          <td key={col} style={{ width: columnWidths.invoiceNo }} className="px-2 py-1.5 truncate">
            {declaration.invoice_no || "-"}
          </td>
        );
      case "blNo":
        return (
          <td key={col} style={{ width: columnWidths.blNo }} className="px-2 py-1.5 truncate">
            {declaration.bl_no || "-"}
          </td>
        );
      case "type":
        return (
          <td key={col} style={{ width: columnWidths.type }} className="px-2 py-1.5">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              declaration.declaration_type === "IMPORT"
                ? "bg-blue-100 text-blue-800"
                : declaration.declaration_type === "EXPORT"
                ? "bg-green-100 text-green-800"
                : "bg-purple-100 text-purple-800"
            }`}>
              {getTypeLabel(declaration.declaration_type)}
            </span>
          </td>
        );
      case "exporter":
        return (
          <td key={col} style={{ width: columnWidths.exporter }} className="px-2 py-1.5 truncate">
            {declaration.foreign_partner_name || "-"}
          </td>
        );
      case "trader":
        return (
          <td key={col} style={{ width: columnWidths.trader }} className="px-2 py-1.5">
            <p className="truncate">{declaration.trader_name || "-"}</p>
            <p className="text-[10px] text-gray-500">{declaration.trader_tax_code}</p>
          </td>
        );
      case "registeredDate":
        return (
          <td key={col} style={{ width: columnWidths.registeredDate }} className="px-2 py-1.5 truncate">
            {declaration.registration_date ? new Date(declaration.registration_date).toLocaleDateString("vi-VN") : "-"}
          </td>
        );
      case "status":
        return (
          <td key={col} style={{ width: columnWidths.status }} className="px-2 py-1.5">
            <div className="flex items-center gap-1">
              {getStatusIcon(declaration.status)}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(declaration.status)}`}>
                {getStatusLabel(declaration.status)}
              </span>
            </div>
          </td>
        );
      case "actions":
        return (
          <td key={col} style={{ width: columnWidths.actions }} className="px-2 py-1.5 text-right">
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => handleViewDeclaration(declaration.id)}
                className="p-1 hover:bg-gray-100 rounded"
                title={t("actions.view")}
              >
                <Eye className="w-3 h-3 text-gray-600" />
              </button>
              <button
                onClick={() => handleEditDeclaration(declaration.id)}
                className="p-1 hover:bg-gray-100 rounded"
                title={t("actions.edit")}
              >
                <Edit className="w-3 h-3 text-gray-600" />
              </button>
              {declaration.status === "DRAFT" && (
                <button
                  onClick={() => handleSubmitDeclaration(declaration.id)}
                  disabled={submitting === declaration.id}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                  title={t("actions.submit")}
                >
                  <Upload className={`w-3 h-3 ${submitting === declaration.id ? "animate-spin text-gray-400" : "text-blue-600"}`} />
                </button>
              )}
              {declaration.status !== "DRAFT" && (
                <button
                  onClick={() => handleExportXML(declaration.id, declaration.declaration_no)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title={t("actions.exportXml")}
                >
                  <Download className="w-3 h-3 text-green-600" />
                </button>
              )}
              <button
                onClick={() => handleDeleteDeclaration(declaration.id, declaration.declaration_no)}
                disabled={deleting === declaration.id}
                className="p-1 hover:bg-red-100 rounded disabled:opacity-50"
                title={t("actions.delete") || "Xóa"}
              >
                <Trash2 className={`w-3 h-3 ${deleting === declaration.id ? "animate-spin text-gray-400" : "text-red-600"}`} />
              </button>
            </div>
          </td>
        );
      default:
        return null;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="h-[calc(100vh-64px)] overflow-auto">
      <style jsx>{`
        .resize-handle {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          cursor: col-resize;
          background: transparent;
        }
        .resize-handle:hover,
        .resize-handle.active {
          background: #3b82f6;
        }
        th {
          position: relative;
        }
      `}</style>

      {/* Sticky Header Section */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        {/* Title and Actions */}
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">{t("title")}</h1>
            <p className="text-xs text-gray-500">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/fms/customs/import"
              className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
            >
              <FileUp className="w-3 h-3" />
              {t("importFromDocs")}
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              <Plus className="w-3 h-3" />
              {t("createNew")}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-3 py-2 border-b flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{t("filters.allTypes")}</option>
            <option value="IMPORT">{t("filters.import")}</option>
            <option value="EXPORT">{t("filters.export")}</option>
            <option value="TRANSIT">{t("filters.transit")}</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{t("filters.allStatus")}</option>
            <option value="DRAFT">{t("filters.draft")}</option>
            <option value="SUBMITTED">{t("filters.submitted")}</option>
            <option value="REGISTERED">{t("filters.registered")}</option>
            <option value="INSPECTION">{t("filters.inspection")}</option>
            <option value="RELEASED">{t("filters.released")}</option>
            <option value="CANCELLED">{t("filters.cancelled")}</option>
          </select>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-500">{t("pagination.rowsPerPage")}:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-1 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Table Header */}
        <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
          <thead className="bg-gray-50 border-b">
            <tr>
              {columnOrder.map((col) => renderHeaderCell(col))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Table Body */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredDeclarations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <FileText className="w-10 h-10 mb-3" />
          <p className="text-sm font-medium">{t("noData")}</p>
          <p className="text-xs">{t("noDataHint")}</p>
        </div>
      ) : (
        <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
          <tbody className="divide-y divide-gray-100">
            {filteredDeclarations.map((declaration) => (
              <tr key={declaration.id} className="hover:bg-gray-50">
                {columnOrder.map((col) => renderBodyCell(col, declaration))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="sticky bottom-0 bg-white border-t px-3 py-2 flex items-center justify-between text-xs">
          <p className="text-gray-600">
            {t("pagination.showing")} {(page - 1) * pageSize + 1} {t("pagination.to")} {Math.min(page * pageSize, total)} {t("pagination.of")} {total} {t("pagination.items")}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              {t("pagination.previous")}
            </button>
            <span className="px-2 py-1">{t("pagination.page")} {page} / {totalPages}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              {t("pagination.next")}
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateDeclarationModal
          t={t}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchDeclarations();
          }}
        />
      )}
    </div>
  );
}

function CreateDeclarationModal({
  t,
  onClose,
  onCreated,
}: {
  t: (key: string) => string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    declaration_type: "IMPORT",
    shipment_id: "",
    trader_name: "",
    trader_tax_code: "",
    trader_address: "",
    customs_office: "",
    invoice_no: "",
    invoice_date: "",
    currency_code: "USD",
    total_value: 0,
    incoterm: "CIF",
    origin_country: "",
    hs_code: "",
    commodity: "",
    package_qty: 0,
    gross_weight: 0,
    net_weight: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/customs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.detail || t("errors.createError"));
      }
    } catch (err) {
      setError(t("errors.generalError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-sm font-bold">{t("modal.createTitle")}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          {error && (
            <div className="p-2 bg-red-50 text-red-600 rounded text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">{t("modal.declarationType")} *</label>
              <select
                value={formData.declaration_type}
                onChange={(e) => setFormData({ ...formData, declaration_type: e.target.value })}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="IMPORT">{t("filters.import")}</option>
                <option value="EXPORT">{t("filters.export")}</option>
                <option value="TRANSIT">{t("filters.transit")}</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">{t("modal.customsOffice")}</label>
              <input
                type="text"
                value={formData.customs_office}
                onChange={(e) => setFormData({ ...formData, customs_office: e.target.value })}
                placeholder={t("modal.customsOfficePlaceholder")}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">{t("modal.traderName")} *</label>
              <input
                type="text"
                value={formData.trader_name}
                onChange={(e) => setFormData({ ...formData, trader_name: e.target.value })}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">{t("modal.taxCode")} *</label>
              <input
                type="text"
                value={formData.trader_tax_code}
                onChange={(e) => setFormData({ ...formData, trader_tax_code: e.target.value })}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">{t("modal.address")}</label>
            <input
              type="text"
              value={formData.trader_address}
              onChange={(e) => setFormData({ ...formData, trader_address: e.target.value })}
              className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium mb-1">{t("modal.invoiceNo")}</label>
              <input
                type="text"
                value={formData.invoice_no}
                onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">{t("modal.invoiceDate")}</label>
              <input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">{t("modal.incoterm")}</label>
              <select
                value={formData.incoterm}
                onChange={(e) => setFormData({ ...formData, incoterm: e.target.value })}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="EXW">EXW</option>
                <option value="FOB">FOB</option>
                <option value="CFR">CFR</option>
                <option value="CIF">CIF</option>
                <option value="DAP">DAP</option>
                <option value="DDP">DDP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium mb-1">{t("modal.currency")}</label>
              <select
                value={formData.currency_code}
                onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CNY">CNY</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">{t("modal.value")}</label>
              <input
                type="number"
                step="0.01"
                value={formData.total_value}
                onChange={(e) => setFormData({ ...formData, total_value: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">{t("modal.originCountry")}</label>
              <input
                type="text"
                value={formData.origin_country}
                onChange={(e) => setFormData({ ...formData, origin_country: e.target.value })}
                placeholder={t("modal.originCountryPlaceholder")}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">{t("modal.hsCode")}</label>
              <input
                type="text"
                value={formData.hs_code}
                onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })}
                placeholder={t("modal.hsCodePlaceholder")}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">{t("modal.packageQty")}</label>
              <input
                type="number"
                value={formData.package_qty}
                onChange={(e) => setFormData({ ...formData, package_qty: parseInt(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">{t("modal.commodity")}</label>
            <textarea
              value={formData.commodity}
              onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">{t("modal.grossWeight")}</label>
              <input
                type="number"
                step="0.01"
                value={formData.gross_weight}
                onChange={(e) => setFormData({ ...formData, gross_weight: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">{t("modal.netWeight")}</label>
              <input
                type="number"
                step="0.01"
                value={formData.net_weight}
                onChange={(e) => setFormData({ ...formData, net_weight: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
            >
              {t("modal.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t("modal.creating") : t("modal.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
