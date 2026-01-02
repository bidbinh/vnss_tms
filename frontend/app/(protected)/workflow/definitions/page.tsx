"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, GitBranch, Play, Settings, Copy, RefreshCw, X, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface WorkflowDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  version: number;
  status: string;
  workflow_type: string;
  entity_module: string;
  default_sla_hours: number;
  created_at: string;
}

interface ApiResponse {
  items: WorkflowDefinition[];
  total: number;
}

interface FormData {
  code: string;
  name: string;
  description: string;
  workflow_type: string;
  category: string;
  entity_module: string;
  default_sla_hours: number;
  allow_parallel: boolean;
  allow_delegation: boolean;
  allow_recall: boolean;
}

const WORKFLOW_TYPES = ["APPROVAL", "SEQUENTIAL", "PARALLEL", "STATE_MACHINE"];
const CATEGORIES = ["GENERAL", "FINANCE", "HR", "PROCUREMENT", "OPERATIONS", "SALES"];
const MODULES = ["GENERAL", "FINANCE", "HRM", "PROCUREMENT", "OPERATIONS", "SALES", "TMS", "WMS", "CRM"];

const initialFormData: FormData = {
  code: "",
  name: "",
  description: "",
  workflow_type: "APPROVAL",
  category: "GENERAL",
  entity_module: "GENERAL",
  default_sla_hours: 24,
  allow_parallel: false,
  allow_delegation: true,
  allow_recall: true,
};

export default function WorkflowDefinitionsPage() {
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDefinitions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<ApiResponse>("/workflow/workflow-definitions");
      setDefinitions(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefinitions();
  }, []);

  const handleCreate = async () => {
    if (!formData.code || !formData.name) {
      setFormError("Vui lòng nhập mã và tên workflow");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch("/workflow/workflow-definitions", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setShowCreateModal(false);
      setFormData(initialFormData);
      fetchDefinitions();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedWorkflow || !formData.name) {
      setFormError("Vui lòng nhập tên workflow");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch(`/workflow/workflow-definitions/${selectedWorkflow.id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      setShowEditModal(false);
      setSelectedWorkflow(null);
      setFormData(initialFormData);
      fetchDefinitions();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClone = async (wf: WorkflowDefinition) => {
    const cloneData = {
      code: `${wf.code}-COPY`,
      name: `${wf.name} (Copy)`,
      description: wf.description,
      workflow_type: wf.workflow_type,
      category: wf.category,
      entity_module: wf.entity_module,
      default_sla_hours: wf.default_sla_hours,
      allow_parallel: false,
      allow_delegation: true,
      allow_recall: true,
    };

    try {
      await apiFetch("/workflow/workflow-definitions", {
        method: "POST",
        body: JSON.stringify(cloneData),
      });
      fetchDefinitions();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi khi clone workflow");
    }
  };

  const handleActivate = async (wf: WorkflowDefinition) => {
    try {
      if (wf.status === "ACTIVE") {
        await apiFetch(`/workflow/workflow-definitions/${wf.id}/deactivate`, {
          method: "POST",
        });
      } else {
        await apiFetch(`/workflow/workflow-definitions/${wf.id}/activate`, {
          method: "POST",
        });
      }
      fetchDefinitions();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const openEditModal = (wf: WorkflowDefinition) => {
    setSelectedWorkflow(wf);
    setFormData({
      code: wf.code,
      name: wf.name,
      description: wf.description || "",
      workflow_type: wf.workflow_type,
      category: wf.category,
      entity_module: wf.entity_module || "GENERAL",
      default_sla_hours: wf.default_sla_hours || 24,
      allow_parallel: false,
      allow_delegation: true,
      allow_recall: true,
    });
    setShowEditModal(true);
  };

  const filteredDefinitions = definitions.filter(
    (d) => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error}</p>
        <button onClick={fetchDefinitions} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          <RefreshCw className="w-4 h-4" /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Definitions</h1>
          <p className="text-gray-500">Quản lý định nghĩa quy trình ({definitions.length})</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDefinitions} className="p-2 border rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setFormData(initialFormData); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Tạo Workflow mới
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm workflow..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDefinitions.map((wf) => (
          <div key={wf.id} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${wf.status === "ACTIVE" ? "bg-blue-100" : "bg-gray-100"}`}>
                  <GitBranch className={`w-5 h-5 ${wf.status === "ACTIVE" ? "text-blue-600" : "text-gray-400"}`} />
                </div>
                <div>
                  <span className="text-xs text-gray-500">{wf.code}</span>
                  <h3 className="font-semibold">{wf.name}</h3>
                </div>
              </div>
              <button
                onClick={() => handleActivate(wf)}
                className={`px-2 py-1 text-xs rounded-full cursor-pointer hover:opacity-80 ${wf.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
              >
                {wf.status}
              </button>
            </div>

            <p className="text-sm text-gray-500 mt-3">{wf.description}</p>

            <div className="flex items-center gap-2 mt-4 text-sm text-gray-500 flex-wrap">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">{wf.category}</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">{wf.entity_module}</span>
              <span className="text-xs">v{wf.version}</span>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-gray-500">SLA: {wf.default_sla_hours}h</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleActivate(wf)}
                  className="p-1.5 hover:bg-gray-100 rounded"
                  title={wf.status === "ACTIVE" ? "Deactivate" : "Activate"}
                >
                  <Play className={`w-4 h-4 ${wf.status === "ACTIVE" ? "text-green-500" : "text-gray-400"}`} />
                </button>
                <button
                  onClick={() => handleClone(wf)}
                  className="p-1.5 hover:bg-gray-100 rounded"
                  title="Clone"
                >
                  <Copy className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => openEditModal(wf)}
                  className="p-1.5 hover:bg-gray-100 rounded"
                  title="Edit"
                >
                  <Edit className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Tạo Workflow mới</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã workflow *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="WF-XXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SLA (giờ)</label>
                  <input
                    type="number"
                    value={formData.default_sla_hours}
                    onChange={(e) => setFormData({ ...formData, default_sla_hours: parseInt(e.target.value) || 24 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên workflow *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Tên quy trình"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Mô tả quy trình..."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                  <select
                    value={formData.workflow_type}
                    onChange={(e) => setFormData({ ...formData, workflow_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {WORKFLOW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                  <select
                    value={formData.entity_module}
                    onChange={(e) => setFormData({ ...formData, entity_module: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.allow_delegation}
                    onChange={(e) => setFormData({ ...formData, allow_delegation: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Cho phép ủy quyền</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.allow_recall}
                    onChange={(e) => setFormData({ ...formData, allow_recall: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Cho phép thu hồi</span>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Đang tạo..." : "Tạo workflow"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedWorkflow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Chỉnh sửa Workflow</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {formError}
                </div>
              )}
              {selectedWorkflow.status === "ACTIVE" && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-sm">
                  Workflow đang active không thể chỉnh sửa. Vui lòng deactivate trước.
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã workflow</label>
                  <input
                    type="text"
                    value={formData.code}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SLA (giờ)</label>
                  <input
                    type="number"
                    value={formData.default_sla_hours}
                    onChange={(e) => setFormData({ ...formData, default_sla_hours: parseInt(e.target.value) || 24 })}
                    disabled={selectedWorkflow.status === "ACTIVE"}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên workflow *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={selectedWorkflow.status === "ACTIVE"}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={selectedWorkflow.status === "ACTIVE"}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                  <select
                    value={formData.workflow_type}
                    onChange={(e) => setFormData({ ...formData, workflow_type: e.target.value })}
                    disabled={selectedWorkflow.status === "ACTIVE"}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    {WORKFLOW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    disabled={selectedWorkflow.status === "ACTIVE"}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                  <select
                    value={formData.entity_module}
                    onChange={(e) => setFormData({ ...formData, entity_module: e.target.value })}
                    disabled={selectedWorkflow.status === "ACTIVE"}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleEdit}
                disabled={submitting || selectedWorkflow.status === "ACTIVE"}
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
