"use client";

import { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Filter,
  Calendar,
  User,
  ArrowRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface WorkflowInstance {
  id: string;
  instance_number: string;
  workflow_name: string;
  title: string;
  status: string;
  initiator_name?: string;
  final_action?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface ApiResponse {
  items: WorkflowInstance[];
  total: number;
}

export default function WorkflowHistoryPage() {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Lấy tất cả instances (bao gồm completed, rejected, cancelled)
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const data = await apiFetch<ApiResponse>(`/workflow/workflow-instances${params}`);
      // Chỉ hiển thị các workflow đã hoàn thành/kết thúc
      const completedStatuses = ["COMPLETED", "REJECTED", "CANCELLED"];
      const filtered =
        statusFilter === "ALL"
          ? data.items.filter((i) => completedStatuses.includes(i.status))
          : data.items;
      setInstances(filtered || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      case "CANCELLED":
        return "bg-gray-200 text-gray-500";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "REJECTED":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "CANCELLED":
        return <Clock className="w-5 h-5 text-gray-500" />;
      default:
        return <Play className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "Đã phê duyệt";
      case "REJECTED":
        return "Đã từ chối";
      case "CANCELLED":
        return "Đã hủy";
      default:
        return status;
    }
  };

  const filteredInstances = instances.filter(
    (inst) =>
      inst.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.instance_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.workflow_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: instances.length,
    completed: instances.filter((i) => i.status === "COMPLETED").length,
    rejected: instances.filter((i) => i.status === "REJECTED").length,
    cancelled: instances.filter((i) => i.status === "CANCELLED").length,
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
          <h1 className="text-2xl font-bold text-gray-900">Lịch sử Workflow</h1>
          <p className="text-gray-500">Các quy trình đã hoàn thành</p>
        </div>
        <button onClick={fetchData} className="p-2 border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Tổng cộng</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">Đã phê duyệt</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm text-gray-500">Đã từ chối</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Đã hủy</p>
              <p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="COMPLETED">Đã phê duyệt</option>
          <option value="REJECTED">Đã từ chối</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {filteredInstances.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border">
            Không có dữ liệu lịch sử
          </div>
        ) : (
          filteredInstances.map((inst) => (
            <div
              key={inst.id}
              className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-2 rounded-full ${
                    inst.status === "COMPLETED"
                      ? "bg-green-100"
                      : inst.status === "REJECTED"
                      ? "bg-red-100"
                      : "bg-gray-100"
                  }`}
                >
                  {getStatusIcon(inst.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{inst.title}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(inst.status)}`}>
                      {getStatusLabel(inst.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">{inst.instance_number}</span>
                    </span>
                    <span>{inst.workflow_name}</span>
                    {inst.initiator_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {inst.initiator_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    {inst.started_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Bắt đầu: {new Date(inst.started_at).toLocaleString("vi-VN")}
                      </span>
                    )}
                    {inst.completed_at && (
                      <>
                        <ArrowRight className="w-3 h-3" />
                        <span>
                          Kết thúc: {new Date(inst.completed_at).toLocaleString("vi-VN")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
