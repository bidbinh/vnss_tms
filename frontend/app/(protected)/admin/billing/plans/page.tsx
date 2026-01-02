"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  ChevronRight,
  Plus,
  Edit2,
  Check,
  X,
  Users,
  HardDrive,
  Percent,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface BillingPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price_per_month: number;
  price_per_year: number;
  monthly_credits: number;
  overage_discount: number;
  grace_percent: number;
  max_users: number;
  max_storage_gb: number;
  features: Record<string, boolean>;
  is_public: boolean;
  is_active: boolean;
  sort_order: number;
}

export default function BillingPlansPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [showInactive]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<BillingPlan[]>(
        `/admin/billing/plans?include_inactive=${showInactive}`
      );
      setPlans(data);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    } finally {
      setLoading(false);
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

  const getPlanColor = (code: string) => {
    switch (code) {
      case "FREE":
        return "border-gray-300 bg-gray-50";
      case "STARTER":
        return "border-blue-300 bg-blue-50";
      case "PRO":
        return "border-green-300 bg-green-50";
      case "ENTERPRISE":
        return "border-purple-300 bg-purple-50";
      default:
        return "border-gray-300 bg-white";
    }
  };

  const getPlanHeaderColor = (code: string) => {
    switch (code) {
      case "FREE":
        return "bg-gray-600";
      case "STARTER":
        return "bg-blue-600";
      case "PRO":
        return "bg-green-600";
      case "ENTERPRISE":
        return "bg-purple-600";
      default:
        return "bg-gray-600";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/admin/billing" className="hover:text-gray-700">
              Billing
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span>Plans</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Plans</h1>
          <p className="text-gray-600">Quản lý các gói cước subscription</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Hiện inactive
          </label>
          <button
            onClick={fetchPlans}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border-2 overflow-hidden ${getPlanColor(
                plan.code
              )} ${!plan.is_active ? "opacity-60" : ""}`}
            >
              {/* Plan Header */}
              <div
                className={`${getPlanHeaderColor(plan.code)} text-white p-4`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  {!plan.is_active && (
                    <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm opacity-90 mt-1">{plan.description}</p>
              </div>

              {/* Pricing */}
              <div className="p-4 border-b border-gray-200">
                <div className="text-3xl font-bold text-gray-900">
                  {plan.price_per_month === 0
                    ? "Miễn phí"
                    : formatCurrency(plan.price_per_month)}
                </div>
                <div className="text-sm text-gray-500">
                  {plan.price_per_month > 0 && "/tháng"}
                </div>
                {plan.price_per_year > 0 && plan.price_per_month > 0 && (
                  <div className="text-sm text-green-600 mt-1">
                    {formatCurrency(plan.price_per_year)}/năm (tiết kiệm{" "}
                    {Math.round(
                      ((plan.price_per_month * 12 - plan.price_per_year) /
                        (plan.price_per_month * 12)) *
                        100
                    )}
                    %)
                  </div>
                )}
              </div>

              {/* Credits */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-2 text-gray-700">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">
                    {plan.monthly_credits === 0
                      ? "Không giới hạn credits"
                      : `${formatNumber(plan.monthly_credits)} credits/tháng`}
                  </span>
                </div>
                {plan.overage_discount > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                    <Percent className="w-4 h-4" />
                    <span>-{plan.overage_discount}% giá overage</span>
                  </div>
                )}
                {plan.grace_percent > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-orange-600">
                    <span className="w-4 h-4 text-center">⚠️</span>
                    <span>+{plan.grace_percent}% grace period</span>
                  </div>
                )}
              </div>

              {/* Limits */}
              <div className="p-4 border-b border-gray-200 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>
                    {plan.max_users === 0
                      ? "Không giới hạn users"
                      : `Tối đa ${plan.max_users} users`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <HardDrive className="w-4 h-4 text-gray-400" />
                  <span>
                    {plan.max_storage_gb === 0
                      ? "Không giới hạn storage"
                      : `${plan.max_storage_gb} GB storage`}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="p-4 space-y-2">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Features:
                </div>
                {Object.entries(plan.features).map(([feature, enabled]) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 text-sm"
                  >
                    {enabled ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={enabled ? "text-gray-700" : "text-gray-400"}>
                      {feature
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
                  <Edit2 className="w-4 h-4" />
                  Chỉnh sửa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">Lưu ý về Billing Plans</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            • <strong>Credits</strong>: Mỗi document type có đơn giá khác nhau
            dựa trên độ phức tạp (200đ - 3,000đ)
          </li>
          <li>
            • <strong>Overage</strong>: Paid plans được giảm giá khi vượt quota,
            FREE plan có grace period
          </li>
          <li>
            • <strong>Grace Period</strong>: FREE plan cho phép vượt thêm{" "}
            {plans.find((p) => p.code === "FREE")?.grace_percent || 10}% trước
            khi block
          </li>
          <li>
            • <strong>Enterprise</strong>: Không giới hạn, hỗ trợ dedicated,
            custom pricing
          </li>
        </ul>
      </div>
    </div>
  );
}
