"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  RefreshCw,
  X,
  Trash2,
  Calendar,
  User,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  FolderKanban,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Project {
  id: string;
  code: string;
  name: string;
}

interface Resource {
  id: string;
  code: string;
  name: string;
  resource_type: string;
  capacity_hours_per_day: number;
  cost_rate_per_hour: number;
  is_available: boolean;
}

interface Allocation {
  id: string;
  tenant_id: string;
  resource_id: string;
  project_id: string;
  task_id: string | null;
  start_date: string;
  end_date: string;
  allocation_percent: number;
  planned_hours: number;
  actual_hours: number;
  planned_cost: number;
  actual_cost: number;
  role: string | null;
  is_confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
}

interface AllocationWithDetails extends Allocation {
  resource_name?: string;
  project_name?: string;
}

const ROLES = [
  { value: "PROJECT_MANAGER", label: "Quản lý dự án" },
  { value: "TECH_LEAD", label: "Tech Lead" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "DESIGNER", label: "Designer" },
  { value: "QA", label: "QA/Tester" },
  { value: "BA", label: "Business Analyst" },
  { value: "SUPPORT", label: "Support" },
  { value: "OTHER", label: "Khác" },
];

const initialFormData = {
  resource_id: "",
  project_id: "",
  task_id: "",
  start_date: "",
  end_date: "",
  allocation_percent: 100,
  planned_hours: 0,
  role: "",
  notes: "",
};

export default function AllocationsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [allocations, setAllocations] = useState<AllocationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationWithDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: Project[] }>("/project/projects?size=200");
      setProjects(data.items || []);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  }, []);

  const fetchResources = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: Resource[] }>("/project/resources?size=200");
      setResources(data.items || []);
    } catch (err) {
      console.error("Error fetching resources:", err);
    }
  }, []);

  const fetchAllocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let url = "/project/resource-allocations?size=200";
      if (selectedProjectId) {
        url += `&project_id=${selectedProjectId}`;
      }
      if (selectedResourceId) {
        url += `&resource_id=${selectedResourceId}`;
      }
      const data = await apiFetch<{ items: Allocation[] }>(url);

      // Enrich with resource and project names
      const enrichedAllocations = (data.items || []).map((alloc) => {
        const resource = resources.find((r) => r.id === alloc.resource_id);
        const project = projects.find((p) => p.id === alloc.project_id);
        return {
          ...alloc,
          resource_name: resource?.name || "Unknown",
          project_name: project?.name || "Unknown",
        };
      });

      setAllocations(enrichedAllocations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, selectedResourceId, resources, projects]);

  useEffect(() => {
    fetchProjects();
    fetchResources();
  }, [fetchProjects, fetchResources]);

  useEffect(() => {
    if (projects.length > 0 && resources.length > 0) {
      fetchAllocations();
    }
  }, [fetchAllocations, projects.length, resources.length]);

  const handleCreate = async () => {
    if (!formData.resource_id || !formData.project_id || !formData.start_date || !formData.end_date) {
      setFormError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setFormError("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch("/project/resource-allocations", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          task_id: formData.task_id || null,
          allocation_percent: Number(formData.allocation_percent),
          planned_hours: Number(formData.planned_hours),
        }),
      });
      setShowCreateModal(false);
      setFormData(initialFormData);
      fetchAllocations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedAllocation || !formData.resource_id || !formData.project_id || !formData.start_date || !formData.end_date) {
      setFormError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch(`/project/resource-allocations/${selectedAllocation.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          task_id: formData.task_id || null,
          allocation_percent: Number(formData.allocation_percent),
          planned_hours: Number(formData.planned_hours),
        }),
      });
      setShowEditModal(false);
      setSelectedAllocation(null);
      setFormData(initialFormData);
      fetchAllocations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (allocationId: string) => {
    if (!confirm("Bạn có chắc muốn xóa phân bổ này?")) return;

    try {
      await apiFetch(`/project/resource-allocations/${allocationId}`, {
        method: "DELETE",
      });
      fetchAllocations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const openEditModal = (allocation: AllocationWithDetails) => {
    setSelectedAllocation(allocation);
    setFormData({
      resource_id: allocation.resource_id,
      project_id: allocation.project_id,
      task_id: allocation.task_id || "",
      start_date: allocation.start_date?.split("T")[0] || "",
      end_date: allocation.end_date?.split("T")[0] || "",
      allocation_percent: allocation.allocation_percent,
      planned_hours: allocation.planned_hours,
      role: allocation.role || "",
      notes: allocation.notes || "",
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const getRoleLabel = (role: string) => {
    const roleInfo = ROLES.find((r) => r.value === role);
    return roleInfo?.label || role || "-";
  };

  const getAllocationColor = (percent: number) => {
    if (percent >= 100) return "bg-red-100 text-red-700";
    if (percent >= 75) return "bg-orange-100 text-orange-700";
    if (percent >= 50) return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const filteredAllocations = allocations.filter(
    (a) =>
      a.resource_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalAllocations = allocations.length;
  const confirmedAllocations = allocations.filter((a) => a.is_confirmed).length;
  const totalPlannedHours = allocations.reduce((sum, a) => sum + (a.planned_hours || 0), 0);
  const totalActualHours = allocations.reduce((sum, a) => sum + (a.actual_hours || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phân bổ nguồn lực</h1>
          <p className="text-gray-500">Quản lý phân bổ nhân sự và thiết bị cho các dự án</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllocations}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setFormData(initialFormData);
              setFormError(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Thêm phân bổ
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAllocations}</p>
              <p className="text-sm text-gray-500">Tổng phân bổ</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{confirmedAllocations}</p>
              <p className="text-sm text-gray-500">Đã xác nhận</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPlannedHours.toLocaleString()}h</p>
              <p className="text-sm text-gray-500">Giờ kế hoạch</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalActualHours.toLocaleString()}h</p>
              <p className="text-sm text-gray-500">Giờ thực tế</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] max-w-md">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả dự án</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px]">
          <select
            value={selectedResourceId}
            onChange={(e) => setSelectedResourceId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả nguồn lực</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.code} - {resource.name}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-red-500">{error}</p>
          <button
            onClick={fetchAllocations}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" /> Thử lại
          </button>
        </div>
      )}

      {/* Allocations Table */}
      {!error && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Nguồn lực</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Dự án</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Vai trò</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Thời gian</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">% Phân bổ</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Kế hoạch</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Thực tế</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Xác nhận</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      {searchTerm ? "Không tìm thấy phân bổ" : "Chưa có phân bổ nào"}
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((allocation) => (
                    <tr key={allocation.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{allocation.resource_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-gray-400" />
                          <span>{allocation.project_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{getRoleLabel(allocation.role || "")}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div>{allocation.start_date?.split("T")[0]}</div>
                          <div className="text-gray-400">đến {allocation.end_date?.split("T")[0]}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${getAllocationColor(allocation.allocation_percent)}`}>
                          {allocation.allocation_percent}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm">{allocation.planned_hours?.toLocaleString()}h</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm">{allocation.actual_hours?.toLocaleString()}h</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {allocation.is_confirmed ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-yellow-500 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(allocation)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(allocation.id)}
                            className="p-1 hover:bg-red-50 rounded"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Thêm phân bổ nguồn lực</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn lực *</label>
                <select
                  value={formData.resource_id}
                  onChange={(e) => setFormData({ ...formData, resource_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn nguồn lực</option>
                  {resources
                    .filter((r) => r.is_available)
                    .map((resource) => (
                      <option key={resource.id} value={resource.id}>
                        {resource.code} - {resource.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dự án *</label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn dự án</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.code} - {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn vai trò</option>
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% Phân bổ</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.allocation_percent}
                    onChange={(e) => setFormData({ ...formData, allocation_percent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số giờ kế hoạch</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.planned_hours}
                    onChange={(e) => setFormData({ ...formData, planned_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Ghi chú về phân bổ..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Đang tạo..." : "Tạo phân bổ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAllocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Chỉnh sửa phân bổ</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn lực *</label>
                <select
                  value={formData.resource_id}
                  onChange={(e) => setFormData({ ...formData, resource_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn nguồn lực</option>
                  {resources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.code} - {resource.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dự án *</label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn dự án</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.code} - {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn vai trò</option>
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% Phân bổ</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.allocation_percent}
                    onChange={(e) => setFormData({ ...formData, allocation_percent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số giờ kế hoạch</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.planned_hours}
                    onChange={(e) => setFormData({ ...formData, planned_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Hủy
              </button>
              <button
                onClick={handleEdit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
