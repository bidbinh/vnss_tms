"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import DataTable, { Column, TablePagination } from "@/components/DataTable";
import { Eye, Download, FileText } from "lucide-react";

// ============ Types ============
interface PaymentQRData {
  qr_url: string;
  driver_name: string;
  bank_name?: string;
  bank_account?: string;
  amount: number;
  order_code: string;
  container_code?: string;
  description: string;
  empty_return_id: string;
}

interface BatchPaymentData {
  total_drivers: number;
  total_amount: number;
  payments: {
    driver_id: string;
    driver_name: string;
    bank_name?: string;
    bank_account?: string;
    bank_bin?: string;
    total_amount: number;
    qr_url?: string;
    error?: string;
    orders: {
      order_code: string;
      container_code?: string;
      amount: number;
      empty_return_id: string;
    }[];
    empty_return_ids: string[];
  }[];
}

interface EmptyReturn {
  id: string;
  order_id: string;
  order_code: string;
  container_code?: string;
  driver_name?: string;
  return_date?: string;
  port_site_id?: string;
  port_site_name?: string;
  // Fees
  cleaning_fee: number;
  cleaning_fee_paid: number;
  lift_fee: number;
  lift_fee_paid: number;
  storage_fee: number;
  storage_fee_paid: number;
  repair_fee: number;
  repair_fee_paid: number;
  other_fee: number;
  other_fee_paid: number;
  other_fee_note?: string;
  total_amount: number;
  total_paid: number;
  // Images
  return_slip_image?: string;
  fee_receipt_image?: string;
  repair_deposit_image?: string;
  // Other
  payer?: string;
  seal_number?: string;
  return_location?: string;
  notes?: string;
  status: string;
  created_at?: string;
  attached_files?: { url: string; name: string; document_type?: string }[];
}

interface PortOrder {
  id: string;
  order_code: string;
  container_code?: string;
  driver_id?: string;
  driver_name?: string;
  pickup_site_id?: string;
  pickup_site_name?: string;
  port_site_id?: string;
  port_site_name?: string;
  order_date: string;
  has_empty_return: boolean;
}

interface PortSite {
  id: string;
  company_name: string;
  detailed_address: string;
}

interface Stats {
  total: number;
  notReturned: number;
  pending: number;
  submitted: number;
  completed: number;
  totalAmount: number;
  totalPaid: number;
}

// ============ Status Config ============
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Chờ xử lý", bg: "bg-yellow-100", text: "text-yellow-800" },
  SUBMITTED: { label: "Đã gửi", bg: "bg-blue-100", text: "text-blue-800" },
  CONFIRMED: { label: "Đã xác nhận", bg: "bg-indigo-100", text: "text-indigo-800" },
  COMPLETED: { label: "Hoàn thành", bg: "bg-green-100", text: "text-green-800" },
  CANCELLED: { label: "Đã hủy", bg: "bg-red-100", text: "text-red-800" },
};


// ============ Helper Functions ============
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

// Normalize file URL to use same origin as current page
// This fixes CORS issues when frontend runs on 127.0.0.1 but API URL uses localhost
function normalizeFileUrl(url: string): string {
  // Extract the path after /uploads/file/
  const match = url.match(/\/uploads\/file\/(.+)/);
  if (match) {
    // Use API base URL but replace hostname with current window hostname to avoid CORS
    // e.g., if window is 127.0.0.1:3000 and API is localhost:8000, use 127.0.0.1:8000
    let apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    if (typeof window !== "undefined") {
      const currentHost = window.location.hostname;
      // Replace localhost with 127.0.0.1 or vice versa to match current origin
      apiBase = apiBase.replace(/localhost|127\.0\.0\.1/, currentHost);
    }
    return `${apiBase}/uploads/file/${match[1]}`;
  }
  return url;
}

function getFileUrlWithToken(url: string): string {
  const normalizedUrl = normalizeFileUrl(url);
  const token = localStorage.getItem("access_token");
  if (!token) return normalizedUrl;
  const separator = normalizedUrl.includes("?") ? "&" : "?";
  return `${normalizedUrl}${separator}token=${token}`;
}

// Download file with custom filename using fetch + blob
// This bypasses the limitation of <a download> attribute with cross-origin/token URLs
async function handleFileDownload(url: string, downloadName: string) {
  try {
    const fileUrl = getFileUrlWithToken(url);
    const token = localStorage.getItem("access_token");

    const response = await fetch(fileUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Không thể tải file");
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    // Create temporary link and click it
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err: any) {
    console.error("Download error:", err);
    // Fallback: open in new tab if fetch fails
    window.open(getFileUrlWithToken(url), "_blank");
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// ============ Main Component ============
export default function EmptyReturnsPage() {
  // Data states
  const [emptyReturns, setEmptyReturns] = useState<EmptyReturn[]>([]);
  const [portOrders, setPortOrders] = useState<PortOrder[]>([]);
  const [portSites, setPortSites] = useState<PortSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, notReturned: 0, pending: 0, submitted: 0, completed: 0, totalAmount: 0, totalPaid: 0 });

  // Filter states
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Pagination
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedOrder, setSelectedOrder] = useState<PortOrder | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<EmptyReturn | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    return_date: new Date().toISOString().split("T")[0],
    port_site_id: "",
    cleaning_fee: 0,
    cleaning_fee_paid: 0,
    lift_fee: 0,
    lift_fee_paid: 0,
    storage_fee: 0,
    storage_fee_paid: 0,
    repair_fee: 0,
    repair_fee_paid: 0,
    other_fee: 0,
    other_fee_paid: 0,
    other_fee_note: "",
    payer: "COMPANY",
    notes: "",
    status: "PENDING",
  });

  // File upload states
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ url: string; name: string; document_type?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payment QR states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"single" | "batch">("single");
  const [singlePaymentData, setSinglePaymentData] = useState<PaymentQRData | null>(null);
  const [batchPaymentData, setBatchPaymentData] = useState<BatchPaymentData | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // ============ Data Fetching ============
  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch in parallel
      const [returnsRes, ordersRes, sitesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/empty-returns`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/empty-returns/port-orders`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/empty-returns/port-sites/list`, { headers }),
      ]);

      if (!returnsRes.ok || !ordersRes.ok || !sitesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [returnsData, ordersData, sitesData] = await Promise.all([
        returnsRes.json(),
        ordersRes.json(),
        sitesRes.json(),
      ]);

      setEmptyReturns(returnsData);
      setPortOrders(ordersData);
      setPortSites(sitesData);

      // Calculate stats
      const orderIdsWithReturns = new Set(returnsData.map((r: EmptyReturn) => r.order_id));
      const notReturnedCount = ordersData.filter((o: PortOrder) => !orderIdsWithReturns.has(o.id)).length;

      const newStats: Stats = {
        total: ordersData.length,
        notReturned: notReturnedCount,
        pending: returnsData.filter((r: EmptyReturn) => r.status === "PENDING").length,
        submitted: returnsData.filter((r: EmptyReturn) => r.status === "SUBMITTED").length,
        completed: returnsData.filter((r: EmptyReturn) => r.status === "COMPLETED").length,
        totalAmount: returnsData.reduce((sum: number, r: EmptyReturn) => sum + (r.total_amount || 0), 0),
        totalPaid: returnsData.reduce((sum: number, r: EmptyReturn) => sum + (r.total_paid || 0), 0),
      };
      setStats(newStats);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      alert("Lỗi tải dữ liệu: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ============ Merged Data (All port orders with empty return info) ============
  const mergedData = useMemo(() => {
    // Create a map of empty returns by order_id
    const returnsByOrderId = new Map<string, EmptyReturn>();
    emptyReturns.forEach((r) => {
      returnsByOrderId.set(r.order_id, r);
    });

    // Merge port orders with empty return data
    return portOrders.map((order): EmptyReturn => {
      const emptyReturn = returnsByOrderId.get(order.id);
      if (emptyReturn) {
        return {
          ...emptyReturn,
          order_code: order.order_code,
          container_code: order.container_code,
          driver_name: order.driver_name,
        };
      }
      // Order without empty return yet
      return {
        id: order.id,
        order_id: order.id,
        order_code: order.order_code,
        container_code: order.container_code,
        driver_name: order.driver_name,
        port_site_name: order.port_site_name,
        status: "NOT_RETURNED",
        cleaning_fee: 0,
        cleaning_fee_paid: 0,
        lift_fee: 0,
        lift_fee_paid: 0,
        storage_fee: 0,
        storage_fee_paid: 0,
        repair_fee: 0,
        repair_fee_paid: 0,
        other_fee: 0,
        other_fee_paid: 0,
        total_amount: 0,
        total_paid: 0,
      };
    });
  }, [portOrders, emptyReturns]);

  // ============ Filtered & Paginated Data ============
  const filteredData = useMemo(() => {
    let data = [...mergedData];

    // Tab filter
    if (activeTab !== "ALL") {
      if (activeTab === "NOT_RETURNED") {
        data = data.filter((r) => r.status === "NOT_RETURNED");
      } else {
        data = data.filter((r) => r.status === activeTab);
      }
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (r) =>
          r.order_code?.toLowerCase().includes(term) ||
          r.container_code?.toLowerCase().includes(term) ||
          r.driver_name?.toLowerCase().includes(term)
      );
    }

    // Date filter
    if (filterStartDate) {
      data = data.filter((r) => r.return_date && new Date(r.return_date) >= new Date(filterStartDate));
    }
    if (filterEndDate) {
      data = data.filter((r) => r.return_date && new Date(r.return_date) <= new Date(filterEndDate));
    }

    return data;
  }, [mergedData, activeTab, searchTerm, filterStartDate, filterEndDate]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Count payable items (must be before columns definition)
  const payableCount = useMemo(() => {
    return filteredData.filter(
      (r) => r.status !== "NOT_RETURNED" && r.status !== "COMPLETED" && r.total_amount > r.total_paid
    ).length;
  }, [filteredData]);

  // ============ Table Columns ============
  const columns: Column<EmptyReturn>[] = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={selectedIds.size > 0 && selectedIds.size === payableCount}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      width: 40,
      sortable: false,
      render: (row) => {
        const isPayable = row.status !== "NOT_RETURNED" && row.status !== "COMPLETED" && row.total_amount > row.total_paid;
        if (!isPayable) return null;
        return (
          <input
            type="checkbox"
            checked={selectedIds.has(row.id)}
            onChange={(e) => {
              e.stopPropagation();
              toggleSelect(row.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        );
      },
    },
    {
      key: "order_code",
      header: "Mã đơn",
      width: 100,
      sortable: true,
      render: (row) => <span className="font-medium text-blue-600">{row.order_code}</span>,
    },
    {
      key: "container_code",
      header: "Số cont",
      width: 120,
      sortable: true,
      render: (row) => <span className="font-mono text-xs">{row.container_code || "-"}</span>,
    },
    {
      key: "driver_name",
      header: "Tài xế",
      width: 120,
      sortable: true,
    },
    {
      key: "return_date",
      header: "Ngày hạ",
      width: 90,
      sortable: true,
      render: (row) => formatShortDate(row.return_date),
    },
    {
      key: "port_site_name",
      header: "Cảng hạ",
      width: 150,
      sortable: true,
    },
    {
      key: "total_amount",
      header: "Tổng phí",
      width: 100,
      align: "right",
      sortable: true,
      render: (row) => (
        <span className={row.total_amount > 0 ? "text-red-600 font-medium" : "text-gray-400"}>
          {row.total_amount > 0 ? formatCurrency(row.total_amount) : "-"}
        </span>
      ),
    },
    {
      key: "total_paid",
      header: "Đã trả",
      width: 100,
      align: "right",
      sortable: true,
      render: (row) => (
        <span className={row.total_paid > 0 ? "text-green-600 font-medium" : "text-gray-400"}>
          {row.total_paid > 0 ? formatCurrency(row.total_paid) : "-"}
        </span>
      ),
    },
    {
      key: "documents",
      header: "Chứng từ",
      width: 100,
      align: "center",
      sortable: false,
      render: (row) => {
        const hasSlip = !!row.return_slip_image;
        const hasFee = !!row.fee_receipt_image;
        const hasRepair = !!row.repair_deposit_image;
        const count = [hasSlip, hasFee, hasRepair].filter(Boolean).length;
        return (
          <div className="flex items-center justify-center gap-1">
            <span className={`w-2 h-2 rounded-full ${hasSlip ? "bg-green-500" : "bg-gray-300"}`} title="Phiếu hạ rỗng" />
            <span className={`w-2 h-2 rounded-full ${hasFee ? "bg-green-500" : "bg-gray-300"}`} title="Phiếu thu phí" />
            <span className={`w-2 h-2 rounded-full ${hasRepair ? "bg-green-500" : "bg-gray-300"}`} title="Phiếu cược SC" />
            <span className="text-xs text-gray-500 ml-1">{count}/3</span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      width: 110,
      align: "center",
      sortable: true,
      render: (row) => {
        const config = STATUS_CONFIG[row.status] || { label: row.status, bg: "bg-gray-100", text: "text-gray-800" };
        if (row.status === "NOT_RETURNED") {
          return <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">Chưa hạ</span>;
        }
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Thao tác",
      width: 150,
      align: "center",
      sortable: false,
      render: (row) => {
        const remaining = row.total_amount - row.total_paid;
        const canPay = row.status !== "NOT_RETURNED" && row.status !== "COMPLETED" && remaining > 0;
        return (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(row);
              }}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium px-1"
            >
              {row.status === "NOT_RETURNED" ? "Hạ rỗng" : "Sửa"}
            </button>
            {canPay && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  generateSingleQR(row.id);
                }}
                disabled={paymentLoading}
                className="text-green-600 hover:text-green-800 text-xs font-medium px-1 flex items-center gap-0.5"
                title="Tạo QR thanh toán"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                QR
              </button>
            )}
            {row.status !== "NOT_RETURNED" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row.id);
                }}
                className="text-red-600 hover:text-red-800 text-xs font-medium px-1"
              >
                Xóa
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // ============ Handlers ============
  function handleEdit(row: EmptyReturn) {
    if (row.status === "NOT_RETURNED") {
      // Create new empty return
      const order = portOrders.find((o) => o.id === row.order_id);
      if (order) {
        setSelectedOrder(order);
        setSelectedReturn(null);
        setModalMode("create");
        setFormData({
          return_date: new Date().toISOString().split("T")[0],
          port_site_id: order.port_site_id || "",
          cleaning_fee: 0,
          cleaning_fee_paid: 0,
          lift_fee: 0,
          lift_fee_paid: 0,
          storage_fee: 0,
          storage_fee_paid: 0,
          repair_fee: 0,
          repair_fee_paid: 0,
          other_fee: 0,
          other_fee_paid: 0,
          other_fee_note: "",
          payer: "COMPANY",
          notes: "",
          status: "PENDING",
        });
        setAttachedFiles([]);
        setShowModal(true);
      }
    } else {
      // Edit existing
      setSelectedReturn(row);
      setSelectedOrder(null);
      setModalMode("edit");
      setFormData({
        return_date: row.return_date || new Date().toISOString().split("T")[0],
        port_site_id: row.port_site_id || "",
        cleaning_fee: row.cleaning_fee || 0,
        cleaning_fee_paid: row.cleaning_fee_paid || 0,
        lift_fee: row.lift_fee || 0,
        lift_fee_paid: row.lift_fee_paid || 0,
        storage_fee: row.storage_fee || 0,
        storage_fee_paid: row.storage_fee_paid || 0,
        repair_fee: row.repair_fee || 0,
        repair_fee_paid: row.repair_fee_paid || 0,
        other_fee: row.other_fee || 0,
        other_fee_paid: row.other_fee_paid || 0,
        other_fee_note: row.other_fee_note || "",
        payer: row.payer || "COMPANY",
        notes: row.notes || "",
        status: row.status || "PENDING",
      });
      // Load attached files from existing data if any
      // Ưu tiên dùng attached_files mới (có document_type), fallback về legacy fields
      const existingFiles: { url: string; name: string; document_type?: string }[] = [];
      if (row.attached_files && Array.isArray(row.attached_files) && row.attached_files.length > 0) {
        row.attached_files.forEach((f: { url: string; name: string; document_type?: string }) => {
          existingFiles.push({ url: f.url, name: f.name, document_type: f.document_type });
        });
      } else {
        // Fallback: legacy fields với document_type mặc định
        const getFilenameFromUrl = (url: string) => {
          const parts = url.split('/');
          return parts[parts.length - 1] || 'file';
        };
        if (row.return_slip_image) existingFiles.push({ url: row.return_slip_image, name: getFilenameFromUrl(row.return_slip_image), document_type: "Phiếu hạ rỗng" });
        if (row.fee_receipt_image) existingFiles.push({ url: row.fee_receipt_image, name: getFilenameFromUrl(row.fee_receipt_image), document_type: "Phiếu thu phí" });
        if (row.repair_deposit_image) existingFiles.push({ url: row.repair_deposit_image, name: getFilenameFromUrl(row.repair_deposit_image), document_type: "Phiếu cược sửa chữa" });
      }
      setAttachedFiles(existingFiles);
      setShowModal(true);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc muốn xóa thông tin hạ rỗng này?")) return;

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/empty-returns/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete");

      alert("Xóa thành công!");
      fetchAllData();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const totalAmount =
      formData.cleaning_fee +
      formData.lift_fee +
      formData.storage_fee +
      formData.repair_fee +
      formData.other_fee;
    const totalPaid =
      formData.cleaning_fee_paid +
      formData.lift_fee_paid +
      formData.storage_fee_paid +
      formData.repair_fee_paid +
      formData.other_fee_paid;

    // Map attached files to legacy fields for backend compatibility
    const filePayload: Record<string, string | undefined> = {};
    if (attachedFiles.length > 0) {
      // First file -> return_slip_image (primary document)
      filePayload.return_slip_image = attachedFiles[0]?.url;
      // Second file -> fee_receipt_image
      filePayload.fee_receipt_image = attachedFiles[1]?.url;
      // Third file -> repair_deposit_image
      filePayload.repair_deposit_image = attachedFiles[2]?.url;
    }

    const payload = {
      ...formData,
      total_amount: totalAmount,
      total_paid: totalPaid,
      ...filePayload,
      attached_files: attachedFiles, // Also send new format for future use
      order_id: modalMode === "create" ? selectedOrder?.id : selectedReturn?.order_id,
    };

    try {
      const token = localStorage.getItem("access_token");
      const url =
        modalMode === "create"
          ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/empty-returns`
          : `${process.env.NEXT_PUBLIC_API_BASE_URL}/empty-returns/${selectedReturn?.id}`;

      const res = await fetch(url, {
        method: modalMode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to save");
      }

      setShowModal(false);
      fetchAllData();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  }

  // ============ Payment QR Handlers ============
  async function generateSingleQR(emptyReturnId: string) {
    setPaymentLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payment-qr/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ empty_return_id: emptyReturnId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to generate QR");
      }

      const data = await res.json();
      setSinglePaymentData(data);
      setPaymentMode("single");
      setShowPaymentModal(true);
    } catch (err: any) {
      alert("Lỗi tạo QR: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  }

  async function generateBatchQR() {
    if (selectedIds.size === 0) {
      alert("Vui lòng chọn ít nhất 1 đơn hạ rỗng để thanh toán");
      return;
    }

    setPaymentLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payment-qr/generate-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ empty_return_ids: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to generate batch QR");
      }

      const data = await res.json();
      setBatchPaymentData(data);
      setPaymentMode("batch");
      setShowPaymentModal(true);
    } catch (err: any) {
      alert("Lỗi tạo QR hàng loạt: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  }

  async function confirmSinglePayment(emptyReturnId: string, amount: number) {
    setConfirmingPayment(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payment-qr/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          empty_return_id: emptyReturnId,
          paid_amount: amount,
          note: "Thanh toán qua VietQR",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to confirm payment");
      }

      alert("Xác nhận thanh toán thành công!");
      setShowPaymentModal(false);
      setSinglePaymentData(null);
      fetchAllData();
    } catch (err: any) {
      alert("Lỗi xác nhận: " + err.message);
    } finally {
      setConfirmingPayment(false);
    }
  }

  async function confirmBatchPayment(emptyReturnIds: string[]) {
    setConfirmingPayment(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payment-qr/confirm-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          empty_return_ids: emptyReturnIds,
          note: "Thanh toán hàng loạt qua VietQR",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to confirm batch payment");
      }

      const result = await res.json();
      alert(result.message);
      setShowPaymentModal(false);
      setBatchPaymentData(null);
      setSelectedIds(new Set());
      fetchAllData();
    } catch (err: any) {
      alert("Lỗi xác nhận: " + err.message);
    } finally {
      setConfirmingPayment(false);
    }
  }

  function toggleSelectAll() {
    const payableItems = filteredData.filter(
      (r) => r.status !== "NOT_RETURNED" && r.status !== "COMPLETED" && r.total_amount > r.total_paid
    );
    if (selectedIds.size === payableItems.length && payableItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(payableItems.map((r) => r.id)));
    }
  }

  function toggleSelect(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  async function handleFilesUpload(files: FileList) {
    setUploadingFiles(true);

    try {
      const token = localStorage.getItem("access_token");
      const uploadedFiles: { url: string; name: string }[] = [];

      for (const file of Array.from(files)) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("folder", "empty-returns");

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/uploads/document?folder=empty-returns`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: uploadFormData,
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.detail || "Upload failed");
        }

        const data = await res.json();
        // Construct URL using frontend's API base URL instead of backend's returned URL
        // This ensures the URL works regardless of backend's API_BASE_URL config
        const fileUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/uploads/file/${data.file_path}`;
        uploadedFiles.push({ url: fileUrl, name: file.name });
      }

      setAttachedFiles((prev) => [...prev, ...uploadedFiles]);
    } catch (err: any) {
      alert("Lỗi upload: " + err.message);
    } finally {
      setUploadingFiles(false);
    }
  }

  // ============ Render ============
  return (
    <div className="h-[calc(100vh-64px)] overflow-auto">
      {/* Phần 1: Header & Stats - Cuộn đi */}
      <div className="p-6 pb-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Quản lý Hạ rỗng</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý việc hạ container rỗng về cảng</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Batch Payment Button */}
            {selectedIds.size > 0 && (
              <button
                onClick={generateBatchQR}
                disabled={paymentLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
              >
                {paymentLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                )}
                Thanh toán ({selectedIds.size})
              </button>
            )}
            <button
              onClick={() => {
                setSelectedOrder(null);
                setSelectedReturn(null);
                setModalMode("create");
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tạo hạ rỗng
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Tổng đơn cảng</div>
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Chưa hạ</div>
            <div className="text-2xl font-bold text-orange-600">{stats.notReturned}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Chờ xử lý</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Đã gửi</div>
            <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Hoàn thành</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Tổng phí</div>
            <div className="text-xl font-bold text-red-600">{formatCurrency(stats.totalAmount)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Đã thanh toán</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</div>
          </div>
        </div>
      </div>

      {/* Phần 2: Filter & Search + Table Header - Sticky */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        {/* Tabs & Filters */}
        <div className="border-y border-gray-200">
          <div className="flex items-center justify-between border-b px-6">
            {/* Tabs */}
            <div className="flex">
              {[
                { key: "ALL", label: "Tất cả" },
                { key: "NOT_RETURNED", label: "Chưa hạ" },
                { key: "PENDING", label: "Chờ xử lý" },
                { key: "SUBMITTED", label: "Đã gửi" },
                { key: "COMPLETED", label: "Hoàn thành" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm mã đơn, cont, tài xế..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border rounded-lg w-64 focus:ring-2 focus:ring-blue-200 outline-none"
                />
                <svg
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-4 px-6 py-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Từ ngày:</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Đến ngày:</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
            {(filterStartDate || filterEndDate || searchTerm) && (
              <button
                onClick={() => {
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setSearchTerm("");
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Xóa bộ lọc
              </button>
            )}
            <div className="ml-auto text-sm text-gray-500">
              Hiển thị {filteredData.length} kết quả
            </div>
          </div>
        </div>

        {/* Table Header */}
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
                      {typeof col.header === "string" ? col.header : col.header}
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
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                    Không có dữ liệu hạ rỗng
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEdit(row)}
                  >
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
      {filteredData.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredData.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            itemName="hạ rỗng"
          />
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {modalMode === "create" ? "Tạo hạ rỗng mới" : "Cập nhật hạ rỗng"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {modalMode === "create" && selectedOrder
                    ? `Đơn hàng: ${selectedOrder.order_code} | Container: ${selectedOrder.container_code || "-"}`
                    : selectedReturn
                    ? `Đơn hàng: ${selectedReturn.order_code} | Container: ${selectedReturn.container_code || "-"}`
                    : "Chọn đơn hàng từ danh sách"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-6">
                {/* Order Selection (for create mode without selected order) */}
                {modalMode === "create" && !selectedOrder && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chọn đơn hàng <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none"
                      onChange={(e) => {
                        const order = portOrders.find((o) => o.id === e.target.value);
                        if (order) {
                          setSelectedOrder(order);
                          setFormData((prev) => ({ ...prev, port_site_id: order.port_site_id || "" }));
                        }
                      }}
                    >
                      <option value="">-- Chọn đơn hàng --</option>
                      {portOrders
                        .filter((o) => !o.has_empty_return)
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.order_code} - {o.container_code || "N/A"} - {o.driver_name || "Chưa có tài xế"}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày hạ rỗng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.return_date}
                      onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cảng hạ <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.port_site_id}
                      onChange={(e) => setFormData({ ...formData, port_site_id: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none"
                    >
                      <option value="">-- Chọn cảng hạ --</option>
                      {portSites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fee Section */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Chi tiết phí
                  </h3>

                  <div className="space-y-3">
                    {/* Fee row template - Phí nâng hạ đầu tiên */}
                    {[
                      { label: "Phí nâng hạ", fee: "lift_fee", paid: "lift_fee_paid" },
                      { label: "Phí vệ sinh", fee: "cleaning_fee", paid: "cleaning_fee_paid" },
                      { label: "Phí lưu bãi", fee: "storage_fee", paid: "storage_fee_paid" },
                      { label: "Phí sửa chữa/cược", fee: "repair_fee", paid: "repair_fee_paid" },
                    ].map((item) => (
                      <div key={item.fee} className="grid grid-cols-3 gap-3 items-center">
                        <label className="text-sm text-gray-600">{item.label}</label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Phải trả"
                            value={(formData as any)[item.fee] ? new Intl.NumberFormat("vi-VN").format((formData as any)[item.fee]) : ""}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/[^\d]/g, "");
                              setFormData({ ...formData, [item.fee]: parseInt(rawValue) || 0 });
                            }}
                            className="w-full border rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-200 outline-none text-right"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">đ</span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Đã trả"
                            value={(formData as any)[item.paid] ? new Intl.NumberFormat("vi-VN").format((formData as any)[item.paid]) : ""}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/[^\d]/g, "");
                              setFormData({ ...formData, [item.paid]: parseInt(rawValue) || 0 });
                            }}
                            className="w-full border rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-200 outline-none text-right"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">đ</span>
                        </div>
                      </div>
                    ))}

                    {/* Other fee with note */}
                    <div className="grid grid-cols-3 gap-3 items-start">
                      <div>
                        <label className="text-sm text-gray-600">Phí khác</label>
                        <input
                          type="text"
                          placeholder="Ghi chú phí khác"
                          value={formData.other_fee_note}
                          onChange={(e) => setFormData({ ...formData, other_fee_note: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-blue-200 outline-none"
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Phải trả"
                          value={formData.other_fee ? new Intl.NumberFormat("vi-VN").format(formData.other_fee) : ""}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/[^\d]/g, "");
                            setFormData({ ...formData, other_fee: parseInt(rawValue) || 0 });
                          }}
                          className="w-full border rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-200 outline-none text-right"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">đ</span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Đã trả"
                          value={formData.other_fee_paid ? new Intl.NumberFormat("vi-VN").format(formData.other_fee_paid) : ""}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/[^\d]/g, "");
                            setFormData({ ...formData, other_fee_paid: parseInt(rawValue) || 0 });
                          }}
                          className="w-full border rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-200 outline-none text-right"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">đ</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="border-t pt-3 mt-3 grid grid-cols-3 gap-3 items-center font-medium">
                      <span className="text-gray-800">Tổng cộng</span>
                      <span className="text-red-600">
                        {formatCurrency(
                          formData.cleaning_fee +
                            formData.lift_fee +
                            formData.storage_fee +
                            formData.repair_fee +
                            formData.other_fee
                        )}
                      </span>
                      <span className="text-green-600">
                        {formatCurrency(
                          formData.cleaning_fee_paid +
                            formData.lift_fee_paid +
                            formData.storage_fee_paid +
                            formData.repair_fee_paid +
                            formData.other_fee_paid
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Documents Section - AI sẽ phân loại */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Chứng từ đính kèm
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Tải lên các chứng từ: Hóa đơn VAT, Phiếu hạ rỗng, Phiếu thu, Cược sửa chữa... AI sẽ tự động phân loại.
                  </p>

                  {/* Upload area */}
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
                    {uploadingFiles ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Đang tải...
                      </div>
                    ) : (
                      <>
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-600 mt-2">Kéo thả hoặc nhấn để chọn file</span>
                        <span className="text-xs text-gray-400">Hỗ trợ: Ảnh, PDF, Word, Excel</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFilesUpload(e.target.files);
                        }
                      }}
                    />
                  </label>

                  {/* Uploaded files list */}
                  {attachedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {attachedFiles.map((file, index) => {
                        // Generate download filename: {Mã đơn} {Loại chứng từ} {Mã container}.ext
                        const orderCode = modalMode === "edit" ? selectedReturn?.order_code : selectedOrder?.order_code;
                        const containerCode = modalMode === "edit" ? selectedReturn?.container_code : selectedOrder?.container_code;
                        const docType = file.document_type || "Chứng từ";
                        const ext = file.name.split('.').pop() || "";
                        const downloadName = `${orderCode || ""} ${docType} ${containerCode || ""}.${ext}`.trim();

                        return (
                          <div key={index} className="flex items-center gap-3 p-2 border rounded-lg bg-gray-50 group">
                            {/* File icon/preview */}
                            <div
                              className="w-12 h-12 rounded-lg border bg-white flex items-center justify-center overflow-hidden cursor-pointer flex-shrink-0"
                              onClick={() => window.open(getFileUrlWithToken(file.url), '_blank')}
                            >
                              {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img
                                  src={getFileUrlWithToken(file.url)}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : file.name.match(/\.pdf$/i) ? (
                                <span className="text-red-600 font-bold text-xs">PDF</span>
                              ) : file.name.match(/\.(doc|docx)$/i) ? (
                                <span className="text-blue-600 font-bold text-xs">DOC</span>
                              ) : file.name.match(/\.(xls|xlsx)$/i) ? (
                                <span className="text-green-600 font-bold text-xs">XLS</span>
                              ) : (
                                <FileText className="w-5 h-5 text-gray-400" />
                              )}
                            </div>

                            {/* Document type selector */}
                            <div className="flex-1 min-w-0">
                              <select
                                value={file.document_type || ""}
                                onChange={(e) => {
                                  setAttachedFiles((prev) =>
                                    prev.map((f, i) => (i === index ? { ...f, document_type: e.target.value } : f))
                                  );
                                }}
                                className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                              >
                                <option value="">-- Chọn loại chứng từ --</option>
                                <option value="Hoá đơn VAT">Hoá đơn VAT</option>
                                <option value="Phiếu hạ rỗng">Phiếu hạ rỗng</option>
                                <option value="Phiếu thu phí">Phiếu thu phí</option>
                                <option value="Phiếu cược sửa chữa">Phiếu cược sửa chữa</option>
                                <option value="Biên lai">Biên lai</option>
                                <option value="Khác">Khác</option>
                              </select>
                              <p className="text-xs text-gray-400 mt-0.5 truncate" title={file.name}>{file.name}</p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => window.open(getFileUrlWithToken(file.url), '_blank')}
                                className="bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-blue-600"
                                title="Xem"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFileDownload(file.url, downloadName)}
                                className="bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-green-600"
                                title={`Tải: ${downloadName}`}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== index))}
                                className="bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600"
                                title="Xóa"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Other Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Người chi trả</label>
                    <select
                      value={formData.payer}
                      onChange={(e) => setFormData({ ...formData, payer: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none"
                    >
                      <option value="COMPANY">Công ty</option>
                      <option value="DRIVER">
                        Tài xế {modalMode === "edit" && selectedReturn?.driver_name ? `(${selectedReturn.driver_name})` : modalMode === "create" && selectedOrder?.driver_name ? `(${selectedOrder.driver_name})` : ""}
                      </option>
                      <option value="CUSTOMER">
                        Khách hàng {/* TODO: Thêm tên khách hàng khi có dữ liệu */}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none"
                    >
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none"
                    rows={3}
                    placeholder="Ghi chú thêm về việc hạ rỗng..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {modalMode === "create" ? "Tạo hạ rỗng" : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment QR Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b bg-gradient-to-r from-green-50 to-blue-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {paymentMode === "single" ? "Thanh toán VietQR" : "Thanh toán hàng loạt"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {paymentMode === "single"
                      ? "Quét mã QR để chuyển tiền hoàn lại cho tài xế"
                      : `${batchPaymentData?.total_drivers} tài xế - ${batchPaymentData?.payments.reduce((sum, p) => sum + p.orders.length, 0)} đơn hạ rỗng`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSinglePaymentData(null);
                  setBatchPaymentData(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
              {/* Single Payment */}
              {paymentMode === "single" && singlePaymentData && (
                <div className="flex flex-col items-center">
                  {/* QR Image */}
                  <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-gray-100 mb-6">
                    <img
                      src={singlePaymentData.qr_url}
                      alt="VietQR"
                      className="w-64 h-64 object-contain"
                    />
                  </div>

                  {/* Payment Info */}
                  <div className="w-full max-w-md space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-500">Người nhận</span>
                      <span className="font-semibold text-gray-800">{singlePaymentData.driver_name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-500">Ngân hàng</span>
                      <span className="font-medium text-gray-700">{singlePaymentData.bank_name || "-"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-500">Số tài khoản</span>
                      <span className="font-mono text-gray-700">{singlePaymentData.bank_account}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-500">Mã đơn</span>
                      <span className="font-medium text-blue-600">{singlePaymentData.order_code}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-500">Container</span>
                      <span className="font-mono text-gray-700">{singlePaymentData.container_code || "-"}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-green-50 rounded-lg px-4 -mx-4">
                      <span className="text-gray-700 font-medium">Số tiền</span>
                      <span className="text-2xl font-bold text-green-600">{formatCurrency(singlePaymentData.amount)}</span>
                    </div>
                    <div className="text-center text-sm text-gray-500 mt-4">
                      Nội dung: <span className="font-medium">{singlePaymentData.description}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Batch Payment */}
              {paymentMode === "batch" && batchPaymentData && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500">Tổng cần thanh toán</div>
                      <div className="text-3xl font-bold text-green-600">{formatCurrency(batchPaymentData.total_amount)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">{batchPaymentData.total_drivers} tài xế</div>
                      <div className="text-sm text-gray-500">
                        {batchPaymentData.payments.reduce((sum, p) => sum + p.orders.length, 0)} đơn hạ rỗng
                      </div>
                    </div>
                  </div>

                  {/* Driver List */}
                  <div className="space-y-4">
                    {batchPaymentData.payments.map((payment, index) => (
                      <div key={payment.driver_id} className="border rounded-xl overflow-hidden">
                        {/* Driver Header */}
                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">{payment.driver_name}</div>
                              <div className="text-xs text-gray-500">
                                {payment.bank_name} - {payment.bank_account}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">{formatCurrency(payment.total_amount)}</div>
                            <div className="text-xs text-gray-500">{payment.orders.length} đơn</div>
                          </div>
                        </div>

                        {/* QR and Orders */}
                        <div className="p-4 flex gap-4">
                          {/* QR Code */}
                          <div className="flex-shrink-0">
                            {payment.qr_url ? (
                              <img
                                src={payment.qr_url}
                                alt={`QR ${payment.driver_name}`}
                                className="w-40 h-40 object-contain border rounded-lg"
                              />
                            ) : (
                              <div className="w-40 h-40 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
                                <div className="text-center text-red-500 text-sm p-2">
                                  <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  {payment.error || "Lỗi tạo QR"}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Order List */}
                          <div className="flex-1">
                            <div className="text-xs font-medium text-gray-500 mb-2">Danh sách đơn hạ rỗng:</div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {payment.orders.map((order) => (
                                <div key={order.empty_return_id} className="flex justify-between text-sm py-1 border-b border-gray-100">
                                  <div>
                                    <span className="text-blue-600 font-medium">{order.order_code}</span>
                                    {order.container_code && (
                                      <span className="text-gray-400 ml-2 font-mono text-xs">{order.container_code}</span>
                                    )}
                                  </div>
                                  <span className="text-green-600 font-medium">{formatCurrency(order.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Confirm Single Driver */}
                        <div className="px-4 pb-3">
                          <button
                            onClick={() => confirmBatchPayment(payment.empty_return_ids)}
                            disabled={confirmingPayment || !payment.qr_url}
                            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                          >
                            {confirmingPayment ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            Xác nhận đã thanh toán cho {payment.driver_name}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Sau khi quét mã và chuyển tiền thành công, nhấn "Xác nhận đã thanh toán"
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSinglePaymentData(null);
                    setBatchPaymentData(null);
                  }}
                  className="px-4 py-2.5 border rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Đóng
                </button>
                {paymentMode === "single" && singlePaymentData && (
                  <button
                    onClick={() => confirmSinglePayment(singlePaymentData.empty_return_id, singlePaymentData.amount)}
                    disabled={confirmingPayment}
                    className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {confirmingPayment ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Xác nhận đã thanh toán
                  </button>
                )}
                {paymentMode === "batch" && batchPaymentData && (
                  <button
                    onClick={() => {
                      const allIds = batchPaymentData.payments.flatMap((p) => p.empty_return_ids);
                      confirmBatchPayment(allIds);
                    }}
                    disabled={confirmingPayment}
                    className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {confirmingPayment ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Xác nhận tất cả ({batchPaymentData.total_drivers} tài xế)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
