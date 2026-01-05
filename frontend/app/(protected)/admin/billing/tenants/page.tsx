"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Search,
  Filter,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface TenantBillingInfo {
  tenant_id: string;
  tenant_name: string;
  tenant_code: string;
  plan_code: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  billing_cycle: string | null;
  credits_used: number;
  credits_limit: number;
  usage_percent: number;
  overage_credits: number;
  is_in_grace: boolean;
  next_billing_date: string | null;
  amount_due: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-700", icon: CheckCircle },
  TRIAL: { label: "Trial", color: "bg-blue-100 text-blue-700", icon: Clock },
  PAST_DUE: { label: "Past Due", color: "bg-red-100 text-red-700", icon: AlertCircle },
  CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-700", icon: XCircle },
  SUSPENDED: { label: "Suspended", color: "bg-orange-100 text-orange-700", icon: AlertCircle },
};

export default function TenantBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantBillingInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [planFilter, setPlanFilter] = useState<string>("");

  useEffect(() => {
    fetchTenants();
  }, [statusFilter, planFilter]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      let url = "/admin/billing/tenants?limit=100";
      if (statusFilter) url += `&status_filter=${statusFilter}`;
      if (planFilter) url += `&plan_filter=${planFilter}`;

      const data = await apiFetch<TenantBillingInfo[]>(url);
      setTenants(data);
    } catch (err) {
      console.error("Failed to fetch tenants:", err);
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

  const filteredTenants = tenants.filter((tenant) =>
    tenant.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.tenant_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUsageBarColor = (percent: number, isInGrace: boolean) => {
    if (isInGrace) return "bg-orange-500";
    if (percent >= 100) return "bg-red-500";
    if (percent >= 80) return "bg-yellow-500";
    return "bg-green-500";
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
            <span>Tenant Billing</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Billing</h1>
          <p className="text-gray-600">
            Quản lý billing và usage của từng tenant
          </p>
        </div>
        <button
          onClick={fetchTenants}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc mã tenant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-[180px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div className="w-[180px]">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả gói</option>
              <option value="FREE">FREE</option>
              <option value="STARTER">STARTER</option>
              <option value="PRO">PRO</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Không tìm thấy tenant nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Tenant
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Plan
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Usage
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Amount Due
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTenants.map((tenant) => {
                  const statusConfig = tenant.subscription_status
                    ? STATUS_CONFIG[tenant.subscription_status]
                    : null;
                  const StatusIcon = statusConfig?.icon || Clock;

                  return (
                    <tr key={tenant.tenant_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {tenant.tenant_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {tenant.tenant_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {tenant.plan_name ? (
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              tenant.plan_code === "FREE"
                                ? "bg-gray-100 text-gray-700"
                                : tenant.plan_code === "STARTER"
                                ? "bg-blue-100 text-blue-700"
                                : tenant.plan_code === "PRO"
                                ? "bg-green-100 text-green-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {tenant.plan_name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">
                            Chưa đăng ký
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {statusConfig ? (
                          <div className="flex items-center gap-1">
                            <StatusIcon className="w-4 h-4" />
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}
                            >
                              {statusConfig.label}
                            </span>
                            {tenant.is_in_grace && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                Grace
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tenant.credits_used > 0 ? (
                          <div className="w-[150px]">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span className="font-medium text-gray-700">
                                {formatNumber(tenant.credits_used)} tokens
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{
                                  width: `${Math.min(100, (tenant.credits_used / 1000) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Chưa có hoạt động</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-medium ${
                            tenant.amount_due > 0 ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {formatCurrency(tenant.amount_due)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/billing/tenants/${tenant.tenant_id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
