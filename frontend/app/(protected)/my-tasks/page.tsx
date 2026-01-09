"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Plus,
  Play,
  Check,
  X,
  User,
  Calendar,
  Building2,
  UserCircle,
  Eye,
  MessageSquare,
  Paperclip,
  ChevronRight,
  AlertTriangle,
  Filter,
  MoreHorizontal,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import TaskDetailDrawer from "./TaskDetailDrawer";
import CreateTaskModal from "./CreateTaskModal";
import EditTaskModal from "./EditTaskModal";

// Types
interface UserTask {
  id: string;
  task_number: string;
  title: string;
  description?: string;
  task_type: string;
  scope: string;
  source: string;
  status: string;
  priority: string;
  assigned_to_id: string;
  assigned_to_name?: string;
  assigned_by_name?: string;
  due_date?: string;
  source_module?: string;
  source_entity_code?: string;
  source_url?: string;
  is_overdue: boolean;
  comments_count: number;
  attachments_json?: string;
  created_at: string;
}

interface TaskCounts {
  total_active: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  need_approval: number;
  watching: number;
}

interface ApiResponse {
  items: UserTask[];
  total: number;
  page: number;
  size: number;
  pages: number;
  counts: TaskCounts;
}

// Constants
const TABS = [
  { key: "active", label: "Cần làm", icon: Play },
  { key: "pending", label: "Chưa bắt đầu", icon: Clock },
  { key: "approval", label: "Cần duyệt", icon: CheckCircle2 },
  { key: "watching", label: "Đang theo dõi", icon: Eye },
  { key: "completed", label: "Đã xong", icon: Check },
  { key: "all", label: "Tất cả", icon: null },
];

const SCOPES = [
  { key: "all", label: "Tất cả", icon: null },
  { key: "COMPANY", label: "Công ty", icon: Building2 },
  { key: "PERSONAL", label: "Cá nhân", icon: UserCircle },
];

const PRIORITIES = {
  URGENT: { label: "Khẩn cấp", color: "bg-red-100 text-red-700 border-red-200" },
  HIGH: { label: "Cao", color: "bg-orange-100 text-orange-700 border-orange-200" },
  NORMAL: { label: "Bình thường", color: "bg-blue-100 text-blue-700 border-blue-200" },
  LOW: { label: "Thấp", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

const STATUSES = {
  PENDING: { label: "Chưa bắt đầu", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  IN_PROGRESS: { label: "Đang thực hiện", color: "bg-blue-100 text-blue-700", icon: Play },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  CANCELLED: { label: "Đã hủy", color: "bg-gray-100 text-gray-500", icon: X },
};

const TASK_TYPES = {
  ACTION: { label: "Cần thực hiện", icon: Play },
  APPROVAL: { label: "Cần phê duyệt", icon: CheckCircle2 },
  REVIEW: { label: "Theo dõi", icon: Eye },
  NOTIFICATION: { label: "Thông báo", icon: MessageSquare },
};

const SOURCE_MODULES = {
  MANUAL: { label: "Tự tạo", color: "bg-gray-100 text-gray-600" },
  TMS: { label: "TMS", color: "bg-blue-100 text-blue-600" },
  HRM: { label: "HRM", color: "bg-purple-100 text-purple-600" },
  CRM: { label: "CRM", color: "bg-green-100 text-green-600" },
  ACCOUNTING: { label: "Accounting", color: "bg-yellow-100 text-yellow-600" },
  WMS: { label: "WMS", color: "bg-orange-100 text-orange-600" },
  PROJECT: { label: "Project", color: "bg-pink-100 text-pink-600" },
  WORKFLOW: { label: "Workflow", color: "bg-indigo-100 text-indigo-600" },
  SYSTEM: { label: "System", color: "bg-red-100 text-red-600" },
};

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [counts, setCounts] = useState<TaskCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState("active");
  const [activeScope, setActiveScope] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  // UI State
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (activeTab !== "all") params.append("tab", activeTab);
      if (activeScope !== "all") params.append("scope", activeScope);
      if (searchTerm) params.append("search", searchTerm);
      if (priorityFilter) params.append("priority", priorityFilter);

      const queryString = params.toString();
      const url = `/my-tasks${queryString ? `?${queryString}` : ""}`;

      const data = await apiFetch<ApiResponse>(url);
      setTasks(data.items || []);
      setCounts(data.counts || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeScope, searchTerm, priorityFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Actions
  const handleStartTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionLoading(taskId);
      await apiFetch(`/my-tasks/${taskId}/start`, { method: "PATCH" });
      toast.success("Đã bắt đầu task");
      fetchTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionLoading(taskId);
      await apiFetch(`/my-tasks/${taskId}/complete`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      toast.success("Đã hoàn thành task");
      fetchTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionLoading(taskId);
      await apiFetch(`/my-tasks/${taskId}/approve`, { method: "PATCH" });
      toast.success("Đã phê duyệt");
      fetchTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const reason = prompt("Nhập lý do từ chối:");
    if (!reason) return;

    try {
      setActionLoading(taskId);
      await apiFetch(`/my-tasks/${taskId}/reject?reason=${encodeURIComponent(reason)}`, { method: "PATCH" });
      toast.success("Đã từ chối");
      fetchTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setActionLoading(null);
    }
  };

  // Format date - consistent with groupTasksByDate logic
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();

    // Compare dates only (ignore time) - same logic as groupTasksByDate
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dueDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dueDateOnly.getTime() === today.getTime()) return "Hôm nay";
    if (dueDateOnly.getTime() === tomorrow.getTime()) return "Ngày mai";

    // Calculate difference in days for past dates
    const diffTime = dueDateOnly.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === -1) return "Hôm qua";
    if (diffDays < -1) return `Quá hạn ${Math.abs(diffDays)} ngày`;

    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  // Group tasks by date
  const groupTasksByDate = (tasks: UserTask[]) => {
    const groups: { [key: string]: UserTask[] } = {
      overdue: [],
      today: [],
      tomorrow: [],
      this_week: [],
      later: [],
      no_date: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    tasks.forEach((task) => {
      if (!task.due_date) {
        groups.no_date.push(task);
        return;
      }

      const dueDate = new Date(task.due_date);
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

      if (dueDateOnly < today) {
        groups.overdue.push(task);
      } else if (dueDateOnly.getTime() === today.getTime()) {
        groups.today.push(task);
      } else if (dueDateOnly.getTime() === tomorrow.getTime()) {
        groups.tomorrow.push(task);
      } else if (dueDateOnly < weekEnd) {
        groups.this_week.push(task);
      } else {
        groups.later.push(task);
      }
    });

    return groups;
  };

  const groupedTasks = groupTasksByDate(tasks);

  // Render task card
  const renderTaskCard = (task: UserTask) => {
    const status = STATUSES[task.status as keyof typeof STATUSES] || STATUSES.PENDING;
    const priority = PRIORITIES[task.priority as keyof typeof PRIORITIES] || PRIORITIES.NORMAL;
    const taskType = TASK_TYPES[task.task_type as keyof typeof TASK_TYPES] || TASK_TYPES.ACTION;
    const source = SOURCE_MODULES[task.source as keyof typeof SOURCE_MODULES] || SOURCE_MODULES.MANUAL;
    const StatusIcon = status.icon;
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "COMPLETED";

    return (
      <div
        key={task.id}
        onClick={() => setSelectedTask(task)}
        className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer ${
          isOverdue ? "border-red-200 bg-red-50/30" : "border-gray-200"
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox / Status Icon */}
          <div className="mt-0.5">
            {task.status === "COMPLETED" ? (
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            ) : task.status === "IN_PROGRESS" ? (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <Play className="w-3 h-3 text-white" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-gray-400" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs text-gray-400">{task.task_number}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${source.color}`}>{source.label}</span>
              {task.scope === "PERSONAL" && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">Cá nhân</span>
              )}
              {task.task_type === "APPROVAL" && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">Cần duyệt</span>
              )}
            </div>

            {/* Title */}
            <h3 className={`font-medium text-gray-900 ${task.status === "COMPLETED" ? "line-through text-gray-400" : ""}`}>
              {task.title}
            </h3>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
            )}

            {/* Source entity link */}
            {task.source_entity_code && task.source_url && (
              <a
                href={task.source_url}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                {task.source_entity_code}
              </a>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 flex-wrap">
              {task.due_date && (
                <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                  {isOverdue && <AlertTriangle className="w-3 h-3" />}
                  <Calendar className="w-3 h-3" />
                  {formatDate(task.due_date)}
                </span>
              )}
              {task.assigned_by_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {task.assigned_by_name}
                </span>
              )}
              {task.comments_count > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {task.comments_count}
                </span>
              )}
              {task.attachments_json && JSON.parse(task.attachments_json).length > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {JSON.parse(task.attachments_json).length}
                </span>
              )}
            </div>
          </div>

          {/* Priority & Actions */}
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs px-2 py-0.5 rounded border ${priority.color}`}>{priority.label}</span>

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              {/* Edit button - always visible for non-completed tasks */}
              {task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditTaskId(task.id);
                  }}
                  className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
                  title="Chỉnh sửa"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}

              {task.task_type === "APPROVAL" && task.status !== "COMPLETED" && (
                <>
                  <button
                    onClick={(e) => handleApproveTask(task.id, e)}
                    disabled={actionLoading === task.id}
                    className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50"
                    title="Phê duyệt"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleRejectTask(task.id, e)}
                    disabled={actionLoading === task.id}
                    className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                    title="Từ chối"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}

              {task.task_type !== "APPROVAL" && task.status === "PENDING" && (
                <button
                  onClick={(e) => handleStartTask(task.id, e)}
                  disabled={actionLoading === task.id}
                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                  title="Bắt đầu"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}

              {task.task_type !== "APPROVAL" && task.status === "IN_PROGRESS" && (
                <button
                  onClick={(e) => handleCompleteTask(task.id, e)}
                  disabled={actionLoading === task.id}
                  className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50"
                  title="Hoàn thành"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render group section
  const renderGroupSection = (title: string, tasks: UserTask[], icon?: React.ReactNode, color?: string) => {
    if (tasks.length === 0) return null;

    return (
      <div className="mb-6">
        <div className={`flex items-center gap-2 mb-3 ${color || "text-gray-700"}`}>
          {icon}
          <h2 className="font-semibold">{title}</h2>
          <span className="text-sm text-gray-400">({tasks.length})</span>
        </div>
        <div className="space-y-3">
          {tasks.map(renderTaskCard)}
        </div>
      </div>
    );
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Công việc của tôi</h1>
          <p className="text-gray-500">Quản lý tất cả công việc cần xử lý</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTasks}
            className="p-2 border rounded-lg hover:bg-gray-50"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Tạo task mới
          </button>
        </div>
      </div>

      {/* Counts Summary */}
      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className="bg-white rounded-xl border p-3">
            <div className="text-2xl font-bold text-gray-900">{counts.total_active}</div>
            <div className="text-xs text-gray-500">Đang hoạt động</div>
          </div>
          <div className="bg-white rounded-xl border p-3">
            <div className="text-2xl font-bold text-yellow-600">{counts.pending}</div>
            <div className="text-xs text-gray-500">Chưa bắt đầu</div>
          </div>
          <div className="bg-white rounded-xl border p-3">
            <div className="text-2xl font-bold text-blue-600">{counts.in_progress}</div>
            <div className="text-xs text-gray-500">Đang thực hiện</div>
          </div>
          <div className="bg-white rounded-xl border p-3">
            <div className="text-2xl font-bold text-green-600">{counts.completed}</div>
            <div className="text-xs text-gray-500">Đã xong</div>
          </div>
          <div className="bg-white rounded-xl border p-3">
            <div className="text-2xl font-bold text-red-600">{counts.overdue}</div>
            <div className="text-xs text-gray-500">Quá hạn</div>
          </div>
          <div className="bg-white rounded-xl border p-3">
            <div className="text-2xl font-bold text-orange-600">{counts.need_approval}</div>
            <div className="text-xs text-gray-500">Cần duyệt</div>
          </div>
          <div className="bg-white rounded-xl border p-3">
            <div className="text-2xl font-bold text-purple-600">{counts.watching}</div>
            <div className="text-xs text-gray-500">Đang theo dõi</div>
          </div>
        </div>
      )}

      {/* Scope Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {SCOPES.map((scope) => {
          const Icon = scope.icon;
          return (
            <button
              key={scope.key}
              onClick={() => setActiveScope(scope.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeScope === scope.key
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {scope.label}
            </button>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b mb-4 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm task..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <select
          value={priorityFilter || ""}
          onChange={(e) => setPriorityFilter(e.target.value || null)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Tất cả độ ưu tiên</option>
          <option value="URGENT">Khẩn cấp</option>
          <option value="HIGH">Cao</option>
          <option value="NORMAL">Bình thường</option>
          <option value="LOW">Thấp</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchTasks}
            className="mt-2 text-sm text-red-700 underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Không có task nào</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:underline"
          >
            Tạo task mới
          </button>
        </div>
      ) : (
        <div>
          {renderGroupSection(
            "Quá hạn",
            groupedTasks.overdue,
            <AlertTriangle className="w-5 h-5 text-red-500" />,
            "text-red-600"
          )}
          {renderGroupSection(
            "Hôm nay",
            groupedTasks.today,
            <Calendar className="w-5 h-5 text-blue-500" />,
            "text-blue-600"
          )}
          {renderGroupSection(
            "Ngày mai",
            groupedTasks.tomorrow,
            <Calendar className="w-5 h-5 text-green-500" />,
            "text-green-600"
          )}
          {renderGroupSection(
            "Tuần này",
            groupedTasks.this_week,
            <Calendar className="w-5 h-5 text-purple-500" />,
            "text-purple-600"
          )}
          {renderGroupSection(
            "Sau đó",
            groupedTasks.later,
            <Calendar className="w-5 h-5 text-gray-400" />
          )}
          {renderGroupSection(
            "Chưa có deadline",
            groupedTasks.no_date,
            <Clock className="w-5 h-5 text-gray-400" />
          )}
        </div>
      )}

      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          taskId={selectedTask.id}
          onClose={() => setSelectedTask(null)}
          onUpdate={fetchTasks}
        />
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchTasks();
          }}
        />
      )}

      {/* Edit Task Modal */}
      {editTaskId && (
        <EditTaskModal
          taskId={editTaskId}
          onClose={() => setEditTaskId(null)}
          onUpdated={() => {
            setEditTaskId(null);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
}
