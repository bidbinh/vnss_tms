"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Users,
  Building2,
  CreditCard,
  FileText,
  Bell,
  Package,
  ArrowRight,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface BillingDashboard {
  total_mrr: number;
  total_this_month: number;
  total_overdue: number;
  growth_percent: number;
  total_tenants: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  churned_this_month: number;
  total_credits_this_month: number;
  total_transactions_this_month: number;
  pending_alerts: number;
  top_tenants_by_usage: Array<{
    tenant_id: string;
    tenant_name: string;
    credits: number;
    transactions: number;
  }>;
}

interface TransactionType {
  id: string;
  code: string;
  name: string;
  description: string;
  tier: number;
  unit_price: number;
  document_types: string[];
  is_active: boolean;
}

interface BillingPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price_per_month: number;
  monthly_credits: number;
  overage_discount: number;
  grace_percent: number;
  max_users: number;
  is_active: boolean;
}

export default function BillingDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<BillingDashboard | null>(null);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, typesData, plansData] = await Promise.all([
        apiFetch<BillingDashboard>("/admin/billing/dashboard").catch(() => null),
        apiFetch<TransactionType[]>("/admin/billing/transaction-types").catch(() => []),
        apiFetch<BillingPlan[]>("/admin/billing/plans").catch(() => []),
      ]);

      setDashboard(dashboardData);
      setTransactionTypes(typesData || []);
      setPlans(plansData || []);
    } catch (err) {
      console.error("Failed to fetch billing data:", err);
      setError("Không thể tải dữ liệu billing. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const seedBillingData = async () => {
    setSeeding(true);
    try {
      await apiFetch("/admin/billing/seed-data", { method: "POST" });
      await fetchData();
    } catch (err) {
      console.error("Failed to seed billing data:", err);
      setError("Không thể khởi tạo dữ liệu billing.");
    } finally {
      setSeeding(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show setup screen if no transaction types exist
  if (transactionTypes.length === 0 || plans.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto mt-12 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Khởi tạo Billing System
          </h1>
          <p className="text-gray-600 mb-6">
            Hệ thống billing chưa được thiết lập. Bấm nút bên dưới để tạo các
            transaction types và billing plans mặc định.
          </p>
          <button
            onClick={seedBillingData}
            disabled={seeding}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {seeding ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Đang khởi tạo...
              </>
            ) : (
              <>
                <Package className="w-5 h-5" />
                Khởi tạo Billing Data
              </>
            )}
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
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Billing</h1>
          <p className="text-gray-600">
            Tổng quan doanh thu, sử dụng và quản lý thanh toán
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Doanh thu định kỳ (MRR)</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboard?.total_mrr || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Doanh thu tháng này</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboard?.total_this_month || 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          {dashboard && Number(dashboard.growth_percent) !== 0 && (
            <p
              className={`text-xs mt-2 ${
                Number(dashboard.growth_percent) > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {Number(dashboard.growth_percent) > 0 ? "+" : ""}
              {Number(dashboard.growth_percent).toFixed(1)}% so với tháng trước
            </p>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Số tiền quá hạn</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(dashboard?.total_overdue || 0)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cảnh báo chờ xử lý</p>
              <p className="text-2xl font-bold text-orange-600">
                {dashboard?.pending_alerts || 0}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Bell className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Building2 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng số Tenant</p>
              <p className="text-xl font-bold">{dashboard?.total_tenants || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Đăng ký đang hoạt động</p>
              <p className="text-xl font-bold text-green-600">
                {dashboard?.active_subscriptions || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Đăng ký dùng thử</p>
              <p className="text-xl font-bold text-blue-600">
                {dashboard?.trial_subscriptions || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-red-600 rotate-180" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Hủy đăng ký tháng này</p>
              <p className="text-xl font-bold text-red-600">
                {dashboard?.churned_this_month || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage Stats */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Sử dụng tháng này</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tổng credits sử dụng</span>
              <span className="font-bold text-lg">
                {formatNumber(dashboard?.total_credits_this_month || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tổng giao dịch</span>
              <span className="font-bold text-lg">
                {formatNumber(dashboard?.total_transactions_this_month || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
          <div className="space-y-2">
            <Link
              href="/admin/billing/tenants"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-500" />
                <span>Billing theo Tenant</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
            <Link
              href="/admin/billing/invoices"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-500" />
                <span>Hóa đơn</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
            <Link
              href="/admin/billing/plans"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-500" />
                <span>Gói cước</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        </div>

        {/* Top Tenants */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">
            Tenant sử dụng nhiều nhất
          </h3>
          {dashboard?.top_tenants_by_usage &&
          dashboard.top_tenants_by_usage.length > 0 ? (
            <div className="space-y-3">
              {dashboard.top_tenants_by_usage.slice(0, 5).map((tenant, idx) => (
                <div
                  key={tenant.tenant_id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 w-4">{idx + 1}.</span>
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {tenant.tenant_name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatNumber(tenant.credits)} credits
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Chưa có dữ liệu sử dụng
            </p>
          )}
        </div>
      </div>

      {/* Transaction Types & Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Types */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Loại giao dịch</h3>
            <Link
              href="/admin/billing/transaction-types"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 font-medium text-gray-500">
                    Cấp độ
                  </th>
                  <th className="text-left py-2 font-medium text-gray-500">
                    Tên
                  </th>
                  <th className="text-right py-2 font-medium text-gray-500">
                    Đơn giá
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactionTypes.map((type) => (
                  <tr key={type.id} className="border-b border-gray-50">
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          type.tier === 1
                            ? "bg-gray-100 text-gray-700"
                            : type.tier === 2
                            ? "bg-blue-100 text-blue-700"
                            : type.tier === 3
                            ? "bg-green-100 text-green-700"
                            : type.tier === 4
                            ? "bg-yellow-100 text-yellow-700"
                            : type.tier === 5
                            ? "bg-purple-100 text-purple-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        Cấp {type.tier}
                      </span>
                    </td>
                    <td className="py-2 font-medium">{type.name}</td>
                    <td className="py-2 text-right">
                      {formatCurrency(type.unit_price)}
                      {type.code === "STORAGE" && "/MB"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Billing Plans */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Gói cước</h3>
            <Link
              href="/admin/billing/plans"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              Quản lý <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`p-3 rounded-lg border ${
                  plan.code === "FREE"
                    ? "border-gray-200 bg-gray-50"
                    : plan.code === "STARTER"
                    ? "border-blue-200 bg-blue-50"
                    : plan.code === "PRO"
                    ? "border-green-200 bg-green-50"
                    : "border-purple-200 bg-purple-50"
                }`}
              >
                <div className="font-semibold text-gray-900">{plan.name}</div>
                <div className="text-lg font-bold mt-1">
                  {plan.price_per_month === 0
                    ? "Miễn phí"
                    : formatCurrency(plan.price_per_month)}
                  <span className="text-xs font-normal text-gray-500">/tháng</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {plan.monthly_credits === 0
                    ? "Không giới hạn"
                    : `${formatNumber(plan.monthly_credits)} credits`}
                </div>
                {plan.grace_percent > 0 && (
                  <div className="text-xs text-orange-600 mt-1">
                    +{plan.grace_percent}% gia hạn thêm
                  </div>
                )}
                {plan.overage_discount > 0 && (
                  <div className="text-xs text-green-600 mt-1">
                    -{plan.overage_discount}% giảm giá vượt mức
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
