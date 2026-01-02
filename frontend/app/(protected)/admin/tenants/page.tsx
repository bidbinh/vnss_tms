"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  Settings,
  Users,
  Package,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Save,
  Truck,
  Route,
  Anchor,
  Zap,
  Users2,
  Calculator,
  Crown,
  AlertCircle,
  PiggyBank,
  FolderKanban,
  Workflow,
  FolderOpen,
  Factory,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface TenantItem {
  id: string;
  name: string;
  code: string;
  type: string;
  subscription_plan: string;
  subscription_status: string;
  is_active: boolean;
  enabled_modules: string[];
  user_count: number;
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  tms: Truck,
  wms: Package,
  fms: Route,
  pms: Anchor,
  ems: Zap,
  mes: Factory,
  crm: Users2,
  hrm: Users,
  accounting: Calculator,
  controlling: PiggyBank,
  project: FolderKanban,
  workflow: Workflow,
  dms: FolderOpen,
};

const MODULE_NAMES: Record<string, string> = {
  tms: "TMS",
  wms: "WMS",
  fms: "FMS",
  pms: "PMS",
  ems: "EMS",
  mes: "MES",
  crm: "CRM",
  hrm: "HRM",
  accounting: "Accounting",
  controlling: "Controlling",
  project: "Project",
  workflow: "Workflow",
  dms: "DMS",
};

const ALL_MODULES = ["tms", "wms", "fms", "pms", "ems", "mes", "crm", "hrm", "accounting", "controlling", "project", "workflow", "dms"];

const SUBSCRIPTION_PLANS = ["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"];

export default function SuperAdminTenantsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [editingModules, setEditingModules] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userSystemRole, setUserSystemRole] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    // Check system_role
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserSystemRole(user.system_role || "");
        if (user.system_role !== "SUPER_ADMIN") {
          setError("Bạn không có quyền truy cập trang này");
          setLoading(false);
          return;
        }
      } catch {
        // ignore
      }
    }

    fetchTenants();
  }, [router]);

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<TenantItem[]>("/tenant/all");
      setTenants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (tenantId: string) => {
    if (expandedTenant === tenantId) {
      setExpandedTenant(null);
    } else {
      setExpandedTenant(tenantId);
      // Always initialize/refresh editing modules when expanding
      const tenant = tenants.find((t) => t.id === tenantId);
      if (tenant) {
        setEditingModules((prev) => ({
          ...prev,
          [tenantId]: prev[tenantId] || [...tenant.enabled_modules],
        }));
      }
    }
  };

  const toggleModule = (tenantId: string, moduleId: string, currentTenantModules: string[]) => {
    if (moduleId === "tms") return; // TMS always enabled

    setEditingModules((prev) => {
      // Get current modules from editingModules or use passed in tenant modules
      const current = prev[tenantId] || [...currentTenantModules];

      if (current.includes(moduleId)) {
        return { ...prev, [tenantId]: current.filter((m) => m !== moduleId) };
      } else {
        return { ...prev, [tenantId]: [...current, moduleId] };
      }
    });
  };

  const saveModules = async (tenantId: string) => {
    setSaving(tenantId);
    try {
      const modules = editingModules[tenantId] || ["tms"];
      await apiFetch(`/tenant/${tenantId}/modules`, {
        method: "PUT",
        body: JSON.stringify({ enabled_modules: modules }),
      });

      // Update local state
      setTenants((prev) =>
        prev.map((t) =>
          t.id === tenantId ? { ...t, enabled_modules: modules } : t
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi khi lưu");
    } finally {
      setSaving(null);
    }
  };

  const toggleTenantStatus = async (tenantId: string, isActive: boolean) => {
    try {
      await apiFetch(`/tenant/${tenantId}/status?is_active=${isActive}`, {
        method: "PUT",
      });
      setTenants((prev) =>
        prev.map((t) => (t.id === tenantId ? { ...t, is_active: isActive } : t))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi");
    }
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && userSystemRole !== "SUPER_ADMIN") {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg text-center">
          <Crown className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold mb-2">Không có quyền truy cập</h2>
          <p>Trang này chỉ dành cho Super Admin (9log.tech)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Crown className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Super Admin Console</h1>
            <p className="text-sm text-gray-500">
              Quản lý tất cả tenants trên nền tảng 9log.tech
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          Tạo Tenant mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng Tenants</p>
              <p className="text-2xl font-bold">{tenants.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Đang hoạt động</p>
              <p className="text-2xl font-bold">
                {tenants.filter((t) => t.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng Users</p>
              <p className="text-2xl font-bold">
                {tenants.reduce((sum, t) => sum + t.user_count, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Gói Enterprise</p>
              <p className="text-2xl font-bold">
                {tenants.filter((t) => t.subscription_plan === "ENTERPRISE").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tenant theo tên hoặc mã..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Tenant List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="font-semibold">Danh sách Tenants ({filteredTenants.length})</h2>
        </div>

        <div className="divide-y">
          {filteredTenants.map((tenant) => {
            const isExpanded = expandedTenant === tenant.id;
            const currentModules = editingModules[tenant.id] || tenant.enabled_modules;
            const hasChanges =
              JSON.stringify([...currentModules].sort()) !==
              JSON.stringify([...tenant.enabled_modules].sort());

            return (
              <div key={tenant.id} className="bg-white">
                {/* Tenant Row */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(tenant.id)}
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
                      <span className="text-sm text-gray-500">({tenant.code})</span>
                      {!tenant.is_active && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          Đã vô hiệu
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>{tenant.type}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {tenant.user_count} users
                      </span>
                      <span>•</span>
                      <span>{tenant.enabled_modules.length} modules</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        tenant.subscription_plan === "ENTERPRISE"
                          ? "bg-purple-100 text-purple-700"
                          : tenant.subscription_plan === "PROFESSIONAL"
                          ? "bg-blue-100 text-blue-700"
                          : tenant.subscription_plan === "STARTER"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {tenant.subscription_plan}
                    </span>

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-gray-50 border-t">
                    {/* Module Management */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-700">Quản lý Modules</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveModules(tenant.id);
                          }}
                          disabled={saving === tenant.id || !hasChanges}
                          className={`flex items-center gap-1 px-3 py-1 text-sm rounded-lg ${
                            hasChanges
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          } disabled:opacity-50`}
                        >
                          {saving === tenant.id ? (
                            "Đang lưu..."
                          ) : (
                            <>
                              <Save className="w-3 h-3" />
                              {hasChanges ? "Lưu thay đổi" : "Đã lưu"}
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {ALL_MODULES.map((moduleId) => {
                          const Icon = MODULE_ICONS[moduleId] || Package;
                          const isEnabled = currentModules.includes(moduleId);
                          const isTMS = moduleId === "tms";

                          return (
                            <button
                              key={moduleId}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleModule(tenant.id, moduleId, tenant.enabled_modules);
                              }}
                              disabled={isTMS}
                              className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${
                                isEnabled
                                  ? "bg-green-50 border-green-200 text-green-700"
                                  : "bg-white border-gray-200 text-gray-400"
                              } ${isTMS ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-100"}`}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {MODULE_NAMES[moduleId]}
                              </span>
                              {isTMS && (
                                <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">
                                  Bắt buộc
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-3 pt-4 border-t">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTenantStatus(tenant.id, !tenant.is_active);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          tenant.is_active
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        {tenant.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
                      </button>

                      <select
                        value={tenant.subscription_plan}
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                          try {
                            await apiFetch(
                              `/tenant/${tenant.id}/subscription?plan=${e.target.value}`,
                              { method: "PUT" }
                            );
                            setTenants((prev) =>
                              prev.map((t) =>
                                t.id === tenant.id
                                  ? { ...t, subscription_plan: e.target.value }
                                  : t
                              )
                            );
                          } catch (err) {
                            alert("Lỗi khi cập nhật");
                          }
                        }}
                        className="px-3 py-2 border rounded-lg text-sm"
                      >
                        {SUBSCRIPTION_PLANS.map((plan) => (
                          <option key={plan} value={plan}>
                            {plan}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <CreateTenantModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchTenants();
          }}
        />
      )}
    </div>
  );
}

// Create Tenant Modal Component (with Admin user creation)
function CreateTenantModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  // Tenant info
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("CARRIER");
  const [plan, setPlan] = useState("FREE");
  const [modules, setModules] = useState<string[]>(["tms"]);

  // Admin user info
  const [adminEmail, setAdminEmail] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPhone, setAdminPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{subdomain: string; email: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use self-register API which creates both tenant and admin
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1$/, "") || "http://localhost:8000"}/api/v1/tenant/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: name,
          subdomain: code,
          company_type: type,
          admin_email: adminEmail,
          admin_password: adminPassword,
          admin_full_name: adminFullName,
          admin_phone: adminPhone || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Lỗi khi tạo tenant");
      }

      const data = await res.json();

      // Now update modules and plan if needed (using super admin APIs)
      if (modules.length > 1 || plan !== "FREE") {
        const token = localStorage.getItem("access_token");

        // Update modules
        if (modules.length > 1) {
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1$/, "") || "http://localhost:8000"}/api/v1/tenant/${data.tenant_id}/modules`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ enabled_modules: modules }),
          });
        }

        // Update subscription plan
        if (plan !== "FREE") {
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1$/, "") || "http://localhost:8000"}/api/v1/tenant/${data.tenant_id}/subscription?plan=${plan}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      setSuccess({ subdomain: data.subdomain, email: adminEmail });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi tạo tenant");
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Tạo thành công!</h2>
          <p className="text-gray-600 mb-4">Tenant và Admin đã được tạo:</p>

          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 mb-4">
            <p><span className="text-gray-500">Subdomain:</span> <strong>{success.subdomain}.9log.tech</strong></p>
            <p><span className="text-gray-500">Admin email:</span> <strong>{success.email}</strong></p>
            <p><span className="text-gray-500">Password:</span> <strong>{adminPassword}</strong></p>
          </div>

          <p className="text-sm text-orange-600 mb-4">
            Hãy lưu lại thông tin đăng nhập và gửi cho khách hàng!
          </p>

          <button
            onClick={() => { onCreated(); }}
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tạo Tenant + Admin mới</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Company Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-600 uppercase">Thông tin công ty</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên công ty *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="VD: Công ty Vận tải ABC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subdomain * (không dấu, không khoảng trắng)
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  required
                  className="flex-1 px-3 py-2 border rounded-l-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="abc-logistics"
                />
                <span className="px-3 py-2 bg-gray-100 border border-l-0 rounded-r-lg text-gray-500 text-sm">
                  .9log.tech
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại hình</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="CARRIER">Vận tải</option>
                  <option value="SHIPPER">Chủ hàng</option>
                  <option value="FORWARDER">Giao nhận</option>
                  <option value="3PL">3PL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gói đăng ký</label>
                <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  {SUBSCRIPTION_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Admin Account */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-600 uppercase">Tài khoản Admin</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
                <input
                  type="text"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SĐT</label>
                <input
                  type="text"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0912345678"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="admin@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu * (ít nhất 6 ký tự)</label>
              <input
                type="text"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Mật khẩu cho admin"
              />
            </div>
          </div>

          {/* Modules */}
          <div className="pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">Modules được bật</label>
            <div className="grid grid-cols-4 gap-2">
              {ALL_MODULES.map((moduleId) => {
                const Icon = MODULE_ICONS[moduleId] || Package;
                const isEnabled = modules.includes(moduleId);
                const isTMS = moduleId === "tms";

                return (
                  <button
                    key={moduleId}
                    type="button"
                    onClick={() => {
                      if (isTMS) return;
                      if (isEnabled) {
                        setModules(modules.filter((m) => m !== moduleId));
                      } else {
                        setModules([...modules, moduleId]);
                      }
                    }}
                    disabled={isTMS}
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-xs ${
                      isEnabled ? "bg-green-50 border-green-200 text-green-700" : "bg-white border-gray-200 text-gray-400"
                    } ${isTMS ? "opacity-60" : ""}`}
                  >
                    <Icon className="w-4 h-4" />
                    {MODULE_NAMES[moduleId]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !name || !code || !adminEmail || !adminPassword || !adminFullName}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "Đang tạo..." : "Tạo Tenant + Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
