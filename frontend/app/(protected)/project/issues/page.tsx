"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  RefreshCw,
  X,
  AlertCircle,
  Bug,
  Lightbulb,
  HelpCircle,
  CheckCircle,
  Clock,
  User,
  MessageSquare,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Project {
  id: string;
  code: string;
  name: string;
}

interface Issue {
  id: string;
  project_id: string;
  task_id: string;
  issue_number: string;
  title: string;
  description: string;
  issue_type: string;
  priority: string;
  status: string;
  category: string;
  reporter_name: string;
  assignee_name: string;
  due_date: string;
  reported_date: string;
  resolved_date: string;
  closed_date: string;
  is_blocking: boolean;
  resolution: string;
  resolution_notes: string;
  affected_areas: string;
}

const ISSUE_TYPES = [
  { value: "BUG", label: "Bug", icon: Bug, color: "bg-red-100 text-red-700" },
  { value: "PROBLEM", label: "Vấn đề", icon: AlertCircle, color: "bg-orange-100 text-orange-700" },
  { value: "CHANGE_REQUEST", label: "Yêu cầu thay đổi", icon: Lightbulb, color: "bg-blue-100 text-blue-700" },
  { value: "QUESTION", label: "Câu hỏi", icon: HelpCircle, color: "bg-purple-100 text-purple-700" },
];

const STATUSES = [
  { value: "OPEN", label: "Mở", color: "bg-blue-100 text-blue-700" },
  { value: "IN_PROGRESS", label: "Đang xử lý", color: "bg-yellow-100 text-yellow-700" },
  { value: "RESOLVED", label: "Đã giải quyết", color: "bg-green-100 text-green-700" },
  { value: "CLOSED", label: "Đóng", color: "bg-gray-100 text-gray-700" },
  { value: "REOPENED", label: "Mở lại", color: "bg-red-100 text-red-700" },
];

const PRIORITIES = [
  { value: "CRITICAL", label: "Nghiêm trọng", color: "bg-red-600 text-white" },
  { value: "HIGH", label: "Cao", color: "bg-orange-500 text-white" },
  { value: "MEDIUM", label: "Trung bình", color: "bg-yellow-500 text-white" },
  { value: "LOW", label: "Thấp", color: "bg-green-500 text-white" },
];

const initialFormData = {
  title: "",
  description: "",
  issue_type: "PROBLEM",
  priority: "MEDIUM",
  category: "",
  assignee_name: "",
  due_date: "",
  is_blocking: false,
  affected_areas: "",
};

export default function IssuesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
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

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let url = "/project/issues?size=200";
      if (selectedProjectId) {
        url += `&project_id=${selectedProjectId}`;
      }
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      const data = await apiFetch<{ items: Issue[] }>(url);
      setIssues(data.items || []);
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
    fetchIssues();
  }, [fetchIssues]);

  const handleCreate = async () => {
    if (!formData.title) {
      setFormError("Vui lòng nhập tiêu đề issue");
      return;
    }
    if (!selectedProjectId) {
      setFormError("Vui lòng chọn dự án");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch("/project/issues", {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProjectId,
          ...formData,
          due_date: formData.due_date || null,
        }),
      });
      setShowCreateModal(false);
      setFormData(initialFormData);
      fetchIssues();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedIssue || !formData.title) {
      setFormError("Vui lòng nhập tiêu đề issue");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch(`/project/issues/${selectedIssue.id}`, {
        method: "PUT",
        body: JSON.stringify({
          project_id: selectedIssue.project_id,
          ...formData,
          due_date: formData.due_date || null,
        }),
      });
      setShowEditModal(false);
      setSelectedIssue(null);
      setFormData(initialFormData);
      fetchIssues();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (issueId: string, status: string) => {
    try {
      await apiFetch(`/project/issues/${issueId}/status?status=${status}`, {
        method: "PATCH",
      });
      fetchIssues();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const openEditModal = (issue: Issue) => {
    setSelectedIssue(issue);
    setFormData({
      title: issue.title,
      description: issue.description || "",
      issue_type: issue.issue_type || "PROBLEM",
      priority: issue.priority || "MEDIUM",
      category: issue.category || "",
      assignee_name: issue.assignee_name || "",
      due_date: issue.due_date || "",
      is_blocking: issue.is_blocking || false,
      affected_areas: issue.affected_areas || "",
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const getTypeInfo = (type: string) => {
    return ISSUE_TYPES.find((t) => t.value === type) || ISSUE_TYPES[1];
  };

  const getStatusInfo = (status: string) => {
    return STATUSES.find((s) => s.value === status) || STATUSES[0];
  };

  const getPriorityInfo = (priority: string) => {
    return PRIORITIES.find((p) => p.value === priority) || PRIORITIES[2];
  };

  const filteredIssues = issues.filter(
    (i) =>
      i.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.issue_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalIssues = issues.length;
  const openIssues = issues.filter((i) => i.status === "OPEN").length;
  const inProgressIssues = issues.filter((i) => i.status === "IN_PROGRESS").length;
  const blockingIssues = issues.filter((i) => i.is_blocking && !["RESOLVED", "CLOSED"].includes(i.status)).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Issues</h1>
          <p className="text-gray-500">Theo dõi và giải quyết các vấn đề phát sinh</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchIssues}
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
            Tạo Issue
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalIssues}</p>
              <p className="text-sm text-gray-500">Tổng issues</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openIssues}</p>
              <p className="text-sm text-gray-500">Đang mở</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Bug className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressIssues}</p>
              <p className="text-sm text-gray-500">Đang xử lý</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{blockingIssues}</p>
              <p className="text-sm text-gray-500">Blocking</p>
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
            placeholder="Tìm kiếm issue..."
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
            onClick={fetchIssues}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" /> Thử lại
          </button>
        </div>
      )}

      {/* Issues List */}
      {!error && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
              {searchTerm ? "Không tìm thấy issue" : "Chưa có issue nào"}
            </div>
          ) : (
            filteredIssues.map((issue) => {
              const typeInfo = getTypeInfo(issue.issue_type);
              const statusInfo = getStatusInfo(issue.status);
              const priorityInfo = getPriorityInfo(issue.priority);
              const TypeIcon = typeInfo.icon;
              return (
                <div
                  key={issue.id}
                  className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow ${
                    issue.is_blocking ? "border-l-4 border-l-red-500" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">{issue.issue_number}</span>
                            {issue.is_blocking && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">BLOCKING</span>
                            )}
                          </div>
                          <h3 className="font-semibold mt-1">{issue.title}</h3>
                        </div>
                        <button
                          onClick={() => openEditModal(issue)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>

                      {issue.description && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{issue.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </span>
                        <select
                          value={issue.status}
                          onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 ${statusInfo.color}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        {issue.assignee_name && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            {issue.assignee_name}
                          </span>
                        )}
                        {issue.due_date && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {issue.due_date}
                          </span>
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Tạo Issue mới</h2>
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
                  placeholder="Mô tả ngắn gọn vấn đề"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Mô tả chi tiết vấn đề, bước tái hiện..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                  <select
                    value={formData.issue_type}
                    onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {ISSUE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ ưu tiên</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người xử lý</label>
                  <input
                    type="text"
                    value={formData.assignee_name}
                    onChange={(e) => setFormData({ ...formData, assignee_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: UI/UX, Backend, Database..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_blocking"
                  checked={formData.is_blocking}
                  onChange={(e) => setFormData({ ...formData, is_blocking: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="is_blocking" className="text-sm text-gray-700">
                  Issue này đang chặn tiến độ dự án (Blocking)
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
                {submitting ? "Đang tạo..." : "Tạo Issue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedIssue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Chỉnh sửa Issue - {selectedIssue.issue_number}</h2>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                  <select
                    value={formData.issue_type}
                    onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {ISSUE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ ưu tiên</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người xử lý</label>
                  <input
                    type="text"
                    value={formData.assignee_name}
                    onChange={(e) => setFormData({ ...formData, assignee_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_blocking"
                  checked={formData.is_blocking}
                  onChange={(e) => setFormData({ ...formData, is_blocking: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="edit_is_blocking" className="text-sm text-gray-700">
                  Blocking
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
