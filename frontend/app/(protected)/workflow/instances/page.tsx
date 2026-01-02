"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface WorkflowInstance {
  id: string;
  instance_number: string;
  workflow_name: string;
  workflow_code: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  initiator_name?: string;
  current_step_name?: string;
  entity_type?: string;
  entity_reference?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface WorkflowDefinition {
  id: string;
  code: string;
  name: string;
  status: string;
}

interface ApiResponse<T> {
  items: T[];
  total: number;
}

const STATUSES = ["ALL", "RUNNING", "COMPLETED", "REJECTED", "CANCELLED", "PENDING"];

export default function WorkflowInstancesPage() {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [instanceDetails, setInstanceDetails] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    workflow_id: "",
    title: "",
    description: "",
    entity_type: "",
    entity_reference: "",
    priority: 5,
    notes: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const [instancesData, workflowsData] = await Promise.all([
        apiFetch<ApiResponse<WorkflowInstance>>(`/workflow/workflow-instances${params}`),
        apiFetch<ApiResponse<WorkflowDefinition>>("/workflow/workflow-definitions?status=ACTIVE"),
      ]);
      setInstances(instancesData.items || []);
      setWorkflows(workflowsData.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const openCreateModal = () => {
    setFormData({
      workflow_id: workflows.length > 0 ? workflows[0].id : "",
      title: "",
      description: "",
      entity_type: "",
      entity_reference: "",
      priority: 5,
      notes: "",
    });
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!formData.workflow_id || !formData.title.trim()) {
      alert("Vui lòng chọn workflow và nhập tiêu đề");
      return;
    }
    try {
      setSaving(true);
      await apiFetch("/workflow/workflow-instances", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi tạo instance");
    } finally {
      setSaving(false);
    }
  };

  const openDetailModal = async (instance: WorkflowInstance) => {
    setSelectedInstance(instance);
    setShowDetailModal(true);
    try {
      const details = await apiFetch<any>(`/workflow/workflow-instances/${instance.id}`);
      setInstanceDetails(details);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (action: string) => {
    if (!selectedInstance) return;
    const comments = prompt("Nhập ghi chú (tùy chọn):");
    try {
      await apiFetch(`/workflow/workflow-instances/${selectedInstance.id}/action?action=${action}&comments=${encodeURIComponent(comments || "")}`, {
        method: "POST",
      });
      setShowDetailModal(false);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi");
    }
  };

  const handleCancel = async (instanceId: string) => {
    const reason = prompt("Nhập lý do hủy:");
    if (!reason) return;
    try {
      await apiFetch(`/workflow/workflow-instances/${instanceId}/cancel?reason=${encodeURIComponent(reason)}`, {
        method: "POST",
      });
      setShowDetailModal(false);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 text-green-700";
      case "RUNNING": return "bg-blue-100 text-blue-700";
      case "REJECTED": return "bg-red-100 text-red-700";
      case "CANCELLED": return "bg-gray-200 text-gray-500";
      case "PENDING": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "RUNNING": return <Play className="w-4 h-4 text-blue-500" />;
      case "REJECTED": return <XCircle className="w-4 h-4 text-red-500" />;
      case "CANCELLED": return <X className="w-4 h-4 text-gray-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const filteredInstances = instances.filter(
    (inst) =>
      inst.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.instance_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.workflow_name.toLowerCase().includes(searchTerm.toLowerCase())
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
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          <RefreshCw className="w-4 h-4" /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Instances</h1>
          <p className="text-gray-500">Các quy trình đang chạy ({instances.length})</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 border rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Khởi tạo Workflow
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 border-b overflow-x-auto">
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              statusFilter === status
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {status === "ALL" ? "Tất cả" : status}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Instances Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instance</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workflow</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bước hiện tại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tạo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredInstances.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Không có workflow instance nào
                </td>
              </tr>
            ) : (
              filteredInstances.map((inst) => (
                <tr key={inst.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs text-gray-500">{inst.instance_number}</p>
                      <p className="font-medium">{inst.title}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                      {inst.workflow_name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(inst.status)}
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(inst.status)}`}>
                        {inst.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{inst.current_step_name || "-"}</td>
                  <td className="px-4 py-3 text-sm">{inst.initiator_name || "-"}</td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(inst.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openDetailModal(inst)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {inst.status === "RUNNING" && (
                        <button
                          onClick={() => handleCancel(inst.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Hủy"
                        >
                          <X className="w-4 h-4" />
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Khởi tạo Workflow mới</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Workflow <span className="text-red-500">*</span></label>
                <select
                  value={formData.workflow_id}
                  onChange={(e) => setFormData({ ...formData, workflow_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn workflow --</option>
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      [{wf.code}] {wf.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tiêu đề <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tiêu đề yêu cầu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Loại đối tượng</label>
                  <input
                    type="text"
                    value={formData.entity_type}
                    onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="PO, PR, Contract..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mã tham chiếu</label>
                  <input
                    type="text"
                    value={formData.entity_reference}
                    onChange={(e) => setFormData({ ...formData, entity_reference: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="PO-001"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Độ ưu tiên (1-10)</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                  max="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Đang tạo..." : "Khởi tạo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedInstance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">{selectedInstance.title}</h2>
                <p className="text-sm text-gray-500">{selectedInstance.instance_number}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedInstance.status)}
                <span className={`px-2 py-1 text-sm rounded-full ${getStatusColor(selectedInstance.status)}`}>
                  {selectedInstance.status}
                </span>
                <span className="text-sm text-gray-500">
                  Workflow: {selectedInstance.workflow_name}
                </span>
              </div>

              {instanceDetails && (
                <>
                  {/* Steps */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">Các bước xử lý</h3>
                    <div className="space-y-2">
                      {instanceDetails.step_instances?.map((step: any, index: number) => (
                        <div
                          key={step.id}
                          className={`flex items-center gap-3 p-2 rounded ${
                            step.status === "ACTIVE"
                              ? "bg-blue-50 border border-blue-200"
                              : step.status === "COMPLETED"
                              ? "bg-green-50"
                              : "bg-gray-50"
                          }`}
                        >
                          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{step.step_name}</p>
                            {step.action_by_name && (
                              <p className="text-xs text-gray-500">
                                {step.action_taken} bởi {step.action_by_name}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(step.status)}`}>
                            {step.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* History */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">Lịch sử</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {instanceDetails.history?.map((h: any) => (
                        <div key={h.id} className="text-sm border-l-2 border-gray-200 pl-3 py-1">
                          <p className="font-medium">{h.event_description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(h.created_at).toLocaleString("vi-VN")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {selectedInstance.status === "RUNNING" && (
              <div className="flex justify-end gap-2 p-4 border-t">
                <button
                  onClick={() => handleAction("REJECT")}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Từ chối
                </button>
                <button
                  onClick={() => handleAction("APPROVE")}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Phê duyệt
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
