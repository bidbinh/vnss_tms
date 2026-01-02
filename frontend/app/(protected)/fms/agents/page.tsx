"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Users,
  Building2,
  Globe,
  Phone,
  Mail,
} from "lucide-react";

interface Agent {
  id: string;
  agent_code: string;
  agent_name: string;
  agent_short_name?: string;
  agent_type?: string;
  is_active: boolean;
  country_name?: string;
  city?: string;
  address?: string;
  contact_person?: string;
  contact_email?: string;
  email?: string;
  phone?: string;
  services_sea: boolean;
  services_air: boolean;
  services_trucking: boolean;
  services_customs: boolean;
  payment_terms?: string;
  credit_limit: number;
  total_shipments: number;
  total_revenue: number;
  created_at: string;
}

const AGENT_TYPES = [
  { value: "", label: "Tất cả loại" },
  { value: "OVERSEAS_AGENT", label: "Đại lý nước ngoài" },
  { value: "CO_LOADER", label: "Co-Loader" },
  { value: "NVOCC", label: "NVOCC" },
  { value: "CUSTOMS_BROKER", label: "Đại lý hải quan" },
  { value: "TRUCKING", label: "Vận tải đường bộ" },
  { value: "WAREHOUSE", label: "Kho bãi" },
  { value: "CARRIER", label: "Hãng vận chuyển" },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [page, filterType]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (filterType) params.append("agent_type", filterType);
      if (search) params.append("search", search);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/agents?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setAgents(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách đại lý:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchAgents();
  };

  const getAgentTypeLabel = (type?: string) => {
    if (!type) return "";
    const found = AGENT_TYPES.find(t => t.value === type);
    return found ? found.label : type.replace("_", " ");
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Đại lý & Đối tác</h1>
          <p className="text-gray-600">Quản lý đại lý giao nhận và đối tác kinh doanh</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Thêm đại lý
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã, tên, quốc gia..."
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
            {AGENT_TYPES.map((type) => (
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

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : agents.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-500">
            <Users className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Không tìm thấy đại lý</p>
            <p className="text-sm">Thêm đại lý đầu tiên để bắt đầu</p>
          </div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{agent.agent_name}</h3>
                    <p className="text-sm text-gray-500">{agent.agent_code}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    agent.is_active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {agent.is_active ? "Hoạt động" : "Ngừng hoạt động"}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {agent.agent_type && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{getAgentTypeLabel(agent.agent_type)}</span>
                  </div>
                )}
                {(agent.city || agent.country_name) && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Globe className="w-4 h-4" />
                    <span>
                      {agent.city}
                      {agent.city && agent.country_name && ", "}
                      {agent.country_name}
                    </span>
                  </div>
                )}
                {agent.contact_person && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{agent.contact_person}</span>
                  </div>
                )}
                {agent.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${agent.email}`} className="hover:text-blue-600">
                      {agent.email}
                    </a>
                  </div>
                )}
                {agent.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${agent.phone}`} className="hover:text-blue-600">
                      {agent.phone}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                <a
                  href={`/fms/agents/${agent.id}`}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Xem chi tiết"
                >
                  <Eye className="w-4 h-4 text-gray-600" />
                </a>
                <button className="p-2 hover:bg-gray-100 rounded" title="Chỉnh sửa">
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded" title="Xóa">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Hiển thị {(page - 1) * pageSize + 1} đến {Math.min(page * pageSize, total)} trong tổng số {total} đại lý
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

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAgentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchAgents();
          }}
        />
      )}
    </div>
  );
}

function CreateAgentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    agent_code: "",
    agent_name: "",
    agent_short_name: "",
    agent_type: "OVERSEAS_AGENT",
    country_code: "",
    country_name: "",
    city: "",
    address: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    email: "",
    phone: "",
    website: "",
    iata_code: "",
    services_sea: false,
    services_air: false,
    services_trucking: false,
    services_customs: false,
    credit_limit: 0,
    payment_terms: "",
    currency_code: "USD",
    notes: "",
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/agents`,
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
        setError(data.detail || "Không thể tạo đại lý");
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
          <h2 className="text-xl font-bold">Thêm đại lý mới</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mã đại lý *</label>
              <input
                type="text"
                value={formData.agent_code}
                onChange={(e) => setFormData({ ...formData, agent_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: AGT001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loại đại lý</label>
              <select
                value={formData.agent_type}
                onChange={(e) => setFormData({ ...formData, agent_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="OVERSEAS_AGENT">Đại lý nước ngoài</option>
                <option value="CO_LOADER">Co-Loader</option>
                <option value="NVOCC">NVOCC</option>
                <option value="CUSTOMS_BROKER">Đại lý hải quan</option>
                <option value="TRUCKING">Vận tải đường bộ</option>
                <option value="WAREHOUSE">Kho bãi</option>
                <option value="CARRIER">Hãng vận chuyển</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tên đại lý *</label>
            <input
              type="text"
              value={formData.agent_name}
              onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên đại lý"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Quốc gia</label>
              <input
                type="text"
                value={formData.country_name}
                onChange={(e) => setFormData({ ...formData, country_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Việt Nam"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Thành phố</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: TP. Hồ Chí Minh"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Địa chỉ</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập địa chỉ đầy đủ"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Người liên hệ</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tên người liên hệ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Điện thoại</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+84 xxx xxx xxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="www.example.com"
              />
            </div>
          </div>

          {/* Services */}
          <div>
            <label className="block text-sm font-medium mb-2">Dịch vụ cung cấp</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.services_sea}
                  onChange={(e) => setFormData({ ...formData, services_sea: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Đường biển</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.services_air}
                  onChange={(e) => setFormData({ ...formData, services_air: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Hàng không</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.services_trucking}
                  onChange={(e) => setFormData({ ...formData, services_trucking: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Đường bộ</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.services_customs}
                  onChange={(e) => setFormData({ ...formData, services_customs: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Hải quan</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hạn mức tín dụng (USD)</label>
              <input
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Điều khoản thanh toán</label>
              <input
                type="text"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: NET 30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              {loading ? "Đang tạo..." : "Tạo đại lý"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
