"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import {
  Activity,
  Search,
  Filter,
  User,
  Calendar,
  Clock,
  Globe,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  Zap,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  Edit,
  Trash2,
  Plus,
  HelpCircle,
  CreditCard,
} from "lucide-react";
import Link from "next/link";

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  module: string;
  resource_type: string;
  resource_id?: string;
  resource_code?: string;
  endpoint: string;
  method: string;
  request_summary?: Record<string, any>;
  response_status: number;
  success: boolean;
  ip_address?: string;
  cost_tokens: number;
  created_at: string;
}

interface ActivitySummary {
  total_actions: number;
  total_tokens: number;
  by_action: Record<string, number>;
  by_module: Record<string, number>;
  by_user: Array<{
    user_id: string;
    user_name: string;
    count: number;
    tokens: number;
  }>;
}

interface ListResponse {
  items: ActivityLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CREATE: <Plus className="w-3 h-3" />,
  UPDATE: <Edit className="w-3 h-3" />,
  DELETE: <Trash2 className="w-3 h-3" />,
};

const MODULE_LABELS: Record<string, string> = {
  tms: "Vận tải",
  hrm: "Nhân sự",
  crm: "Khách hàng",
  wms: "Kho bãi",
  fms: "Forwarding",
  system: "Hệ thống",
  accounting: "Kế toán",
};

const RESOURCE_LABELS: Record<string, string> = {
  orders: "Đơn hàng",
  trips: "Chuyến xe",
  drivers: "Tài xế",
  vehicles: "Phương tiện",
  employees: "Nhân viên",
  customers: "Khách hàng",
  fuel_logs: "Nhật ký xăng dầu",
  rates: "Bảng giá",
  sites: "Điểm giao nhận",
  locations: "Địa điểm",
  accounts: "Tài khoản CRM",
  leads: "Khách tiềm năng",
  users: "Người dùng",
  payroll: "Bảng lương",
  attendance: "Chấm công",
  departments: "Phòng ban",
  positions: "Chức vụ",
  namecards: "Danh thiếp",
};

const FIELD_LABELS: Record<string, string> = {
  full_name: "Họ tên",
  employee_code: "Mã NV",
  status: "Trạng thái",
  phone: "Điện thoại",
  email: "Email",
  department_id: "Phòng ban",
  position_id: "Chức vụ",
  order_code: "Mã đơn",
  customer_name: "Khách hàng",
  driver_id: "Tài xế",
  vehicle_id: "Phương tiện",
  total_amount: "Tổng tiền",
  plate_no: "Biển số",
  name: "Tên",
  code: "Mã",
  address: "Địa chỉ",
  notes: "Ghi chú",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  DISPATCHER: "bg-green-100 text-green-700",
  ACCOUNTANT: "bg-yellow-100 text-yellow-700",
  HR: "bg-pink-100 text-pink-700",
  DRIVER: "bg-gray-100 text-gray-700",
};

// Token cost explanation
const TOKEN_COSTS: Record<string, Record<string, Record<string, number>>> = {
  tms: {
    orders: { CREATE: 10, UPDATE: 5, DELETE: 15 },
    trips: { CREATE: 8, UPDATE: 4, DELETE: 12 },
    drivers: { CREATE: 5, UPDATE: 3, DELETE: 20 },
    vehicles: { CREATE: 5, UPDATE: 3, DELETE: 20 },
    customers: { CREATE: 5, UPDATE: 3, DELETE: 10 },
    fuel_logs: { CREATE: 3, UPDATE: 2, DELETE: 5 },
  },
  hrm: {
    employees: { CREATE: 8, UPDATE: 4, DELETE: 25 },
    attendance: { CREATE: 2, UPDATE: 1, DELETE: 3 },
    payroll: { CREATE: 15, UPDATE: 8, DELETE: 20 },
    departments: { CREATE: 5, UPDATE: 3, DELETE: 10 },
  },
  crm: {
    accounts: { CREATE: 5, UPDATE: 3, DELETE: 10 },
    leads: { CREATE: 3, UPDATE: 2, DELETE: 5 },
  },
  system: {
    users: { CREATE: 10, UPDATE: 5, DELETE: 30 },
  },
  default: {
    default: { CREATE: 5, UPDATE: 3, DELETE: 10 },
  },
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [showTokenInfo, setShowTokenInfo] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Available filter options
  const [modules, setModules] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchSummary();
    fetchModules();
  }, [page, moduleFilter, actionFilter, userFilter, startDate, endDate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());
      if (search) params.set("search", search);
      if (moduleFilter) params.set("module", moduleFilter);
      if (actionFilter) params.set("action", actionFilter);
      if (userFilter) params.set("user_id", userFilter);
      if (startDate) params.set("start_date", new Date(startDate).toISOString());
      if (endDate) params.set("end_date", new Date(endDate).toISOString());

      const data = await apiFetch<ListResponse>(`/activity-logs?${params.toString()}`);
      setLogs(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (moduleFilter) params.set("module", moduleFilter);
      if (startDate) params.set("start_date", new Date(startDate).toISOString());
      if (endDate) params.set("end_date", new Date(endDate).toISOString());

      const data = await apiFetch<ActivitySummary>(`/activity-logs/summary?${params.toString()}`);
      setSummary(data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  };

  const fetchModules = async () => {
    try {
      const data = await apiFetch<{ modules: string[] }>("/activity-logs/modules");
      setModules(data.modules);
    } catch (error) {
      console.error("Failed to fetch modules:", error);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  // Format date to Vietnam timezone
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    // Use Asia/Ho_Chi_Minh timezone for proper display
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  const getFieldLabel = (field: string) => {
    return FIELD_LABELS[field] || field;
  };

  const getResourceLabel = (resourceType: string) => {
    return RESOURCE_LABELS[resourceType] || resourceType;
  };

  const toggleExpand = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Nhật ký hoạt động
          </h1>
          <p className="text-gray-600 mt-1">
            Theo dõi hoạt động người dùng và chi phí token
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/billing"
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
            title="Xem chi phí Billing"
          >
            <CreditCard className="w-4 h-4" />
            Billing
          </Link>
          <button
            onClick={() => setShowTokenInfo(!showTokenInfo)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100"
            title="Giải thích cách tính token"
          >
            <HelpCircle className="w-4 h-4" />
            Token là gì?
          </button>
          <button
            onClick={() => {
              fetchLogs();
              fetchSummary();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
        </div>
      </div>

      {/* Token Info Panel */}
      {showTokenInfo && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-2">Cách tính Token</h3>
              <p className="text-sm text-yellow-700 mb-3">
                Token là đơn vị đo lường chi phí sử dụng hệ thống. Mỗi thao tác sẽ tiêu tốn một số token nhất định,
                tùy thuộc vào module và loại thao tác:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white rounded p-3">
                  <h4 className="font-medium text-gray-900 mb-2">📦 Vận tải (TMS)</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Đơn hàng: Tạo 10 | Sửa 5 | Xóa 15</li>
                    <li>• Chuyến xe: Tạo 8 | Sửa 4 | Xóa 12</li>
                    <li>• Tài xế/Xe: Tạo 5 | Sửa 3 | Xóa 20</li>
                  </ul>
                </div>
                <div className="bg-white rounded p-3">
                  <h4 className="font-medium text-gray-900 mb-2">👥 Nhân sự (HRM)</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Nhân viên: Tạo 8 | Sửa 4 | Xóa 25</li>
                    <li>• Bảng lương: Tạo 15 | Sửa 8 | Xóa 20</li>
                    <li>• Chấm công: Tạo 2 | Sửa 1 | Xóa 3</li>
                  </ul>
                </div>
                <div className="bg-white rounded p-3">
                  <h4 className="font-medium text-gray-900 mb-2">⚙️ Mặc định</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Tạo mới: 5 tokens</li>
                    <li>• Cập nhật: 3 tokens</li>
                    <li>• Xóa: 10 tokens</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-yellow-600 mt-3">
                * Token được tính để phục vụ mục đích billing và audit. Xóa dữ liệu quan trọng sẽ tốn nhiều token hơn.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng hoạt động</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.total_actions.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Zap className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng tokens</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.total_tokens.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tạo mới</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(summary.by_action["CREATE"] || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Người dùng tích cực</p>
                <p className="text-lg font-bold text-gray-900 truncate">
                  {summary.by_user[0]?.user_name || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên user, endpoint, resource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Module Filter */}
          <select
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả module</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {MODULE_LABELS[m] || m}
              </option>
            ))}
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả thao tác</option>
            <option value="CREATE">Tạo mới</option>
            <option value="UPDATE">Cập nhật</option>
            <option value="DELETE">Xóa</option>
          </select>

          {/* Toggle more filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? "Ẩn" : "Thêm"} bộ lọc
          </button>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Từ ngày</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Đến ngày</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearch("");
                  setModuleFilter("");
                  setActionFilter("");
                  setUserFilter("");
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-600">
        Tổng: <span className="font-medium">{total.toLocaleString()}</span> hoạt động
      </div>

      {/* Activity Log List */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Đang tải...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Không có hoạt động nào
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  {/* Action badge */}
                  <div
                    className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${
                      ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {ACTION_ICONS[log.action]}
                    {ACTION_LABELS[log.action] || log.action}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">
                        {log.user_name}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-xs rounded ${
                          ROLE_COLORS[log.user_role] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {log.user_role}
                      </span>
                      <span className="text-gray-500">đã</span>
                      <span className="text-gray-700">
                        {ACTION_LABELS[log.action]?.toLowerCase() || log.action.toLowerCase()}
                      </span>
                      <span className="font-medium text-blue-600">
                        {getResourceLabel(log.resource_type)}
                      </span>
                      {log.resource_code && (
                        <span className="text-gray-500">({log.resource_code})</span>
                      )}
                    </div>

                    {/* Details row */}
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(log.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {MODULE_LABELS[log.module] || log.module}
                      </span>
                      {log.ip_address && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {log.ip_address}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-yellow-600">
                        <Zap className="w-3 h-3" />
                        {log.cost_tokens} tokens
                      </span>
                    </div>

                    {/* Request summary - Collapsible for UPDATE actions */}
                    {log.request_summary && Object.keys(log.request_summary).length > 0 && (
                      <div className="mt-2">
                        {log.action === "UPDATE" && log.request_summary.changed_fields ? (
                          <div className="text-xs bg-blue-50 rounded p-2 border border-blue-100">
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="flex items-center gap-1 text-blue-700 font-medium hover:text-blue-800"
                            >
                              {expandedLog === log.id ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                              Đã thay đổi {log.request_summary.changed_fields.length} trường
                            </button>
                            {expandedLog === log.id && (
                              <div className="mt-2 space-y-1 pl-4 border-l-2 border-blue-200">
                                {log.request_summary.changed_fields.map((field: string) => {
                                  // Check if we have detailed changes (old/new values)
                                  const changes = log.request_summary?.changes?.[field];
                                  const oldValue = changes?.old;
                                  const newValue = changes?.new;

                                  return (
                                    <div key={field} className="text-gray-600">
                                      <span className="font-medium text-gray-700">
                                        {getFieldLabel(field)}:
                                      </span>{" "}
                                      {changes ? (
                                        <>
                                          <span className="text-red-500 line-through">
                                            {oldValue || "(trống)"}
                                          </span>
                                          <span className="mx-1">→</span>
                                          <span className="text-green-600 font-medium">
                                            {newValue || "(trống)"}
                                          </span>
                                        </>
                                      ) : (
                                        <span className="text-gray-400">(đã thay đổi)</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : log.action === "DELETE" ? (
                          <div className="text-xs text-red-600 bg-red-50 rounded p-2 border border-red-100">
                            <span className="font-medium flex items-center gap-1">
                              <Trash2 className="w-3 h-3" />
                              Đã xóa/hủy
                            </span>
                            {log.resource_id && (
                              <span className="text-gray-500 ml-1">
                                (ID: {log.resource_id.slice(0, 8)}...)
                              </span>
                            )}
                            {log.request_summary?.reason && (
                              <div className="mt-1 text-gray-600">
                                Lý do: {log.request_summary.reason}
                              </div>
                            )}
                            {log.request_summary?.cancel_reason && (
                              <div className="mt-1 text-gray-600">
                                Lý do hủy: {log.request_summary.cancel_reason}
                              </div>
                            )}
                          </div>
                        ) : log.action === "CREATE" ? (
                          <div className="text-xs bg-green-50 rounded p-2 border border-green-100">
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="flex items-center gap-1 text-green-700 font-medium hover:text-green-800"
                            >
                              {expandedLog === log.id ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                              Xem chi tiết dữ liệu tạo mới
                            </button>
                            {expandedLog === log.id && (
                              <div className="mt-2 space-y-1 pl-4 border-l-2 border-green-200">
                                {Object.entries(log.request_summary)
                                  .filter(([key]) => key !== "changed_fields")
                                  .map(([key, value]) => (
                                    <div key={key} className="text-gray-600">
                                      <span className="font-medium text-gray-700">
                                        {getFieldLabel(key)}:
                                      </span>{" "}
                                      <span className="text-green-600">
                                        {String(value).slice(0, 50)}
                                        {String(value).length > 50 && "..."}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                            {Object.entries(log.request_summary)
                              .slice(0, 3)
                              .map(([key, value]) => (
                                <span key={key} className="mr-3">
                                  {getFieldLabel(key)}: {String(value).slice(0, 30)}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <div className="text-right text-sm">
                    <div className="text-gray-500 text-xs">
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Trang {page} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Users by Tokens */}
      {summary && summary.by_user.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top người dùng theo tokens
          </h3>
          <div className="space-y-3">
            {summary.by_user.map((user, index) => (
              <div key={user.user_id} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{user.user_name}</div>
                  <div className="text-sm text-gray-500">
                    {user.count} hoạt động
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-yellow-600">
                    {user.tokens.toLocaleString()} tokens
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
