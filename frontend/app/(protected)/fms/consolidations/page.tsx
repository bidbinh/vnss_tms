"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Boxes,
  Ship,
  Plane,
  Package,
  Calendar,
  X,
} from "lucide-react";

interface Consolidation {
  id: string;
  consol_no: string;
  consol_type: string;
  status: string;
  origin_port?: string;
  origin_port_name?: string;
  destination_port?: string;
  destination_port_name?: string;
  carrier_name?: string;
  vessel_name?: string;
  voyage_no?: string;
  flight_no?: string;
  etd?: string;
  eta?: string;
  atd?: string;
  ata?: string;
  master_bl_no?: string;
  master_awb_no?: string;
  total_packages: number;
  total_gross_weight: number;
  total_volume: number;
  house_count: number;
  created_at: string;
}

const TYPES = [
  { value: "", label: "Tất cả loại" },
  { value: "LCL", label: "Ghép hàng LCL" },
  { value: "AIR", label: "Ghép hàng Air" },
];

const STATUSES = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "OPEN", label: "Đang mở" },
  { value: "CLOSED", label: "Đã đóng" },
  { value: "DEPARTED", label: "Đã khởi hành" },
  { value: "ARRIVED", label: "Đã đến" },
  { value: "DELIVERED", label: "Đã giao" },
];

function CreateConsolidationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    consol_type: "LCL",
    origin_port: "",
    origin_port_name: "",
    destination_port: "",
    destination_port_name: "",
    carrier_name: "",
    vessel_name: "",
    voyage_no: "",
    flight_no: "",
    etd: "",
    eta: "",
    master_bl_no: "",
    master_awb_no: "",
    remarks: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isLCL = formData.consol_type === "LCL";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/consolidations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            etd: formData.etd || null,
            eta: formData.eta || null,
          }),
        }
      );

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.detail || "Không thể tạo lô ghép");
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
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Tạo lô ghép mới</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Loại ghép hàng *</label>
              <select
                value={formData.consol_type}
                onChange={(e) => setFormData({ ...formData, consol_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LCL">Ghép hàng LCL (Đường biển)</option>
                <option value="AIR">Ghép hàng Air (Hàng không)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mã cảng đi *</label>
              <input
                type="text"
                value={formData.origin_port}
                onChange={(e) => setFormData({ ...formData, origin_port: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: VNSGN"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tên cảng đi</label>
              <input
                type="text"
                value={formData.origin_port_name}
                onChange={(e) => setFormData({ ...formData, origin_port_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="TP. Hồ Chí Minh"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mã cảng đến *</label>
              <input
                type="text"
                value={formData.destination_port}
                onChange={(e) => setFormData({ ...formData, destination_port: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: USNYC"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tên cảng đến</label>
              <input
                type="text"
                value={formData.destination_port_name}
                onChange={(e) => setFormData({ ...formData, destination_port_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="New York"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hãng vận chuyển</label>
              <input
                type="text"
                value={formData.carrier_name}
                onChange={(e) => setFormData({ ...formData, carrier_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={isLCL ? "VD: Maersk, MSC..." : "VD: Vietnam Airlines, Cathay..."}
              />
            </div>
            {isLCL ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Tên tàu</label>
                  <input
                    type="text"
                    value={formData.vessel_name}
                    onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tên tàu"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Số hiệu chuyến bay</label>
                <input
                  type="text"
                  value={formData.flight_no}
                  onChange={(e) => setFormData({ ...formData, flight_no: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: VN123"
                />
              </div>
            )}
          </div>

          {isLCL && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Số chuyến (Voyage)</label>
                <input
                  type="text"
                  value={formData.voyage_no}
                  onChange={(e) => setFormData({ ...formData, voyage_no: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 2512W"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số Master B/L</label>
                <input
                  type="text"
                  value={formData.master_bl_no}
                  onChange={(e) => setFormData({ ...formData, master_bl_no: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Số MBL"
                />
              </div>
            </div>
          )}

          {!isLCL && (
            <div>
              <label className="block text-sm font-medium mb-1">Số Master AWB</label>
              <input
                type="text"
                value={formData.master_awb_no}
                onChange={(e) => setFormData({ ...formData, master_awb_no: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: 172-12345678"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ngày khởi hành dự kiến (ETD)</label>
              <input
                type="date"
                value={formData.etd}
                onChange={(e) => setFormData({ ...formData, etd: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ngày đến dự kiến (ETA)</label>
              <input
                type="date"
                value={formData.eta}
                onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ghi chú thêm..."
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
              {loading ? "Đang tạo..." : "Tạo lô ghép"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ConsolidationsPage() {
  const [consolidations, setConsolidations] = useState<Consolidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchConsolidations();
  }, [page, filterType, filterStatus]);

  const fetchConsolidations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (filterType) params.append("consol_type", filterType);
      if (filterStatus) params.append("status", filterStatus);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/consolidations?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setConsolidations(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách ghép hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "LCL" ? (
      <Ship className="w-4 h-4 text-blue-600" />
    ) : (
      <Plane className="w-4 h-4 text-purple-600" />
    );
  };

  const getStatusLabel = (status: string) => {
    const found = STATUSES.find(s => s.value === status);
    return found ? found.label : status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN": return "bg-green-100 text-green-800";
      case "CLOSED": return "bg-gray-100 text-gray-800";
      case "DEPARTED": return "bg-blue-100 text-blue-800";
      case "ARRIVED": return "bg-teal-100 text-teal-800";
      case "DELIVERED": return "bg-emerald-100 text-emerald-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Ghép hàng</h1>
          <p className="text-gray-600">Quản lý ghép hàng LCL và Air consolidation</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Tạo lô ghép mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Lô đang mở</p>
              <p className="text-2xl font-bold text-green-600">
                {consolidations.filter(c => c.status === "OPEN").length}
              </p>
            </div>
            <Boxes className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Đang vận chuyển</p>
              <p className="text-2xl font-bold text-blue-600">
                {consolidations.filter(c => c.status === "DEPARTED").length}
              </p>
            </div>
            <Ship className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ghép hàng LCL</p>
              <p className="text-2xl font-bold">
                {consolidations.filter(c => c.consol_type === "LCL").length}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ghép hàng Air</p>
              <p className="text-2xl font-bold">
                {consolidations.filter(c => c.consol_type === "AIR").length}
              </p>
            </div>
            <Plane className="w-8 h-8 text-purple-500" />
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
              placeholder="Tìm theo mã lô ghép, tàu, MBL..."
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
        ) : consolidations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Boxes className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Không tìm thấy lô ghép</p>
            <p className="text-sm">Tạo lô ghép đầu tiên để bắt đầu gom hàng</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Mã lô ghép</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Loại</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tuyến đường</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tàu/Chuyến bay</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">MBL/MAWB</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Số HBL</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Trọng lượng</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Thể tích</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">ETD/ETA</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Trạng thái</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {consolidations.map((consol) => (
                  <tr key={consol.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a href={`/fms/consolidations/${consol.id}`} className="font-medium text-blue-600 hover:underline">
                        {consol.consol_no}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(consol.consol_type)}
                        <span className="text-sm">{consol.consol_type === "LCL" ? "LCL" : "Air"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">
                        {consol.origin_port} → {consol.destination_port}
                      </p>
                      <p className="text-xs text-gray-500">
                        {consol.origin_port_name} → {consol.destination_port_name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{consol.vessel_name || consol.flight_no || "-"}</p>
                      <p className="text-xs text-gray-500">{consol.voyage_no}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {consol.master_bl_no || consol.master_awb_no || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-medium">
                        {consol.house_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {consol.total_gross_weight?.toFixed(2) || 0} kg
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {consol.total_volume?.toFixed(3) || 0} cbm
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{consol.etd || "-"}</p>
                      <p className="text-xs text-gray-500">{consol.eta || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(consol.status)}`}>
                        {getStatusLabel(consol.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a href={`/fms/consolidations/${consol.id}`} className="p-1 hover:bg-gray-100 rounded" title="Xem chi tiết">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </a>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Chỉnh sửa">
                          <Edit className="w-4 h-4 text-gray-600" />
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
              Hiển thị {(page - 1) * pageSize + 1} đến {Math.min(page * pageSize, total)} trong tổng số {total} lô ghép
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
        <CreateConsolidationModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchConsolidations();
          }}
        />
      )}
    </div>
  );
}
