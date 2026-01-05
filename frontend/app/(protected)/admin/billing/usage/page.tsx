"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Coins,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart,
  Receipt,
  Info,
  Activity,
  Package,
  HardDrive,
  Gift,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface UserBilling {
  user_id: string;
  user_name: string;
  user_role: string;
  total_actions: number;
  total_tokens: number;
}

interface BillingData {
  period: {
    month: number;
    year: number;
    start_date: string;
    end_date: string;
  };
  // NEW: Order-based billing
  orders: {
    total_completed: number;
    free_quota: number;
    billable: number;
    price_per_order_vnd: number;
    cost_vnd: number;
  };
  // NEW: Storage billing
  storage: {
    used_gb: number;
    used_mb: number;
    free_quota_gb: number;
    billable_gb: number;
    price_per_gb_vnd: number;
    cost_vnd: number;
  };
  summary: {
    total_users: number;
    total_actions: number;
    total_tokens: number;
    base_fee_vnd: number;
    order_cost_vnd: number;
    storage_cost_vnd: number;
    total_cost_vnd: number;
  };
  users: UserBilling[];
  by_module: Record<string, { actions: number; tokens: number }>;
  by_action: Record<string, { count: number; tokens: number }>;
  pricing_config: {
    order_price_vnd: number;
    free_orders_per_month: number;
    free_storage_gb: number;
    storage_price_per_gb_vnd: number;
    role_estimates?: Record<string, { monthly_vnd: number }>;
  };
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  HR_MANAGER: "Trưởng nhân sự",
  HR: "Nhân sự",
  ACCOUNTANT: "Kế toán",
  DISPATCHER: "Điều phối",
  STAFF: "Nhân viên",
  DRIVER: "Tài xế",
  USER: "Người dùng",
};

const MODULE_LABELS: Record<string, string> = {
  tms: "Vận tải",
  hrm: "Nhân sự",
  crm: "Khách hàng",
  wms: "Kho bãi",
  fms: "Tài chính",
  system: "Hệ thống",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  BULK_CREATE: "Tạo hàng loạt",
  BULK_UPDATE: "Cập nhật hàng loạt",
  BULK_DELETE: "Xóa hàng loạt",
};

export default function BillingUsagePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Month/Year selection - use Vietnam timezone
  const getVNDate = () => {
    const now = new Date();
    // Convert to Vietnam timezone string then parse
    const vnDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
    const [y, m] = vnDateStr.split("-").map(Number);
    return { month: m, year: y };
  };
  const vnNow = getVNDate();
  const [month, setMonth] = useState(vnNow.month);
  const [year, setYear] = useState(vnNow.year);

  const fetchBilling = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log(`[Billing] Fetching for month=${month}, year=${year}`);
      const res = await apiFetch<BillingData>(`/activity-logs/billing?month=${month}&year=${year}`);
      console.log("[Billing] Response:", res);
      setData(res);
    } catch (err: unknown) {
      console.error("[Billing] Error:", err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Không thể tải dữ liệu billing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, [month, year]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const getMonthName = (m: number) => {
    const months = [
      "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
      "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
      "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
    ];
    return months[m - 1];
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/billing"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Quay lại Billing"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-600" />
              Chi phí theo hoạt động
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Dữ liệu từ Activity Logs - cơ sở tính Billing
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
          <button
            onClick={prevMonth}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-[140px] justify-center">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="font-medium">
              {getMonthName(month)} {year}
            </span>
          </div>
          <button
            onClick={nextMonth}
            className="p-1 hover:bg-gray-100 rounded"
            disabled={month === vnNow.month && year === vnNow.year}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* NEW: Order-based Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Orders */}
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{formatNumber(data.orders?.total_completed || 0)}</div>
              <div className="text-sm text-gray-500">Đơn hoàn thành</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {data.orders?.billable || 0} đơn tính phí (sau {data.orders?.free_quota || 50} FREE)
          </div>
        </div>

        {/* Order Cost */}
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Receipt className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(data.orders?.cost_vnd || 0)}
              </div>
              <div className="text-sm text-gray-500">Phí đơn hàng</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {formatCurrency(data.orders?.price_per_order_vnd || 3000)}/đơn
          </div>
        </div>

        {/* Storage */}
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <HardDrive className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {(data.storage?.used_mb || 0).toFixed(1)} MB
              </div>
              <div className="text-sm text-gray-500">Lưu trữ đã dùng</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Miễn phí: {data.storage?.free_quota_gb || 1} GB
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl border p-4 shadow-sm text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {formatCurrency(data.summary?.total_cost_vnd || 0)}
              </div>
              <div className="text-sm opacity-80">Tổng chi phí</div>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Pricing Info - Per Order Model */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Gift className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-green-800 mb-2">
              Mô hình tính phí: Trả theo đơn hàng thành công
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-lg p-3 border">
                <div className="font-medium text-gray-700">📦 Đơn hàng</div>
                <ul className="text-gray-600 mt-1 space-y-0.5">
                  <li>• <span className="text-green-600 font-medium">{data.orders?.free_quota || 50} đơn FREE</span>/tháng</li>
                  <li>• Sau đó: {formatCurrency(data.orders?.price_per_order_vnd || 3000)}/đơn</li>
                </ul>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="font-medium text-gray-700">💾 Lưu trữ</div>
                <ul className="text-gray-600 mt-1 space-y-0.5">
                  <li>• <span className="text-green-600 font-medium">{data.storage?.free_quota_gb || 1} GB FREE</span></li>
                  <li>• Sau đó: {formatCurrency(data.storage?.price_per_gb_vnd || 5000)}/GB/tháng</li>
                </ul>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="font-medium text-gray-700">👥 Người dùng</div>
                <ul className="text-gray-600 mt-1 space-y-0.5">
                  <li>• <span className="text-green-600 font-medium">Không giới hạn</span></li>
                  <li>• Thêm bao nhiêu cũng được!</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">Chi tiết chi phí tháng này</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Phí đơn hàng ({data.orders?.billable || 0} đơn × {formatCurrency(data.orders?.price_per_order_vnd || 3000)})</span>
            <span className="font-medium">{formatCurrency(data.orders?.cost_vnd || 0)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Phí lưu trữ ({(data.storage?.billable_gb || 0).toFixed(3)} GB × {formatCurrency(data.storage?.price_per_gb_vnd || 5000)})</span>
            <span className="font-medium">{formatCurrency(data.storage?.cost_vnd || 0)}</span>
          </div>
          {(data.summary?.base_fee_vnd || 0) > 0 && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Phí nền</span>
              <span className="font-medium">{formatCurrency(data.summary?.base_fee_vnd || 0)}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 font-bold text-lg">
            <span>Tổng cộng</span>
            <span className="text-green-600">{formatCurrency(data.summary?.total_cost_vnd || 0)}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users Table - 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              Hoạt động theo người dùng
            </h2>
            <Link
              href="/admin/activity-logs"
              className="text-sm text-blue-600 hover:underline"
            >
              Xem Activity Logs →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3 font-medium">Người dùng</th>
                  <th className="text-left p-3 font-medium">Vai trò</th>
                  <th className="text-right p-3 font-medium">Thao tác</th>
                  <th className="text-right p-3 font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      Không có dữ liệu sử dụng trong tháng này
                    </td>
                  </tr>
                ) : (
                  data.users.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{user.user_name}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {ROLE_LABELS[user.user_role] || user.user_role}
                        </span>
                      </td>
                      <td className="p-3 text-right">{formatNumber(user.total_actions)}</td>
                      <td className="p-3 text-right">{formatNumber(user.total_tokens)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {data.users.length > 0 && (
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td className="p-3" colSpan={2}>Tổng cộng ({data.summary?.total_users || 0} người)</td>
                    <td className="p-3 text-right">
                      {formatNumber(data.summary?.total_actions || 0)}
                    </td>
                    <td className="p-3 text-right">
                      {formatNumber(data.summary?.total_tokens || 0)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="p-3 bg-gray-50 text-xs text-gray-500 border-t">
            💡 Với mô hình mới, chi phí tính theo đơn hàng hoàn thành - không tính theo người dùng
          </div>
        </div>

        {/* Right sidebar - Charts */}
        <div className="space-y-6">
          {/* By Module */}
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-gray-400" />
              Theo module
            </h3>
            <div className="space-y-3">
              {Object.entries(data.by_module).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Chưa có dữ liệu</p>
              ) : (
                Object.entries(data.by_module).map(([module, stats]) => (
                  <div key={module} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          module === "tms"
                            ? "bg-blue-500"
                            : module === "hrm"
                            ? "bg-green-500"
                            : module === "crm"
                            ? "bg-purple-500"
                            : "bg-gray-500"
                        }`}
                      />
                      <span className="text-sm">{MODULE_LABELS[module] || module}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatNumber(stats.tokens)} tokens</div>
                      <div className="text-xs text-gray-400">{formatNumber(stats.actions)} thao tác</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* By Action */}
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              Theo loại thao tác
            </h3>
            <div className="space-y-3">
              {Object.entries(data.by_action).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Chưa có dữ liệu</p>
              ) : (
                Object.entries(data.by_action).map(([action, stats]) => (
                  <div key={action} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          action === "CREATE"
                            ? "bg-green-100 text-green-700"
                            : action === "UPDATE"
                            ? "bg-blue-100 text-blue-700"
                            : action === "DELETE"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ACTION_LABELS[action] || action}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatNumber(stats.tokens)} tokens</div>
                      <div className="text-xs text-gray-400">{formatNumber(stats.count)} lần</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Role Pricing Reference */}
          {data.pricing_config.role_estimates && (
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-gray-400" />
                Ước tính theo vai trò
              </h3>
              <div className="space-y-2 text-sm">
                {Object.entries(data.pricing_config.role_estimates).map(([role, estimate]) => (
                  <div key={role} className="flex items-center justify-between">
                    <span className="text-gray-600">{ROLE_LABELS[role] || role}</span>
                    <span className="font-medium">{formatCurrency(estimate.monthly_vnd)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                * Ước tính dựa trên mức sử dụng trung bình
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
