"use client";

import { useState, useEffect } from "react";
import {
  Workflow,
  GitBranch,
  Play,
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface WorkflowStats {
  total_definitions: number;
  active_instances: number;
  pending_approvals: number;
  completed_today: number;
  my_tasks: number;
}

interface ApiResponse {
  items: any[];
  total: number;
}

export default function WorkflowDashboard() {
  const [stats, setStats] = useState<WorkflowStats>({
    total_definitions: 0,
    active_instances: 0,
    pending_approvals: 0,
    completed_today: 0,
    my_tasks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [defsRes, instancesRes, approvalsRes] = await Promise.all([
          apiFetch<ApiResponse>("/workflow/workflow-definitions"),
          apiFetch<ApiResponse>("/workflow/instances").catch(() => ({ items: [], total: 0 })),
          apiFetch<ApiResponse>("/workflow/approvals/pending").catch(() => ({ items: [], total: 0 })),
        ]);
        setStats({
          total_definitions: defsRes.total || defsRes.items?.length || 0,
          active_instances: instancesRes.total || instancesRes.items?.length || 0,
          pending_approvals: approvalsRes.total || approvalsRes.items?.length || 0,
          completed_today: 0,
          my_tasks: 0,
        });
      } catch (err) {
        console.error("Failed to fetch workflow stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const pendingApprovals = [
    { id: 1, title: "Phê duyệt đơn nghỉ phép", requester: "Nguyễn Văn A", type: "Leave Request", time: "2 giờ trước" },
    { id: 2, title: "Phê duyệt mua sắm thiết bị", requester: "Trần Thị B", type: "Purchase", time: "3 giờ trước" },
    { id: 3, title: "Phê duyệt hợp đồng KH001", requester: "Lê Văn C", type: "Contract", time: "5 giờ trước" },
  ];

  const recentWorkflows = [
    { id: 1, name: "Leave Request WF", status: "COMPLETED", step: "Completed", time: "10 phút trước" },
    { id: 2, name: "Purchase Order WF", status: "IN_PROGRESS", step: "Manager Approval", time: "30 phút trước" },
    { id: 3, name: "Contract Approval WF", status: "IN_PROGRESS", step: "Legal Review", time: "1 giờ trước" },
    { id: 4, name: "Expense Report WF", status: "REJECTED", step: "Rejected by Finance", time: "2 giờ trước" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "IN_PROGRESS":
        return <Play className="w-4 h-4 text-blue-500" />;
      case "REJECTED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Dashboard</h1>
          <p className="text-gray-500">Quản lý quy trình làm việc</p>
        </div>
        <a
          href="/workflow/definitions"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <GitBranch className="w-4 h-4" />
          Tạo quy trình mới
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <GitBranch className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Quy trình</p>
              <p className="text-xl font-bold">{stats.total_definitions}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Play className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Đang chạy</p>
              <p className="text-xl font-bold">{stats.active_instances}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Chờ duyệt</p>
              <p className="text-xl font-bold text-yellow-600">{stats.pending_approvals}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Hoàn thành hôm nay</p>
              <p className="text-xl font-bold">{stats.completed_today}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tasks của tôi</p>
              <p className="text-xl font-bold">{stats.my_tasks}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Chờ phê duyệt</h2>
            <a href="/workflow/approvals" className="text-sm text-blue-600 hover:underline">
              Xem tất cả
            </a>
          </div>
          <div className="space-y-3">
            {pendingApprovals.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-500">
                      {item.requester} • {item.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{item.time}</span>
                  <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    Xem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Workflows */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Quy trình gần đây</h2>
            <a href="/workflow/instances" className="text-sm text-blue-600 hover:underline">
              Xem tất cả
            </a>
          </div>
          <div className="space-y-3">
            {recentWorkflows.map((wf) => (
              <div key={wf.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  {getStatusIcon(wf.status)}
                  <div>
                    <p className="font-medium">{wf.name}</p>
                    <p className="text-sm text-gray-500">{wf.step}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{wf.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <a
          href="/workflow/definitions"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50"
        >
          <GitBranch className="w-5 h-5 text-blue-500" />
          <span>Quy trình</span>
        </a>
        <a
          href="/workflow/instances"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50"
        >
          <Play className="w-5 h-5 text-green-500" />
          <span>Đang chạy</span>
        </a>
        <a
          href="/workflow/approvals"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50"
        >
          <CheckSquare className="w-5 h-5 text-purple-500" />
          <span>Phê duyệt</span>
        </a>
        <a
          href="/workflow/tasks"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50"
        >
          <Users className="w-5 h-5 text-orange-500" />
          <span>Tasks của tôi</span>
        </a>
      </div>
    </div>
  );
}
