"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

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
  currency_code?: string;
  total_value?: number;
  total_taxes?: number;
  submission_date?: string;
  registered_date?: string;
  release_date?: string;
  inspection_required: boolean;
  created_at: string;
}

const STATUSES = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Nháp" },
  { value: "SUBMITTED", label: "Đã nộp" },
  { value: "REGISTERED", label: "Đã đăng ký" },
  { value: "INSPECTION", label: "Kiểm tra" },
  { value: "RELEASED", label: "Đã thông quan" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const TYPES = [
  { value: "", label: "Tất cả loại" },
  { value: "IMPORT", label: "Nhập khẩu" },
  { value: "EXPORT", label: "Xuất khẩu" },
  { value: "TRANSIT", label: "Quá cảnh" },
];

export default function CustomsPage() {
  const [declarations, setDeclarations] = useState<CustomsDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchDeclarations();
  }, [page, filterType, filterStatus]);

  const fetchDeclarations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (filterType) params.append("declaration_type", filterType);
      if (filterStatus) params.append("status", filterStatus);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/customs?${params}`,
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
      console.error("Lỗi khi tải danh sách tờ khai:", error);
    } finally {
      setLoading(false);
    }
  };

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
    switch (status) {
      case "DRAFT": return "Nháp";
      case "SUBMITTED": return "Đã nộp";
      case "REGISTERED": return "Đã đăng ký";
      case "INSPECTION": return "Kiểm tra";
      case "RELEASED": return "Đã thông quan";
      case "CANCELLED": return "Đã hủy";
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "IMPORT": return "Nhập khẩu";
      case "EXPORT": return "Xuất khẩu";
      case "TRANSIT": return "Quá cảnh";
      default: return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "RELEASED": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "INSPECTION": return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
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

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tờ khai Hải quan</h1>
          <p className="text-gray-600">Quản lý tờ khai xuất nhập khẩu</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Tạo tờ khai mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Chờ nộp</p>
              <p className="text-2xl font-bold text-gray-800">
                {declarations.filter(d => d.status === "DRAFT").length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-gray-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Đang kiểm tra</p>
              <p className="text-2xl font-bold text-orange-600">
                {declarations.filter(d => d.status === "INSPECTION").length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Chờ thông quan</p>
              <p className="text-2xl font-bold text-blue-600">
                {declarations.filter(d => d.status === "REGISTERED").length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Đã thông quan</p>
              <p className="text-2xl font-bold text-green-600">
                {declarations.filter(d => d.status === "RELEASED").length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm số tờ khai, doanh nghiệp..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : declarations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Chưa có tờ khai nào</p>
            <p className="text-sm">Tạo tờ khai hải quan để bắt đầu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Số tờ khai</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Loại</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Doanh nghiệp</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Chi cục HQ</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Trị giá</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Thuế</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Trạng thái</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {declarations.map((declaration) => (
                  <tr key={declaration.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-blue-600">
                        {declaration.declaration_no || "Nháp"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Hóa đơn: {declaration.invoice_no || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        declaration.declaration_type === "IMPORT"
                          ? "bg-blue-100 text-blue-800"
                          : declaration.declaration_type === "EXPORT"
                          ? "bg-green-100 text-green-800"
                          : "bg-purple-100 text-purple-800"
                      }`}>
                        {getTypeLabel(declaration.declaration_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{declaration.trader_name || "-"}</p>
                      <p className="text-xs text-gray-500">{declaration.trader_tax_code}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {declaration.customs_office || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(declaration.total_value, declaration.currency_code)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                      {formatCurrency(declaration.total_taxes, "VND")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(declaration.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(declaration.status)}`}>
                          {getStatusLabel(declaration.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded" title="Xem">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Sửa">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        {declaration.status === "DRAFT" && (
                          <button className="p-1 hover:bg-gray-100 rounded" title="Nộp tờ khai">
                            <Upload className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-gray-600">
              Hiển thị {(page - 1) * pageSize + 1} đến {Math.min(page * pageSize, total)} trong tổng số {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
              >
                Trước
              </button>
              <span className="px-3 py-1">Trang {page} / {totalPages}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateDeclarationModal
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
  onClose,
  onCreated,
}: {
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
        setError(data.detail || "Không thể tạo tờ khai");
      }
    } catch (err) {
      setError("Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Tạo tờ khai Hải quan mới</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Loại tờ khai *</label>
              <select
                value={formData.declaration_type}
                onChange={(e) => setFormData({ ...formData, declaration_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="IMPORT">Nhập khẩu</option>
                <option value="EXPORT">Xuất khẩu</option>
                <option value="TRANSIT">Quá cảnh</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chi cục Hải quan</label>
              <input
                type="text"
                value={formData.customs_office}
                onChange={(e) => setFormData({ ...formData, customs_office: e.target.value })}
                placeholder="VD: Chi cục HQ Cát Lái"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Doanh nghiệp XNK *</label>
              <input
                type="text"
                value={formData.trader_name}
                onChange={(e) => setFormData({ ...formData, trader_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mã số thuế *</label>
              <input
                type="text"
                value={formData.trader_tax_code}
                onChange={(e) => setFormData({ ...formData, trader_tax_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Địa chỉ</label>
            <input
              type="text"
              value={formData.trader_address}
              onChange={(e) => setFormData({ ...formData, trader_address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Số hóa đơn</label>
              <input
                type="text"
                value={formData.invoice_no}
                onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ngày hóa đơn</label>
              <input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Điều kiện giao hàng</label>
              <select
                value={formData.incoterm}
                onChange={(e) => setFormData({ ...formData, incoterm: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tiền tệ</label>
              <select
                value={formData.currency_code}
                onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CNY">CNY</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trị giá</label>
              <input
                type="number"
                step="0.01"
                value={formData.total_value}
                onChange={(e) => setFormData({ ...formData, total_value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nước xuất xứ</label>
              <input
                type="text"
                value={formData.origin_country}
                onChange={(e) => setFormData({ ...formData, origin_country: e.target.value })}
                placeholder="VD: CN, US, JP"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mã HS</label>
              <input
                type="text"
                value={formData.hs_code}
                onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })}
                placeholder="VD: 8471300000"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số kiện</label>
              <input
                type="number"
                value={formData.package_qty}
                onChange={(e) => setFormData({ ...formData, package_qty: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mô tả hàng hóa</label>
            <textarea
              value={formData.commodity}
              onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Trọng lượng thực (kg)</label>
              <input
                type="number"
                step="0.01"
                value={formData.gross_weight}
                onChange={(e) => setFormData({ ...formData, gross_weight: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trọng lượng tịnh (kg)</label>
              <input
                type="number"
                step="0.01"
                value={formData.net_weight}
                onChange={(e) => setFormData({ ...formData, net_weight: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Đang tạo..." : "Tạo tờ khai"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
