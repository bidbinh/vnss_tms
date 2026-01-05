"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  GripVertical,
  Clock,
  AlertCircle,
  User,
  Calendar,
  Zap,
  X,
  ChevronRight,
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

const STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "CANCELLED"];
const PRIORITIES = ["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  BACKLOG: { label: "Backlog", color: "bg-gray-100 text-gray-700", bgColor: "bg-gray-50" },
  TODO: { label: "To Do", color: "bg-blue-100 text-blue-700", bgColor: "bg-blue-50" },
  IN_PROGRESS: { label: "In Progress", color: "bg-yellow-100 text-yellow-700", bgColor: "bg-yellow-50" },
  IN_REVIEW: { label: "In Review", color: "bg-purple-100 text-purple-700", bgColor: "bg-purple-50" },
  BLOCKED: { label: "Blocked", color: "bg-red-100 text-red-700", bgColor: "bg-red-50" },
  DONE: { label: "Done", color: "bg-green-100 text-green-700", bgColor: "bg-green-50" },
  CANCELLED: { label: "Cancelled", color: "bg-gray-300 text-gray-700", bgColor: "bg-gray-100" },
};

const PRIORITY_CONFIG: Record<string, { color: string; icon: string }> = {
  LOWEST: { color: "text-gray-400", icon: "⬇️" },
  LOW: { color: "text-blue-400", icon: "🔵" },
  MEDIUM: { color: "text-yellow-400", icon: "🟡" },
  HIGH: { color: "text-orange-400", icon: "🔸" },
  HIGHEST: { color: "text-red-500", icon: "🔴" },
};

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ items: Task[] }>("/project/tasks");
      setTasks(data.items || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Filter tasks
  const getFilteredTasks = (status: string) => {
    return tasks.filter((task) => {
      const matchStatus = task.status === status;
      const matchSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.task_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPriority = !filterPriority || task.priority === filterPriority;
      return matchStatus && matchSearch && matchPriority;
    });
  };

  // Handle drag
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: string) => {
    if (!draggedTask) return;

    try {
      await apiFetch(`/api/v1/project/tasks/${draggedTask.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setTasks((prev) =>
        prev.map((t) => (t.id === draggedTask.id ? { ...t, status } : t))
      );
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setDraggedTask(null);
    }
  };

  // Count tasks by status
  const getStatusCount = (status: string) => {
    return getFilteredTasks(status).length;
  };

  // Get total story points
  const getTotalPoints = (status: string) => {
    return getFilteredTasks(status).reduce((sum, task) => sum + (task.story_points || 0), 0);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading Kanban board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Project Kanban</h1>
            <p className="text-gray-500">Quản lý công việc theo trạng thái</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Tạo Task
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tất cả Priority</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button onClick={fetchTasks} className="p-2 border rounded-lg hover:bg-gray-100">
            <Zap className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 overflow-auto">
        {STATUSES.map((status) => {
          const filteredTasks = getFilteredTasks(status);
          const config = STATUS_CONFIG[status];

          return (
            <div key={status} className="flex flex-col h-full">
              {/* Column Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900">{config.label}</h2>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${config.color}`}>
                      {getStatusCount(status)}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-xs text-gray-500">
                  {getTotalPoints(status)} pts • {filteredTasks.length} tasks
                </div>
              </div>

              {/* Column Content */}
              <div
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(status)}
                className={`flex-1 ${config.bgColor} rounded-lg p-4 space-y-3 min-h-[500px] border-2 border-dashed border-transparent hover:border-gray-300 transition-colors`}
              >
                {filteredTasks.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Không có task
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      onClick={() => setSelectedTask(task)}
                      className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md cursor-move transition-shadow border border-gray-200 hover:border-blue-300"
                    >
                      {/* Task Header */}
                      <div className="flex items-start gap-2 mb-2">
                        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-500">{task.task_number}</p>
                          <p className="font-medium text-gray-900 truncate">{task.title}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded font-medium whitespace-nowrap ${
                          task.task_type === "BUG" ? "bg-red-100 text-red-700" :
                          task.task_type === "STORY" ? "bg-purple-100 text-purple-700" :
                          task.task_type === "EPIC" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {task.task_type}
                        </span>
                      </div>

                      {/* Task Description */}
                      {task.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 mb-3">{task.description}</p>
                      )}

                      {/* Task Meta */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {task.priority && (
                          <span title={task.priority} className="text-lg">
                            {PRIORITY_CONFIG[task.priority]?.icon || "•"}
                          </span>
                        )}
                        {task.story_points && (
                          <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                            {task.story_points} pts
                          </span>
                        )}
                        {task.estimated_hours > 0 && (
                          <span className="px-2 py-0.5 text-xs bg-orange-50 text-orange-700 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.estimated_hours}h
                          </span>
                        )}
                      </div>

                      {/* Task Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
                        {task.assignee_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {task.assignee_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-6 border-b bg-white">
              <div>
                <p className="text-sm text-gray-500">{selectedTask.task_number}</p>
                <h2 className="text-xl font-bold text-gray-900">{selectedTask.title}</h2>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedTask.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Mô tả</h3>
                  <p className="text-gray-600">{selectedTask.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Loại</h3>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                    {selectedTask.task_type}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Priority</h3>
                  <span className="text-lg">{PRIORITY_CONFIG[selectedTask.priority]?.icon} {selectedTask.priority}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${STATUS_CONFIG[selectedTask.status].color}`}>
                    {STATUS_CONFIG[selectedTask.status].label}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Story Points</h3>
                  <p className="text-gray-600">{selectedTask.story_points || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Estimated Hours</h3>
                  <p className="text-gray-600">{selectedTask.estimated_hours}h</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Actual Hours</h3>
                  <p className="text-gray-600">{selectedTask.actual_hours}h</p>
                </div>
              </div>

              {selectedTask.assignee_name && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Người thực hiện</h3>
                  <p className="text-gray-600">{selectedTask.assignee_name}</p>
                </div>
              )}

              {selectedTask.due_date && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Hạn chót</h3>
                  <p className="text-gray-600">
                    {new Date(selectedTask.due_date).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}

              {selectedTask.labels && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Labels</h3>
                  <div className="flex gap-2 flex-wrap">
                    {selectedTask.labels.split(",").map((label) => (
                      <span key={label} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {label.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Ghi chú</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedTask.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}