"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Ship,
  FileText,
  Download,
  Printer,
} from "lucide-react";

interface BillOfLading {
  id: string;
  bl_no: string;
  bl_type: string;
  shipment_id: string;
  shipment_no?: string;
  shipper_name?: string;
  consignee_name?: string;
  notify_party?: string;
  origin_port?: string;
  destination_port?: string;
  carrier_name?: string;
  vessel_name?: string;
  voyage_no?: string;
  container_count: number;
  total_packages: number;
  gross_weight: number;
  volume: number;
  commodity?: string;
  freight_terms?: string;
  status: string;
  issued_date?: string;
  created_at: string;
}

const STATUSES = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Nháp" },
  { value: "ISSUED", label: "Đã phát hành" },
  { value: "SURRENDERED", label: "Đã nộp gốc" },
  { value: "TELEX_RELEASED", label: "Telex Release" },
  { value: "RELEASED", label: "Đã giải phóng" },
];

const BL_TYPES = [
  { value: "", label: "Tất cả loại" },
  { value: "MASTER", label: "Master B/L" },
  { value: "HOUSE", label: "House B/L" },
];

export default function BillsOfLadingPage() {
  const [bls, setBls] = useState<BillOfLading[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchBLs();
  }, [page, filterType, filterStatus]);

  const fetchBLs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (filterType) params.append("bl_type", filterType);
      if (filterStatus) params.append("status", filterStatus);
      if (search) params.append("search", search);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/bills-of-lading?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setBls(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách B/L:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchBLs();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-800";
      case "ISSUED": return "bg-blue-100 text-blue-800";
      case "SURRENDERED": return "bg-orange-100 text-orange-800";
      case "TELEX_RELEASED": return "bg-teal-100 text-teal-800";
      case "RELEASED": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "DRAFT": return "Nháp";
      case "ISSUED": return "Đã phát hành";
      case "SURRENDERED": return "Đã nộp gốc";
      case "TELEX_RELEASED": return "Telex Release";
      case "RELEASED": return "Đã giải phóng";
      default: return status;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vận đơn Đường biển (B/L)</h1>
          <p className="text-gray-600">Quản lý Master B/L và House B/L</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Tạo B/L mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tổng B/L</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Master B/L</p>
              <p className="text-2xl font-bold text-purple-600">
                {bls.filter(b => b.bl_type === "MASTER").length}
              </p>
            </div>
            <Ship className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">House B/L</p>
              <p className="text-2xl font-bold text-blue-600">
                {bls.filter(b => b.bl_type === "HOUSE").length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Chờ phát hành</p>
              <p className="text-2xl font-bold text-orange-600">
                {bls.filter(b => b.status === "DRAFT").length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-orange-500" />
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
              placeholder="Tìm kiếm số B/L, người gửi, người nhận..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {BL_TYPES.map((type) => (
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
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : bls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Ship className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Chưa có vận đơn đường biển</p>
            <p className="text-sm">Tạo B/L đầu tiên để bắt đầu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Số B/L</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Loại</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Người gửi</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Người nhận</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tuyến đường</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tàu/Chuyến</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Cont</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Trọng lượng</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Trạng thái</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bls.map((bl) => (
                  <tr key={bl.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a href={`/fms/bills-of-lading/${bl.id}`} className="font-medium text-blue-600 hover:underline">
                        {bl.bl_no}
                      </a>
                      <p className="text-xs text-gray-500">{bl.shipment_no}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        bl.bl_type === "MASTER" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {bl.bl_type === "MASTER" ? "Master" : "House"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{bl.shipper_name || "-"}</td>
                    <td className="px-4 py-3 text-sm">{bl.consignee_name || "-"}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{bl.origin_port} → {bl.destination_port}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{bl.vessel_name || "-"}</p>
                      <p className="text-xs text-gray-500">{bl.voyage_no}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-medium text-sm">
                        {bl.container_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{bl.gross_weight?.toFixed(2)} kg</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bl.status)}`}>
                        {getStatusLabel(bl.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a href={`/fms/bills-of-lading/${bl.id}`} className="p-1 hover:bg-gray-100 rounded" title="Xem">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </a>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Sửa">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded" title="In">
                          <Printer className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Tải xuống">
                          <Download className="w-4 h-4 text-gray-600" />
                        </button>
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
        <CreateBLModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchBLs();
          }}
        />
      )}
    </div>
  );
}

function CreateBLModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    bl_no: "",
    bl_type: "HOUSE",
    shipment_id: "",
    shipper_name: "",
    shipper_address: "",
    consignee_name: "",
    consignee_address: "",
    notify_party: "",
    notify_address: "",
    origin_port: "",
    destination_port: "",
    carrier_name: "",
    vessel_name: "",
    voyage_no: "",
    total_packages: 0,
    gross_weight: 0,
    volume: 0,
    commodity: "",
    freight_terms: "PREPAID",
    place_of_issue: "",
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/bills-of-lading`,
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
        setError(data.detail || "Không thể tạo B/L");
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
          <h2 className="text-xl font-bold">Tạo vận đơn đường biển mới</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Số B/L *</label>
              <input
                type="text"
                value={formData.bl_no}
                onChange={(e) => setFormData({ ...formData, bl_no: e.target.value })}
                placeholder="VD: COSU1234567890"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loại B/L *</label>
              <select
                value={formData.bl_type}
                onChange={(e) => setFormData({ ...formData, bl_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="MASTER">Master B/L</option>
                <option value="HOUSE">House B/L</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Người gửi hàng</label>
              <input
                type="text"
                value={formData.shipper_name}
                onChange={(e) => setFormData({ ...formData, shipper_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Người nhận hàng</label>
              <input
                type="text"
                value={formData.consignee_name}
                onChange={(e) => setFormData({ ...formData, consignee_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bên được thông báo</label>
            <input
              type="text"
              value={formData.notify_party}
              onChange={(e) => setFormData({ ...formData, notify_party: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cảng đi</label>
              <input
                type="text"
                value={formData.origin_port}
                onChange={(e) => setFormData({ ...formData, origin_port: e.target.value.toUpperCase() })}
                placeholder="VD: VNSGN"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cảng đến</label>
              <input
                type="text"
                value={formData.destination_port}
                onChange={(e) => setFormData({ ...formData, destination_port: e.target.value.toUpperCase() })}
                placeholder="VD: USNYC"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hãng tàu</label>
              <input
                type="text"
                value={formData.carrier_name}
                onChange={(e) => setFormData({ ...formData, carrier_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tên tàu</label>
              <input
                type="text"
                value={formData.vessel_name}
                onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số chuyến</label>
              <input
                type="text"
                value={formData.voyage_no}
                onChange={(e) => setFormData({ ...formData, voyage_no: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Số kiện</label>
              <input
                type="number"
                value={formData.total_packages}
                onChange={(e) => setFormData({ ...formData, total_packages: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trọng lượng (kg)</label>
              <input
                type="number"
                step="0.01"
                value={formData.gross_weight}
                onChange={(e) => setFormData({ ...formData, gross_weight: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Thể tích (cbm)</label>
              <input
                type="number"
                step="0.001"
                value={formData.volume}
                onChange={(e) => setFormData({ ...formData, volume: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Điều kiện cước</label>
              <select
                value={formData.freight_terms}
                onChange={(e) => setFormData({ ...formData, freight_terms: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PREPAID">Trả trước</option>
                <option value="COLLECT">Trả sau</option>
              </select>
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
              {loading ? "Đang tạo..." : "Tạo B/L"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
