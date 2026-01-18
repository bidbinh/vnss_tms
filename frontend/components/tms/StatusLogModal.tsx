"use client";

import { useState, useEffect } from "react";
import { X, Edit2, Check, XCircle, Clock, User } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface StatusLog {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  changed_by_user_id: string | null;
  changed_by_name: string | null;
  note: string | null;
}

interface StatusLogModalProps {
  orderId: string;
  orderCode: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "Mới tạo",
  ASSIGNED: "Đã phân công",
  IN_TRANSIT: "Đang vận chuyển",
  DELIVERED: "Đã giao hàng",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  REJECTED: "Từ chối",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  ASSIGNED: "bg-purple-100 text-purple-700",
  IN_TRANSIT: "bg-yellow-100 text-yellow-700",
  DELIVERED: "bg-green-100 text-green-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
  REJECTED: "bg-gray-100 text-gray-700",
};

export default function StatusLogModal({
  orderId,
  orderCode,
  isOpen,
  onClose,
  onUpdated,
}: StatusLogModalProps) {
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchLogs();
    }
  }, [isOpen, orderId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<StatusLog[]>(`/api/v1/orders/${orderId}/status-logs`);
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch status logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (log: StatusLog) => {
    const dt = new Date(log.changed_at);
    // Format for datetime-local input (local time)
    const localDate = dt.toISOString().split("T")[0];
    const localTime = dt.toTimeString().slice(0, 5);

    setEditingId(log.id);
    setEditDate(localDate);
    setEditTime(localTime);
    setEditNote(log.note || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDate("");
    setEditTime("");
    setEditNote("");
  };

  const saveEdit = async (logId: string) => {
    if (!editDate || !editTime) return;

    setSaving(true);
    try {
      // Combine date and time into ISO string
      const newDateTime = new Date(`${editDate}T${editTime}:00`);

      await apiFetch(`/api/v1/orders/${orderId}/status-logs/${logId}`, {
        method: "PATCH",
        body: JSON.stringify({
          changed_at: newDateTime.toISOString(),
          note: editNote || null,
        }),
      });

      // Refresh logs
      await fetchLogs();
      cancelEdit();

      if (onUpdated) {
        onUpdated();
      }
    } catch (error) {
      console.error("Failed to update status log:", error);
      alert("Không thể cập nhật. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const dt = new Date(dateStr);
    return dt.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Lịch sử trạng thái
            </h3>
            <p className="text-sm text-gray-500">Đơn hàng: {orderCode}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Không có lịch sử trạng thái
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div
                  key={log.id}
                  className={`relative pl-8 pb-4 ${
                    index < logs.length - 1 ? "border-l-2 border-gray-200 ml-3" : "ml-3"
                  }`}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center -translate-x-1/2 ${
                      STATUS_COLORS[log.to_status] || "bg-gray-100"
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Status change */}
                        <div className="flex items-center gap-2 mb-2">
                          {log.from_status && (
                            <>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_COLORS[log.from_status] || "bg-gray-100"}`}>
                                {STATUS_LABELS[log.from_status] || log.from_status}
                              </span>
                              <span className="text-gray-400">→</span>
                            </>
                          )}
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_COLORS[log.to_status] || "bg-gray-100"}`}>
                            {STATUS_LABELS[log.to_status] || log.to_status}
                          </span>
                        </div>

                        {/* DateTime - editable */}
                        {editingId === log.id ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <input
                                type="time"
                                value={editTime}
                                onChange={(e) => setEditTime(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <input
                              type="text"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              placeholder="Ghi chú (tùy chọn)"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => saveEdit(log.id)}
                                disabled={saving}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                <Check className="w-4 h-4" />
                                Lưu
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="flex items-center gap-1 px-3 py-1 border border-gray-300 text-sm rounded hover:bg-gray-100"
                              >
                                <XCircle className="w-4 h-4" />
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDateTime(log.changed_at)}
                            </div>
                            {log.changed_by_name && (
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {log.changed_by_name}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Note */}
                        {log.note && editingId !== log.id && (
                          <p className="mt-2 text-sm text-gray-500 italic">
                            {log.note}
                          </p>
                        )}
                      </div>

                      {/* Edit button */}
                      {editingId !== log.id && (
                        <button
                          onClick={() => startEdit(log)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Chỉnh sửa thời gian"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-500">
            * Trips/Day được tính dựa trên ngày DELIVERED. Chỉnh sửa thời gian ở đây sẽ ảnh hưởng đến tính lương.
          </p>
        </div>
      </div>
    </div>
  );
}
