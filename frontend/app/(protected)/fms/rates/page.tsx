"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Ship,
  Plane,
  Truck,
  Calendar,
} from "lucide-react";

interface FreightRate {
  id: string;
  rate_code: string;
  rate_name?: string;
  rate_type: string;
  is_active: boolean;
  carrier_name?: string;
  agent_name?: string;
  origin_port?: string;
  origin_port_name?: string;
  destination_port?: string;
  destination_port_name?: string;
  transit_time_min?: number;
  transit_time_max?: number;
  currency_code: string;
  rate_20gp?: number;
  rate_40gp?: number;
  rate_40hc?: number;
  rate_per_cbm?: number;
  rate_per_ton?: number;
  min_charge?: number;
  effective_date?: string;
  expiry_date?: string;
  created_at: string;
}

const RATE_TYPES = [
  { value: "", label: "Tất cả loại" },
  { value: "SEA_FCL", label: "Đường biển FCL" },
  { value: "SEA_LCL", label: "Đường biển LCL" },
  { value: "AIR", label: "Hàng không" },
  { value: "ROAD", label: "Đường bộ" },
];

export default function RatesPage() {
  const [rates, setRates] = useState<FreightRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchRates();
  }, [page, filterType]);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (filterType) params.append("rate_type", filterType);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/rates?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setRates(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Lỗi khi tải bảng giá cước:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchRates();
  };

  const getModeIcon = (type: string) => {
    if (type.startsWith("SEA")) return <Ship className="w-4 h-4 text-blue-600" />;
    if (type === "AIR") return <Plane className="w-4 h-4 text-purple-600" />;
    return <Truck className="w-4 h-4 text-green-600" />;
  };

  const getRateTypeLabel = (type: string) => {
    const found = RATE_TYPES.find(t => t.value === type);
    return found ? found.label : type.replace("_", " ");
  };

  const formatCurrency = (amount: number | undefined, currency: string) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bảng giá cước</h1>
          <p className="text-gray-600">Quản lý bảng giá cước vận chuyển</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Thêm giá cước
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tuyến đường, hãng vận chuyển..."
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
            {RATE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
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

      {/* Rates Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : rates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <DollarSign className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Không tìm thấy giá cước</p>
            <p className="text-sm">Thêm giá cước đầu tiên để bắt đầu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Mã giá</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Loại</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tuyến đường</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Hãng/Đại lý</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">20GP</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">40GP</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">40HC</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Transit</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Hiệu lực</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Trạng thái</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rates.map((rate) => (
                  <tr key={rate.id} className={`hover:bg-gray-50 ${isExpired(rate.expiry_date) ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-blue-600">{rate.rate_code}</p>
                      {rate.rate_name && (
                        <p className="text-xs text-gray-500">{rate.rate_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getModeIcon(rate.rate_type)}
                        <span className="text-sm">{getRateTypeLabel(rate.rate_type)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">
                        {rate.origin_port} → {rate.destination_port}
                      </p>
                      <p className="text-xs text-gray-500">
                        {rate.origin_port_name} → {rate.destination_port_name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{rate.carrier_name || rate.agent_name || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(rate.rate_20gp, rate.currency_code)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(rate.rate_40gp, rate.currency_code)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(rate.rate_40hc, rate.currency_code)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">
                        {rate.transit_time_min && rate.transit_time_max
                          ? `${rate.transit_time_min}-${rate.transit_time_max} ngày`
                          : "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{rate.effective_date || "-"}</p>
                      <p className="text-xs text-gray-500">đến {rate.expiry_date || "∞"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {isExpired(rate.expiry_date) ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Hết hạn
                        </span>
                      ) : rate.is_active ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Ngừng
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded" title="Chỉnh sửa">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Xóa">
                          <Trash2 className="w-4 h-4 text-red-600" />
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
              Hiển thị {(page - 1) * pageSize + 1} đến {Math.min(page * pageSize, total)} trong tổng số {total} bảng giá
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Trước
              </button>
              <span className="px-3 py-1">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateRateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchRates();
          }}
        />
      )}
    </div>
  );
}

function CreateRateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    rate_code: "",
    rate_name: "",
    rate_type: "SEA_FCL",
    carrier_name: "",
    agent_name: "",
    origin_port: "",
    origin_port_name: "",
    destination_port: "",
    destination_port_name: "",
    transit_time_min: 0,
    transit_time_max: 0,
    currency_code: "USD",
    // FCL rates
    rate_20gp: 0,
    rate_40gp: 0,
    rate_40hc: 0,
    // LCL rates
    rate_per_cbm: 0,
    rate_per_ton: 0,
    min_charge: 0,
    // Air rates
    rate_min: 0,
    rate_normal: 0,
    rate_45kg: 0,
    rate_100kg: 0,
    rate_300kg: 0,
    rate_500kg: 0,
    effective_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
    remarks: "",
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/rates`,
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
        setError(data.detail || "Không thể tạo giá cước");
      }
    } catch (err) {
      setError("Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const isFCL = formData.rate_type === "SEA_FCL";
  const isLCL = formData.rate_type === "SEA_LCL";
  const isAIR = formData.rate_type === "AIR";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Thêm giá cước mới</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mã giá cước *</label>
              <input
                type="text"
                value={formData.rate_code}
                onChange={(e) => setFormData({ ...formData, rate_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: SEA-VNSGN-USNYC-001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loại cước *</label>
              <select
                value={formData.rate_type}
                onChange={(e) => setFormData({ ...formData, rate_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="SEA_FCL">Đường biển FCL</option>
                <option value="SEA_LCL">Đường biển LCL</option>
                <option value="AIR">Hàng không</option>
                <option value="ROAD">Đường bộ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tên bảng giá</label>
            <input
              type="text"
              value={formData.rate_name}
              onChange={(e) => setFormData({ ...formData, rate_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mô tả bảng giá"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hãng vận chuyển</label>
              <input
                type="text"
                value={formData.carrier_name}
                onChange={(e) => setFormData({ ...formData, carrier_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Maersk, MSC..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Đại lý</label>
              <input
                type="text"
                value={formData.agent_name}
                onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tên đại lý"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mã cảng đi</label>
              <input
                type="text"
                value={formData.origin_port}
                onChange={(e) => setFormData({ ...formData, origin_port: e.target.value.toUpperCase() })}
                placeholder="VD: VNSGN"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium mb-1">Mã cảng đến</label>
              <input
                type="text"
                value={formData.destination_port}
                onChange={(e) => setFormData({ ...formData, destination_port: e.target.value.toUpperCase() })}
                placeholder="VD: USNYC"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {isFCL && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cước 20GP</label>
                <input
                  type="number"
                  value={formData.rate_20gp}
                  onChange={(e) => setFormData({ ...formData, rate_20gp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cước 40GP</label>
                <input
                  type="number"
                  value={formData.rate_40gp}
                  onChange={(e) => setFormData({ ...formData, rate_40gp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cước 40HC</label>
                <input
                  type="number"
                  value={formData.rate_40hc}
                  onChange={(e) => setFormData({ ...formData, rate_40hc: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {isLCL && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cước/CBM</label>
                <input
                  type="number"
                  value={formData.rate_per_cbm}
                  onChange={(e) => setFormData({ ...formData, rate_per_cbm: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cước/Tấn</label>
                <input
                  type="number"
                  value={formData.rate_per_ton}
                  onChange={(e) => setFormData({ ...formData, rate_per_ton: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cước tối thiểu</label>
                <input
                  type="number"
                  value={formData.min_charge}
                  onChange={(e) => setFormData({ ...formData, min_charge: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {isAIR && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cước tối thiểu (M)</label>
                  <input
                    type="number"
                    value={formData.rate_min}
                    onChange={(e) => setFormData({ ...formData, rate_min: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cước thường (N)</label>
                  <input
                    type="number"
                    value={formData.rate_normal}
                    onChange={(e) => setFormData({ ...formData, rate_normal: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cước +45kg</label>
                  <input
                    type="number"
                    value={formData.rate_45kg}
                    onChange={(e) => setFormData({ ...formData, rate_45kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cước +100kg</label>
                  <input
                    type="number"
                    value={formData.rate_100kg}
                    onChange={(e) => setFormData({ ...formData, rate_100kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cước +300kg</label>
                  <input
                    type="number"
                    value={formData.rate_300kg}
                    onChange={(e) => setFormData({ ...formData, rate_300kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cước +500kg</label>
                  <input
                    type="number"
                    value={formData.rate_500kg}
                    onChange={(e) => setFormData({ ...formData, rate_500kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Loại tiền</label>
              <select
                value={formData.currency_code}
                onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="VND">VND</option>
                <option value="EUR">EUR</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Transit tối thiểu (ngày)</label>
              <input
                type="number"
                value={formData.transit_time_min}
                onChange={(e) => setFormData({ ...formData, transit_time_min: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Transit tối đa (ngày)</label>
              <input
                type="number"
                value={formData.transit_time_max}
                onChange={(e) => setFormData({ ...formData, transit_time_max: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ngày hiệu lực *</label>
              <input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ngày hết hạn</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
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
              {loading ? "Đang tạo..." : "Tạo giá cước"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
