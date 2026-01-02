"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  ArrowRight,
  FileText,
  DollarSign,
  Building2,
} from "lucide-react";

interface CRMAccount {
  id: string;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface Quotation {
  id: string;
  quotation_no: string;
  version: number;
  status: string;
  customer_name?: string;
  contact_person?: string;
  contact_email?: string;
  shipment_type?: string;
  shipment_mode?: string;
  origin_port?: string;
  origin_port_name?: string;
  destination_port?: string;
  destination_port_name?: string;
  currency_code: string;
  total_buy_cost: number;
  total_sell_price: number;
  profit: number;
  profit_margin: number;
  valid_from?: string;
  valid_to?: string;
  created_at: string;
}

const STATUSES = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Nháp" },
  { value: "SENT", label: "Đã gửi" },
  { value: "ACCEPTED", label: "Đã chấp nhận" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "EXPIRED", label: "Hết hạn" },
  { value: "CONVERTED", label: "Đã chuyển đổi" },
];

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchQuotations();
  }, [page, filterStatus]);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (filterStatus) params.append("status", filterStatus);
      if (search) params.append("search", search);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/quotations?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setQuotations(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách báo giá:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchQuotations();
  };

  const getStatusLabel = (status: string) => {
    const found = STATUSES.find(s => s.value === status);
    return found ? found.label : status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-800";
      case "SENT": return "bg-blue-100 text-blue-800";
      case "ACCEPTED": return "bg-green-100 text-green-800";
      case "REJECTED": return "bg-red-100 text-red-800";
      case "EXPIRED": return "bg-orange-100 text-orange-800";
      case "CONVERTED": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Báo giá</h1>
          <p className="text-gray-600">Quản lý báo giá và bảng giá cước vận chuyển</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Tạo báo giá mới
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tổng báo giá</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Chờ phản hồi</p>
              <p className="text-2xl font-bold text-orange-600">
                {quotations.filter(q => q.status === "SENT").length}
              </p>
            </div>
            <Send className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Đã chấp nhận</p>
              <p className="text-2xl font-bold text-green-600">
                {quotations.filter(q => q.status === "ACCEPTED").length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Đã chuyển đổi</p>
              <p className="text-2xl font-bold text-purple-600">
                {quotations.filter(q => q.status === "CONVERTED").length}
              </p>
            </div>
            <ArrowRight className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã báo giá, khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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

      {/* Quotations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : quotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Không tìm thấy báo giá</p>
            <p className="text-sm">Tạo báo giá đầu tiên để bắt đầu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Mã báo giá</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Khách hàng</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tuyến đường</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Phương thức</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Giá bán</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Lợi nhuận</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Hiệu lực đến</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Trạng thái</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a
                        href={`/fms/quotations/${quotation.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {quotation.quotation_no}
                      </a>
                      <p className="text-xs text-gray-500">Phiên bản {quotation.version}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{quotation.customer_name || "-"}</p>
                      <p className="text-xs text-gray-500">{quotation.contact_person}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">
                        {quotation.origin_port || "-"} → {quotation.destination_port || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">
                        {quotation.shipment_mode === "SEA_FCL" ? "Đường biển FCL" :
                         quotation.shipment_mode === "SEA_LCL" ? "Đường biển LCL" :
                         quotation.shipment_mode === "AIR" ? "Hàng không" :
                         quotation.shipment_mode === "ROAD" ? "Đường bộ" :
                         quotation.shipment_mode?.replace("_", " ") || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(quotation.total_sell_price, quotation.currency_code)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className={`text-sm font-medium ${quotation.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(quotation.profit, quotation.currency_code)}
                      </p>
                      <p className="text-xs text-gray-500">{quotation.profit_margin?.toFixed(1)}%</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{quotation.valid_to || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>
                        {getStatusLabel(quotation.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/fms/quotations/${quotation.id}`}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </a>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Chỉnh sửa">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        {quotation.status === "DRAFT" && (
                          <button className="p-1 hover:bg-gray-100 rounded" title="Gửi báo giá">
                            <Send className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                        {quotation.status === "ACCEPTED" && (
                          <button className="p-1 hover:bg-gray-100 rounded" title="Chuyển thành lô hàng">
                            <ArrowRight className="w-4 h-4 text-green-600" />
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
              Hiển thị {(page - 1) * pageSize + 1} đến {Math.min(page * pageSize, total)} trong tổng số {total} báo giá
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
        <CreateQuotationModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchQuotations();
          }}
        />
      )}
    </div>
  );
}

function CreateQuotationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    customer_id: "",
    customer_name: "",
    customer_email: "",
    shipment_type: "EXPORT",
    shipment_mode: "SEA_FCL",
    origin_port: "",
    origin_port_name: "",
    destination_port: "",
    destination_port_name: "",
    commodity: "",
    currency_code: "USD",
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: "",
    transit_time: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // CRM Customer states
  const [customers, setCustomers] = useState<CRMAccount[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CRMAccount | null>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch customers from CRM
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
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setCustomers(data.items || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách khách hàng:", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch) {
        fetchCustomers(customerSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: CRMAccount) => {
    setSelectedCustomer(customer);
    setFormData({
      ...formData,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_email: customer.email || "",
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/quotations`,
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
        setError(data.detail || "Không thể tạo báo giá");
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
          <h2 className="text-xl font-bold">Tạo báo giá mới</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Customer Selection from CRM */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2" ref={customerDropdownRef}>
              <label className="block text-sm font-medium mb-1">
                <Building2 className="w-4 h-4 inline mr-1" />
                Khách hàng (CRM) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    if (!e.target.value) {
                      setSelectedCustomer(null);
                      setFormData({ ...formData, customer_id: "", customer_name: "", customer_email: "" });
                    }
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tìm kiếm khách hàng..."
                  required
                />
                {showCustomerDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {loadingCustomers ? (
                      <div className="p-3 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="p-3 text-center text-gray-500">
                        Không tìm thấy khách hàng
                      </div>
                    ) : (
                      customers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleSelectCustomer(customer)}
                          className={`p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 ${
                            selectedCustomer?.id === customer.id ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-xs text-gray-500">{customer.code}</p>
                            </div>
                            {customer.email && (
                              <span className="text-xs text-gray-500">{customer.email}</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm">
                  <p className="font-medium">{selectedCustomer.name}</p>
                  <p className="text-gray-600">
                    {selectedCustomer.email && <span>{selectedCustomer.email}</span>}
                    {selectedCustomer.phone && <span> | {selectedCustomer.phone}</span>}
                  </p>
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Email liên hệ</label>
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Loại vận chuyển</label>
              <select
                value={formData.shipment_type}
                onChange={(e) => setFormData({ ...formData, shipment_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EXPORT">Xuất khẩu</option>
                <option value="IMPORT">Nhập khẩu</option>
                <option value="CROSS_TRADE">Chuyển tiếp</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phương thức vận chuyển</label>
              <select
                value={formData.shipment_mode}
                onChange={(e) => setFormData({ ...formData, shipment_mode: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SEA_FCL">Đường biển FCL</option>
                <option value="SEA_LCL">Đường biển LCL</option>
                <option value="AIR">Hàng không</option>
                <option value="ROAD">Đường bộ</option>
              </select>
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Loại tiền tệ</label>
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
              <label className="block text-sm font-medium mb-1">Hiệu lực từ</label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hiệu lực đến</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium mb-1">Thời gian vận chuyển</label>
              <input
                type="text"
                value={formData.transit_time}
                onChange={(e) => setFormData({ ...formData, transit_time: e.target.value })}
                placeholder="VD: 15-20 ngày"
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
              {loading ? "Đang tạo..." : "Tạo báo giá"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
