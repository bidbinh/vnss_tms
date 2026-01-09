"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Users,
  Building,
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface EmployeeStats {
  by_status: {
    active: number;
    probation: number;
    on_leave: number;
    suspended: number;
    resigned: number;
    terminated: number;
  };
  by_type: {
    full_time: number;
    part_time: number;
    contract: number;
    intern: number;
    freelancer: number;
    driver: number;
  };
  total_active: number;
  total_inactive: number;
}

interface ContractStats {
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  expiring_within_30_days: number;
  total_active: number;
}

interface AdvanceStats {
  total_outstanding: number;
  pending_requests: number;
  approved_requests: number;
  employees_with_advance: number;
}

export default function HRMDashboardPage() {
  const router = useRouter();
  const t = useTranslations("hrm.dashboard");
  const [loading, setLoading] = useState(true);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [contractStats, setContractStats] = useState<ContractStats | null>(null);
  const [advanceStats, setAdvanceStats] = useState<AdvanceStats | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<number>(0);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      const [empStatsRes, contractStatsRes, advanceStatsRes] = await Promise.all([
        apiFetch<EmployeeStats>("/hrm/employees/stats").catch(() => null),
        apiFetch<ContractStats>("/hrm/contracts/stats").catch(() => null),
        apiFetch<AdvanceStats>("/hrm/advances/stats").catch(() => null),
      ]);

      if (empStatsRes) setEmployeeStats(empStatsRes);
      if (contractStatsRes) setContractStats(contractStatsRes);
      if (advanceStatsRes) setAdvanceStats(advanceStatsRes);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <Link
          href="/hrm/employees/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <UserPlus className="w-4 h-4" />
          {t("addEmployee")}
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">{t("activeEmployees")}</div>
              <div className="text-2xl font-bold text-gray-900">
                {employeeStats?.total_active || 0}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <span>{t("official")}: {employeeStats?.by_status.active || 0}</span>
            <span>{t("probation")}: {employeeStats?.by_status.probation || 0}</span>
          </div>
        </div>

        {/* Active Contracts */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">{t("activeContracts")}</div>
              <div className="text-2xl font-bold text-gray-900">
                {contractStats?.total_active || 0}
              </div>
            </div>
          </div>
          {(contractStats?.expiring_within_30_days ?? 0) > 0 && (
            <div className="mt-3 flex items-center gap-1 text-xs text-orange-600">
              <AlertCircle className="w-3 h-3" />
              <span>{contractStats?.expiring_within_30_days} {t("expiringContracts")}</span>
            </div>
          )}
        </div>

        {/* Pending Leaves */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">{t("pendingLeaves")}</div>
              <div className="text-2xl font-bold text-gray-900">{pendingLeaves}</div>
            </div>
          </div>
          <Link
            href="/hrm/leaves?status=pending"
            className="mt-3 text-xs text-blue-600 hover:underline"
          >
            {t("viewAll")} →
          </Link>
        </div>

        {/* Outstanding Advances */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">{t("outstandingAdvances")}</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(advanceStats?.total_outstanding || 0)}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            {advanceStats?.employees_with_advance || 0} {t("employeesWithAdvance")}
          </div>
        </div>
      </div>

      {/* Employee Distribution & Contract Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee by Type */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">{t("employeesByType")}</h2>
          <div className="space-y-3">
            {employeeStats && (
              <>
                <DistributionBar
                  label={t("fullTime")}
                  value={employeeStats.by_type.full_time}
                  total={employeeStats.total_active}
                  color="bg-blue-500"
                />
                <DistributionBar
                  label={t("driver")}
                  value={employeeStats.by_type.driver}
                  total={employeeStats.total_active}
                  color="bg-green-500"
                />
                <DistributionBar
                  label={t("partTime")}
                  value={employeeStats.by_type.part_time}
                  total={employeeStats.total_active}
                  color="bg-yellow-500"
                />
                <DistributionBar
                  label={t("contract")}
                  value={employeeStats.by_type.contract}
                  total={employeeStats.total_active}
                  color="bg-purple-500"
                />
                <DistributionBar
                  label={t("intern")}
                  value={employeeStats.by_type.intern}
                  total={employeeStats.total_active}
                  color="bg-pink-500"
                />
                <DistributionBar
                  label={t("freelancer")}
                  value={employeeStats.by_type.freelancer}
                  total={employeeStats.total_active}
                  color="bg-gray-500"
                />
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">{t("quickActions")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionButton
              href="/hrm/employees"
              icon={Users}
              label={t("employeeList")}
              color="bg-blue-50 text-blue-600 hover:bg-blue-100"
            />
            <QuickActionButton
              href="/hrm/departments"
              icon={Building}
              label={t("departments")}
              color="bg-green-50 text-green-600 hover:bg-green-100"
            />
            <QuickActionButton
              href="/hrm/attendance"
              icon={Clock}
              label={t("attendance")}
              color="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
            />
            <QuickActionButton
              href="/hrm/leaves"
              icon={Calendar}
              label={t("leaves")}
              color="bg-purple-50 text-purple-600 hover:bg-purple-100"
            />
            <QuickActionButton
              href="/hrm/payroll"
              icon={DollarSign}
              label={t("payroll")}
              color="bg-pink-50 text-pink-600 hover:bg-pink-100"
            />
            <QuickActionButton
              href="/hrm/jobs"
              icon={Briefcase}
              label={t("recruitment")}
              color="bg-orange-50 text-orange-600 hover:bg-orange-100"
            />
          </div>
        </div>
      </div>

      {/* Pending Approvals & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">{t("pendingApprovals")}</h2>
          <div className="space-y-3">
            {(advanceStats?.pending_requests ?? 0) > 0 && (
              <PendingItem
                label={t("advanceRequests")}
                count={advanceStats?.pending_requests || 0}
                href="/hrm/advances?status=pending"
                color="text-purple-600"
              />
            )}
            {pendingLeaves > 0 && (
              <PendingItem
                label={t("leaveRequests")}
                count={pendingLeaves}
                href="/hrm/leaves?status=pending"
                color="text-yellow-600"
              />
            )}
            {(advanceStats?.pending_requests ?? 0) === 0 && pendingLeaves === 0 && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {t("noPendingRequests")}
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">{t("alerts")}</h2>
          <div className="space-y-3">
            {(contractStats?.expiring_within_30_days ?? 0) > 0 && (
              <AlertItem
                label={t("expiringContractsAlert")}
                count={contractStats?.expiring_within_30_days || 0}
                href="/hrm/contracts?expiring=30"
                type="warning"
              />
            )}
            {(employeeStats?.by_status.suspended ?? 0) > 0 && (
              <AlertItem
                label={t("suspendedEmployees")}
                count={employeeStats?.by_status.suspended || 0}
                href="/hrm/employees?status=suspended"
                type="danger"
              />
            )}
            {(contractStats?.expiring_within_30_days ?? 0) === 0 &&
              (employeeStats?.by_status.suspended ?? 0) === 0 && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {t("noAlerts")}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Employee Movement (if we have data) */}
      <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">{t("employeeMovement")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">-</div>
            <div className="text-sm text-gray-600">{t("newEmployees")}</div>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-2">
              <UserMinus className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">-</div>
            <div className="text-sm text-gray-600">{t("resigned")}</div>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">-</div>
            <div className="text-sm text-gray-600">{t("turnoverRate")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function DistributionBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function QuickActionButton({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${color}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function PendingItem({
  label,
  count,
  href,
  color,
}: {
  label: string;
  count: number;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-lg font-bold ${color}`}>{count}</span>
    </Link>
  );
}

function AlertItem({
  label,
  count,
  href,
  type,
}: {
  label: string;
  count: number;
  href: string;
  type: "warning" | "danger";
}) {
  const bgColor = type === "warning" ? "bg-yellow-50" : "bg-red-50";
  const textColor = type === "warning" ? "text-yellow-600" : "text-red-600";
  const iconColor = type === "warning" ? "text-yellow-500" : "text-red-500";

  return (
    <Link
      href={href}
      className={`flex items-center justify-between p-3 ${bgColor} rounded-lg hover:opacity-80 transition-opacity`}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className={`w-4 h-4 ${iconColor}`} />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className={`text-lg font-bold ${textColor}`}>{count}</span>
    </Link>
  );
}
