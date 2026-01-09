"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  RefreshCw,
  X,
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  CheckCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Project {
  id: string;
  code: string;
  name: string;
}

interface Risk {
  id: string;
  project_id: string;
  risk_number: string;
  title: string;
  description: string;
  category: string;
  probability: string;
  impact: string;
  risk_score: number;
  status: string;
  cost_impact: number;
  schedule_impact_days: number;
  owner_name: string;
  target_resolution_date: string;
  response_strategy: string;
  response_plan: string;
  contingency_plan: string;
  identified_date: string;
  actual_resolution_date: string;
}

const STATUSES = [
  { value: "IDENTIFIED", label: "Đã nhận diện", color: "bg-blue-100 text-blue-700" },
  { value: "ASSESSING", label: "Đang đánh giá", color: "bg-yellow-100 text-yellow-700" },
  { value: "MITIGATING", label: "Đang xử lý", color: "bg-orange-100 text-orange-700" },
  { value: "MONITORING", label: "Theo dõi", color: "bg-purple-100 text-purple-700" },
  { value: "RESOLVED", label: "Đã giải quyết", color: "bg-green-100 text-green-700" },
  { value: "CLOSED", label: "Đóng", color: "bg-gray-100 text-gray-700" },
];

const PROBABILITIES = [
  { value: "VERY_LOW", label: "Rất thấp", score: 1 },
  { value: "LOW", label: "Thấp", score: 2 },
  { value: "MEDIUM", label: "Trung bình", score: 3 },
  { value: "HIGH", label: "Cao", score: 4 },
  { value: "VERY_HIGH", label: "Rất cao", score: 5 },
];

const IMPACTS = [
  { value: "NEGLIGIBLE", label: "Không đáng kể", score: 1 },
  { value: "MINOR", label: "Nhỏ", score: 2 },
  { value: "MODERATE", label: "Vừa", score: 3 },
  { value: "MAJOR", label: "Lớn", score: 4 },
  { value: "CRITICAL", label: "Nghiêm trọng", score: 5 },
];

const CATEGORIES = [
  "Technical",
  "Schedule",
  "Cost",
  "Resource",
  "Quality",
  "External",
  "Legal",
  "Security",
];

const initialFormData = {
  title: "",
  description: "",
  category: "",
  probability: "MEDIUM",
  impact: "MODERATE",
  cost_impact: 0,
  schedule_impact_days: 0,
  owner_name: "",
  target_resolution_date: "",
  response_strategy: "",
  response_plan: "",
  contingency_plan: "",
};

export default function RisksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
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

  const fetchRisks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let url = "/project/risks?size=200";
      if (selectedProjectId) {
        url += `&project_id=${selectedProjectId}`;
      }
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      const data = await apiFetch<{ items: Risk[] }>(url);
      setRisks(data.items || []);
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
    fetchRisks();
  }, [fetchRisks]);

  const handleCreate = async () => {
    if (!formData.title) {
      setFormError("Vui lòng nhập tiêu đề rủi ro");
      return;
    }
    if (!selectedProjectId) {
      setFormError("Vui lòng chọn dự án");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch("/project/risks", {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProjectId,
          ...formData,
          target_resolution_date: formData.target_resolution_date || null,
        }),
      });
      setShowCreateModal(false);
      setFormData(initialFormData);
      fetchRisks();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedRisk || !formData.title) {
      setFormError("Vui lòng nhập tiêu đề rủi ro");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch(`/project/risks/${selectedRisk.id}`, {
        method: "PUT",
        body: JSON.stringify({
          project_id: selectedRisk.project_id,
          ...formData,
          target_resolution_date: formData.target_resolution_date || null,
        }),
      });
      setShowEditModal(false);
      setSelectedRisk(null);
      setFormData(initialFormData);
      fetchRisks();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (riskId: string, status: string) => {
    try {
      await apiFetch(`/project/risks/${riskId}/status?status=${status}`, {
        method: "PATCH",
      });
      fetchRisks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const openEditModal = (risk: Risk) => {
    setSelectedRisk(risk);
    setFormData({
      title: risk.title,
      description: risk.description || "",
      category: risk.category || "",
      probability: risk.probability || "MEDIUM",
      impact: risk.impact || "MODERATE",
      cost_impact: risk.cost_impact || 0,
      schedule_impact_days: risk.schedule_impact_days || 0,
      owner_name: risk.owner_name || "",
      target_resolution_date: risk.target_resolution_date || "",
      response_strategy: risk.response_strategy || "",
      response_plan: risk.response_plan || "",
      contingency_plan: risk.contingency_plan || "",
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const getStatusInfo = (status: string) => {
    return STATUSES.find((s) => s.value === status) || STATUSES[0];
  };

  const getRiskScoreColor = (score: number) => {
    if (score <= 5) return "bg-green-100 text-green-700";
    if (score <= 10) return "bg-yellow-100 text-yellow-700";
    if (score <= 15) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  };

  const filteredRisks = risks.filter(
    (r) =>
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.risk_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalRisks = risks.length;
  const highRisks = risks.filter((r) => r.risk_score >= 15).length;
  const activeRisks = risks.filter((r) => !["RESOLVED", "CLOSED"].includes(r.status)).length;
  const resolvedRisks = risks.filter((r) => r.status === "RESOLVED").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý rủi ro</h1>
          <p className="text-gray-500">Nhận diện, đánh giá và theo dõi rủi ro dự án</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRisks}
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
            Thêm rủi ro
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRisks}</p>
              <p className="text-sm text-gray-500">Tổng rủi ro</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{highRisks}</p>
              <p className="text-sm text-gray-500">Rủi ro cao</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Shield className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeRisks}</p>
              <p className="text-sm text-gray-500">Đang theo dõi</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resolvedRisks}</p>
              <p className="text-sm text-gray-500">Đã giải quyết</p>
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
            placeholder="Tìm kiếm rủi ro..."
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
            onClick={fetchRisks}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" /> Thử lại
          </button>
        </div>
      )}

      {/* Risks Table */}
      {!error && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiêu đề</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Xác suất</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tác động</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Điểm</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người phụ trách</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredRisks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm ? "Không tìm thấy rủi ro" : "Chưa có rủi ro nào"}
                  </td>
                </tr>
              ) : (
                filteredRisks.map((risk) => {
                  const statusInfo = getStatusInfo(risk.status);
                  const probInfo = PROBABILITIES.find((p) => p.value === risk.probability);
                  const impactInfo = IMPACTS.find((i) => i.value === risk.impact);
                  return (
                    <tr key={risk.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-sm">{risk.risk_number}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{risk.title}</p>
                          {risk.category && (
                            <p className="text-xs text-gray-500">{risk.category}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{probInfo?.label || risk.probability}</td>
                      <td className="px-4 py-3 text-sm">{impactInfo?.label || risk.impact}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getRiskScoreColor(risk.risk_score || 0)}`}>
                          {risk.risk_score || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={risk.status}
                          onChange={(e) => handleStatusChange(risk.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 ${statusInfo.color}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm">{risk.owner_name || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(risk)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Thêm rủi ro mới</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Mô tả ngắn gọn rủi ro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Chọn danh mục</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Xác suất</label>
                  <select
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PROBABILITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tác động</label>
                  <select
                    value={formData.impact}
                    onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {IMPACTS.map((i) => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chi phí ảnh hưởng (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cost_impact}
                    onChange={(e) => setFormData({ ...formData, cost_impact: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh hưởng tiến độ (ngày)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.schedule_impact_days}
                    onChange={(e) => setFormData({ ...formData, schedule_impact_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người phụ trách</label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày giải quyết mục tiêu</label>
                  <input
                    type="date"
                    value={formData.target_resolution_date}
                    onChange={(e) => setFormData({ ...formData, target_resolution_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chiến lược ứng phó</label>
                <input
                  type="text"
                  value={formData.response_strategy}
                  onChange={(e) => setFormData({ ...formData, response_strategy: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Avoid, Mitigate, Transfer, Accept"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kế hoạch ứng phó</label>
                <textarea
                  value={formData.response_plan}
                  onChange={(e) => setFormData({ ...formData, response_plan: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kế hoạch dự phòng</label>
                <textarea
                  value={formData.contingency_plan}
                  onChange={(e) => setFormData({ ...formData, contingency_plan: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
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
                {submitting ? "Đang tạo..." : "Tạo rủi ro"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - similar structure to Create */}
      {showEditModal && selectedRisk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Chỉnh sửa rủi ro - {selectedRisk.risk_number}</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Chọn danh mục</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Xác suất</label>
                  <select
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PROBABILITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tác động</label>
                  <select
                    value={formData.impact}
                    onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {IMPACTS.map((i) => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người phụ trách</label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày giải quyết mục tiêu</label>
                  <input
                    type="date"
                    value={formData.target_resolution_date}
                    onChange={(e) => setFormData({ ...formData, target_resolution_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kế hoạch ứng phó</label>
                <textarea
                  value={formData.response_plan}
                  onChange={(e) => setFormData({ ...formData, response_plan: e.target.value })}
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
