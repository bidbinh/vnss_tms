"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Play,
  Check,
  X,
  User,
  Calendar,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface WorkflowTask {
  id: string;
  task_number: string;
  title: string;
  description?: string;
  task_type: string;
  status: string;
  priority: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  claimed_by_id?: string;
  claimed_by_name?: string;
  due_date?: string;
  sla_hours?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface ApiResponse {
  items: WorkflowTask[];
  total: number;
}

const STATUSES = ["ALL", "PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function WorkflowTasksPage() {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const data = await apiFetch<ApiResponse>(`/workflow/workflow-tasks${params}`);
      setTasks(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter]);

  const handleClaim = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await apiFetch(`/workflow/workflow-tasks/${taskId}/claim`, { method: "PATCH" });
      fetchTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStart = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await apiFetch(`/workflow/workflow-tasks/${taskId}/start`, { method: "PATCH" });
      fetchTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (taskId: string) => {
    const comments = prompt("Nhập ghi chú hoàn thành (tùy chọn):");
    try {
      setActionLoading(taskId);
      await apiFetch(`/workflow/workflow-tasks/${taskId}/complete?result=COMPLETED&comments=${encodeURIComponent(comments || "")}`, { method: "PATCH" });
      fetchTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (taskId: string) => {
    const reason = prompt("Nhập lý do hủy:");
    if (!reason) return;
    try {
      setActionLoading(taskId);
      await apiFetch(`/workflow/workflow-tasks/${taskId}/cancel?reason=${encodeURIComponent(reason)}`, { method: "PATCH" });
      fetchTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 text-green-700";
      case "IN_PROGRESS": return "bg-blue-100 text-blue-700";
      case "ASSIGNED": return "bg-purple-100 text-purple-700";
      case "PENDING": return "bg-yellow-100 text-yellow-700";
      case "CANCELLED": return "bg-gray-200 text-gray-500";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "text-red-600 font-bold";
      case "HIGH": return "text-red-500";
      case "NORMAL": return "text-yellow-500";
      case "LOW": return "text-green-500";
      default: return "text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "IN_PROGRESS": return <Clock className="w-4 h-4 text-blue-500" />;
      case "CANCELLED": return <X className="w-4 h-4 text-gray-500" />;
      default: return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task_number.toLowerCase().includes(searchTerm.toLowerCase())
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
        <button onClick={fetchTasks} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          <RefreshCw className="w-4 h-4" /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Tasks</h1>
          <p className="text-gray-500">Quản lý các task trong quy trình ({tasks.length} tasks)</p>
        </div>
        <button onClick={fetchTasks} className="p-2 border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />
        </button>
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
            {status === "ALL" ? "Tất cả" : status.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm kiếm task..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Không có task nào
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(task.status)}
                    <span className="text-xs text-gray-500">{task.task_number}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900">{task.title}</h3>
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    {task.assigned_to_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {task.assigned_to_name}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.due_date).toLocaleDateString("vi-VN")}
                      </span>
                    )}
                    {task.sla_hours && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        SLA: {task.sla_hours}h
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {task.status === "PENDING" && !task.claimed_by_id && (
                    <button
                      onClick={() => handleClaim(task.id)}
                      disabled={actionLoading === task.id}
                      className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      Nhận task
                    </button>
                  )}
                  {(task.status === "PENDING" || task.status === "ASSIGNED") && (
                    <button
                      onClick={() => handleStart(task.id)}
                      disabled={actionLoading === task.id}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="Bắt đầu"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  {task.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => handleComplete(task.id)}
                      disabled={actionLoading === task.id}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                      title="Hoàn thành"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
                    <button
                      onClick={() => handleCancel(task.id)}
                      disabled={actionLoading === task.id}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      title="Hủy"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
