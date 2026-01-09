"use client";

import { useState, useEffect } from "react";
import {
  X,
  Check,
  Play,
  Clock,
  Calendar,
  User,
  Users,
  MessageSquare,
  Paperclip,
  ExternalLink,
  Send,
  MoreHorizontal,
  Edit2,
  Trash2,
  AlertTriangle,
  Building2,
  UserCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

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
  assigned_by_id?: string;
  assigned_by_name?: string;
  due_date?: string;
  reminder_at?: string;
  started_at?: string;
  completed_at?: string;
  source_module?: string;
  source_entity_type?: string;
  source_entity_id?: string;
  source_entity_code?: string;
  source_url?: string;
  is_overdue: boolean;
  result?: string;
  result_note?: string;
  comments_count: number;
  attachments_json?: string;
  watchers?: Watcher[];
  comments?: Comment[];
  created_at: string;
  created_by_name?: string;
}

interface Watcher {
  id: string;
  user_id: string;
  user_name?: string;
}

interface Comment {
  id: string;
  content: string;
  comment_type: string;
  user_id: string;
  user_name?: string;
  attachments_json?: string;
  created_at: string;
}

interface TaskDetailDrawerProps {
  taskId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const PRIORITIES = {
  URGENT: { label: "Khẩn cấp", color: "bg-red-100 text-red-700" },
  HIGH: { label: "Cao", color: "bg-orange-100 text-orange-700" },
  NORMAL: { label: "Bình thường", color: "bg-blue-100 text-blue-700" },
  LOW: { label: "Thấp", color: "bg-gray-100 text-gray-600" },
};

const STATUSES = {
  PENDING: { label: "Chưa bắt đầu", color: "bg-yellow-100 text-yellow-700" },
  IN_PROGRESS: { label: "Đang thực hiện", color: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Đã hủy", color: "bg-gray-100 text-gray-500" },
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

export default function TaskDetailDrawer({ taskId, onClose, onUpdate }: TaskDetailDrawerProps) {
  const [task, setTask] = useState<UserTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completeNote, setCompleteNote] = useState("");

  // Fetch task details
  const fetchTask = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<UserTask>(`/my-tasks/${taskId}`);
      setTask(data);
    } catch (err) {
      toast.error("Không thể tải chi tiết task");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  // Actions
  const handleStart = async () => {
    try {
      setActionLoading(true);
      await apiFetch(`/my-tasks/${taskId}/start`, { method: "PATCH" });
      toast.success("Đã bắt đầu task");
      fetchTask();
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setActionLoading(true);
      await apiFetch(`/my-tasks/${taskId}/complete`, {
        method: "PATCH",
        body: JSON.stringify({ result_note: completeNote }),
      });
      toast.success("Đã hoàn thành task");
      setShowCompleteDialog(false);
      setCompleteNote("");
      fetchTask();
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt("Nhập lý do hủy:");
    if (!reason) return;

    try {
      setActionLoading(true);
      await apiFetch(`/my-tasks/${taskId}/cancel?reason=${encodeURIComponent(reason)}`, {
        method: "PATCH",
      });
      toast.success("Đã hủy task");
      fetchTask();
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    const note = prompt("Ghi chú phê duyệt (tùy chọn):");
    try {
      setActionLoading(true);
      const url = note
        ? `/my-tasks/${taskId}/approve?note=${encodeURIComponent(note)}`
        : `/my-tasks/${taskId}/approve`;
      await apiFetch(url, { method: "PATCH" });
      toast.success("Đã phê duyệt");
      fetchTask();
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt("Nhập lý do từ chối:");
    if (!reason) return;

    try {
      setActionLoading(true);
      await apiFetch(`/my-tasks/${taskId}/reject?reason=${encodeURIComponent(reason)}`, {
        method: "PATCH",
      });
      toast.success("Đã từ chối");
      fetchTask();
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setActionLoading(false);
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      await apiFetch(`/my-tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: newComment }),
      });
      setNewComment("");
      fetchTask();
    } catch (err) {
      toast.error("Không thể thêm comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Format date
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading || !task) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />
        <div className="ml-auto w-full max-w-xl bg-white shadow-xl h-full flex items-center justify-center relative">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const status = STATUSES[task.status as keyof typeof STATUSES] || STATUSES.PENDING;
  const priority = PRIORITIES[task.priority as keyof typeof PRIORITIES] || PRIORITIES.NORMAL;
  const source = SOURCE_MODULES[task.source as keyof typeof SOURCE_MODULES] || SOURCE_MODULES.MANUAL;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "COMPLETED";
  const isCompleted = task.status === "COMPLETED" || task.status === "CANCELLED";

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="ml-auto w-full max-w-xl bg-white shadow-xl h-full flex flex-col relative animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{task.task_number}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${status.color}`}>{status.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${priority.color}`}>{priority.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Title */}
            <h2 className={`text-xl font-semibold mb-2 ${isCompleted ? "line-through text-gray-400" : ""}`}>
              {task.title}
            </h2>

            {/* Tags */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className={`text-xs px-2 py-1 rounded ${source.color}`}>{source.label}</span>
              {task.scope === "PERSONAL" && (
                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-600 flex items-center gap-1">
                  <UserCircle className="w-3 h-3" /> Cá nhân
                </span>
              )}
              {task.scope === "COMPANY" && (
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Công ty
                </span>
              )}
              {task.task_type === "APPROVAL" && (
                <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-600">Cần phê duyệt</span>
              )}
              {isOverdue && (
                <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Quá hạn
                </span>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Mô tả</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Source Link */}
            {task.source_entity_code && task.source_url && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Liên kết</h3>
                <a
                  href={task.source_url}
                  className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  {task.source_entity_type}: {task.source_entity_code}
                </a>
              </div>
            )}

            {/* Result (if completed) */}
            {task.result && (
              <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
                <h3 className="text-sm font-medium text-green-800 mb-1">Kết quả: {task.result}</h3>
                {task.result_note && <p className="text-sm text-green-700">{task.result_note}</p>}
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <span className="text-xs text-gray-500">Người thực hiện</span>
                <p className="text-sm font-medium flex items-center gap-1">
                  <User className="w-4 h-4 text-gray-400" />
                  {task.assigned_to_name || "-"}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Giao bởi</span>
                <p className="text-sm font-medium">{task.assigned_by_name || "-"}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Deadline</span>
                <p className={`text-sm font-medium flex items-center gap-1 ${isOverdue ? "text-red-600" : ""}`}>
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDate(task.due_date)}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Ngày tạo</span>
                <p className="text-sm font-medium">{formatDateTime(task.created_at)}</p>
              </div>
              {task.started_at && (
                <div>
                  <span className="text-xs text-gray-500">Bắt đầu</span>
                  <p className="text-sm font-medium">{formatDateTime(task.started_at)}</p>
                </div>
              )}
              {task.completed_at && (
                <div>
                  <span className="text-xs text-gray-500">Hoàn thành</span>
                  <p className="text-sm font-medium">{formatDateTime(task.completed_at)}</p>
                </div>
              )}
            </div>

            {/* Watchers */}
            {task.watchers && task.watchers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Users className="w-4 h-4" /> Người theo dõi
                </h3>
                <div className="flex flex-wrap gap-2">
                  {task.watchers.map((watcher) => (
                    <span
                      key={watcher.id}
                      className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600"
                    >
                      {watcher.user_name || watcher.user_id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                <MessageSquare className="w-4 h-4" /> Hoạt động ({task.comments?.length || 0})
              </h3>

              {/* Add comment */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  placeholder="Thêm bình luận..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddComment}
                  disabled={submittingComment || !newComment.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Comment list */}
              <div className="space-y-3">
                {task.comments?.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                      {comment.user_name?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{comment.user_name || "User"}</span>
                        <span className="text-xs text-gray-400">
                          {formatDateTime(comment.created_at)}
                        </span>
                        {comment.comment_type !== "COMMENT" && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                            {comment.comment_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        {!isCompleted && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex items-center gap-2">
              {task.task_type === "APPROVAL" ? (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Phê duyệt
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> Từ chối
                  </button>
                </>
              ) : (
                <>
                  {task.status === "PENDING" && (
                    <button
                      onClick={handleStart}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" /> Bắt đầu
                    </button>
                  )}
                  {task.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => setShowCompleteDialog(true)}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Hoàn thành
                    </button>
                  )}
                </>
              )}
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Hủy task
              </button>
            </div>
          </div>
        )}

        {/* Complete Dialog */}
        {showCompleteDialog && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-6">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Hoàn thành task</h3>
              <textarea
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
                placeholder="Ghi chú kết quả (tùy chọn)..."
                className="w-full px-3 py-2 border rounded-lg mb-4 h-24 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCompleteDialog(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleComplete}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Xác nhận hoàn thành
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
