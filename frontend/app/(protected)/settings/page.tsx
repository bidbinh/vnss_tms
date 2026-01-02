"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  Save,
  Truck,
  Package,
  Users,
  Users2,
  Calculator,
  Route,
  Anchor,
  Zap,
  type LucideIcon,
  CheckCircle2,
  AlertCircle,
  Building2,
  Crown,
  Palette,
  Clock,
  DollarSign,
  Languages,
  ExternalLink,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// Icon mapping for modules
const MODULE_ICONS: Record<string, LucideIcon> = {
  tms: Truck,
  wms: Package,
  fms: Route,
  pms: Anchor,
  ems: Zap,
  crm: Users2,
  hrm: Users,
  accounting: Calculator,
};

interface ModuleFromAPI {
  id: string;
  name: string;
  fullName: string;
  description: string;
  color: string;
  href: string;
  enabled: boolean;
}

interface TenantInfo {
  id: string;
  name: string;
  code: string;
  type: string;
  logo_url: string | null;
  primary_color: string | null;
  subscription_plan: string;
  subscription_status: string;
  timezone: string;
  currency: string;
  locale: string;
  is_active: boolean;
}

interface TenantMeResponse {
  tenant: TenantInfo;
  modules: ModuleFromAPI[];
  enabled_module_ids: string[];
}

interface UserInfo {
  role: string;
  system_role: string;
}

const TIMEZONES = [
  { value: "Asia/Ho_Chi_Minh", label: "Việt Nam (GMT+7)" },
  { value: "Asia/Bangkok", label: "Thái Lan (GMT+7)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
  { value: "Asia/Tokyo", label: "Nhật Bản (GMT+9)" },
  { value: "America/New_York", label: "New York (GMT-5)" },
  { value: "Europe/London", label: "London (GMT+0)" },
];

const CURRENCIES = [
  { value: "VND", label: "VND - Việt Nam Đồng" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "THB", label: "THB - Thai Baht" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
];

const LOCALES = [
  { value: "vi-VN", label: "Tiếng Việt" },
  { value: "en-US", label: "English (US)" },
  { value: "th-TH", label: "ภาษาไทย" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [modules, setModules] = useState<ModuleFromAPI[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>({ role: "", system_role: "" });

  // Editable settings
  const [editName, setEditName] = useState("");
  const [editTimezone, setEditTimezone] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  const [editLocale, setEditLocale] = useState("");
  const [editPrimaryColor, setEditPrimaryColor] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    // Get user info from localStorage
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserInfo({
          role: user.role || "",
          system_role: user.system_role || "",
        });
      } catch {
        // ignore
      }
    }

    fetchTenantData();
  }, [router]);

  const fetchTenantData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<TenantMeResponse>("/tenant/me");
      setTenant(data.tenant);
      setModules(data.modules);

      // Initialize edit values
      setEditName(data.tenant.name);
      setEditTimezone(data.tenant.timezone);
      setEditCurrency(data.tenant.currency);
      setEditLocale(data.tenant.locale);
      setEditPrimaryColor(data.tenant.primary_color || "#3B82F6");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = userInfo.system_role === "SUPER_ADMIN";
  const isTenantAdmin = userInfo.system_role === "TENANT_ADMIN" || userInfo.role === "ADMIN";
  const canEdit = isSuperAdmin || isTenantAdmin;

  const hasSettingsChanges =
    tenant &&
    (editName !== tenant.name ||
      editTimezone !== tenant.timezone ||
      editCurrency !== tenant.currency ||
      editLocale !== tenant.locale ||
      editPrimaryColor !== (tenant.primary_color || "#3B82F6"));

  const handleSaveSettings = async () => {
    if (!hasSettingsChanges) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch("/tenant/settings", {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          timezone: editTimezone,
          currency: editCurrency,
          locale: editLocale,
          primary_color: editPrimaryColor,
        }),
      });

      // Update local state
      if (tenant) {
        setTenant({
          ...tenant,
          name: editName,
          timezone: editTimezone,
          currency: editCurrency,
          locale: editLocale,
          primary_color: editPrimaryColor,
        });
      }

      setSuccess("Cập nhật thành công!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi cập nhật");
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = modules.filter((m) => m.enabled).length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Settings className="w-6 h-6 text-gray-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cài đặt hệ thống</h1>
            <p className="text-sm text-gray-500">
              {isSuperAdmin
                ? "Super Admin - Quản lý toàn bộ hệ thống"
                : "Quản lý cài đặt doanh nghiệp của bạn"}
            </p>
          </div>
        </div>

        {canEdit && hasSettingsChanges && (
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu thay đổi</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Super Admin Quick Access */}
      {isSuperAdmin && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-purple-600" />
              <div>
                <h3 className="font-semibold text-purple-900">Super Admin Console</h3>
                <p className="text-sm text-purple-700">
                  Quản lý tất cả tenants, bật/tắt modules, thay đổi subscription
                </p>
              </div>
            </div>
            <Link
              href="/admin/tenants"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <span>Mở Console</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Tenant Info Card */}
      {tenant && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: editPrimaryColor + "20" }}
            >
              <Building2 className="w-8 h-8" style={{ color: editPrimaryColor }} />
            </div>
            <div className="flex-1">
              {canEdit ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xl font-bold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                />
              ) : (
                <h2 className="text-xl font-bold text-gray-900">{tenant.name}</h2>
              )}
              <p className="text-sm text-gray-500">
                Mã: {tenant.code} | Loại: {tenant.type}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  tenant.subscription_status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {tenant.subscription_plan}
              </span>
              {!isSuperAdmin && (
                <p className="text-xs text-gray-500 mt-1">
                  Liên hệ 9log.tech để nâng cấp
                </p>
              )}
            </div>
          </div>

          {/* Editable Settings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Clock className="w-3 h-3" />
                Múi giờ
              </label>
              {canEdit ? (
                <select
                  value={editTimezone}
                  onChange={(e) => setEditTimezone(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="font-medium">{tenant.timezone}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <DollarSign className="w-3 h-3" />
                Tiền tệ
              </label>
              {canEdit ? (
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="font-medium">{tenant.currency}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Languages className="w-3 h-3" />
                Ngôn ngữ
              </label>
              {canEdit ? (
                <select
                  value={editLocale}
                  onChange={(e) => setEditLocale(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  {LOCALES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="font-medium">{tenant.locale}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Palette className="w-3 h-3" />
                Màu chủ đạo
              </label>
              {canEdit ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editPrimaryColor}
                    onChange={(e) => setEditPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <span className="text-sm font-mono">{editPrimaryColor}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: tenant.primary_color || "#3B82F6" }}
                  />
                  <span className="font-medium">{tenant.primary_color || "#3B82F6"}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modules Overview (Read-only for Tenant Admin) */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Modules đã kích hoạt</h2>
              <p className="text-sm text-gray-500">
                {isSuperAdmin
                  ? "Quản lý modules trong Super Admin Console"
                  : "Liên hệ 9log.tech để bật thêm modules"}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{enabledCount}</span> / {modules.length}{" "}
              modules đang bật
            </div>
          </div>
        </div>

        {!isSuperAdmin && (
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <p className="text-sm text-blue-700">
              Việc bật/tắt modules do Super Admin (9log.tech) quản lý. Liên hệ{" "}
              <a href="mailto:support@9log.tech" className="underline font-medium">
                support@9log.tech
              </a>{" "}
              để yêu cầu kích hoạt thêm modules.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
          {modules.map((module) => {
            const Icon = MODULE_ICONS[module.id] || Package;

            return (
              <div
                key={module.id}
                className={`p-4 rounded-lg border ${
                  module.enabled
                    ? "bg-white border-green-200"
                    : "bg-gray-50 border-gray-200 opacity-50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`p-2 rounded-lg ${
                      module.enabled ? `bg-gradient-to-r ${module.color}` : "bg-gray-300"
                    } text-white`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{module.name}</h3>
                    <p className="text-xs text-gray-500">{module.fullName}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 truncate">{module.description}</span>
                  {module.enabled ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <span className="text-xs text-gray-400 flex-shrink-0">Chưa bật</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-medium text-gray-800 mb-2">Phân quyền cài đặt</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            <strong>Super Admin (9log.tech):</strong> Bật/tắt modules, thay đổi
            subscription, quản lý tất cả tenants
          </li>
          <li>
            <strong>Tenant Admin:</strong> Thay đổi tên, logo, timezone, tiền tệ, ngôn
            ngữ của công ty
          </li>
          <li>
            <strong>Nhân viên:</strong> Chỉ có thể xem thông tin cài đặt
          </li>
        </ul>
      </div>
    </div>
  );
}
