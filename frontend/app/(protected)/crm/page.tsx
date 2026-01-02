"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  UserPlus,
  Target,
  FileText,
  Phone,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface DashboardSummary {
  accounts: {
    total: number;
    active: number;
  };
  contacts: {
    total: number;
  };
  leads: {
    total: number;
    new: number;
    qualified: number;
  };
  opportunities: {
    open: number;
    pipeline_value: number;
    weighted_pipeline: number;
    won_this_month: number;
    won_value_this_month: number;
  };
  quotes: {
    pending: number;
  };
  activities: {
    overdue: number;
    today: number;
  };
}

interface PipelineStage {
  stage: string;
  count: number;
  total_value: number;
  weighted_value: number;
}

interface RecentActivity {
  id: string;
  activity_type: string;
  subject: string;
  status: string;
  account: {
    id: string;
    name: string;
  } | null;
  created_at: string;
}

const STAGE_LABELS: Record<string, string> = {
  QUALIFICATION: "Đánh giá",
  NEEDS_ANALYSIS: "Phân tích nhu cầu",
  PROPOSAL: "Báo giá",
  NEGOTIATION: "Đàm phán",
  CLOSED_WON: "Thành công",
  CLOSED_LOST: "Thất bại",
};

const STAGE_COLORS: Record<string, string> = {
  QUALIFICATION: "bg-gray-500",
  NEEDS_ANALYSIS: "bg-blue-500",
  PROPOSAL: "bg-yellow-500",
  NEGOTIATION: "bg-orange-500",
  CLOSED_WON: "bg-green-500",
  CLOSED_LOST: "bg-red-500",
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: "Cuộc gọi",
  EMAIL: "Email",
  MEETING: "Cuộc họp",
  TASK: "Công việc",
  NOTE: "Ghi chú",
  VISIT: "Thăm KH",
  DEMO: "Demo",
  FOLLOW_UP: "Theo dõi",
};

export default function CRMDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

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
      const [summaryRes, pipelineRes, activitiesRes] = await Promise.all([
        apiFetch<DashboardSummary>("/crm/dashboard/summary").catch(() => null),
        apiFetch<{ stages: PipelineStage[] }>("/crm/dashboard/pipeline").catch(() => null),
        apiFetch<{ items: RecentActivity[] }>("/crm/dashboard/recent-activities?limit=5").catch(() => null),
      ]);

      if (summaryRes) setSummary(summaryRes);
      if (pipelineRes) setPipeline(pipelineRes.stages.filter(s => !["CLOSED_WON", "CLOSED_LOST"].includes(s.stage)));
      if (activitiesRes) setRecentActivities(activitiesRes.items);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + " tỷ";
    }
    if (value >= 1000000) {
      return (value / 1000000).toFixed(0) + " triệu";
    }
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const formatFullCurrency = (value: number) => {
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
          <h1 className="text-2xl font-bold text-gray-900">CRM Dashboard</h1>
          <p className="text-gray-600 mt-1">Quản lý khách hàng và bán hàng</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/crm/leads/new"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <UserPlus className="w-4 h-4" />
            Lead mới
          </Link>
          <Link
            href="/crm/accounts/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Building2 className="w-4 h-4" />
            Khách hàng mới
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Accounts */}
        <Link href="/crm/accounts" className="block">
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Khách hàng</div>
                <div className="text-2xl font-bold text-gray-900">
                  {summary?.accounts.total || 0}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Đang hoạt động: {summary?.accounts.active || 0}
            </div>
          </div>
        </Link>

        {/* Leads */}
        <Link href="/crm/leads" className="block">
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <UserPlus className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Leads</div>
                <div className="text-2xl font-bold text-gray-900">
                  {summary?.leads.total || 0}
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              <span>Mới: {summary?.leads.new || 0}</span>
              <span>Qualified: {summary?.leads.qualified || 0}</span>
            </div>
          </div>
        </Link>

        {/* Open Opportunities */}
        <Link href="/crm/opportunities" className="block">
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Target className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Cơ hội đang mở</div>
                <div className="text-2xl font-bold text-gray-900">
                  {summary?.opportunities.open || 0}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Giá trị: {formatCurrency(summary?.opportunities.pipeline_value || 0)}
            </div>
          </div>
        </Link>

        {/* Won This Month */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Thành công tháng này</div>
              <div className="text-2xl font-bold text-gray-900">
                {summary?.opportunities.won_this_month || 0}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-green-600 font-medium">
            {formatCurrency(summary?.opportunities.won_value_this_month || 0)}
          </div>
        </div>
      </div>

      {/* Pipeline & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Pipeline */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Sales Pipeline</h2>
            <Link href="/crm/opportunities" className="text-sm text-blue-600 hover:underline">
              Xem tất cả →
            </Link>
          </div>

          {pipeline.length > 0 ? (
            <div className="space-y-4">
              {pipeline.map((stage) => (
                <div key={stage.stage} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${STAGE_COLORS[stage.stage]}`} />
                      <span className="text-sm font-medium text-gray-700">
                        {STAGE_LABELS[stage.stage] || stage.stage}
                      </span>
                      <span className="text-xs text-gray-500">({stage.count})</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(stage.total_value)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`${STAGE_COLORS[stage.stage]} h-2 rounded-full transition-all`}
                      style={{
                        width: `${Math.min(100, (stage.total_value / (summary?.opportunities.pipeline_value || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tổng giá trị Pipeline</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatFullCurrency(summary?.opportunities.pipeline_value || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-600">Giá trị gia quyền</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatFullCurrency(summary?.opportunities.weighted_pipeline || 0)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Chưa có dữ liệu pipeline
            </div>
          )}
        </div>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Cần chú ý</h2>
            <div className="space-y-3">
              {(summary?.activities.overdue || 0) > 0 && (
                <Link
                  href="/crm/activities?status=overdue"
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-700">Hoạt động quá hạn</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    {summary?.activities.overdue}
                  </span>
                </Link>
              )}

              {(summary?.activities.today || 0) > 0 && (
                <Link
                  href="/crm/activities?date=today"
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-700">Hoạt động hôm nay</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">
                    {summary?.activities.today}
                  </span>
                </Link>
              )}

              {(summary?.quotes.pending || 0) > 0 && (
                <Link
                  href="/crm/quotes?status=pending"
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-700">Báo giá chờ xử lý</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {summary?.quotes.pending}
                  </span>
                </Link>
              )}

              {(summary?.activities.overdue || 0) === 0 &&
               (summary?.activities.today || 0) === 0 &&
               (summary?.quotes.pending || 0) === 0 && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Không có mục cần chú ý
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Thao tác nhanh</h2>
            <div className="grid grid-cols-2 gap-2">
              <QuickActionButton
                href="/crm/accounts"
                icon={Building2}
                label="Khách hàng"
                color="bg-blue-50 text-blue-600 hover:bg-blue-100"
              />
              <QuickActionButton
                href="/crm/contacts"
                icon={Users}
                label="Liên hệ"
                color="bg-green-50 text-green-600 hover:bg-green-100"
              />
              <QuickActionButton
                href="/crm/leads"
                icon={UserPlus}
                label="Leads"
                color="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
              />
              <QuickActionButton
                href="/crm/opportunities"
                icon={Target}
                label="Cơ hội"
                color="bg-purple-50 text-purple-600 hover:bg-purple-100"
              />
              <QuickActionButton
                href="/crm/quotes"
                icon={FileText}
                label="Báo giá"
                color="bg-pink-50 text-pink-600 hover:bg-pink-100"
              />
              <QuickActionButton
                href="/crm/activities"
                icon={Phone}
                label="Hoạt động"
                color="bg-orange-50 text-orange-600 hover:bg-orange-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Hoạt động gần đây</h2>
          <Link href="/crm/activities" className="text-sm text-blue-600 hover:underline">
            Xem tất cả →
          </Link>
        </div>

        {recentActivities.length > 0 ? (
          <div className="divide-y">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getActivityTypeColor(activity.activity_type)}`}>
                    {getActivityTypeIcon(activity.activity_type)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{activity.subject}</div>
                    <div className="text-xs text-gray-500">
                      {ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type}
                      {activity.account && ` • ${activity.account.name}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(activity.status)}`}>
                    {activity.status === "COMPLETED" ? "Hoàn thành" :
                     activity.status === "PLANNED" ? "Đã lên kế hoạch" : activity.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Chưa có hoạt động nào
          </div>
        )}
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
      className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${color}`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function getActivityTypeColor(type: string): string {
  const colors: Record<string, string> = {
    CALL: "bg-green-100 text-green-600",
    EMAIL: "bg-blue-100 text-blue-600",
    MEETING: "bg-purple-100 text-purple-600",
    TASK: "bg-yellow-100 text-yellow-600",
    NOTE: "bg-gray-100 text-gray-600",
    VISIT: "bg-orange-100 text-orange-600",
    DEMO: "bg-pink-100 text-pink-600",
    FOLLOW_UP: "bg-indigo-100 text-indigo-600",
  };
  return colors[type] || "bg-gray-100 text-gray-600";
}

function getActivityTypeIcon(type: string) {
  const iconClass = "w-4 h-4";
  switch (type) {
    case "CALL":
      return <Phone className={iconClass} />;
    case "EMAIL":
      return <FileText className={iconClass} />;
    case "MEETING":
      return <Users className={iconClass} />;
    default:
      return <Clock className={iconClass} />;
  }
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-700",
    PLANNED: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}
