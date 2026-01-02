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
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface WorkflowInstance {
  id: string;
  instance_number: string;
  workflow_name: string;
  title: string;
  status: string;
  current_step_name?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface ApiResponse {
  items: WorkflowInstance[];
  total: number;
}

export default function MyRequestsPage() {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Lấy các workflow do user hiện tại tạo
      const data = await apiFetch<ApiResponse>("/workflow/workflow-instances");
      setInstances(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 text-green-700";
      case "RUNNING": return "bg-blue-100 text-blue-700";
      case "REJECTED": return "bg-red-100 text-red-700";
      case "CANCELLED": return "bg-gray-200 text-gray-500";
      default: return "bg-yellow-100 text-yellow-700";
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
      inst.instance_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: instances.length,
    running: instances.filter((i) => i.status === "RUNNING").length,
    completed: instances.filter((i) => i.status === "COMPLETED").length,
    rejected: instances.filter((i) => i.status === "REJECTED").length,
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
          <h1 className="text-2xl font-bold text-gray-900">Yêu cầu của tôi</h1>
          <p className="text-gray-500">Các quy trình bạn đã khởi tạo</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 border rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href="/workflow/instances"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Tạo yêu cầu mới
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Tổng yêu cầu</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Đang xử lý</p>
          <p className="text-2xl font-bold text-blue-600">{stats.running}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Đã hoàn thành</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Bị từ chối</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm kiếm yêu cầu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredInstances.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border">
            Bạn chưa có yêu cầu nào
          </div>
        ) : (
          filteredInstances.map((inst) => (
            <div
              key={inst.id}
              className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(inst.status)}
                    <span className="text-xs text-gray-500">{inst.instance_number}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(inst.status)}`}>
                      {inst.status}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900">{inst.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>Workflow: {inst.workflow_name}</span>
                    {inst.current_step_name && (
                      <span>Bước hiện tại: {inst.current_step_name}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Tạo lúc: {new Date(inst.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
                <a
                  href={`/workflow/instances`}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Eye className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
