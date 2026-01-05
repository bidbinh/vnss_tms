"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  create: "Tạo mới",
  edit: "Sửa",
  delete: "Xóa",
  export: "Xuất file",
  approve: "Duyệt",
  assign: "Phân công",
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
      const res = await api.get("/api/v1/roles", { params: { limit: 100 } });
      setRoles(res.data.roles || []);
    } catch (error) {
      toast.error("Không thể tải danh sách roles");
    } finally {
      setLoading(false);
    }
  };

  const loadModuleResources = async () => {
    try {
      const res = await api.get("/api/v1/roles/available-modules");
      setModuleResources(res.data.resources || {});
    } catch (error) {
      console.error("Failed to load modules:", error);
    }
  };

  const handleCreateRole = async () => {
    if (!formData.name || !formData.code) {
      toast.error("Vui lòng nhập tên và mã role");
      return;
    }

    try {
      // Convert selected permissions to API format
      const permissions: { module: string; resource: string; action: string }[] = [];
      Object.entries(selectedPermissions).forEach(([moduleResource, actions]) => {
        const [module, resource] = moduleResource.split(":");
        actions.forEach((action) => {
          permissions.push({ module, resource, action });
        });
      });

      await api.post("/api/v1/roles", {
        ...formData,
        code: formData.code.toUpperCase(),
        permissions,
      });

      toast.success("Tạo role thành công");
      setShowCreateDialog(false);
      resetForm();
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Không thể tạo role");
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    try {
      // Convert selected permissions to API format
      const permissions: { module: string; resource: string; action: string }[] = [];
      Object.entries(selectedPermissions).forEach(([moduleResource, actions]) => {
        const [module, resource] = moduleResource.split(":");
        actions.forEach((action) => {
          permissions.push({ module, resource, action });
        });
      });

      await api.put(`/api/v1/roles/${selectedRole.id}`, {
        name: formData.name,
        description: formData.description,
        permissions: selectedRole.is_system ? undefined : permissions,
      });

      toast.success("Cập nhật role thành công");
      setShowEditDialog(false);
      resetForm();
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Không thể cập nhật role");
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    try {
      await api.delete(`/api/v1/roles/${selectedRole.id}`);
      toast.success("Xóa role thành công");
      setShowDeleteDialog(false);
      setSelectedRole(null);
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Không thể xóa role");
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

    // Convert permissions to selected format
    const perms: { [key: string]: string[] } = {};
    role.permissions.forEach((p) => {
      const key = `${p.module}:${p.resource}`;
      if (!perms[key]) perms[key] = [];
      perms[key].push(p.action);
    });
    setSelectedPermissions(perms);

    // Expand modules that have permissions
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Quản lý Roles & Phân quyền
          </h1>
          <p className="text-muted-foreground">
            Quản lý các vai trò và quyền hạn trong hệ thống
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo Role mới
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Roles Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="text-center">Số quyền</TableHead>
                <TableHead className="text-center">Số users</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : filteredRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Không có role nào
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {role.is_system && <Lock className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium">{role.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{role.code}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {role.description || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {role.code === "ADMIN" ? (
                        <Badge variant="secondary">Toàn quyền</Badge>
                      ) : (
                        role.permissions.length
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {role.user_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {role.is_active ? (
                        <Badge variant="default">Hoạt động</Badge>
                      ) : (
                        <Badge variant="secondary">Tắt</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!role.is_system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedRole(role);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo Role mới</DialogTitle>
            <DialogDescription>
              Tạo vai trò mới và cấu hình quyền hạn
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên Role *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Nhân viên kho"
                />
              </div>
              <div className="space-y-2">
                <Label>Mã Role *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="VD: WMS_STAFF"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả vai trò..."
              />
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <Label>Phân quyền</Label>
              <Card>
                <CardContent className="p-4 space-y-2">
                  {Object.entries(moduleResources).map(([module, resources]) => (
                    <div key={module} className="border rounded-lg">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
                        onClick={() => toggleModule(module)}
                      >
                        <span className="font-medium">
                          {MODULE_LABELS[module] || module}
                        </span>
                        {expandedModules.includes(module) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      {expandedModules.includes(module) && (
                        <div className="p-3 pt-0 border-t">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tài nguyên</TableHead>
                                {AVAILABLE_ACTIONS.map((action) => (
                                  <TableHead key={action} className="text-center w-20">
                                    {ACTION_LABELS[action]}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {resources.map((resource) => (
                                <TableRow key={resource}>
                                  <TableCell className="font-medium capitalize">
                                    {resource.replace(/_/g, " ")}
                                  </TableCell>
                                  {AVAILABLE_ACTIONS.map((action) => (
                                    <TableCell key={action} className="text-center">
                                      <Checkbox
                                        checked={isPermissionSelected(module, resource, action)}
                                        onCheckedChange={() =>
                                          togglePermission(module, resource, action)
                                        }
                                      />
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateRole}>Tạo Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chỉnh sửa Role: {selectedRole?.name}
              {selectedRole?.is_system && (
                <Badge variant="secondary" className="ml-2">
                  System Role
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedRole?.is_system
                ? "Chỉ có thể sửa tên và mô tả của system role"
                : "Cập nhật thông tin và quyền hạn"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên Role</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mã Role</Label>
                <Input value={formData.code} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Permissions - only for non-system roles */}
            {!selectedRole?.is_system && (
              <div className="space-y-2">
                <Label>Phân quyền</Label>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    {Object.entries(moduleResources).map(([module, resources]) => (
                      <div key={module} className="border rounded-lg">
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
                          onClick={() => toggleModule(module)}
                        >
                          <span className="font-medium">
                            {MODULE_LABELS[module] || module}
                          </span>
                          {expandedModules.includes(module) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>

                        {expandedModules.includes(module) && (
                          <div className="p-3 pt-0 border-t">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Tài nguyên</TableHead>
                                  {AVAILABLE_ACTIONS.map((action) => (
                                    <TableHead key={action} className="text-center w-20">
                                      {ACTION_LABELS[action]}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {resources.map((resource) => (
                                  <TableRow key={resource}>
                                    <TableCell className="font-medium capitalize">
                                      {resource.replace(/_/g, " ")}
                                    </TableCell>
                                    {AVAILABLE_ACTIONS.map((action) => (
                                      <TableCell key={action} className="text-center">
                                        <Checkbox
                                          checked={isPermissionSelected(module, resource, action)}
                                          onCheckedChange={() =>
                                            togglePermission(module, resource, action)
                                          }
                                        />
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateRole}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa Role</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa role &quot;{selectedRole?.name}&quot;? Hành động này không thể
              hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
