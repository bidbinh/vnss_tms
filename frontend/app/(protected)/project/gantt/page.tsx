"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar,
  ListTodo,
  User,
  Flag,
  CheckCircle2,
  Clock,
  PlayCircle,
  PauseCircle,
  Circle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Project {
  id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface Task {
  id: string;
  project_id: string;
  task_number: string;
  title: string;
  status: string;
  priority: string;
  assignee_name: string | null;
  start_date: string | null;
  due_date: string | null;
  progress_percent: number;
  parent_task_id: string | null;
}

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  due_date: string;
  status: string;
}

const TASK_STATUSES = [
  { value: "TODO", label: "Chờ xử lý", color: "bg-gray-400", icon: Circle },
  { value: "IN_PROGRESS", label: "Đang thực hiện", color: "bg-blue-500", icon: PlayCircle },
  { value: "IN_REVIEW", label: "Đang review", color: "bg-purple-500", icon: PauseCircle },
  { value: "DONE", label: "Hoàn thành", color: "bg-green-500", icon: CheckCircle2 },
  { value: "ON_HOLD", label: "Tạm dừng", color: "bg-yellow-500", icon: Clock },
  { value: "CANCELLED", label: "Hủy", color: "bg-red-500", icon: Circle },
];

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "border-red-500",
  HIGH: "border-orange-500",
  MEDIUM: "border-yellow-500",
  LOW: "border-green-500",
};

const VIEW_MODES = [
  { value: "day", label: "Ngày", days: 1 },
  { value: "week", label: "Tuần", days: 7 },
  { value: "month", label: "Tháng", days: 30 },
];

export default function GanttPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [cellWidth, setCellWidth] = useState(40);

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

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

  const fetchTasks = useCallback(async () => {
    if (!selectedProjectId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<{ items: Task[] }>(
        `/project/tasks?project_id=${selectedProjectId}&size=200`
      );
      setTasks(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  const fetchMilestones = useCallback(async () => {
    if (!selectedProjectId) return;

    try {
      const data = await apiFetch<{ items: Milestone[] }>(
        `/project/milestones?project_id=${selectedProjectId}&size=200`
      );
      setMilestones(data.items || []);
    } catch (err) {
      console.error("Error fetching milestones:", err);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks();
      fetchMilestones();

      // Set start date based on project
      const project = projects.find((p) => p.id === selectedProjectId);
      if (project?.start_date) {
        const projectStart = new Date(project.start_date);
        // Start from the beginning of the week containing project start
        const dayOfWeek = projectStart.getDay();
        projectStart.setDate(projectStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        setStartDate(projectStart);
      }
    }
  }, [selectedProjectId, fetchTasks, fetchMilestones, projects]);

  // Calculate date range for display - reduced for better visibility
  const daysToShow = viewMode === "day" ? 14 : viewMode === "week" ? 8 * 7 : 12 * 7;

  const dateRange = useMemo(() => {
    const dates: Date[] = [];
    const current = new Date(startDate);
    for (let i = 0; i < daysToShow; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [startDate, daysToShow]);

  // Group dates by week/month for header
  const groupedDates = useMemo(() => {
    if (viewMode === "day") {
      return dateRange.map((d) => ({
        label: d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit" }),
        span: 1,
        dates: [d],
      }));
    }

    const groups: { label: string; span: number; dates: Date[] }[] = [];
    let currentGroup: { label: string; span: number; dates: Date[] } | null = null;

    dateRange.forEach((date) => {
      let label: string;
      if (viewMode === "week") {
        label = `Tuần ${getWeekNumber(date)}`;
      } else {
        // Month view - group by month
        label = date.toLocaleDateString("vi-VN", { month: "short", year: "numeric" });
      }

      if (!currentGroup || currentGroup.label !== label) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { label, span: 1, dates: [date] };
      } else {
        currentGroup.span++;
        currentGroup.dates.push(date);
      }
    });

    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [dateRange, viewMode]);

  const getTaskPosition = (task: Task) => {
    if (!task.start_date || !task.due_date) return null;

    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.due_date);
    const rangeStart = dateRange[0];
    const rangeEnd = dateRange[dateRange.length - 1];

    // Check if task is within range
    if (taskEnd < rangeStart || taskStart > rangeEnd) return null;

    const startOffset = Math.max(
      0,
      Math.floor((taskStart.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
    );
    const endOffset = Math.min(
      daysToShow - 1,
      Math.floor((taskEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      left: startOffset * cellWidth,
      width: Math.max((endOffset - startOffset + 1) * cellWidth, cellWidth),
    };
  };

  const getMilestonePosition = (milestone: Milestone) => {
    if (!milestone.due_date) return null;

    const milestoneDate = new Date(milestone.due_date);
    const rangeStart = dateRange[0];
    const rangeEnd = dateRange[dateRange.length - 1];

    if (milestoneDate < rangeStart || milestoneDate > rangeEnd) return null;

    const offset = Math.floor(
      (milestoneDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    return { left: offset * cellWidth + cellWidth / 2 - 8 };
  };

  const getStatusInfo = (status: string) => {
    return TASK_STATUSES.find((s) => s.value === status) || TASK_STATUSES[0];
  };

  const navigatePeriod = (direction: "prev" | "next") => {
    const newDate = new Date(startDate);
    const days = viewMode === "day" ? 7 : viewMode === "week" ? 28 : 30;
    newDate.setDate(newDate.getDate() + (direction === "next" ? days : -days));
    setStartDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    today.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    setStartDate(today);
  };

  const handleZoom = (direction: "in" | "out") => {
    setCellWidth((prev) => {
      if (direction === "in") return Math.min(prev + 10, 80);
      return Math.max(prev - 10, 20);
    });
  };

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const avgProgress =
    tasks.length > 0
      ? Math.round(tasks.reduce((sum, t) => sum + (t.progress_percent || 0), 0) / tasks.length)
      : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biểu đồ Gantt</h1>
          <p className="text-gray-500">Theo dõi tiến độ dự án theo thời gian</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchTasks();
              fetchMilestones();
            }}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ListTodo className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalTasks}</p>
              <p className="text-sm text-gray-500">Tổng công việc</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedTasks}</p>
              <p className="text-sm text-gray-500">Hoàn thành</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <PlayCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressTasks}</p>
              <p className="text-sm text-gray-500">Đang thực hiện</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Flag className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgProgress}%</p>
              <p className="text-sm text-gray-500">Tiến độ TB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center gap-4">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Chọn dự án</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>

          <div className="flex items-center border rounded-lg overflow-hidden">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setViewMode(mode.value as "day" | "week" | "month")}
                className={`px-3 py-2 text-sm ${
                  viewMode === mode.value
                    ? "bg-blue-600 text-white"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom("out")}
            className="p-2 border rounded-lg hover:bg-gray-50"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom("in")}
            className="p-2 border rounded-lg hover:bg-gray-50"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button
            onClick={() => navigatePeriod("prev")}
            className="p-2 border rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Hôm nay
          </button>
          <button
            onClick={() => navigatePeriod("next")}
            className="p-2 border rounded-lg hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-red-500">{error}</p>
          <button
            onClick={fetchTasks}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" /> Thử lại
          </button>
        </div>
      )}

      {/* Gantt Chart */}
      {!error && selectedProjectId && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ListTodo className="w-12 h-12 mb-4 text-gray-300" />
              <p>Chưa có công việc nào trong dự án này</p>
            </div>
          ) : (
            <div className="flex">
              {/* Task List */}
              <div className="w-80 flex-shrink-0 border-r">
                {/* Header */}
                <div className="h-16 bg-gray-50 border-b px-4 flex items-center">
                  <span className="font-medium text-gray-600">Công việc</span>
                </div>
                {/* Tasks */}
                <div className="divide-y">
                  {tasks.map((task) => {
                    const statusInfo = getStatusInfo(task.status);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <div
                        key={task.id}
                        className={`h-12 px-4 flex items-center gap-3 hover:bg-gray-50 ${
                          task.parent_task_id ? "pl-8" : ""
                        }`}
                      >
                        <StatusIcon className={`w-4 h-4 ${statusInfo.color.replace("bg-", "text-")}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-gray-400">{task.task_number}</p>
                        </div>
                        {task.assignee_name && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            <span className="truncate max-w-[60px]">{task.assignee_name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline */}
              <div className="flex-1 overflow-x-auto">
                {/* Date Header */}
                <div className={`${viewMode === "month" ? "h-12" : "h-16"} bg-gray-50 border-b flex flex-col`}>
                  {/* Group header (weeks/months) */}
                  <div className="flex-1 flex border-b min-w-max">
                    {groupedDates.map((group, idx) => (
                      <div
                        key={idx}
                        style={{ width: group.span * cellWidth, minWidth: group.span * cellWidth }}
                        className="flex items-center justify-center text-xs font-medium text-gray-600 border-r last:border-r-0 overflow-hidden whitespace-nowrap"
                      >
                        <span className="truncate px-1">{group.label}</span>
                      </div>
                    ))}
                  </div>
                  {/* Day numbers - hide in month view */}
                  {viewMode !== "month" && (
                    <div className="flex-1 flex min-w-max">
                      {dateRange.map((date, idx) => {
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const isToday = date.toDateString() === new Date().toDateString();
                        return (
                          <div
                            key={idx}
                            style={{ width: cellWidth, minWidth: cellWidth }}
                            className={`flex items-center justify-center text-xs ${
                              isToday
                                ? "bg-blue-100 text-blue-700 font-bold"
                                : isWeekend
                                ? "bg-gray-100 text-gray-400"
                                : "text-gray-500"
                            }`}
                          >
                            {date.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Task Bars */}
                <div className="relative min-w-max">
                  {/* Background grid */}
                  <div className="absolute inset-0 flex min-w-max">
                    {dateRange.map((date, idx) => {
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const isToday = date.toDateString() === new Date().toDateString();
                      return (
                        <div
                          key={idx}
                          style={{ width: cellWidth, minWidth: cellWidth }}
                          className={`h-full border-r border-gray-100 ${
                            isToday ? "bg-blue-50" : isWeekend ? "bg-gray-50" : ""
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Milestones */}
                  {milestones.map((milestone) => {
                    const position = getMilestonePosition(milestone);
                    if (!position) return null;
                    return (
                      <div
                        key={milestone.id}
                        className="absolute top-0 z-10"
                        style={{ left: position.left }}
                      >
                        <div className="relative group">
                          <div
                            className={`w-4 h-4 rotate-45 ${
                              milestone.status === "COMPLETED"
                                ? "bg-green-500"
                                : "bg-purple-500"
                            }`}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                            <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                              {milestone.name}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Task Bars */}
                  {tasks.map((task) => {
                    const position = getTaskPosition(task);
                    const statusInfo = getStatusInfo(task.status);
                    return (
                      <div key={task.id} className="h-12 relative flex items-center">
                        {position ? (
                          <div
                            className={`absolute h-6 rounded ${statusInfo.color} opacity-80 hover:opacity-100 cursor-pointer transition-opacity border-l-4 ${
                              PRIORITY_COLORS[task.priority] || "border-gray-400"
                            }`}
                            style={{
                              left: position.left,
                              width: position.width,
                            }}
                            title={`${task.title} (${task.progress_percent || 0}%)`}
                          >
                            {/* Progress indicator */}
                            {task.progress_percent > 0 && (
                              <div
                                className="absolute inset-y-0 left-0 bg-white/30 rounded-l"
                                style={{ width: `${task.progress_percent}%` }}
                              />
                            )}
                            {/* Task label */}
                            {position.width > 80 && (
                              <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-medium truncate">
                                {task.title}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="px-4 text-xs text-gray-400 italic">
                            Chưa có ngày
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Project Selected */}
      {!selectedProjectId && (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Vui lòng chọn dự án để xem biểu đồ Gantt</p>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <h3 className="font-medium text-gray-700 mb-3">Chú thích</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-wrap gap-3">
            {TASK_STATUSES.slice(0, 4).map((status) => {
              const StatusIcon = status.icon;
              return (
                <div key={status.value} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${status.color}`} />
                  <span className="text-sm text-gray-600">{status.label}</span>
                </div>
              );
            })}
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rotate-45 bg-purple-500" />
            <span className="text-sm text-gray-600">Milestone</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex flex-wrap gap-3">
            <span className="text-sm text-gray-600">Ưu tiên:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-l-4 border-red-500 bg-gray-200" />
              <span className="text-xs text-gray-500">Nghiêm trọng</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-l-4 border-orange-500 bg-gray-200" />
              <span className="text-xs text-gray-500">Cao</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-l-4 border-yellow-500 bg-gray-200" />
              <span className="text-xs text-gray-500">Trung bình</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-l-4 border-green-500 bg-gray-200" />
              <span className="text-xs text-gray-500">Thấp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
