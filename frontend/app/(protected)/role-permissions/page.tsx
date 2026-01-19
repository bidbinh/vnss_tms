"use client";

import { useState, useEffect, Fragment } from "react";
import { apiFetch, PermissionDeniedError } from "@/lib/api";
import AccessDenied from "@/components/ui/AccessDenied";
import { ChevronDown, ChevronRight, Shield, Users, Save, RotateCcw } from "lucide-react";

interface ActionInfo {
  action: string;
  label: string;
  description: string;
}

interface ResourceInfo {
  resource: string;
  label: string;
  icon: string;
  order: number;
  available_actions: ActionInfo[];
}

interface AppModuleInfo {
  code: string;
  label: string;
  icon: string;
  order: number;
  resources: ResourceInfo[];
}

interface RolePermission {
  role: string;
  label: string;
  permissions: Record<string, string[]>;
  modules: string[];  // App module access
  description: string | null;
  is_custom: boolean;
}

export default function RolePermissionsPage() {
  const [grouped, setGrouped] = useState<AppModuleInfo[]>([]);
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Fetch modules and roles
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setAccessDenied(false);
      try {
        const [modulesData, rolesData] = await Promise.all([
          apiFetch<{ modules: any[]; grouped: AppModuleInfo[] }>("/role-permissions/modules"),
          apiFetch<{ roles: RolePermission[] }>("/role-permissions/roles"),
        ]);

        setGrouped(modulesData.grouped);
        setRoles(rolesData.roles);

        // Expand all modules by default
        const expanded: Record<string, boolean> = {};
        modulesData.grouped.forEach((m) => {
          expanded[m.code] = true;
        });
        setExpandedModules(expanded);

        // Select first role by default
        if (rolesData.roles.length > 0) {
          const firstRole = rolesData.roles[0];
          setSelectedRole(firstRole.role);
          setPermissions(firstRole.permissions || {});
          setEnabledModules(firstRole.modules || []);
        }
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          setAccessDenied(true);
        } else {
          setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle role selection
  const handleRoleSelect = (role: string) => {
    if (hasChanges) {
      if (!confirm("Bạn có thay đổi chưa lưu. Bạn có muốn tiếp tục?")) {
        return;
      }
    }
    setSelectedRole(role);
    const roleData = roles.find((r) => r.role === role);
    setPermissions(roleData?.permissions || {});
    setEnabledModules(roleData?.modules || []);
    setHasChanges(false);
    setSuccessMessage(null);
  };

  // Toggle module access (top-level)
  const toggleModuleAccess = (moduleCode: string) => {
    setEnabledModules((prev) => {
      if (prev.includes(moduleCode)) {
        return prev.filter((m) => m !== moduleCode);
      } else {
        return [...prev, moduleCode];
      }
    });
    setHasChanges(true);
    setSuccessMessage(null);
  };

  // Check if a resource's parent module is enabled
  const isModuleEnabled = (moduleCode: string) => {
    // Empty array means all modules enabled (legacy)
    if (enabledModules.length === 0) return true;
    return enabledModules.includes(moduleCode);
  };

  // Toggle permission
  const togglePermission = (resource: string, action: string) => {
    setPermissions((prev) => {
      const resourcePerms = prev[resource] || [];
      const newResourcePerms = resourcePerms.includes(action)
        ? resourcePerms.filter((a) => a !== action)
        : [...resourcePerms, action];

      const newPermissions = {
        ...prev,
        [resource]: newResourcePerms,
      };

      // Remove empty resources
      if (newResourcePerms.length === 0) {
        delete newPermissions[resource];
      }

      return newPermissions;
    });
    setHasChanges(true);
    setSuccessMessage(null);
  };

  // Toggle all actions for a resource
  const toggleAllResource = (resource: string, resourceInfo: ResourceInfo) => {
    const currentPerms = permissions[resource] || [];
    const allActions = resourceInfo.available_actions.map((a) => a.action);
    const hasAll = allActions.every((a) => currentPerms.includes(a));

    setPermissions((prev) => {
      if (hasAll) {
        // Remove all
        const newPermissions = { ...prev };
        delete newPermissions[resource];
        return newPermissions;
      } else {
        // Add all
        return {
          ...prev,
          [resource]: allActions,
        };
      }
    });
    setHasChanges(true);
    setSuccessMessage(null);
  };

  // Toggle expand/collapse module
  const toggleExpand = (moduleCode: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleCode]: !prev[moduleCode],
    }));
  };

  // Save permissions
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await apiFetch<{ message: string; role: string; permissions: Record<string, string[]>; modules: string[] }>(
        `/role-permissions/roles/${selectedRole}`,
        {
          method: "PUT",
          body: JSON.stringify({
            permissions,
            modules: enabledModules.length > 0 ? enabledModules : null,
          }),
        }
      );

      setSuccessMessage(data.message);
      setHasChanges(false);

      // Update roles list
      setRoles((prev) =>
        prev.map((r) =>
          r.role === selectedRole
            ? { ...r, permissions, modules: enabledModules, is_custom: true }
            : r
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    if (!confirm("Bạn có chắc muốn đặt lại quyền mặc định cho vai trò này?")) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await apiFetch<{ message: string; role: string; permissions: Record<string, string[]> }>(
        `/role-permissions/roles/${selectedRole}/reset`,
        { method: "POST" }
      );

      setSuccessMessage(data.message);
      setPermissions(data.permissions);
      setEnabledModules([]);
      setHasChanges(false);

      // Update roles list
      setRoles((prev) =>
        prev.map((r) =>
          r.role === selectedRole
            ? { ...r, permissions: data.permissions, modules: [], is_custom: false }
            : r
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  const selectedRoleData = roles.find((r) => r.role === selectedRole);

  if (accessDenied) {
    return <AccessDenied title="Không có quyền truy cập" message="Chỉ Admin mới có thể quản lý phân quyền" />;
  }

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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-7 h-7 text-blue-600" />
          Phân quyền vai trò
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Cấu hình quyền truy cập cho từng vai trò trong hệ thống
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
          <span className="text-lg">✓</span>
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Role List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border p-4 sticky top-4">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Vai trò
            </h2>
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.role}
                  onClick={() => handleRoleSelect(role.role)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedRole === role.role
                      ? "bg-black text-white"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className="font-medium">{role.label}</div>
                  <div
                    className={`text-xs mt-1 ${
                      selectedRole === role.role
                        ? "text-gray-300"
                        : "text-gray-500"
                    }`}
                  >
                    {role.is_custom ? "Tùy chỉnh" : "Mặc định"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-20 rounded-t-xl">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Quyền của {selectedRoleData?.label}
                </h2>
                {selectedRoleData?.is_custom && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                    Đã tùy chỉnh
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Đặt lại mặc định
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
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
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Permission by Module */}
            <div className="max-h-[65vh] overflow-y-auto">
              {grouped.map((appModule) => {
                const isExpanded = expandedModules[appModule.code] ?? true;
                const moduleEnabled = isModuleEnabled(appModule.code);

                return (
                  <div key={appModule.code} className="border-b last:border-b-0">
                    {/* Module Header */}
                    <div
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                        !moduleEnabled ? "opacity-50" : ""
                      }`}
                      onClick={() => toggleExpand(appModule.code)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="text-xl">{appModule.icon}</span>
                        <span className="font-semibold text-gray-900">{appModule.label}</span>
                        <span className="text-xs text-gray-500">
                          ({appModule.resources.length} chức năng)
                        </span>
                      </div>
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-xs text-gray-500">Truy cập Module</span>
                          <input
                            type="checkbox"
                            checked={moduleEnabled}
                            onChange={() => toggleModuleAccess(appModule.code)}
                            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Resources Table */}
                    {isExpanded && moduleEnabled && (
                      <div className="bg-gray-50 px-4 pb-4">
                        <table className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase w-1/4">
                                Chức năng
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">
                                Xem
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">
                                Tạo mới
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">
                                Sửa
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">
                                Xóa
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">
                                Xuất file
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">
                                Sử dụng
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase w-16">
                                Tất cả
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {appModule.resources.map((resource) => {
                              const resourcePerms = permissions[resource.resource] || [];
                              const availableActions = resource.available_actions.map((a) => a.action);
                              const hasAll = availableActions.every((a) => resourcePerms.includes(a));

                              return (
                                <tr key={resource.resource} className="hover:bg-gray-50">
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{resource.icon}</span>
                                      <span className="text-sm font-medium text-gray-800">
                                        {resource.label}
                                      </span>
                                    </div>
                                  </td>
                                  {["view", "create", "edit", "delete", "export", "use"].map((action) => {
                                    const isAvailable = availableActions.includes(action);
                                    const isChecked = resourcePerms.includes(action);

                                    return (
                                      <td key={action} className="px-3 py-2 text-center">
                                        {isAvailable ? (
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => togglePermission(resource.resource, action)}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                          />
                                        ) : (
                                          <span className="text-gray-300">—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={hasAll}
                                      onChange={() => toggleAllResource(resource.resource, resource)}
                                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Collapsed disabled state */}
                    {isExpanded && !moduleEnabled && (
                      <div className="bg-gray-50 px-4 py-6 text-center text-gray-400 text-sm">
                        Module đã bị tắt. Bật "Truy cập Module" để cấu hình quyền chi tiết.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="p-4 border-t bg-gray-50 rounded-b-xl">
              <h3 className="font-medium text-gray-700 mb-2">Ghi chú</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
                <div>• <strong>Xem:</strong> Xem danh sách và chi tiết</div>
                <div>• <strong>Tạo mới:</strong> Thêm bản ghi mới</div>
                <div>• <strong>Sửa:</strong> Chỉnh sửa bản ghi</div>
                <div>• <strong>Xóa:</strong> Xóa bản ghi</div>
                <div>• <strong>Xuất file:</strong> Xuất Excel/PDF</div>
                <div>• <strong>Sử dụng:</strong> Sử dụng tính năng</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
