"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Plane,
  FileText,
  Download,
  Printer,
} from "lucide-react";

interface AirwayBill {
  id: string;
  awb_no: string;
  awb_type: string;
  shipment_id: string;
  shipment_no?: string;
  shipper_name?: string;
  consignee_name?: string;
  origin_airport?: string;
  destination_airport?: string;
  carrier_code?: string;
  carrier_name?: string;
  flight_no?: string;
  flight_date?: string;
  pieces: number;
  gross_weight: number;
  chargeable_weight: number;
  volume: number;
  commodity?: string;
  status: string;
  issued_date?: string;
  created_at: string;
}

const STATUSES = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Nháp" },
  { value: "ISSUED", label: "Đã phát hành" },
  { value: "SURRENDERED", label: "Đã nộp" },
  { value: "RELEASED", label: "Đã giải phóng" },
];

const AWB_TYPES = [
  { value: "", label: "Tất cả loại" },
  { value: "MASTER", label: "Master AWB" },
  { value: "HOUSE", label: "House AWB" },
];

export default function AirwayBillsPage() {
  const [awbs, setAwbs] = useState<AirwayBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchAWBs();
  }, [page, filterType, filterStatus]);

  const fetchAWBs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (filterType) params.append("awb_type", filterType);
      if (filterStatus) params.append("status", filterStatus);
      if (search) params.append("search", search);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/airway-bills?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setAwbs(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách AWB:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchAWBs();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-800";
      case "ISSUED": return "bg-blue-100 text-blue-800";
      case "SURRENDERED": return "bg-orange-100 text-orange-800";
      case "RELEASED": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "DRAFT": return "Nháp";
      case "ISSUED": return "Đã phát hành";
      case "SURRENDERED": return "Đã nộp";
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
          <h1 className="text-2xl font-bold">Vận đơn Hàng không (AWB)</h1>
          <p className="text-gray-600">Quản lý Master AWB và House AWB</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Tạo AWB mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tổng AWB</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Master AWB</p>
              <p className="text-2xl font-bold text-purple-600">
                {awbs.filter(a => a.awb_type === "MASTER").length}
              </p>
            </div>
            <Plane className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">House AWB</p>
              <p className="text-2xl font-bold text-blue-600">
                {awbs.filter(a => a.awb_type === "HOUSE").length}
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
                {awbs.filter(a => a.status === "DRAFT").length}
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
              placeholder="Tìm kiếm số AWB, người gửi, người nhận..."
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
            {AWB_TYPES.map((type) => (
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
        ) : awbs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Plane className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Chưa có vận đơn hàng không</p>
            <p className="text-sm">Tạo AWB đầu tiên để bắt đầu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Số AWB</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Loại</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Người gửi</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Người nhận</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tuyến đường</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Chuyến bay</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Số kiện</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Trọng lượng</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Trạng thái</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {awbs.map((awb) => (
                  <tr key={awb.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a href={`/fms/airway-bills/${awb.id}`} className="font-medium text-blue-600 hover:underline">
                        {awb.awb_no}
                      </a>
                      <p className="text-xs text-gray-500">{awb.shipment_no}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        awb.awb_type === "MASTER" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {awb.awb_type === "MASTER" ? "Master" : "House"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{awb.shipper_name || "-"}</td>
                    <td className="px-4 py-3 text-sm">{awb.consignee_name || "-"}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{awb.origin_airport} → {awb.destination_airport}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{awb.flight_no || "-"}</p>
                      <p className="text-xs text-gray-500">{awb.flight_date || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{awb.pieces}</td>
                    <td className="px-4 py-3 text-right text-sm">{awb.gross_weight?.toFixed(2)} kg</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(awb.status)}`}>
                        {getStatusLabel(awb.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a href={`/fms/airway-bills/${awb.id}`} className="p-1 hover:bg-gray-100 rounded" title="Xem">
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
        <CreateAWBModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchAWBs();
          }}
        />
      )}
    </div>
  );
}

function CreateAWBModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    awb_no: "",
    awb_type: "HOUSE",
    shipment_id: "",
    shipper_name: "",
    shipper_address: "",
    consignee_name: "",
    consignee_address: "",
    origin_airport: "",
    destination_airport: "",
    carrier_code: "",
    carrier_name: "",
    flight_no: "",
    flight_date: "",
    pieces: 0,
    gross_weight: 0,
    chargeable_weight: 0,
    volume: 0,
    commodity: "",
    special_handling: "",
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/airway-bills`,
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
        setError(data.detail || "Không thể tạo AWB");
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
          <h2 className="text-xl font-bold">Tạo vận đơn hàng không mới</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Số AWB *</label>
              <input
                type="text"
                value={formData.awb_no}
                onChange={(e) => setFormData({ ...formData, awb_no: e.target.value })}
                placeholder="VD: 180-12345678"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loại AWB *</label>
              <select
                value={formData.awb_type}
                onChange={(e) => setFormData({ ...formData, awb_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="MASTER">Master AWB</option>
                <option value="HOUSE">House AWB</option>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Sân bay đi</label>
              <input
                type="text"
                value={formData.origin_airport}
                onChange={(e) => setFormData({ ...formData, origin_airport: e.target.value.toUpperCase() })}
                placeholder="VD: SGN"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sân bay đến</label>
              <input
                type="text"
                value={formData.destination_airport}
                onChange={(e) => setFormData({ ...formData, destination_airport: e.target.value.toUpperCase() })}
                placeholder="VD: LAX"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hãng bay</label>
              <input
                type="text"
                value={formData.carrier_code}
                onChange={(e) => setFormData({ ...formData, carrier_code: e.target.value.toUpperCase() })}
                placeholder="VD: VN"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số chuyến bay</label>
              <input
                type="text"
                value={formData.flight_no}
                onChange={(e) => setFormData({ ...formData, flight_no: e.target.value })}
                placeholder="VD: VN300"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ngày bay</label>
              <input
                type="date"
                value={formData.flight_date}
                onChange={(e) => setFormData({ ...formData, flight_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Số kiện</label>
              <input
                type="number"
                value={formData.pieces}
                onChange={(e) => setFormData({ ...formData, pieces: parseInt(e.target.value) || 0 })}
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
              <label className="block text-sm font-medium mb-1">Trọng lượng tính cước</label>
              <input
                type="number"
                step="0.01"
                value={formData.chargeable_weight}
                onChange={(e) => setFormData({ ...formData, chargeable_weight: parseFloat(e.target.value) || 0 })}
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
              {loading ? "Đang tạo..." : "Tạo AWB"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
