"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  Star,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  MoreVertical,
  Send,
  X,
  Briefcase,
  Truck,
  Package,
  Calendar,
  DollarSign,
  UserMinus,
  Settings,
  Shield,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ConnectedWorker {
  access_id: string;
  worker: {
    id: string;
    username: string;
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
    job_title?: string;
    is_available: boolean;
    license_class?: string;
  };
  role: string;
  is_active: boolean;
  total_tasks_completed: number;
  last_task_at?: string;
  rating?: number;
  connected_at: string;
}

interface Invitation {
  id: string;
  worker?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  invited_email: string;
  role: string;
  status: string;
  message?: string;
  created_at: string;
  expires_at: string;
  responded_at?: string;
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<ConnectedWorker[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState<"connected" | "invitations">("connected");

  // Invite form
  const [inviteForm, setInviteForm] = useState({
    email: "",
    worker_username: "",
    role: "DRIVER",
    message: "",
  });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Assign task modal
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<ConnectedWorker | null>(null);

  // Edit role modal
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<ConnectedWorker | null>(null);
  const [editRoleForm, setEditRoleForm] = useState({
    role: "DRIVER",
    permissions: {} as Record<string, string[]>,
  });
  const [savingRole, setSavingRole] = useState(false);
  const [editRoleError, setEditRoleError] = useState("");
  const [editRoleSuccess, setEditRoleSuccess] = useState("");
  const [taskForm, setTaskForm] = useState({
    task_type: "ORDER",
    task_ref_id: "",
    task_code: "",
    title: "",
    description: "",
    scheduled_start: "",
    scheduled_end: "",
    payment_amount: "",
  });
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workersData, invitationsData] = await Promise.all([
        apiFetch<{ workers: ConnectedWorker[] }>("/workspace/workers"),
        apiFetch<{ invitations: Invitation[] }>("/workspace/invitations"),
      ]);
      setWorkers(workersData.workers || []);
      setInvitations(invitationsData.invitations || []);
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviting(true);

    try {
      await apiFetch("/workspace/invite", {
        method: "POST",
        body: JSON.stringify({
          email: inviteForm.email || null,
          worker_username: inviteForm.worker_username || null,
          role: inviteForm.role,
          message: inviteForm.message || null,
        }),
      });

      setInviteSuccess("Đã gửi lời mời thành công!");
      setInviteForm({ email: "", worker_username: "", role: "DRIVER", message: "" });
      fetchData();

      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess("");
      }, 2000);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Gửi lời mời thất bại");
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm("Bạn có chắc muốn hủy lời mời này?")) return;

    try {
      await apiFetch(`/workspace/invitations/${invitationId}`, {
        method: "DELETE",
      });
      fetchData();
    } catch (error) {
      console.error("Failed to revoke invitation:", error);
    }
  };

  const handleDisconnectWorker = async (accessId: string, workerName: string) => {
    if (!confirm(`Bạn có chắc muốn hủy kết nối với ${workerName}?\n\nWorker sẽ không thể nhận việc từ công ty nữa.`)) return;

    try {
      await apiFetch(`/workspace/workers/${accessId}`, {
        method: "DELETE",
      });
      fetchData();
    } catch (error) {
      console.error("Failed to disconnect worker:", error);
      alert("Không thể hủy kết nối. Vui lòng thử lại.");
    }
  };

  const openAssignTaskModal = (worker: ConnectedWorker) => {
    setSelectedWorker(worker);
    setTaskForm({
      task_type: "ORDER",
      task_ref_id: "",
      task_code: "",
      title: "",
      description: "",
      scheduled_start: "",
      scheduled_end: "",
      payment_amount: "",
    });
    setAssignError("");
    setAssignSuccess("");
    setShowAssignTaskModal(true);
  };

  const openEditRoleModal = (worker: ConnectedWorker) => {
    setEditingWorker(worker);
    setEditRoleForm({
      role: worker.role,
      permissions: {},
    });
    setEditRoleError("");
    setEditRoleSuccess("");
    setShowEditRoleModal(true);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker) return;

    setEditRoleError("");
    setEditRoleSuccess("");
    setSavingRole(true);

    try {
      await apiFetch(`/workspace/admin/workers/${editingWorker.access_id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: editRoleForm.role,
          permissions: Object.keys(editRoleForm.permissions).length > 0 ? {
            modules: getRoleModules(editRoleForm.role),
            permissions: editRoleForm.permissions,
          } : null,
        }),
      });

      setEditRoleSuccess("Đã cập nhật quyền thành công!");
      setTimeout(() => {
        setShowEditRoleModal(false);
        setEditRoleSuccess("");
        fetchData();
      }, 1500);
    } catch (error) {
      setEditRoleError(error instanceof Error ? error.message : "Cập nhật thất bại");
    } finally {
      setSavingRole(false);
    }
  };

  // Helper to get modules by role
  const getRoleModules = (role: string) => {
    const roleModules: Record<string, string[]> = {
      DRIVER: ["workspace"],
      DISPATCHER: ["tms", "dispatch", "workspace"],
      MANAGER: ["tms", "dispatch", "masterdata", "reports", "workspace"],
      ACCOUNTANT: ["reports", "workspace"],
      WORKER: ["workspace"],
    };
    return roleModules[role] || ["workspace"];
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;

    setAssignError("");
    setAssignSuccess("");
    setAssigning(true);

    try {
      await apiFetch("/workspace/assign-task", {
        method: "POST",
        body: JSON.stringify({
          worker_id: selectedWorker.worker.id,
          task_type: taskForm.task_type,
          task_ref_id: taskForm.task_ref_id || `TASK-${Date.now()}`,
          task_code: taskForm.task_code || null,
          title: taskForm.title,
          description: taskForm.description || null,
          scheduled_start: taskForm.scheduled_start || null,
          scheduled_end: taskForm.scheduled_end || null,
          payment_amount: taskForm.payment_amount ? parseFloat(taskForm.payment_amount) : null,
        }),
      });

      setAssignSuccess("Đã giao việc thành công!");
      setTimeout(() => {
        setShowAssignTaskModal(false);
        setAssignSuccess("");
        fetchData();
      }, 1500);
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : "Giao việc thất bại");
    } finally {
      setAssigning(false);
    }
  };

  const filteredWorkers = workers.filter(
    (w) =>
      w.worker.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.worker.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.worker.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingInvitations = invitations.filter((i) => i.status === "PENDING");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
          <p className="text-gray-600">
            Quản lý workers từ Personal Workspace
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Mời Worker
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-blue-600">{workers.length}</div>
          <div className="text-sm text-gray-500">Workers kết nối</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-green-600">
            {workers.filter((w) => w.worker.is_available).length}
          </div>
          <div className="text-sm text-gray-500">Sẵn sàng làm việc</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {pendingInvitations.length}
          </div>
          <div className="text-sm text-gray-500">Lời mời đang chờ</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-purple-600">
            {workers.reduce((sum, w) => sum + w.total_tasks_completed, 0)}
          </div>
          <div className="text-sm text-gray-500">Tổng việc hoàn thành</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setTab("connected")}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                tab === "connected"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Workers kết nối ({workers.length})
            </button>
            <button
              onClick={() => setTab("invitations")}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                tab === "invitations"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Lời mời ({invitations.length})
            </button>
          </div>
        </div>

        {tab === "connected" && (
          <>
            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm worker..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Workers List */}
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Chưa có worker nào</p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="mt-3 text-blue-600 hover:underline"
                >
                  Mời worker đầu tiên
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredWorkers.map((w) => (
                  <div key={w.access_id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          {w.worker.avatar_url ? (
                            <img
                              src={w.worker.avatar_url}
                              alt={w.worker.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-blue-600 font-medium">
                              {w.worker.full_name?.charAt(0) || "W"}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {w.worker.full_name}
                            </span>
                            <span className="text-sm text-gray-500">
                              @{w.worker.username}
                            </span>
                            {w.worker.is_available ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                Sẵn sàng
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                Tạm ngưng
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-3">
                            {w.worker.job_title && (
                              <span>{w.worker.job_title}</span>
                            )}
                            {w.worker.license_class && (
                              <span>GPLX: {w.worker.license_class}</span>
                            )}
                            <span>Vai trò: {w.role}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-gray-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>{w.total_tasks_completed} việc</span>
                          </div>
                          {w.rating && (
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Star className="w-4 h-4 fill-current" />
                              <span>{w.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => openAssignTaskModal(w)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center gap-1.5"
                        >
                          <Briefcase className="w-4 h-4" />
                          Giao việc
                        </button>
                        <button
                          onClick={() => openEditRoleModal(w)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                          title="Đổi quyền"
                        >
                          <Shield className="w-5 h-5" />
                        </button>
                        <a
                          href={`https://${w.worker.username}.9log.tech`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Xem workspace"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                        <button
                          onClick={() => handleDisconnectWorker(w.access_id, w.worker.full_name)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Hủy kết nối"
                        >
                          <UserMinus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "invitations" && (
          <div className="divide-y divide-gray-100">
            {invitations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Chưa có lời mời nào</p>
              </div>
            ) : (
              invitations.map((inv) => (
                <div key={inv.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Mail className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {inv.worker?.full_name || inv.invited_email}
                        </div>
                        <div className="text-sm text-gray-600">
                          {inv.worker?.username ? (
                            <span className="text-blue-600">@{inv.worker.username}</span>
                          ) : inv.invited_email ? (
                            <span>{inv.invited_email}</span>
                          ) : null}
                        </div>
                        <div className="text-sm text-gray-500">
                          Vai trò: {inv.role} • Gửi lúc:{" "}
                          {new Date(inv.created_at).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          inv.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : inv.status === "ACCEPTED"
                            ? "bg-green-100 text-green-700"
                            : inv.status === "DECLINED"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {inv.status === "PENDING"
                          ? "Đang chờ"
                          : inv.status === "ACCEPTED"
                          ? "Đã chấp nhận"
                          : inv.status === "DECLINED"
                          ? "Đã từ chối"
                          : inv.status}
                      </span>
                      {inv.status === "PENDING" && (
                        <button
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
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
        )}
      </div>

      {/* Assign Task Modal */}
      {showAssignTaskModal && selectedWorker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold">Giao việc cho Worker</h3>
                <p className="text-sm text-gray-500">{selectedWorker.worker.full_name}</p>
              </div>
              <button
                onClick={() => setShowAssignTaskModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignTask} className="p-4 space-y-4">
              {assignError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {assignError}
                </div>
              )}

              {assignSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {assignSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại công việc
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "ORDER", label: "Đơn hàng", icon: Package },
                    { value: "TRIP", label: "Chuyến xe", icon: Truck },
                    { value: "DELIVERY", label: "Giao hàng", icon: Package },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setTaskForm({ ...taskForm, task_type: type.value })}
                      className={`p-3 border rounded-lg flex flex-col items-center gap-1 ${
                        taskForm.task_type === type.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <type.icon className="w-5 h-5" />
                      <span className="text-sm">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề công việc *
                </label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="VD: Giao hàng cho Công ty ABC"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã tham chiếu
                  </label>
                  <input
                    type="text"
                    value={taskForm.task_ref_id}
                    onChange={(e) => setTaskForm({ ...taskForm, task_ref_id: e.target.value })}
                    placeholder="ID đơn hàng/chuyến xe"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã công việc
                  </label>
                  <input
                    type="text"
                    value={taskForm.task_code}
                    onChange={(e) => setTaskForm({ ...taskForm, task_code: e.target.value })}
                    placeholder="VD: TASK-001"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả chi tiết
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows={3}
                  placeholder="Mô tả chi tiết công việc cần làm..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    value={taskForm.scheduled_start}
                    onChange={(e) => setTaskForm({ ...taskForm, scheduled_start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Kết thúc
                  </label>
                  <input
                    type="datetime-local"
                    value={taskForm.scheduled_end}
                    onChange={(e) => setTaskForm({ ...taskForm, scheduled_end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Số tiền thanh toán (VNĐ)
                </label>
                <input
                  type="number"
                  value={taskForm.payment_amount}
                  onChange={(e) => setTaskForm({ ...taskForm, payment_amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignTaskModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={assigning || !taskForm.title}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  {assigning ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Briefcase className="w-4 h-4" />
                      Giao việc
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Mời Worker</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-4 space-y-4">
              {inviteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {inviteError}
                </div>
              )}

              {inviteSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {inviteSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email hoặc Username
                </label>
                <input
                  type="text"
                  value={inviteForm.email || inviteForm.worker_username}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.includes("@")) {
                      setInviteForm({ ...inviteForm, email: value, worker_username: "" });
                    } else {
                      setInviteForm({ ...inviteForm, worker_username: value, email: "" });
                    }
                  }}
                  placeholder="email@example.com hoặc username"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nhập email để mời hoặc username của worker đã có tài khoản
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vai trò
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DRIVER">🚛 Tài xế - Xem và cập nhật đơn hàng được giao</option>
                  <option value="DISPATCHER">📋 Điều phối - Quản lý đơn hàng, tài xế, xe</option>
                  <option value="MANAGER">👔 Quản lý - Full quyền TMS + Master data</option>
                  <option value="ACCOUNTANT">💰 Kế toán - Xem báo cáo, đơn hàng</option>
                  <option value="WORKER">👷 Nhân viên - Xem công việc được giao</option>
                  <option value="FREELANCER">🏃 Freelancer - Nhận việc theo dự án</option>
                  <option value="CONTRACTOR">🏗️ Nhà thầu - Nhận việc theo hợp đồng</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Quyền có thể được tùy chỉnh sau khi worker chấp nhận lời mời
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lời nhắn (tùy chọn)
                </label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  rows={3}
                  placeholder="Viết lời nhắn cho worker..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  {inviting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Gửi lời mời
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditRoleModal && editingWorker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  Đổi quyền Worker
                </h3>
                <p className="text-sm text-gray-500">{editingWorker.worker.full_name} (@{editingWorker.worker.username})</p>
              </div>
              <button
                onClick={() => setShowEditRoleModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="p-4 space-y-4">
              {editRoleError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {editRoleError}
                </div>
              )}

              {editRoleSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {editRoleSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vai trò hiện tại: <span className="text-purple-600 font-semibold">{editingWorker.role}</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn vai trò mới
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: "DRIVER", label: "Tài xế", desc: "Xem và cập nhật đơn hàng được giao", icon: "🚛" },
                    { value: "DISPATCHER", label: "Điều phối", desc: "Quản lý đơn hàng, tài xế, xe", icon: "📋" },
                    { value: "MANAGER", label: "Quản lý", desc: "Full quyền TMS + Master data + Báo cáo", icon: "👔" },
                    { value: "ACCOUNTANT", label: "Kế toán", desc: "Xem báo cáo, đơn hàng", icon: "💰" },
                    { value: "WORKER", label: "Nhân viên", desc: "Xem công việc được giao", icon: "👷" },
                  ].map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setEditRoleForm({ ...editRoleForm, role: role.value })}
                      className={`p-3 border rounded-lg text-left transition-all ${
                        editRoleForm.role === role.value
                          ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{role.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">{role.label}</div>
                          <div className="text-sm text-gray-500">{role.desc}</div>
                        </div>
                        {editRoleForm.role === role.value && (
                          <CheckCircle className="w-5 h-5 text-purple-600 ml-auto" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission preview */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">Quyền sẽ được cấp:</div>
                <div className="flex flex-wrap gap-2">
                  {getRoleModules(editRoleForm.role).map((mod) => (
                    <span key={mod} className="px-2 py-1 bg-white border rounded text-xs text-gray-600">
                      {mod === "tms" ? "TMS - Vận tải" :
                       mod === "dispatch" ? "Điều phối" :
                       mod === "masterdata" ? "Master Data" :
                       mod === "reports" ? "Báo cáo" :
                       mod === "workspace" ? "Workspace" : mod}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditRoleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingRole || editRoleForm.role === editingWorker.role}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  {savingRole ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
