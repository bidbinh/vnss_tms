"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  X,
  Flag,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Target,
  User,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Project {
  id: string;
  code: string;
  name: string;
}

interface Milestone {
  id: string;
  project_id: string;
  phase_id: string;
  name: string;
  description: string;
  status: string;
  due_date: string;
  completed_date: string;
  owner_id: string;
  owner_name: string;
  total_tasks: number;
  completed_tasks: number;
  progress_percent: number;
  deliverables: string;
  budget_checkpoint: number;
  requires_approval: boolean;
  approved_by: string;
  approved_at: string;
  approval_notes: string;
  notify_days_before: number;
  notes: string;
}

const STATUSES = [
  { value: "NOT_STARTED", label: "Chưa bắt đầu", icon: Clock, color: "bg-gray-100 text-gray-700" },
  { value: "IN_PROGRESS", label: "Đang thực hiện", icon: Target, color: "bg-blue-100 text-blue-700" },
  { value: "COMPLETED", label: "Hoàn thành", icon: CheckCircle, color: "bg-green-100 text-green-700" },
  { value: "OVERDUE", label: "Quá hạn", icon: AlertTriangle, color: "bg-red-100 text-red-700" },
  { value: "CANCELLED", label: "Hủy", icon: X, color: "bg-gray-100 text-gray-500" },
];

const initialFormData = {
  name: "",
  description: "",
  due_date: "",
  owner_name: "",
  deliverables: "",
  budget_checkpoint: 0,
  requires_approval: false,
  notify_days_before: 7,
  notes: "",
};

export default function MilestonesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: Project[] }>("/project/projects?size=200");
      setProjects(data.items || []);
      if (data.items?.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data.items[0].id);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  }, [selectedProjectId]);

  const fetchMilestones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let url = "/project/milestones?size=200";
      if (selectedProjectId) {
        url += `&project_id=${selectedProjectId}`;
      }
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      const data = await apiFetch<{ items: Milestone[] }>(url);
      setMilestones(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const handleCreate = async () => {
    if (!formData.name) {
      setFormError("Vui lòng nhập tên milestone");
      return;
    }
    if (!selectedProjectId) {
      setFormError("Vui lòng chọn dự án");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch("/project/milestones", {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProjectId,
          ...formData,
          due_date: formData.due_date || null,
        }),
      });
      setShowCreateModal(false);
      setFormData(initialFormData);
      fetchMilestones();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedMilestone || !formData.name) {
      setFormError("Vui lòng nhập tên milestone");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch(`/project/milestones/${selectedMilestone.id}`, {
        method: "PUT",
        body: JSON.stringify({
          project_id: selectedMilestone.project_id,
          ...formData,
          due_date: formData.due_date || null,
        }),
      });
      setShowEditModal(false);
      setSelectedMilestone(null);
      setFormData(initialFormData);
      fetchMilestones();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (milestoneId: string) => {
    if (!confirm("Bạn có chắc muốn đánh dấu milestone này là hoàn thành?")) return;

    try {
      await apiFetch(`/project/milestones/${milestoneId}/complete`, {
        method: "POST",
      });
      fetchMilestones();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const openEditModal = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setFormData({
      name: milestone.name,
      description: milestone.description || "",
      due_date: milestone.due_date || "",
      owner_name: milestone.owner_name || "",
      deliverables: milestone.deliverables || "",
      budget_checkpoint: milestone.budget_checkpoint || 0,
      requires_approval: milestone.requires_approval || false,
      notify_days_before: milestone.notify_days_before || 7,
      notes: milestone.notes || "",
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const getStatusInfo = (status: string) => {
    return STATUSES.find((s) => s.value === status) || STATUSES[0];
  };

  const isOverdue = (milestone: Milestone) => {
    if (!milestone.due_date || milestone.status === "COMPLETED") return false;
    return new Date(milestone.due_date) < new Date();
  };

  const filteredMilestones = milestones.filter((m) =>
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === "COMPLETED").length;
  const overdueMilestones = milestones.filter((m) => isOverdue(m)).length;
  const upcomingMilestones = milestones.filter((m) => {
    if (!m.due_date || m.status === "COMPLETED") return false;
    const due = new Date(m.due_date);
    const now = new Date();
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Milestones</h1>
          <p className="text-gray-500">Quản lý các mốc quan trọng của dự án</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMilestones}
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
            disabled={!selectedProjectId}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Thêm Milestone
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Flag className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMilestones}</p>
              <p className="text-sm text-gray-500">Tổng milestones</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedMilestones}</p>
              <p className="text-sm text-gray-500">Hoàn thành</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdueMilestones}</p>
              <p className="text-sm text-gray-500">Quá hạn</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingMilestones}</p>
              <p className="text-sm text-gray-500">Sắp đến hạn</p>
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
        <div className="min-w-[150px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm milestone..."
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
            onClick={fetchMilestones}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" /> Thử lại
          </button>
        </div>
      )}

      {/* Milestones Grid */}
      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredMilestones.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
              {searchTerm ? "Không tìm thấy milestone" : "Chưa có milestone nào"}
            </div>
          ) : (
            filteredMilestones.map((milestone) => {
              const statusInfo = getStatusInfo(milestone.status);
              const StatusIcon = statusInfo.icon;
              const overdue = isOverdue(milestone);
              return (
                <div
                  key={milestone.id}
                  className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${
                    overdue ? "border-red-200" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${overdue ? "bg-red-100" : "bg-blue-100"}`}>
                        <Flag className={`w-5 h-5 ${overdue ? "text-red-600" : "text-blue-600"}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{milestone.name}</h3>
                        {milestone.owner_name && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {milestone.owner_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </span>
                  </div>

                  {milestone.description && (
                    <p className="text-sm text-gray-500 mt-3 line-clamp-2">{milestone.description}</p>
                  )}

                  {/* Due Date */}
                  <div className="flex items-center gap-2 mt-4 text-sm">
                    <Calendar className={`w-4 h-4 ${overdue ? "text-red-500" : "text-gray-400"}`} />
                    <span className={overdue ? "text-red-600 font-medium" : ""}>
                      {milestone.due_date || "Chưa có deadline"}
                    </span>
                    {overdue && <span className="text-red-600 text-xs">(Quá hạn)</span>}
                  </div>

                  {/* Progress */}
                  {milestone.total_tasks > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-500">
                          Tasks: {milestone.completed_tasks}/{milestone.total_tasks}
                        </span>
                        <span className="font-medium">{milestone.progress_percent || 0}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            milestone.progress_percent === 100 ? "bg-green-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${milestone.progress_percent || 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <button
                      onClick={() => openEditModal(milestone)}
                      className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4" />
                      Sửa
                    </button>
                    {milestone.status !== "COMPLETED" && (
                      <button
                        onClick={() => handleComplete(milestone.id)}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Hoàn thành
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Thêm Milestone mới</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên milestone *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Hoàn thành UAT, Go-live, MVP Release..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người phụ trách</label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Tên người phụ trách"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deliverables</label>
                <textarea
                  value={formData.deliverables}
                  onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Các sản phẩm bàn giao tại milestone này..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Checkpoint (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.budget_checkpoint}
                    onChange={(e) => setFormData({ ...formData, budget_checkpoint: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhắc trước (ngày)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.notify_days_before}
                    onChange={(e) => setFormData({ ...formData, notify_days_before: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_approval"
                  checked={formData.requires_approval}
                  onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="requires_approval" className="text-sm text-gray-700">
                  Yêu cầu phê duyệt (Gate approval)
                </label>
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
                {submitting ? "Đang tạo..." : "Tạo Milestone"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMilestone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Chỉnh sửa Milestone</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên milestone *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người phụ trách</label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deliverables</label>
                <textarea
                  value={formData.deliverables}
                  onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Checkpoint (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.budget_checkpoint}
                    onChange={(e) => setFormData({ ...formData, budget_checkpoint: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhắc trước (ngày)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.notify_days_before}
                    onChange={(e) => setFormData({ ...formData, notify_days_before: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_requires_approval"
                  checked={formData.requires_approval}
                  onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="edit_requires_approval" className="text-sm text-gray-700">
                  Yêu cầu phê duyệt (Gate approval)
                </label>
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
