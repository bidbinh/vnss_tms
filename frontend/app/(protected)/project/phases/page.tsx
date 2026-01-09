"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  X,
  Layers,
  Calendar,
  CheckCircle,
  Clock,
  Play,
  Pause,
  ChevronRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Project {
  id: string;
  code: string;
  name: string;
  phases?: ProjectPhase[];
}

interface ProjectPhase {
  id: string;
  project_id: string;
  phase_number: number;
  name: string;
  description: string;
  status: string;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date: string;
  actual_end_date: string;
  progress_percent: number;
  weight_percent: number;
  budget_amount: number;
  actual_cost: number;
  deliverables: string;
  requires_approval: boolean;
  approved_by: string;
  approved_at: string;
  notes: string;
}

const STATUSES = [
  { value: "NOT_STARTED", label: "Chưa bắt đầu", icon: Clock, color: "bg-gray-100 text-gray-700" },
  { value: "IN_PROGRESS", label: "Đang thực hiện", icon: Play, color: "bg-blue-100 text-blue-700" },
  { value: "COMPLETED", label: "Hoàn thành", icon: CheckCircle, color: "bg-green-100 text-green-700" },
  { value: "SKIPPED", label: "Bỏ qua", icon: Pause, color: "bg-yellow-100 text-yellow-700" },
];

const initialFormData = {
  phase_number: 1,
  name: "",
  description: "",
  planned_start_date: "",
  planned_end_date: "",
  weight_percent: 0,
  budget_amount: 0,
  deliverables: "",
};

export default function ProjectPhasesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<ProjectPhase | null>(null);
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

  const fetchPhases = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<{ phases: ProjectPhase[] }>(`/project/projects/${selectedProjectId}`);
      setPhases(data.phases || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchPhases();
    }
  }, [selectedProjectId, fetchPhases]);

  const handleCreate = async () => {
    if (!formData.name) {
      setFormError("Vui lòng nhập tên giai đoạn");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch("/project/project-phases", {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProjectId,
          ...formData,
          planned_start_date: formData.planned_start_date || null,
          planned_end_date: formData.planned_end_date || null,
        }),
      });
      setShowCreateModal(false);
      setFormData(initialFormData);
      fetchPhases();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedPhase || !formData.name) {
      setFormError("Vui lòng nhập tên giai đoạn");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch(`/project/project-phases/${selectedPhase.id}`, {
        method: "PUT",
        body: JSON.stringify({
          project_id: selectedProjectId,
          ...formData,
          planned_start_date: formData.planned_start_date || null,
          planned_end_date: formData.planned_end_date || null,
        }),
      });
      setShowEditModal(false);
      setSelectedPhase(null);
      setFormData(initialFormData);
      fetchPhases();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (phaseId: string) => {
    if (!confirm("Bạn có chắc muốn đánh dấu giai đoạn này là hoàn thành?")) return;

    try {
      await apiFetch(`/project/project-phases/${phaseId}/complete`, {
        method: "POST",
      });
      fetchPhases();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const openEditModal = (phase: ProjectPhase) => {
    setSelectedPhase(phase);
    setFormData({
      phase_number: phase.phase_number,
      name: phase.name,
      description: phase.description || "",
      planned_start_date: phase.planned_start_date || "",
      planned_end_date: phase.planned_end_date || "",
      weight_percent: phase.weight_percent || 0,
      budget_amount: phase.budget_amount || 0,
      deliverables: phase.deliverables || "",
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    const nextNumber = phases.length > 0 ? Math.max(...phases.map((p) => p.phase_number)) + 1 : 1;
    setFormData({ ...initialFormData, phase_number: nextNumber });
    setFormError(null);
    setShowCreateModal(true);
  };

  const getStatusInfo = (status: string) => {
    return STATUSES.find((s) => s.value === status) || STATUSES[0];
  };

  const totalWeight = phases.reduce((sum, p) => sum + (p.weight_percent || 0), 0);
  const overallProgress = phases.reduce((sum, p) => sum + (p.progress_percent || 0) * (p.weight_percent || 0) / 100, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Giai đoạn dự án</h1>
          <p className="text-gray-500">Quản lý các giai đoạn/phase của dự án</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPhases}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateModal}
            disabled={!selectedProjectId}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Thêm giai đoạn
          </button>
        </div>
      </div>

      {/* Project Selector */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Chọn dự án</label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Chọn dự án --</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code} - {project.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProjectId && (
        <>
          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Layers className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{phases.length}</p>
                  <p className="text-sm text-gray-500">Tổng giai đoạn</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{phases.filter((p) => p.status === "COMPLETED").length}</p>
                  <p className="text-sm text-gray-500">Hoàn thành</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Play className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overallProgress.toFixed(0)}%</p>
                  <p className="text-sm text-gray-500">Tiến độ tổng</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-red-500">{error}</p>
              <button
                onClick={fetchPhases}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4" /> Thử lại
              </button>
            </div>
          )}

          {/* Phases Timeline */}
          {!error && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : phases.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
                  Chưa có giai đoạn nào. Nhấn "Thêm giai đoạn" để tạo mới.
                </div>
              ) : (
                phases
                  .sort((a, b) => a.phase_number - b.phase_number)
                  .map((phase, index) => {
                    const statusInfo = getStatusInfo(phase.status);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <div key={phase.id} className="bg-white rounded-xl shadow-sm border p-6">
                        <div className="flex items-start gap-4">
                          {/* Phase Number */}
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                              {phase.phase_number}
                            </div>
                            {index < phases.length - 1 && (
                              <div className="w-0.5 h-16 bg-gray-200 mt-2"></div>
                            )}
                          </div>

                          {/* Phase Content */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">{phase.name}</h3>
                                <p className="text-gray-500 text-sm mt-1">{phase.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusInfo.label}
                                </span>
                              </div>
                            </div>

                            {/* Phase Details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                              <div className="text-sm">
                                <span className="text-gray-500">Bắt đầu dự kiến:</span>
                                <p className="font-medium">{phase.planned_start_date || "N/A"}</p>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-500">Kết thúc dự kiến:</span>
                                <p className="font-medium">{phase.planned_end_date || "N/A"}</p>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-500">Trọng số:</span>
                                <p className="font-medium">{phase.weight_percent}%</p>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-500">Ngân sách:</span>
                                <p className="font-medium">{((phase.budget_amount || 0) / 1000000).toFixed(0)}M</p>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-500">Tiến độ</span>
                                <span className="font-medium">{phase.progress_percent || 0}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    phase.progress_percent === 100 ? "bg-green-500" : "bg-blue-500"
                                  }`}
                                  style={{ width: `${phase.progress_percent || 0}%` }}
                                />
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-4">
                              <button
                                onClick={() => openEditModal(phase)}
                                className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" />
                                Sửa
                              </button>
                              {phase.status !== "COMPLETED" && (
                                <button
                                  onClick={() => handleComplete(phase.id)}
                                  className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Hoàn thành
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Thêm giai đoạn mới</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số thứ tự</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.phase_number}
                    onChange={(e) => setFormData({ ...formData, phase_number: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trọng số (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.weight_percent}
                    onChange={(e) => setFormData({ ...formData, weight_percent: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên giai đoạn *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Phân tích yêu cầu, Thiết kế, Phát triển..."
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu dự kiến</label>
                  <input
                    type="date"
                    value={formData.planned_start_date}
                    onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc dự kiến</label>
                  <input
                    type="date"
                    value={formData.planned_end_date}
                    onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngân sách (VND)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.budget_amount}
                  onChange={(e) => setFormData({ ...formData, budget_amount: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deliverables</label>
                <textarea
                  value={formData.deliverables}
                  onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Danh sách các sản phẩm bàn giao..."
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
                {submitting ? "Đang tạo..." : "Tạo giai đoạn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPhase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Chỉnh sửa giai đoạn</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số thứ tự</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.phase_number}
                    onChange={(e) => setFormData({ ...formData, phase_number: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trọng số (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.weight_percent}
                    onChange={(e) => setFormData({ ...formData, weight_percent: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên giai đoạn *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu dự kiến</label>
                  <input
                    type="date"
                    value={formData.planned_start_date}
                    onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc dự kiến</label>
                  <input
                    type="date"
                    value={formData.planned_end_date}
                    onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngân sách (VND)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.budget_amount}
                  onChange={(e) => setFormData({ ...formData, budget_amount: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
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
