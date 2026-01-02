"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  Download,
  Eye,
  Calendar,
  Zap,
  Package,
  HardDrive,
  Users,
  ExternalLink,
  Bell,
  Check,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Subscription {
  id: string;
  plan_code: string;
  plan_name: string;
  plan_description: string | null;
  price_per_month: string;
  price_per_year: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  status: string;
  trial_ends_at: string | null;
  credits_used: string;
  credits_limit: number;
  overage_credits: string;
  usage_percent: number;
  is_in_grace: boolean;
  blocked_at: string | null;
  auto_renew: boolean;
  next_billing_date: string | null;
}

interface UsageBreakdownItem {
  transaction_type_code: string;
  transaction_type_name: string;
  count: number;
  credits: string;
  unit_price: string;
}

interface CurrentUsage {
  billing_period: string;
  total_credits_used: string;
  credits_limit: number;
  usage_percent: number;
  overage_credits: string;
  estimated_overage_cost: string;
  breakdown: UsageBreakdownItem[];
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  billing_period: string;
  base_amount: string;
  overage_amount: string;
  tax_amount: string;
  total_amount: string;
  status: string;
  paid_amount: string;
  paid_at: string | null;
  transactions_count: number;
  included_transactions: number;
  overage_transactions: number;
}

interface Alert {
  id: string;
  alert_type: string;
  message: string | null;
  triggered_at: string;
  acknowledged_at: string | null;
}

interface BillingOverview {
  has_subscription: boolean;
  subscription: Subscription | null;
  current_usage: CurrentUsage | null;
  recent_invoices: Invoice[];
  total_pending: string;
  total_overdue: string;
  active_alerts: Alert[];
}

export default function TenantBillingPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingOverview();
  }, []);

  const fetchBillingOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<BillingOverview>("/billing/overview");
      setOverview(data);
    } catch (err: any) {
      console.error("Failed to fetch billing overview:", err);
      setError(err.message || "Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await apiFetch(`/billing/alerts/${alertId}/acknowledge`, {
        method: "PUT",
      });
      fetchBillingOverview();
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatNumber = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700";
      case "TRIAL":
        return "bg-blue-100 text-blue-700";
      case "PAST_DUE":
        return "bg-orange-100 text-orange-700";
      case "CANCELLED":
      case "SUSPENDED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-700";
      case "SENT":
        return "bg-blue-100 text-blue-700";
      case "PARTIAL":
        return "bg-yellow-100 text-yellow-700";
      case "OVERDUE":
        return "bg-red-100 text-red-700";
      case "DRAFT":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: "Đang hoạt động",
      TRIAL: "Dùng thử",
      PAST_DUE: "Quá hạn thanh toán",
      CANCELLED: "Đã hủy",
      SUSPENDED: "Tạm ngưng",
      PAID: "Đã thanh toán",
      SENT: "Chờ thanh toán",
      PARTIAL: "Thanh toán một phần",
      OVERDUE: "Quá hạn",
      DRAFT: "Bản nháp",
    };
    return labels[status] || status;
  };

  const getUsageBarColor = (percent: number) => {
    if (percent >= 100) return "bg-red-500";
    if (percent >= 80) return "bg-orange-500";
    return "bg-green-500";
  };

  const getPlanColor = (code: string) => {
    switch (code) {
      case "FREE":
        return "border-gray-400 bg-gray-50";
      case "STARTER":
        return "border-blue-400 bg-blue-50";
      case "PRO":
        return "border-green-400 bg-green-50";
      case "ENTERPRISE":
        return "border-purple-400 bg-purple-50";
      default:
        return "border-gray-400 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchBillingOverview}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/settings" className="hover:text-gray-700">
              Settings
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span>Billing</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Billing & Subscription
          </h1>
          <p className="text-gray-600">
            Theo dõi subscription, usage và hóa đơn
          </p>
        </div>
        <button
          onClick={fetchBillingOverview}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {overview?.active_alerts && overview.active_alerts.length > 0 && (
        <div className="space-y-2">
          {overview.active_alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border flex items-center justify-between ${
                alert.alert_type.includes("OVERDUE")
                  ? "bg-red-50 border-red-200"
                  : alert.alert_type.includes("QUOTA")
                  ? "bg-orange-50 border-orange-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell
                  className={`w-5 h-5 ${
                    alert.alert_type.includes("OVERDUE")
                      ? "text-red-600"
                      : alert.alert_type.includes("QUOTA")
                      ? "text-orange-600"
                      : "text-blue-600"
                  }`}
                />
                <div>
                  <p
                    className={`font-medium ${
                      alert.alert_type.includes("OVERDUE")
                        ? "text-red-800"
                        : alert.alert_type.includes("QUOTA")
                        ? "text-orange-800"
                        : "text-blue-800"
                    }`}
                  >
                    {alert.message || alert.alert_type.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(alert.triggered_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => acknowledgeAlert(alert.id)}
                className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Đã xem
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No Subscription */}
      {!overview?.has_subscription && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Chưa có gói subscription
          </h3>
          <p className="text-gray-600 mb-4">
            Liên hệ admin để được cấp gói subscription phù hợp
          </p>
          <Link
            href="/billing/plans"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Xem các gói cước
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Subscription Info */}
      {overview?.subscription && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan */}
          <div
            className={`rounded-xl border-2 p-6 ${getPlanColor(
              overview.subscription.plan_code
            )}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {overview.subscription.plan_name}
              </h3>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                  overview.subscription.status
                )}`}
              >
                {getStatusLabel(overview.subscription.status)}
              </span>
            </div>

            {overview.subscription.plan_description && (
              <p className="text-sm text-gray-600 mb-4">
                {overview.subscription.plan_description}
              </p>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Giá/tháng</span>
                <span className="font-medium">
                  {Number(overview.subscription.price_per_month) === 0
                    ? "Miễn phí"
                    : formatCurrency(overview.subscription.price_per_month)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Chu kỳ</span>
                <span className="font-medium">
                  {overview.subscription.billing_cycle === "YEARLY"
                    ? "Hàng năm"
                    : "Hàng tháng"}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Hết hạn</span>
                <span className="font-medium">
                  {formatDate(overview.subscription.current_period_end)}
                </span>
              </div>

              {overview.subscription.trial_ends_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Hết trial</span>
                  <span className="font-medium text-blue-600">
                    {formatDate(overview.subscription.trial_ends_at)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Auto-renew</span>
                <span
                  className={`font-medium ${
                    overview.subscription.auto_renew
                      ? "text-green-600"
                      : "text-gray-600"
                  }`}
                >
                  {overview.subscription.auto_renew ? "Có" : "Không"}
                </span>
              </div>
            </div>
          </div>

          {/* Usage Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Usage tháng này
            </h3>

            {/* Usage Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">Credits đã dùng</span>
                <span className="font-medium">
                  {formatNumber(overview.subscription.credits_used)} /{" "}
                  {overview.subscription.credits_limit === 0
                    ? "∞"
                    : formatNumber(overview.subscription.credits_limit)}
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getUsageBarColor(
                    overview.subscription.usage_percent
                  )} transition-all`}
                  style={{
                    width: `${Math.min(
                      100,
                      overview.subscription.usage_percent
                    )}%`,
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {overview.subscription.usage_percent.toFixed(1)}% sử dụng
              </p>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3 pt-4 border-t">
              {overview.current_usage && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Tổng giao dịch</span>
                    <span className="font-medium">
                      {formatNumber(
                        overview.current_usage.breakdown.reduce(
                          (sum, b) => sum + b.count,
                          0
                        )
                      )}
                    </span>
                  </div>

                  {Number(overview.current_usage.overage_credits) > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-orange-600">Credits vượt</span>
                      <span className="font-medium text-orange-600">
                        {formatNumber(overview.current_usage.overage_credits)}
                      </span>
                    </div>
                  )}

                  {Number(overview.current_usage.estimated_overage_cost) >
                    0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-orange-600">Phí vượt ước tính</span>
                      <span className="font-medium text-orange-600">
                        {formatCurrency(
                          overview.current_usage.estimated_overage_cost
                        )}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {overview.subscription.is_in_grace && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-700">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Đang trong grace period. Vui lòng nâng cấp gói để tiếp tục sử
                  dụng.
                </p>
              </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Thanh toán
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Chờ thanh toán</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(overview.total_pending)}
                </p>
              </div>

              {Number(overview.total_overdue) > 0 && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">Quá hạn</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(overview.total_overdue)}
                  </p>
                </div>
              )}

              <Link
                href="/settings/billing/invoices"
                className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Xem tất cả hóa đơn
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Usage Breakdown */}
      {overview?.current_usage &&
        overview.current_usage.breakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Chi tiết sử dụng - {overview.current_usage.billing_period}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Loại giao dịch
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                      Đơn giá
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                      Số lượng
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                      Credits
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overview.current_usage.breakdown.map((item) => (
                    <tr
                      key={item.transaction_type_code}
                      className="border-b border-gray-100"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.transaction_type_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.transaction_type_code}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium">
                        {formatNumber(item.count)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium">
                        {formatNumber(item.credits)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td
                      colSpan={3}
                      className="py-3 px-4 text-right font-medium text-gray-700"
                    >
                      Tổng cộng
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {formatNumber(
                        overview.current_usage.total_credits_used
                      )}{" "}
                      credits
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

      {/* Recent Invoices */}
      {overview?.recent_invoices && overview.recent_invoices.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Hóa đơn gần đây
            </h3>
            <Link
              href="/settings/billing/invoices"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              Xem tất cả
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Số hóa đơn
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Kỳ
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    Tổng tiền
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    Trạng thái
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    Hạn thanh toán
                  </th>
                </tr>
              </thead>
              <tbody>
                {overview.recent_invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <Link
                        href={`/settings/billing/invoices/${invoice.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {invoice.billing_period}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-medium">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getInvoiceStatusColor(
                          invoice.status
                        )}`}
                      >
                        {getStatusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-600">
                      {formatDate(invoice.due_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">Lưu ý</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            • <strong>Credits</strong>: Mỗi loại giao dịch có đơn giá khác nhau
            dựa trên độ phức tạp
          </li>
          <li>
            • <strong>Overage</strong>: Khi vượt quota, phí vượt sẽ được tính
            vào hóa đơn tháng sau
          </li>
          <li>
            • <strong>Thanh toán</strong>: Liên hệ admin để được hỗ trợ thanh
            toán qua VNPay hoặc chuyển khoản
          </li>
        </ul>
      </div>
    </div>
  );
}
