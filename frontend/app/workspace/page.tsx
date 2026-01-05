"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Briefcase,
  CheckCircle,
  Clock,
  Star,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  Package,
  TrendingUp,
  Users,
  ExternalLink,
  Calendar,
  Truck,
  MapPin,
  FileText,
  BarChart3,
  ClipboardList,
  Network,
  UserPlus,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

// Support both NEXT_PUBLIC_API_URL and NEXT_PUBLIC_API_BASE_URL for compatibility
const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:8000");

interface TenantPermissions {
  modules: string[];
  permissions: Record<string, string[]>;
}

interface ConnectedTenant {
  access_id: string;
  tenant: {
    id: string;
    name: string;
    code: string;
    logo_url?: string;
  };
  role: string;
  tasks_completed: number;
  active_tasks: number;
  rating?: number;
  connected_since: string;
  // Permissions loaded separately
  permissions?: TenantPermissions;
}

interface Invitation {
  id: string;
  tenant: {
    id: string;
    name: string;
    code: string;
    logo_url?: string;
  };
  role: string;
  message?: string;
  created_at: string;
  expires_at: string;
}

interface Task {
  id: string;
  task_type: string;
  task_code?: string;
  title: string;
  status: string;
  tenant: {
    id: string;
    name: string;
  };
  scheduled_start?: string;
  payment_amount?: number;
  assigned_at: string;
}

export default function WorkerDashboard() {
  const { worker, logout } = useWorker();
  const [tenants, setTenants] = useState<ConnectedTenant[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (worker) {
      fetchData();
    }
  }, [worker]);

  const fetchData = async () => {
    try {
      console.log("[Workspace] Fetching data...", API_BASE);
      const [tenantsRes, invitationsRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/workspace/my-tenants`, { credentials: "include" }),
        fetch(`${API_BASE}/api/v1/workspace/my-invitations`, { credentials: "include" }),
        fetch(`${API_BASE}/api/v1/workspace/my-tasks?status=ASSIGNED`, { credentials: "include" }),
      ]);

      console.log("[Workspace] invitationsRes status:", invitationsRes.status);

      if (tenantsRes.ok) {
        const data = await tenantsRes.json();
        const tenantsWithPerms = data.tenants || [];

        // Fetch permissions for each tenant
        for (const t of tenantsWithPerms) {
          try {
            const permRes = await fetch(
              `${API_BASE}/api/v1/worker-tenant/permissions?tenant_id=${t.tenant.id}`,
              { credentials: "include" }
            );
            if (permRes.ok) {
              const permData = await permRes.json();
              t.permissions = permData.permissions;
            }
          } catch (e) {
            console.log("[Workspace] Could not fetch permissions for", t.tenant.name);
          }
        }

        setTenants(tenantsWithPerms);
      }

      if (invitationsRes.ok) {
        const data = await invitationsRes.json();
        console.log("[Workspace] invitations data:", data);
        setInvitations(data.invitations || []);
      } else {
        const errorText = await invitationsRes.text();
        console.error("[Workspace] invitations error:", errorText);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitation = async (invitationId: string, accept: boolean) => {
    try {
      console.log("[Workspace] Responding to invitation:", invitationId, "accept:", accept);
      console.log("[Workspace] API URL:", `${API_BASE}/api/v1/workspace/invitations/${invitationId}/respond`);

      const res = await fetch(
        `${API_BASE}/api/v1/workspace/invitations/${invitationId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ accept }),
        }
      );

      console.log("[Workspace] Response status:", res.status);

      if (res.ok) {
        const data = await res.json();
        console.log("[Workspace] Success:", data);
        fetchData(); // Refresh
      } else {
        const errorText = await res.text();
        console.error("[Workspace] Error response:", res.status, errorText);
        alert(`Lỗi: ${errorText || res.statusText}`);
      }
    } catch (error) {
      console.error("[Workspace] Failed to respond to invitation:", error);
      // More specific error message
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        alert("Không thể kết nối đến server. Vui lòng kiểm tra:\n1. Server backend đang chạy\n2. URL API đúng: " + API_BASE);
      } else {
        alert("Đã xảy ra lỗi: " + (error as Error).message);
      }
    }
  };

  if (!worker) {
    return null;
  }

  // Stats
  const totalTasksCompleted = tenants.reduce((sum, t) => sum + t.tasks_completed, 0);
  const activeTasksCount = tasks.filter((t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">
              9log<span className="text-blue-600">.tech</span>
            </h1>
            <span className="text-sm text-gray-500">Personal Workspace</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                {worker.avatar_url ? (
                  <img
                    src={worker.avatar_url}
                    alt={worker.full_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-blue-600 font-medium text-sm">
                    {worker.full_name?.charAt(0) || "U"}
                  </span>
                )}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-gray-900">{worker.full_name}</div>
                <div className="text-xs text-gray-500">@{worker.username}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/workspace/availability"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Lịch làm việc"
              >
                <Calendar className="w-5 h-5" />
              </Link>
              <Link
                href="/workspace/profile"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <button
                onClick={logout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">
            Xin chào, {worker.full_name}!
          </h2>
          <p className="opacity-90 mb-4">
            Workspace của bạn:{" "}
            <a
              href={`https://${worker.username}.9log.tech`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {worker.username}.9log.tech
            </a>
          </p>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-white/20 rounded-lg p-3">
              <div className="text-2xl font-bold">{tenants.length}</div>
              <div className="text-sm opacity-80">Công ty kết nối</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <div className="text-2xl font-bold">{activeTasksCount}</div>
              <div className="text-sm opacity-80">Việc đang làm</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <div className="text-2xl font-bold">{totalTasksCompleted}</div>
              <div className="text-sm opacity-80">Việc hoàn thành</div>
            </div>
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h3 className="font-semibold text-yellow-800 flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5" />
              Lời mời đang chờ ({invitations.length})
            </h3>
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {inv.tenant.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Mời bạn làm {inv.role}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleInvitation(inv.id, false)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Từ chối
                    </button>
                    <button
                      onClick={() => handleInvitation(inv.id, true)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Chấp nhận
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Tasks */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Công việc của tôi
              </h3>
              <Link
                href="/workspace/tasks"
                className="text-sm text-blue-600 hover:underline"
              >
                Xem tất cả
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Chưa có công việc nào</p>
                <p className="text-sm">
                  Kết nối với công ty để bắt đầu nhận việc
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              task.status === "ASSIGNED"
                                ? "bg-yellow-100 text-yellow-700"
                                : task.status === "IN_PROGRESS"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {task.status === "ASSIGNED"
                              ? "Chờ xử lý"
                              : task.status === "IN_PROGRESS"
                              ? "Đang thực hiện"
                              : "Hoàn thành"}
                          </span>
                          {task.task_code && (
                            <span className="text-xs text-gray-500">
                              #{task.task_code}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 mt-1">
                          {task.title}
                        </h4>
                        <div className="text-sm text-gray-500 mt-1">
                          {task.tenant.name}
                        </div>
                      </div>
                      {task.payment_amount && (
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            {new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(task.payment_amount)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connected Companies */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Công ty kết nối ({tenants.length})
              </h3>
            </div>

            {tenants.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Chưa kết nối với công ty nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tenants.map((t) => (
                  <div key={t.access_id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {t.tenant.logo_url ? (
                          <img
                            src={t.tenant.logo_url}
                            alt={t.tenant.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {t.tenant.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t.role === "DRIVER" ? "🚛 Tài xế" :
                           t.role === "DISPATCHER" ? "📋 Điều phối" :
                           t.role === "MANAGER" ? "👔 Quản lý" :
                           t.role === "ACCOUNTANT" ? "💰 Kế toán" : t.role}
                        </div>
                      </div>
                      <a
                        href={`https://${t.tenant.code}.9log.tech`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Quick Access Links to consolidated workspace TMS */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {t.permissions?.permissions?.orders?.includes("view") && (
                        <Link
                          href="/workspace/tms/orders"
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded-lg flex items-center gap-1"
                        >
                          <Package className="w-3 h-3" />
                          Đơn hàng
                        </Link>
                      )}
                      {t.permissions?.permissions?.drivers?.includes("view") && (
                        <Link
                          href="/workspace/tms/drivers"
                          className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs rounded-lg flex items-center gap-1"
                        >
                          <Users className="w-3 h-3" />
                          Tài xế
                        </Link>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {t.tasks_completed} việc
                      </span>
                      {t.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          {t.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main TMS Dashboard Button */}
        {tenants.some(t =>
          t.permissions?.permissions?.orders?.includes("view") ||
          t.permissions?.permissions?.orders?.includes("assign")
        ) && (
          <Link
            href="/workspace/tms"
            className="block bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 hover:from-blue-700 hover:to-blue-800 transition-all group overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Truck className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">TMS Dashboard</div>
                  <div className="text-blue-100">
                    Quản lý đơn hàng từ {tenants.filter(t =>
                      t.permissions?.permissions?.orders?.includes("view")
                    ).length} công ty
                  </div>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </div>
          </Link>
        )}

        {/* Network Section - Worker to Worker Connection */}
        <Link
          href="/workspace/network"
          className="block bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg p-6 hover:from-green-700 hover:to-emerald-700 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">Mạng lưới của tôi</div>
                <div className="text-green-100">
                  Kết nối với tài xế và điều phối viên khác
                </div>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </div>
        </Link>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/workspace/network"
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-green-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200">
                <UserPlus className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Mạng lưới</div>
                <div className="text-sm text-gray-500">Tài xế & Điều phối</div>
              </div>
            </div>
          </Link>
          <Link
            href="/workspace/tms/orders"
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Đơn hàng</div>
                <div className="text-sm text-gray-500">Xem tất cả đơn hàng</div>
              </div>
            </div>
          </Link>
          <Link
            href="/workspace/availability"
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Lịch làm việc</div>
                <div className="text-sm text-gray-500">Khai báo thời gian rảnh</div>
              </div>
            </div>
          </Link>
          <Link
            href="/workspace/profile"
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Hồ sơ</div>
                <div className="text-sm text-gray-500">Chỉnh sửa thông tin</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                {worker.avatar_url ? (
                  <img
                    src={worker.avatar_url}
                    alt={worker.full_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-blue-600 font-bold text-2xl">
                    {worker.full_name?.charAt(0) || "U"}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {worker.full_name}
                </h3>
                <p className="text-gray-500">@{worker.username}</p>
                {worker.job_title && (
                  <p className="text-sm text-gray-600 mt-1">{worker.job_title}</p>
                )}
              </div>
            </div>
            <Link
              href="/workspace/profile"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
            >
              Chỉnh sửa hồ sơ
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {tenants.length}
              </div>
              <div className="text-sm text-gray-500">Công ty</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {totalTasksCompleted}
              </div>
              <div className="text-sm text-gray-500">Việc hoàn thành</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {activeTasksCount}
              </div>
              <div className="text-sm text-gray-500">Đang xử lý</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">
                {tenants.length > 0 &&
                tenants.some((t) => t.rating)
                  ? (
                      tenants.filter((t) => t.rating).reduce((sum, t) => sum + (t.rating || 0), 0) /
                      tenants.filter((t) => t.rating).length
                    ).toFixed(1)
                  : "-"}
              </div>
              <div className="text-sm text-gray-500">Đánh giá TB</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
