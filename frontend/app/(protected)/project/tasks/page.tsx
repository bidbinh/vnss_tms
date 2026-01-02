"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Clock,
  RefreshCw,
  X,
  Edit2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Task {
  id: string;
  task_number: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  task_type: string;
  project_id: string;
  assignee_id?: string;
  assignee_name?: string;
  start_date?: string;
  due_date: string;
  estimated_hours: number;
  actual_hours: number;
  story_points?: number;
  labels?: string;
  notes?: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

interface ApiResponse<T> {
  items: T[];
  total: number;
}

const TASK_TYPES = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK", "FEATURE", "IMPROVEMENT"];
const PRIORITIES = ["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"];
const STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "CANCELLED"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    project_id: "",
    title: "",
    description: "",
    task_type: "TASK",
    priority: "MEDIUM",
    assignee_name: "",
    start_date: "",
    due_date: "",
    estimated_hours: 0,
    story_points: 0,
    labels: "",
    notes: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksData, projectsData] = await Promise.all([
        apiFetch<ApiResponse<Task>>("/project/tasks"),
        apiFetch<ApiResponse<Project>>("/project/projects"),
      ]);
      setTasks(tasksData.items || []);
      setProjects(projectsData.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      project_id: projects.length > 0 ? projects[0].id : "",
      title: "",
      description: "",
      task_type: "TASK",
      priority: "MEDIUM",
      assignee_name: "",
      start_date: "",
      due_date: "",
      estimated_hours: 0,
      story_points: 0,
      labels: "",
      notes: "",
    });
  };

  const openCreateModal = () => {
    resetForm();
    if (projects.length > 0) {
      setFormData((prev) => ({ ...prev, project_id: projects[0].id }));
    }
    setShowCreateModal(true);
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      project_id: task.project_id,
      title: task.title,
      description: task.description || "",
      task_type: task.task_type,
      priority: task.priority,
      assignee_name: task.assignee_name || "",
      start_date: task.start_date || "",
      due_date: task.due_date || "",
      estimated_hours: task.estimated_hours || 0,
      story_points: task.story_points || 0,
      labels: task.labels || "",
      notes: task.notes || "",
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (task: Task) => {
    setSelectedTask(task);
    setShowDeleteModal(true);
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.project_id) {
      alert("Vui lòng nhập tiêu đề và chọn dự án");
      return;
    }

    try {
      setSaving(true);
      await apiFetch("/project/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          estimated_hours: formData.estimated_hours || 0,
          story_points: formData.story_points || null,
          start_date: formData.start_date || null,
          due_date: formData.due_date || null,
        }),
      });
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi tạo task");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedTask || !formData.title.trim()) {
      alert("Vui lòng nhập tiêu đề");
      return;
    }

    try {
      setSaving(true);
      await apiFetch(`/project/tasks/${selectedTask.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          estimated_hours: formData.estimated_hours || 0,
          story_points: formData.story_points || null,
          start_date: formData.start_date || null,
          due_date: formData.due_date || null,
        }),
      });
      setShowEditModal(false);
      setSelectedTask(null);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi cập nhật task");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (task: Task, newStatus: string) => {
    try {
      await apiFetch(`/project/tasks/${task.id}/status?status=${newStatus}`, {
        method: "PATCH",
      });
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi cập nhật trạng thái");
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;

    try {
      setSaving(true);
      // Note: Backend doesn't have delete endpoint yet, we'll change status to CANCELLED
      await apiFetch(`/project/tasks/${selectedTask.id}/status?status=CANCELLED`, {
        method: "PATCH",
      });
      setShowDeleteModal(false);
      setSelectedTask(null);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi xóa task");
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DONE":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "IN_PROGRESS":
      case "IN_REVIEW":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "BLOCKED":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "CANCELLED":
        return <X className="w-4 h-4 text-gray-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DONE":
        return "bg-green-100 text-green-700";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700";
      case "IN_REVIEW":
        return "bg-purple-100 text-purple-700";
      case "BLOCKED":
        return "bg-red-100 text-red-700";
      case "CANCELLED":
        return "bg-gray-200 text-gray-500";
      case "TODO":
        return "bg-gray-100 text-gray-700";
      case "BACKLOG":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGHEST":
      case "HIGH":
        return "text-red-500";
      case "MEDIUM":
        return "text-yellow-500";
      case "LOW":
      case "LOWEST":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "BUG":
        return "bg-red-100 text-red-700";
      case "FEATURE":
        return "bg-purple-100 text-purple-700";
      case "STORY":
        return "bg-blue-100 text-blue-700";
      case "EPIC":
        return "bg-indigo-100 text-indigo-700";
      case "IMPROVEMENT":
        return "bg-teal-100 text-teal-700";
      case "TASK":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "ALL" || task.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    ALL: tasks.length,
    TODO: tasks.filter((t) => t.status === "TODO").length,
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    IN_REVIEW: tasks.filter((t) => t.status === "IN_REVIEW").length,
    BLOCKED: tasks.filter((t) => t.status === "BLOCKED").length,
    DONE: tasks.filter((t) => t.status === "DONE").length,
  };

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
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          <RefreshCw className="w-4 h-4" /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500">Quản lý công việc ({tasks.length} tasks)</p>
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
            Tạo Task mới
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 border-b overflow-x-auto">
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              statusFilter === status
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {status === "ALL" ? "Tất cả" : status.replace("_", " ")} ({count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm task..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Task
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Assignee
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Due Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Hours
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Không có task nào
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <div>
                        <p className="text-xs text-gray-500">{task.task_number}</p>
                        <p className="font-medium">{task.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${getTypeColor(task.task_type)}`}>
                      {task.task_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      className={`px-2 py-1 text-xs rounded-full border-0 cursor-pointer ${getStatusColor(task.status)}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{task.assignee_name || "-"}</td>
                  <td className="px-4 py-3 text-sm">{task.due_date || "-"}</td>
                  <td className="px-4 py-3 text-sm">
                    {task.actual_hours}/{task.estimated_hours}h
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(task)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(task)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Tạo Task mới</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Dự án <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn dự án --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tiêu đề task"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Mô tả chi tiết task"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Loại Task</label>
                  <select
                    value={formData.task_type}
                    onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Độ ưu tiên</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Người thực hiện</label>
                <input
                  type="text"
                  value={formData.assignee_name}
                  onChange={(e) => setFormData({ ...formData, assignee_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Tên người thực hiện"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ngày hết hạn</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ước tính (giờ)</label>
                  <input
                    type="number"
                    value={formData.estimated_hours}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Story Points</label>
                  <input
                    type="number"
                    value={formData.story_points}
                    onChange={(e) =>
                      setFormData({ ...formData, story_points: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Labels (phân cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  value={formData.labels}
                  onChange={(e) => setFormData({ ...formData, labels: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="frontend, urgent, review"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Ghi chú thêm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Đang tạo..." : "Tạo Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                Sửa Task: {selectedTask.task_number}
              </h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Dự án</label>
                <select
                  value={formData.project_id}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium mb-1">Loại Task</label>
                  <select
                    value={formData.task_type}
                    onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Độ ưu tiên</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Người thực hiện</label>
                <input
                  type="text"
                  value={formData.assignee_name}
                  onChange={(e) => setFormData({ ...formData, assignee_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ngày hết hạn</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ước tính (giờ)</label>
                  <input
                    type="number"
                    value={formData.estimated_hours}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Story Points</label>
                  <input
                    type="number"
                    value={formData.story_points}
                    onChange={(e) =>
                      setFormData({ ...formData, story_points: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Labels</label>
                <input
                  type="text"
                  value={formData.labels}
                  onChange={(e) => setFormData({ ...formData, labels: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold">Xóa Task</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Bạn có chắc chắn muốn hủy task{" "}
                <span className="font-medium">{selectedTask.task_number}</span>? Task sẽ được
                chuyển sang trạng thái CANCELLED.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
