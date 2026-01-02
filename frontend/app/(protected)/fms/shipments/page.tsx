"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Ship,
  Plane,
  Truck,
  Eye,
  Edit,
  Trash2,
  FileText,
  Package,
  X,
} from "lucide-react";

interface Shipment {
  id: string;
  shipment_no: string;
  reference_no?: string;
  shipment_type: string;
  shipment_mode: string;
  status: string;
  customer_name?: string;
  shipper_name?: string;
  consignee_name?: string;
  origin_port?: string;
  origin_port_name?: string;
  destination_port?: string;
  destination_port_name?: string;
  etd?: string;
  eta?: string;
  carrier_name?: string;
  vessel_name?: string;
  voyage_no?: string;
  total_packages?: number;
  gross_weight?: number;
  volume_cbm?: number;
  created_at: string;
}

interface CRMAccount {
  id: string;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

const SHIPMENT_TYPES = [
  { value: "", label: "Tất cả loại" },
  { value: "EXPORT", label: "Xuất khẩu" },
  { value: "IMPORT", label: "Nhập khẩu" },
  { value: "CROSS_TRADE", label: "Chuyển tiếp" },
  { value: "DOMESTIC", label: "Nội địa" },
];

const SHIPMENT_MODES = [
  { value: "", label: "Tất cả phương thức" },
  { value: "SEA_FCL", label: "Đường biển FCL" },
  { value: "SEA_LCL", label: "Đường biển LCL" },
  { value: "AIR", label: "Hàng không" },
  { value: "ROAD", label: "Đường bộ" },
  { value: "RAIL", label: "Đường sắt" },
  { value: "MULTIMODAL", label: "Đa phương thức" },
];

const STATUSES = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Nháp" },
  { value: "BOOKED", label: "Đã đặt chỗ" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "IN_TRANSIT", label: "Đang vận chuyển" },
  { value: "ARRIVED", label: "Đã đến" },
  { value: "CUSTOMS_CLEARANCE", label: "Thông quan" },
  { value: "DELIVERED", label: "Đã giao" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchShipments();
  }, [page, filterType, filterMode, filterStatus]);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (filterType) params.append("shipment_type", filterType);
      if (filterMode) params.append("shipment_mode", filterMode);
      if (filterStatus) params.append("status", filterStatus);
      if (search) params.append("search", search);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/shipments?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setShipments(data.items || []);
        setTotal(data.total || 0);
      } else {
        console.error("Lỗi API:", res.status);
        setShipments([]);
        setTotal(0);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách lô hàng:", error);
      setShipments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchShipments();
  };

  const getModeIcon = (mode: string) => {
    if (mode?.startsWith("SEA")) return <Ship className="w-4 h-4 text-blue-600" />;
    if (mode === "AIR") return <Plane className="w-4 h-4 text-purple-600" />;
    return <Truck className="w-4 h-4 text-green-600" />;
  };

  const getStatusLabel = (status: string) => {
    const found = STATUSES.find(s => s.value === status);
    return found ? found.label : status;
  };

  const getModeLabel = (mode: string) => {
    const found = SHIPMENT_MODES.find(m => m.value === mode);
    return found ? found.label : mode?.replace("_", " ");
  };

  const getTypeLabel = (type: string) => {
    const found = SHIPMENT_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-800";
      case "BOOKED": return "bg-blue-100 text-blue-800";
      case "CONFIRMED": return "bg-indigo-100 text-indigo-800";
      case "IN_TRANSIT": return "bg-cyan-100 text-cyan-800";
      case "ARRIVED": return "bg-teal-100 text-teal-800";
      case "CUSTOMS_CLEARANCE": return "bg-orange-100 text-orange-800";
      case "DELIVERED": return "bg-green-100 text-green-800";
      case "COMPLETED": return "bg-emerald-100 text-emerald-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Lô hàng</h1>
          <p className="text-gray-600">Quản lý tất cả các lô hàng vận chuyển</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Tạo lô hàng mới
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã lô hàng, mã tham chiếu, khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-5 h-5" />
            Bộ lọc
          </button>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Tìm kiếm
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SHIPMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SHIPMENT_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
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
        )}
      </div>

      {/* Shipments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : shipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Package className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Không tìm thấy lô hàng</p>
            <p className="text-sm">Tạo lô hàng đầu tiên để bắt đầu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Mã lô hàng</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Loại/Phương thức</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Khách hàng</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tuyến đường</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Hãng vận chuyển</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">ETD/ETA</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Trạng thái</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a
                        href={`/fms/shipments/${shipment.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {shipment.shipment_no}
                      </a>
                      {shipment.reference_no && (
                        <p className="text-xs text-gray-500">{shipment.reference_no}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getModeIcon(shipment.shipment_mode)}
                        <div>
                          <p className="text-sm">{getModeLabel(shipment.shipment_mode)}</p>
                          <p className="text-xs text-gray-500">{getTypeLabel(shipment.shipment_type)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{shipment.customer_name || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">
                        {shipment.origin_port || "-"} → {shipment.destination_port || "-"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {shipment.origin_port_name} → {shipment.destination_port_name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{shipment.carrier_name || "-"}</p>
                      {shipment.vessel_name && (
                        <p className="text-xs text-gray-500">
                          {shipment.vessel_name} / {shipment.voyage_no}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{shipment.etd ? new Date(shipment.etd).toLocaleDateString("vi-VN") : "-"}</p>
                      <p className="text-xs text-gray-500">{shipment.eta ? new Date(shipment.eta).toLocaleDateString("vi-VN") : "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(shipment.status)}`}>
                        {getStatusLabel(shipment.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/fms/shipments/${shipment.id}`}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </a>
                        <button
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Chứng từ"
                        >
                          <FileText className="w-4 h-4 text-gray-600" />
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
              Hiển thị {(page - 1) * pageSize + 1} đến {Math.min(page * pageSize, total)} trong tổng số {total} lô hàng
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
        <CreateShipmentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchShipments();
          }}
        />
      )}
    </div>
  );
}

function CreateShipmentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    shipment_type: "EXPORT",
    shipment_mode: "SEA_FCL",
    customer_id: "",
    customer_name: "",
    shipper_name: "",
    consignee_name: "",
    origin_port: "",
    origin_port_name: "",
    destination_port: "",
    destination_port_name: "",
    etd: "",
    eta: "",
    carrier_name: "",
    vessel_name: "",
    voyage_no: "",
    commodity: "",
    incoterms: "FOB",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // CRM Customers
  const [customers, setCustomers] = useState<CRMAccount[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Fetch customers from CRM
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (search?: string) => {
    try {
      setLoadingCustomers(true);
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams({
        page: "1",
        page_size: "50",
        account_type: "CUSTOMER",
      });
      if (search) params.append("search", search);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/crm/accounts?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setCustomers(data.items || []);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách khách hàng:", error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleCustomerSelect = (customer: CRMAccount) => {
    setFormData({
      ...formData,
      customer_id: customer.id,
      customer_name: customer.name,
    });
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      // Convert date strings to ISO format
      const payload = {
        ...formData,
        etd: formData.etd ? new Date(formData.etd).toISOString() : null,
        eta: formData.eta ? new Date(formData.eta).toISOString() : null,
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/shipments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.detail || "Không thể tạo lô hàng");
      }
    } catch (err) {
      setError("Đã xảy ra lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Tạo lô hàng mới</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
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
            <div>
              <label className="block text-sm font-medium mb-1">Loại lô hàng *</label>
              <select
                value={formData.shipment_type}
                onChange={(e) => setFormData({ ...formData, shipment_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="EXPORT">Xuất khẩu</option>
                <option value="IMPORT">Nhập khẩu</option>
                <option value="CROSS_TRADE">Chuyển tiếp</option>
                <option value="DOMESTIC">Nội địa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phương thức vận chuyển *</label>
              <select
                value={formData.shipment_mode}
                onChange={(e) => setFormData({ ...formData, shipment_mode: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="SEA_FCL">Đường biển FCL</option>
                <option value="SEA_LCL">Đường biển LCL</option>
                <option value="AIR">Hàng không</option>
                <option value="ROAD">Đường bộ</option>
                <option value="RAIL">Đường sắt</option>
                <option value="MULTIMODAL">Đa phương thức</option>
              </select>
            </div>
          </div>

          {/* Customer Selection from CRM */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Khách hàng (từ CRM)</label>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerDropdown(true);
                fetchCustomers(e.target.value);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tìm kiếm khách hàng theo tên, mã..."
            />
            {showCustomerDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {loadingCustomers ? (
                  <div className="p-3 text-center text-gray-500">Đang tải...</div>
                ) : customers.length === 0 ? (
                  <div className="p-3 text-center text-gray-500">Không tìm thấy khách hàng</div>
                ) : (
                  customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleCustomerSelect(customer)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b last:border-b-0"
                    >
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.code} • {customer.phone || customer.email}</p>
                    </button>
                  ))
                )}
              </div>
            )}
            {formData.customer_id && (
              <p className="text-xs text-green-600 mt-1">Đã chọn: {formData.customer_name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Người gửi hàng</label>
              <input
                type="text"
                value={formData.shipper_name}
                onChange={(e) => setFormData({ ...formData, shipper_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tên người gửi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Người nhận hàng</label>
              <input
                type="text"
                value={formData.consignee_name}
                onChange={(e) => setFormData({ ...formData, consignee_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tên người nhận"
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
                placeholder="VD: TP. Hồ Chí Minh"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                placeholder="VD: New York"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hãng vận chuyển</label>
              <input
                type="text"
                value={formData.carrier_name}
                onChange={(e) => setFormData({ ...formData, carrier_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tên hãng"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tên tàu/Chuyến bay</label>
              <input
                type="text"
                value={formData.vessel_name}
                onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tên tàu hoặc số chuyến bay"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số chuyến</label>
              <input
                type="text"
                value={formData.voyage_no}
                onChange={(e) => setFormData({ ...formData, voyage_no: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Số voyage/flight"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hàng hóa</label>
              <input
                type="text"
                value={formData.commodity}
                onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mô tả hàng hóa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Điều kiện giao hàng</label>
              <select
                value={formData.incoterms}
                onChange={(e) => setFormData({ ...formData, incoterms: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EXW">EXW - Giao tại xưởng</option>
                <option value="FCA">FCA - Giao cho người chuyên chở</option>
                <option value="FAS">FAS - Giao dọc mạn tàu</option>
                <option value="FOB">FOB - Giao lên tàu</option>
                <option value="CFR">CFR - Tiền hàng và cước</option>
                <option value="CIF">CIF - Tiền hàng, bảo hiểm, cước</option>
                <option value="CPT">CPT - Cước phí trả tới</option>
                <option value="CIP">CIP - Cước phí và bảo hiểm trả tới</option>
                <option value="DAP">DAP - Giao tại nơi đến</option>
                <option value="DPU">DPU - Giao tại nơi đến đã dỡ hàng</option>
                <option value="DDP">DDP - Giao hàng đã trả thuế</option>
              </select>
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
              {loading ? "Đang tạo..." : "Tạo lô hàng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
