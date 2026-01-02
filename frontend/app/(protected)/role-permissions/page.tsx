"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface ActionInfo {
  action: string;
  label: string;
  description: string;
}

interface ModuleInfo {
  module: string;
  label: string;
  icon: string;
  order: number;
  available_actions: ActionInfo[];
}

interface RolePermission {
  role: string;
  label: string;
  permissions: Record<string, string[]>;
  description: string | null;
  is_custom: boolean;
}

export default function RolePermissionsPage() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch modules and roles
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [modulesData, rolesData] = await Promise.all([
          apiFetch<{ modules: ModuleInfo[] }>("/role-permissions/modules"),
          apiFetch<{ roles: RolePermission[] }>("/role-permissions/roles"),
        ]);

        setModules(modulesData.modules);
        setRoles(rolesData.roles);

        // Select first role by default
        if (rolesData.roles.length > 0) {
          const firstRole = rolesData.roles[0];
          setSelectedRole(firstRole.role);
          setPermissions(firstRole.permissions || {});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
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
    setHasChanges(false);
    setSuccessMessage(null);
  };

  // Toggle permission
  const togglePermission = (module: string, action: string) => {
    setPermissions((prev) => {
      const modulePerms = prev[module] || [];
      const newModulePerms = modulePerms.includes(action)
        ? modulePerms.filter((a) => a !== action)
        : [...modulePerms, action];

      const newPermissions = {
        ...prev,
        [module]: newModulePerms,
      };

      // Remove empty modules
      if (newModulePerms.length === 0) {
        delete newPermissions[module];
      }

      return newPermissions;
    });
    setHasChanges(true);
    setSuccessMessage(null);
  };

  // Toggle all actions for a module
  const toggleAllModule = (module: string, moduleInfo: ModuleInfo) => {
    const currentPerms = permissions[module] || [];
    const allActions = moduleInfo.available_actions.map((a) => a.action);
    const hasAll = allActions.every((a) => currentPerms.includes(a));

    setPermissions((prev) => {
      if (hasAll) {
        // Remove all
        const newPermissions = { ...prev };
        delete newPermissions[module];
        return newPermissions;
      } else {
        // Add all
        return {
          ...prev,
          [module]: allActions,
        };
      }
    });
    setHasChanges(true);
    setSuccessMessage(null);
  };

  // Save permissions
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await apiFetch<{ message: string; role: string; permissions: Record<string, string[]> }>(
        `/role-permissions/roles/${selectedRole}`,
        {
          method: "PUT",
          body: JSON.stringify({ permissions }),
        }
      );

      setSuccessMessage(data.message);
      setHasChanges(false);

      // Update roles list
      setRoles((prev) =>
        prev.map((r) =>
          r.role === selectedRole
            ? { ...r, permissions, is_custom: true }
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
      setHasChanges(false);

      // Update roles list
      setRoles((prev) =>
        prev.map((r) =>
          r.role === selectedRole
            ? { ...r, permissions: data.permissions, is_custom: false }
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
        <h1 className="text-2xl font-bold text-gray-900">Phân quyền vai trò</h1>
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
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Vai trò</h2>
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
            <div className="p-4 border-b flex items-center justify-between">
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
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
                    "Lưu thay đổi"
                  )}
                </button>
              </div>
            </div>

            {/* Permission Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/4">
                      Chức năng
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Xem
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tạo mới
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Chỉnh sửa
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Xóa
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Xuất file
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Sử dụng
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                      Tất cả
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {modules.map((module) => {
                    const modulePerms = permissions[module.module] || [];
                    const availableActions = module.available_actions.map(
                      (a) => a.action
                    );
                    const hasAll = availableActions.every((a) =>
                      modulePerms.includes(a)
                    );

                    return (
                      <tr key={module.module} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{module.icon}</span>
                            <span className="font-medium text-gray-900">
                              {module.label}
                            </span>
                          </div>
                        </td>
                        {["view", "create", "edit", "delete", "export", "use"].map(
                          (action) => {
                            const isAvailable = availableActions.includes(action);
                            const isChecked = modulePerms.includes(action);

                            return (
                              <td key={action} className="px-4 py-3 text-center">
                                {isAvailable ? (
                                  <label className="inline-flex items-center justify-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        togglePermission(module.module, action)
                                      }
                                      className="w-5 h-5 text-black bg-gray-100 border-gray-300 rounded focus:ring-black focus:ring-2 cursor-pointer"
                                    />
                                  </label>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            );
                          }
                        )}
                        <td className="px-4 py-3 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasAll}
                              onChange={() => toggleAllModule(module.module, module)}
                              className="w-5 h-5 text-black bg-gray-100 border-gray-300 rounded focus:ring-black focus:ring-2 cursor-pointer"
                            />
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    className="w-4 h-4 text-black bg-gray-100 border-gray-300 rounded"
                  />
                  <span>Có quyền</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    readOnly
                    className="w-4 h-4 bg-gray-100 border-gray-300 rounded"
                  />
                  <span>Không có quyền</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">—</span>
                  <span>Không áp dụng</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="font-medium text-blue-900 mb-2">Ghi chú</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Xem:</strong> Xem danh sách và chi tiết dữ liệu</li>
              <li>• <strong>Tạo mới:</strong> Thêm bản ghi mới</li>
              <li>• <strong>Chỉnh sửa:</strong> Sửa đổi bản ghi hiện có</li>
              <li>• <strong>Xóa:</strong> Xóa bản ghi</li>
              <li>• <strong>Xuất file:</strong> Xuất dữ liệu ra Excel/PDF</li>
              <li>• <strong>Sử dụng:</strong> Sử dụng tính năng (áp dụng cho AI Assistant)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
