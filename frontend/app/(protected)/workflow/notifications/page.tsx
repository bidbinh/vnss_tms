"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Check,
  Trash2,
  Eye,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface PendingTask {
  id: string;
  step_name: string;
  step_type: string;
  status: string;
  activated_at?: string;
  sla_hours?: number;
  instance?: {
    instance_number: string;
    title: string;
    initiator_name: string;
    entity_type?: string;
    entity_reference?: string;
  };
}

interface ApiResponse {
  items: PendingTask[];
  total: number;
}

export default function WorkflowNotificationsPage() {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<ApiResponse>("/workflow/my-pending-tasks");
      setTasks(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays} ngày trước`;
    if (diffHours > 0) return `${diffHours} giờ trước`;
    return "Vừa xong";
  };

  const isOverdue = (activatedAt?: string, slaHours?: number) => {
    if (!activatedAt || !slaHours) return false;
    const activated = new Date(activatedAt);
    const deadline = new Date(activated.getTime() + slaHours * 60 * 60 * 1000);
    return new Date() > deadline;
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
          <h1 className="text-2xl font-bold text-gray-900">Thông báo Workflow</h1>
          <p className="text-gray-500">Các task đang chờ bạn xử lý ({tasks.length})</p>
        </div>
        <button onClick={fetchData} className="p-2 border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Chờ xử lý</p>
              <p className="text-xl font-bold">{tasks.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Quá hạn SLA</p>
              <p className="text-xl font-bold text-red-600">
                {tasks.filter((t) => isOverdue(t.activated_at, t.sla_hours)).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sắp hết hạn</p>
              <p className="text-xl font-bold text-yellow-600">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Không có thông báo mới</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow ${
                isOverdue(task.activated_at, task.sla_hours) ? "border-red-300 bg-red-50" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-2 rounded-full ${
                    isOverdue(task.activated_at, task.sla_hours)
                      ? "bg-red-100"
                      : "bg-blue-100"
                  }`}
                >
                  {isOverdue(task.activated_at, task.sla_hours) ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <Bell className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">
                      {task.instance?.title || "Workflow Task"}
                    </h3>
                    {isOverdue(task.activated_at, task.sla_hours) && (
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                        Quá hạn
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Bước: <span className="font-medium">{task.step_name}</span>
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    {task.instance?.instance_number && (
                      <span>{task.instance.instance_number}</span>
                    )}
                    {task.instance?.initiator_name && (
                      <span>Từ: {task.instance.initiator_name}</span>
                    )}
                    {task.sla_hours && <span>SLA: {task.sla_hours}h</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {getTimeAgo(task.activated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/workflow/instances"
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Xử lý
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
