"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Package,
  Filter,
  Calendar,
  Warehouse,
  Loader2,
  FileText,
} from "lucide-react";

interface Adjustment {
  id: string;
  adjustment_number: string;
  adjustment_date: string;
  adjustment_type: string;
  status: string;
  warehouse_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  location_id: string | null;
  lot_id: string | null;
  lot_number: string | null;
  quantity_before: number;
  adjustment_quantity: number;
  quantity_after: number;
  unit_cost: number;
  adjustment_value: number;
  reason: string;
  notes: string | null;
  source_document_type: string | null;
  source_document_number: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
}

interface AdjustmentFormData {
  adjustment_type: string;
  warehouse_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  location_id: string | null;
  lot_id: string | null;
  lot_number: string | null;
  adjustment_quantity: number;
  unit_cost: number;
  reason: string;
  notes: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  standard_cost: number;
}

interface WarehouseItem {
  id: string;
  code: string;
  name: string;
}

const ADJUSTMENT_TYPES = [
  { value: "PHYSICAL_COUNT", label: "Kiểm kê thực tế" },
  { value: "DAMAGED", label: "Hàng hư hỏng" },
  { value: "LOSS", label: "Mất mát" },
  { value: "FOUND", label: "Tìm thấy" },
  { value: "CORRECTION", label: "Điều chỉnh sai số" },
  { value: "OTHER", label: "Khác" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<Adjustment | null>(null);
  const [formData, setFormData] = useState<AdjustmentFormData>({
    adjustment_type: "PHYSICAL_COUNT",
    warehouse_id: "",
    product_id: "",
    product_code: "",
    product_name: "",
    location_id: null,
    lot_id: null,
    lot_number: null,
    adjustment_quantity: 0,
    unit_cost: 0,
    reason: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });

  const fetchAdjustments = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_BASE}/wms/adjustments?page=${pagination.page}&size=${pagination.size}`;
      if (filterType) url += `&adjustment_type=${filterType}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch adjustments");

      const data = await res.json();
      setAdjustments(data.items || []);
      setPagination((prev) => ({
        ...prev,
        total: data.total,
        pages: data.pages,
      }));
    } catch (err) {
      console.error("Error fetching adjustments:", err);
      setError("Không thể tải danh sách điều chỉnh. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filterType]);

  const fetchWarehouses = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/wms/warehouses?size=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    }
  }, []);

  const fetchProducts = useCallback(async (search: string) => {
    if (!search || search.length < 2) {
      setProducts([]);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/wms/products?search=${search}&size=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  }, []);

  useEffect(() => {
    fetchAdjustments();
    fetchWarehouses();
  }, [fetchAdjustments, fetchWarehouses]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(productSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, fetchProducts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeLabel = (type: string) => {
    return ADJUSTMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-700";
      case "DRAFT":
        return "bg-yellow-100 text-yellow-700";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "Đã duyệt";
      case "DRAFT":
        return "Chờ duyệt";
      case "REJECTED":
        return "Từ chối";
      default:
        return status;
    }
  };

  const openCreateModal = () => {
    setFormData({
      adjustment_type: "PHYSICAL_COUNT",
      warehouse_id: warehouses[0]?.id || "",
      product_id: "",
      product_code: "",
      product_name: "",
      location_id: null,
      lot_id: null,
      lot_number: null,
      adjustment_quantity: 0,
      unit_cost: 0,
      reason: "",
      notes: "",
    });
    setProductSearch("");
    setProducts([]);
    setShowModal(true);
  };

  const handleProductSelect = (product: Product) => {
    setFormData({
      ...formData,
      product_id: product.id,
      product_code: product.code,
      product_name: product.name,
      unit_cost: product.standard_cost,
    });
    setProductSearch(`${product.code} - ${product.name}`);
    setProducts([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id) {
      setError("Vui lòng chọn sản phẩm");
      return;
    }
    if (!formData.warehouse_id) {
      setError("Vui lòng chọn kho");
      return;
    }
    if (formData.adjustment_quantity === 0) {
      setError("Số lượng điều chỉnh không được bằng 0");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/wms/adjustments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create adjustment");
      }

      setShowModal(false);
      fetchAdjustments();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (adjustment: Adjustment) => {
    if (!confirm("Bạn có chắc muốn duyệt phiếu điều chỉnh này?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/wms/adjustments/${adjustment.id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to approve adjustment");
      }

      fetchAdjustments();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Không thể duyệt phiếu điều chỉnh";
      alert(errorMessage);
    }
  };

  const viewDetail = (adjustment: Adjustment) => {
    setSelectedAdjustment(adjustment);
    setShowDetailModal(true);
  };

  const filteredAdjustments = adjustments.filter((adj) => {
    const matchesSearch =
      adj.adjustment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adj.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adj.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || adj.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: adjustments.length,
    draft: adjustments.filter((a) => a.status === "DRAFT").length,
    approved: adjustments.filter((a) => a.status === "APPROVED").length,
    totalValue: adjustments
      .filter((a) => a.status === "APPROVED")
      .reduce((sum, a) => sum + Math.abs(a.adjustment_value), 0),
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
          <h1 className="text-2xl font-bold text-gray-900">Điều chỉnh tồn kho</h1>
          <p className="text-gray-500">Quản lý các phiếu điều chỉnh số lượng tồn kho</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tạo phiếu điều chỉnh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Tổng số phiếu</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Edit className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-sm text-gray-500">Chờ duyệt</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-sm text-gray-500">Đã duyệt</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
              <p className="text-sm text-gray-500">Tổng giá trị điều chỉnh</p>
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
            placeholder="Tìm kiếm phiếu, sản phẩm..."
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
          {ADJUSTMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Chờ duyệt</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="REJECTED">Từ chối</option>
        </select>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số phiếu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số lượng
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá trị
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
              {filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Không có phiếu điều chỉnh nào
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">{adj.adjustment_number}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(adj.adjustment_date)}
                    </td>
                    <td className="px-4 py-3 text-sm">{getTypeLabel(adj.adjustment_type)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{adj.product_name}</p>
                        <p className="text-xs text-gray-500">{adj.product_code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {adj.adjustment_quantity > 0 ? (
                          <ArrowUpCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span
                          className={`font-medium ${
                            adj.adjustment_quantity > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {adj.adjustment_quantity > 0 ? "+" : ""}
                          {adj.adjustment_quantity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {adj.quantity_before} → {adj.quantity_after}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          adj.adjustment_value > 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {adj.adjustment_value > 0 ? "+" : ""}
                        {formatCurrency(adj.adjustment_value)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                          adj.status
                        )}`}
                      >
                        {getStatusLabel(adj.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => viewDetail(adj)}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {adj.status === "DRAFT" && (
                          <button
                            onClick={() => handleApprove(adj)}
                            className="p-1.5 hover:bg-green-100 rounded text-green-600"
                            title="Duyệt"
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Tạo phiếu điều chỉnh tồn kho</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại điều chỉnh *
                    </label>
                    <select
                      value={formData.adjustment_type}
                      onChange={(e) =>
                        setFormData({ ...formData, adjustment_type: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {ADJUSTMENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kho *</label>
                    <select
                      value={formData.warehouse_id}
                      onChange={(e) =>
                        setFormData({ ...formData, warehouse_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">-- Chọn kho --</option>
                      {warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.code} - {wh.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sản phẩm *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tìm kiếm sản phẩm..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        if (!e.target.value) {
                          setFormData({
                            ...formData,
                            product_id: "",
                            product_code: "",
                            product_name: "",
                          });
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {products.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {products.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleProductSelect(product)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
                          >
                            <span>
                              {product.code} - {product.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatCurrency(product.standard_cost)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số lượng điều chỉnh *
                    </label>
                    <input
                      type="number"
                      value={formData.adjustment_quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          adjustment_quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: 10 hoặc -5"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Số dương = tăng tồn, số âm = giảm tồn
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đơn giá
                    </label>
                    <input
                      type="number"
                      value={formData.unit_cost}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          unit_cost: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lô (nếu có)
                  </label>
                  <input
                    type="text"
                    value={formData.lot_number || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, lot_number: e.target.value || null })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: LOT2024001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lý do điều chỉnh *
                  </label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="VD: Kiểm kê phát hiện chênh lệch"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Thông tin bổ sung..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Tạo phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAdjustment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chi tiết phiếu điều chỉnh</h2>
              <span
                className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                  selectedAdjustment.status
                )}`}
              >
                {getStatusLabel(selectedAdjustment.status)}
              </span>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Số phiếu</p>
                  <p className="font-medium">{selectedAdjustment.adjustment_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ngày tạo</p>
                  <p className="font-medium">{formatDate(selectedAdjustment.adjustment_date)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Loại điều chỉnh</p>
                  <p className="font-medium">
                    {getTypeLabel(selectedAdjustment.adjustment_type)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sản phẩm</p>
                  <p className="font-medium">{selectedAdjustment.product_name}</p>
                  <p className="text-xs text-gray-500">{selectedAdjustment.product_code}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Trước điều chỉnh</p>
                    <p className="text-xl font-bold">{selectedAdjustment.quantity_before}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Điều chỉnh</p>
                    <p
                      className={`text-xl font-bold ${
                        selectedAdjustment.adjustment_quantity > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {selectedAdjustment.adjustment_quantity > 0 ? "+" : ""}
                      {selectedAdjustment.adjustment_quantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sau điều chỉnh</p>
                    <p className="text-xl font-bold">{selectedAdjustment.quantity_after}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Đơn giá</p>
                  <p className="font-medium">{formatCurrency(selectedAdjustment.unit_cost)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Giá trị điều chỉnh</p>
                  <p
                    className={`font-medium ${
                      selectedAdjustment.adjustment_value > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {selectedAdjustment.adjustment_value > 0 ? "+" : ""}
                    {formatCurrency(selectedAdjustment.adjustment_value)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Lý do</p>
                <p className="font-medium">{selectedAdjustment.reason}</p>
              </div>

              {selectedAdjustment.notes && (
                <div>
                  <p className="text-sm text-gray-500">Ghi chú</p>
                  <p>{selectedAdjustment.notes}</p>
                </div>
              )}

              {selectedAdjustment.approved_at && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500">Đã duyệt lúc</p>
                  <p className="font-medium">{formatDate(selectedAdjustment.approved_at)}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Đóng
              </button>
              {selectedAdjustment.status === "DRAFT" && (
                <button
                  onClick={() => {
                    handleApprove(selectedAdjustment);
                    setShowDetailModal(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Duyệt phiếu
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
