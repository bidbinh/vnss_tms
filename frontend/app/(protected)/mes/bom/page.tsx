"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Boxes,
  Loader2,
  CheckCircle,
  FileText,
  Copy,
  Trash2,
  Package,
  X,
  ChevronDown,
} from "lucide-react";

interface Product {
  id: string;
  code: string;
  name: string;
}

interface BOMLineInput {
  component_id: string;
  component_code: string;
  component_name: string;
  quantity: number;
  unit_name: string;
  unit_cost: number;
  scrap_rate: number;
  is_critical: boolean;
  notes: string;
}

interface BOM {
  id: string;
  bom_code: string;
  bom_name: string;
  description: string | null;
  version: string;
  product_id: string;
  product_code: string | null;
  product_name: string | null;
  base_quantity: number;
  unit_name: string | null;
  bom_type: string;
  status: string;
  routing_id: string | null;
  standard_cost: number;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function BOMPage() {
  const [boms, setBoms] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    bom_code: "",
    bom_name: "",
    description: "",
    version: "1.0",
    product_id: "",
    product_code: "",
    product_name: "",
    base_quantity: 1,
    unit_name: "",
    bom_type: "STANDARD",
    valid_from: "",
    valid_to: "",
    notes: "",
  });
  const [bomLines, setBomLines] = useState<BOMLineInput[]>([]);

  const fetchBOMs = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_BASE}/mes/bom?page=${pagination.page}&size=${pagination.size}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterType) url += `&bom_type=${filterType}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setBoms(data.items || []);
        setPagination((prev) => ({
          ...prev,
          total: data.total || 0,
          pages: data.pages || 0,
        }));
      }
    } catch (err) {
      console.error("Error fetching BOMs:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filterStatus, filterType, searchTerm]);

  useEffect(() => {
    fetchBOMs();
  }, [fetchBOMs]);

  // Fetch products for dropdown
  const fetchProducts = async () => {
    if (products.length > 0) return; // Already loaded
    setLoadingProducts(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/wms/products?size=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Open create modal
  const openCreateModal = () => {
    fetchProducts();
    setFormData({
      bom_code: "",
      bom_name: "",
      description: "",
      version: "1.0",
      product_id: "",
      product_code: "",
      product_name: "",
      base_quantity: 1,
      unit_name: "",
      bom_type: "STANDARD",
      valid_from: "",
      valid_to: "",
      notes: "",
    });
    setBomLines([]);
    setShowCreateModal(true);
  };

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setFormData((prev) => ({
        ...prev,
        product_id: product.id,
        product_code: product.code,
        product_name: product.name,
        bom_code: `BOM-${product.code}`,
        bom_name: `Định mức ${product.name}`,
      }));
    }
  };

  // Add component line
  const addBomLine = () => {
    setBomLines((prev) => [
      ...prev,
      {
        component_id: "",
        component_code: "",
        component_name: "",
        quantity: 1,
        unit_name: "Cái",
        unit_cost: 0,
        scrap_rate: 0,
        is_critical: false,
        notes: "",
      },
    ]);
  };

  // Remove component line
  const removeBomLine = (index: number) => {
    setBomLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Update component line
  const updateBomLine = (index: number, field: keyof BOMLineInput, value: unknown) => {
    setBomLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  };

  // Handle component selection in line
  const handleComponentSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setBomLines((prev) =>
        prev.map((line, i) =>
          i === index
            ? {
                ...line,
                component_id: product.id,
                component_code: product.code,
                component_name: product.name,
              }
            : line
        )
      );
    }
  };

  // Create BOM
  const handleCreateBOM = async () => {
    if (!formData.product_id) {
      alert("Vui lòng chọn sản phẩm");
      return;
    }
    if (!formData.bom_code || !formData.bom_name) {
      alert("Vui lòng nhập mã và tên BOM");
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
        base_quantity: Number(formData.base_quantity),
        valid_from: formData.valid_from || null,
        valid_to: formData.valid_to || null,
        lines: bomLines
          .filter((l) => l.component_id)
          .map((l) => ({
            ...l,
            quantity: Number(l.quantity),
            unit_cost: Number(l.unit_cost),
            scrap_rate: Number(l.scrap_rate),
          })),
      };

      const res = await fetch(`${API_BASE}/mes/bom`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowCreateModal(false);
        fetchBOMs();
      } else {
        const err = await res.json();
        alert(err.detail || "Lỗi khi tạo BOM");
      }
    } catch (err) {
      console.error("Error creating BOM:", err);
      alert("Lỗi khi tạo BOM");
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700";
      case "DRAFT":
        return "bg-gray-100 text-gray-700";
      case "INACTIVE":
        return "bg-yellow-100 text-yellow-700";
      case "OBSOLETE":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: "Bản nháp",
      ACTIVE: "Đang sử dụng",
      INACTIVE: "Ngừng sử dụng",
      OBSOLETE: "Lỗi thời",
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      STANDARD: "Tiêu chuẩn",
      PHANTOM: "Ảo (Phantom)",
      ENGINEERING: "Kỹ thuật",
      MANUFACTURING: "Sản xuất",
    };
    return labels[type] || type;
  };

  // Stats
  const stats = {
    total: boms.length,
    active: boms.filter((b) => b.status === "ACTIVE").length,
    draft: boms.filter((b) => b.status === "DRAFT").length,
    inactive: boms.filter((b) => b.status === "INACTIVE" || b.status === "OBSOLETE").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Định mức NVL (BOM)</h1>
          <p className="text-gray-500">Bill of Materials - Công thức sản xuất</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tạo BOM mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Boxes className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Tổng BOM</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-gray-500">Đang sử dụng</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-sm text-gray-500">Bản nháp</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Package className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inactive}</p>
              <p className="text-sm text-gray-500">Ngừng sử dụng</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm BOM, sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả loại</option>
          <option value="STANDARD">Tiêu chuẩn</option>
          <option value="PHANTOM">Ảo (Phantom)</option>
          <option value="ENGINEERING">Kỹ thuật</option>
          <option value="MANUFACTURING">Sản xuất</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="ACTIVE">Đang sử dụng</option>
          <option value="INACTIVE">Ngừng sử dụng</option>
          <option value="OBSOLETE">Lỗi thời</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã BOM
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SL cơ sở
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chi phí
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phiên bản
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {boms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm || filterStatus || filterType
                      ? "Không tìm thấy BOM phù hợp"
                      : "Chưa có BOM nào."}
                  </td>
                </tr>
              ) : (
                boms.map((bom) => (
                  <tr key={bom.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">{bom.bom_code}</span>
                      <p className="text-sm text-gray-500">{bom.bom_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{bom.product_name || "-"}</p>
                        <p className="text-xs text-gray-500">{bom.product_code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                        {getTypeLabel(bom.bom_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium">{bom.base_quantity}</span>
                      {bom.unit_name && (
                        <span className="text-xs text-gray-500 ml-1">{bom.unit_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(bom.standard_cost)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm">{bom.version}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(bom.status)}`}
                      >
                        {getStatusLabel(bom.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                          title="Sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                          title="Nhân bản"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {bom.status === "DRAFT" && (
                          <button
                            className="p-1.5 hover:bg-green-100 rounded text-green-600"
                            title="Kích hoạt"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Hiển thị {(pagination.page - 1) * pagination.size + 1} -{" "}
              {Math.min(pagination.page * pagination.size, pagination.total)} trong{" "}
              {pagination.total} kết quả
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Trước
              </button>
              <span className="px-3 py-1">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create BOM Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold">Tạo BOM mới</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
              {/* Product Selection */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Sản phẩm *
                </label>
                <div className="relative">
                  <select
                    value={formData.product_id}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  >
                    <option value="">-- Chọn sản phẩm --</option>
                    {loadingProducts ? (
                      <option disabled>Đang tải...</option>
                    ) : (
                      products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.name}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {formData.product_name && (
                  <p className="mt-2 text-sm text-blue-700">
                    Đã chọn: <strong>{formData.product_name}</strong>
                  </p>
                )}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã BOM *
                  </label>
                  <input
                    type="text"
                    value={formData.bom_code}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bom_code: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: BOM-SP001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên BOM *
                  </label>
                  <input
                    type="text"
                    value={formData.bom_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bom_name: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Định mức sản phẩm A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại BOM
                  </label>
                  <select
                    value={formData.bom_type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bom_type: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="STANDARD">Tiêu chuẩn</option>
                    <option value="PHANTOM">Ảo (Phantom)</option>
                    <option value="ENGINEERING">Kỹ thuật</option>
                    <option value="MANUFACTURING">Sản xuất</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phiên bản
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, version: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lượng cơ sở
                  </label>
                  <input
                    type="number"
                    value={formData.base_quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        base_quantity: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị
                  </label>
                  <input
                    type="text"
                    value={formData.unit_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, unit_name: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Cái, Bộ, Chiếc"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hiệu lực từ
                  </label>
                  <input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, valid_from: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hiệu lực đến
                  </label>
                  <input
                    type="date"
                    value={formData.valid_to}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, valid_to: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Mô tả về BOM..."
                />
              </div>

              {/* BOM Lines - Components */}
              <div className="border rounded-lg">
                <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
                  <h3 className="font-medium">Thành phần (NVL)</h3>
                  <button
                    type="button"
                    onClick={addBomLine}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm NVL
                  </button>
                </div>

                {bomLines.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>Chưa có thành phần nào. Nhấn &quot;Thêm NVL&quot; để bắt đầu.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">
                            NVL / Thành phần
                          </th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600 w-24">
                            Số lượng
                          </th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600 w-24">
                            Đơn vị
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">
                            Đơn giá
                          </th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600 w-20">
                            Hao hụt %
                          </th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600 w-16">
                            Xóa
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {bomLines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <select
                                value={line.component_id}
                                onChange={(e) => handleComponentSelect(idx, e.target.value)}
                                className="w-full px-2 py-1.5 border rounded focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">-- Chọn NVL --</option>
                                {products
                                  .filter((p) => p.id !== formData.product_id)
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.code} - {p.name}
                                    </option>
                                  ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={line.quantity}
                                onChange={(e) =>
                                  updateBomLine(idx, "quantity", Number(e.target.value))
                                }
                                className="w-full px-2 py-1.5 border rounded text-center focus:ring-2 focus:ring-blue-500"
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={line.unit_name}
                                onChange={(e) => updateBomLine(idx, "unit_name", e.target.value)}
                                className="w-full px-2 py-1.5 border rounded text-center focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={line.unit_cost}
                                onChange={(e) =>
                                  updateBomLine(idx, "unit_cost", Number(e.target.value))
                                }
                                className="w-full px-2 py-1.5 border rounded text-right focus:ring-2 focus:ring-blue-500"
                                min="0"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={line.scrap_rate}
                                onChange={(e) =>
                                  updateBomLine(idx, "scrap_rate", Number(e.target.value))
                                }
                                className="w-full px-2 py-1.5 border rounded text-center focus:ring-2 focus:ring-blue-500"
                                min="0"
                                max="100"
                                step="0.1"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeBomLine(idx)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateBOM}
                disabled={creating || !formData.product_id}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Tạo BOM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
