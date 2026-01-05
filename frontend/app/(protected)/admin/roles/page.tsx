"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Lock,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Permission {
  id: string;
  module: string;
  resource: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
  module_code: string | null;
  is_system: boolean;
  is_active: boolean;
  user_count: number;
  permissions: Permission[];
  created_at: string | null;
}

interface ModuleResources {
  [module: string]: string[];
}

const AVAILABLE_ACTIONS = ["view", "create", "edit", "delete", "export", "approve", "assign"];

const ACTION_LABELS: { [key: string]: string } = {
  view: "Xem",
  create: "Tạo",
  edit: "Sửa",
  delete: "Xóa",
  export: "Xuất",
  approve: "Duyệt",
  assign: "Gán",
};

const MODULE_LABELS: { [key: string]: string } = {
  tms: "Vận tải (TMS)",
  wms: "Kho bãi (WMS)",
  fms: "Forwarding (FMS)",
  pms: "Cảng (PMS)",
  ems: "Chuyển phát (EMS)",
  crm: "Khách hàng (CRM)",
  hrm: "Nhân sự (HRM)",
  accounting: "Kế toán",
  settings: "Cài đặt",
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });
  const [selectedPermissions, setSelectedPermissions] = useState<{ [key: string]: string[] }>({});
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Available modules/resources from API
  const [moduleResources, setModuleResources] = useState<ModuleResources>({});

  useEffect(() => {
    loadRoles();
    loadModuleResources();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ roles: Role[] }>("/roles?limit=100");
      setRoles(res.roles || []);
    } catch (error) {
      toast.error("Không thể tải danh sách roles");
    } finally {
      setLoading(false);
    }
  };

  const loadModuleResources = async () => {
    try {
      const res = await apiFetch<{ resources: ModuleResources }>("/roles/available-modules");
      setModuleResources(res.resources || {});
    } catch (error) {
      console.error("Failed to load modules:", error);
      // Default modules if API fails
      setModuleResources({
        tms: ["dashboard", "orders", "trips", "vehicles", "drivers", "customers", "reports"],
        hrm: ["dashboard", "employees", "departments", "attendance", "payroll"],
        crm: ["dashboard", "accounts", "contacts", "leads", "opportunities"],
      });
    }
  };

  const handleCreateRole = async () => {
    if (!formData.name || !formData.code) {
      toast.error("Vui lòng nhập tên và mã role");
      return;
    }

    try {
      const permissions: { module: string; resource: string; action: string }[] = [];
      Object.entries(selectedPermissions).forEach(([moduleResource, actions]) => {
        const [module, resource] = moduleResource.split(":");
        actions.forEach((action) => {
          permissions.push({ module, resource, action });
        });
      });

      await apiFetch("/roles", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          code: formData.code.toUpperCase(),
          permissions,
        }),
      });

      toast.success("Tạo role thành công");
      setShowCreateDialog(false);
      resetForm();
      loadRoles();
    } catch (error: any) {
      toast.error(error.message || "Không thể tạo role");
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    try {
      const permissions: { module: string; resource: string; action: string }[] = [];
      Object.entries(selectedPermissions).forEach(([moduleResource, actions]) => {
        const [module, resource] = moduleResource.split(":");
        actions.forEach((action) => {
          permissions.push({ module, resource, action });
        });
      });

      await apiFetch(`/roles/${selectedRole.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          permissions: selectedRole.is_system ? undefined : permissions,
        }),
      });

      toast.success("Cập nhật role thành công");
      setShowEditDialog(false);
      resetForm();
      loadRoles();
    } catch (error: any) {
      toast.error(error.message || "Không thể cập nhật role");
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    try {
      await apiFetch(`/roles/${selectedRole.id}`, { method: "DELETE" });
      toast.success("Xóa role thành công");
      setShowDeleteDialog(false);
      setSelectedRole(null);
      loadRoles();
    } catch (error: any) {
      toast.error(error.message || "Không thể xóa role");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", code: "", description: "" });
    setSelectedPermissions({});
    setSelectedRole(null);
    setExpandedModules([]);
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description || "",
    });

    const perms: { [key: string]: string[] } = {};
    role.permissions.forEach((p) => {
      const key = `${p.module}:${p.resource}`;
      if (!perms[key]) perms[key] = [];
      perms[key].push(p.action);
    });
    setSelectedPermissions(perms);

    const modules = [...new Set(role.permissions.map((p) => p.module))];
    setExpandedModules(modules);

    setShowEditDialog(true);
  };

  const toggleModule = (module: string) => {
    setExpandedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
  };

  const togglePermission = (module: string, resource: string, action: string) => {
    const key = `${module}:${resource}`;
    setSelectedPermissions((prev) => {
      const current = prev[key] || [];
      if (current.includes(action)) {
        const updated = current.filter((a) => a !== action);
        if (updated.length === 0) {
          const { [key]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [key]: updated };
      } else {
        return { ...prev, [key]: [...current, action] };
      }
    });
  };

  const isPermissionSelected = (module: string, resource: string, action: string) => {
    const key = `${module}:${resource}`;
    return selectedPermissions[key]?.includes(action) || false;
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase())
  );

  // Permission Matrix Component
  const PermissionMatrix = ({ disabled = false }: { disabled?: boolean }) => (
    <div className="space-y-2">
      {Object.entries(moduleResources).map(([module, resources]) => (
        <div key={module} className="border rounded-lg">
          <button
            type="button"
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
            onClick={() => toggleModule(module)}
          >
            <span className="font-medium">{MODULE_LABELS[module] || module}</span>
            {expandedModules.includes(module) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {expandedModules.includes(module) && (
            <div className="p-3 pt-0 border-t">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Tài nguyên</th>
                    {AVAILABLE_ACTIONS.map((action) => (
                      <th key={action} className="text-center py-2 px-1 w-16">
                        {ACTION_LABELS[action]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => (
                    <tr key={resource} className="border-b last:border-0">
                      <td className="py-2 px-2 font-medium capitalize">
                        {resource.replace(/_/g, " ")}
                      </td>
                      {AVAILABLE_ACTIONS.map((action) => (
                        <td key={action} className="text-center py-2 px-1">
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={isPermissionSelected(module, resource, action)}
                            onChange={() => togglePermission(module, resource, action)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Quản lý Roles & Phân quyền
          </h1>
          <p className="text-gray-500">Quản lý các vai trò và quyền hạn trong hệ thống</p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Tạo Role mới
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-lg shadow border">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 font-medium">Role</th>
              <th className="text-left py-3 px-4 font-medium">Mã</th>
              <th className="text-left py-3 px-4 font-medium">Mô tả</th>
              <th className="text-center py-3 px-4 font-medium">Số quyền</th>
              <th className="text-center py-3 px-4 font-medium">Số users</th>
              <th className="text-center py-3 px-4 font-medium">Trạng thái</th>
              <th className="text-right py-3 px-4 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : filteredRoles.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  Không có role nào
                </td>
              </tr>
            ) : (
              filteredRoles.map((role) => (
                <tr key={role.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {role.is_system && <Lock className="h-4 w-4 text-gray-400" />}
                      <span className="font-medium">{role.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">{role.code}</span>
                  </td>
                  <td className="py-3 px-4 max-w-[200px] truncate text-gray-600">
                    {role.description || "-"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {role.code === "ADMIN" ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                        Toàn quyền
                      </span>
                    ) : (
                      role.permissions.length
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      {role.user_count}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {role.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                        Hoạt động
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                        Tắt
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditDialog(role)}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {!role.is_system && (
                        <button
                          onClick={() => {
                            setSelectedRole(role);
                            setShowDeleteDialog(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold">Tạo Role mới</h2>
                <p className="text-gray-500 text-sm">Tạo vai trò mới và cấu hình quyền hạn</p>
              </div>
              <button onClick={() => setShowCreateDialog(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tên Role *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Nhân viên kho"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mã Role *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: WMS_STAFF"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả vai trò..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phân quyền</label>
                <PermissionMatrix />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateRole}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tạo Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {showEditDialog && selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  Chỉnh sửa Role: {selectedRole.name}
                  {selectedRole.is_system && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                      System Role
                    </span>
                  )}
                </h2>
                <p className="text-gray-500 text-sm">
                  {selectedRole.is_system
                    ? "Chỉ có thể sửa tên và mô tả của system role"
                    : "Cập nhật thông tin và quyền hạn"}
                </p>
              </div>
              <button onClick={() => setShowEditDialog(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tên Role</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mã Role</label>
                  <input
                    type="text"
                    value={formData.code}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {!selectedRole.is_system && (
                <div>
                  <label className="block text-sm font-medium mb-2">Phân quyền</label>
                  <PermissionMatrix />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowEditDialog(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateRole}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">Xác nhận xóa Role</h2>
            </div>
            <div className="p-4">
              <p className="text-gray-600">
                Bạn có chắc muốn xóa role &quot;{selectedRole.name}&quot;? Hành động này không thể hoàn
                tác.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteRole}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
