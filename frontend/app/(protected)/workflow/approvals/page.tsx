"use client";

import { useState, useEffect } from "react";
import { Search, CheckCircle, XCircle, Clock, Eye, MessageSquare, User, Calendar } from "lucide-react";

interface ApprovalRequest {
  id: string;
  workflow_name: string;
  title: string;
  requester: string;
  request_date: string;
  current_step: string;
  priority: string;
  status: string;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  useEffect(() => {
    setTimeout(() => {
      setApprovals([
        { id: "1", workflow_name: "Leave Request", title: "Nghỉ phép 3 ngày", requester: "Nguyễn Văn A", request_date: "2024-02-18", current_step: "Manager Approval", priority: "NORMAL", status: "PENDING" },
        { id: "2", workflow_name: "Purchase Order", title: "Mua thiết bị văn phòng", requester: "Trần Thị B", request_date: "2024-02-17", current_step: "Finance Review", priority: "HIGH", status: "PENDING" },
        { id: "3", workflow_name: "Contract Approval", title: "Hợp đồng KH ABC Corp", requester: "Lê Văn C", request_date: "2024-02-16", current_step: "Legal Review", priority: "HIGH", status: "PENDING" },
        { id: "4", workflow_name: "Expense Report", title: "Chi phí công tác T2/2024", requester: "Phạm Thị D", request_date: "2024-02-15", current_step: "Manager Approval", priority: "NORMAL", status: "APPROVED" },
        { id: "5", workflow_name: "Leave Request", title: "Nghỉ phép đột xuất", requester: "Hoàng Văn E", request_date: "2024-02-14", current_step: "HR Review", priority: "URGENT", status: "REJECTED" },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "bg-red-100 text-red-700";
      case "HIGH": return "bg-orange-100 text-orange-700";
      case "NORMAL": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const filteredApprovals = approvals.filter(a => filter === "ALL" || a.status === filter);

  const counts = {
    pending: approvals.filter(a => a.status === "PENDING").length,
    approved: approvals.filter(a => a.status === "APPROVED").length,
    rejected: approvals.filter(a => a.status === "REJECTED").length,
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
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-500">Các yêu cầu chờ phê duyệt</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-sm text-yellow-600">Chờ xử lý</p>
              <p className="text-2xl font-bold text-yellow-700">{counts.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-green-600">Đã duyệt</p>
              <p className="text-2xl font-bold text-green-700">{counts.approved}</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-sm text-red-600">Từ chối</p>
              <p className="text-2xl font-bold text-red-700">{counts.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button onClick={() => setFilter("ALL")} className={`px-4 py-2 rounded-lg ${filter === "ALL" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}>
          Tất cả
        </button>
        <button onClick={() => setFilter("PENDING")} className={`px-4 py-2 rounded-lg ${filter === "PENDING" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}>
          Chờ duyệt
        </button>
        <button onClick={() => setFilter("APPROVED")} className={`px-4 py-2 rounded-lg ${filter === "APPROVED" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}>
          Đã duyệt
        </button>
        <button onClick={() => setFilter("REJECTED")} className={`px-4 py-2 rounded-lg ${filter === "REJECTED" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}>
          Từ chối
        </button>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {filteredApprovals.map((approval) => (
          <div key={approval.id} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{approval.workflow_name}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(approval.priority)}`}>
                    {approval.priority}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mt-1">{approval.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {approval.requester}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {approval.request_date}
                  </div>
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{approval.current_step}</span>
                </div>
              </div>
              {approval.status === "PENDING" ? (
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
                    <Eye className="w-4 h-4" />
                    Xem
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <CheckCircle className="w-4 h-4" />
                    Duyệt
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                    <XCircle className="w-4 h-4" />
                    Từ chối
                  </button>
                </div>
              ) : (
                <span className={`px-3 py-1.5 rounded-lg text-sm ${approval.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {approval.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
