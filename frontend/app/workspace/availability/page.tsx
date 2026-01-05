"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Repeat,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  tenant_id?: string;
  note?: string;
  task_id?: string;
  order_id?: string;
}

interface Template {
  id: string;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  tenant_id?: string;
}

const DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

export default function AvailabilityPage() {
  const { worker } = useWorker();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [formData, setFormData] = useState({
    start_time: "06:00",
    end_time: "18:00",
    status: "AVAILABLE",
    note: "",
    recurrence_type: "NONE",
    recurrence_end_date: "",
  });
  const [templateForm, setTemplateForm] = useState({
    day_of_week: 0,
    start_time: "06:00",
    end_time: "18:00",
  });

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (worker) {
      fetchData();
    }
  }, [worker, currentWeekStart]);

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const fetchData = async () => {
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const [availRes, templatesRes] = await Promise.all([
        fetch(
          `${baseUrl}/api/v1/driver-availability/my-availability?start_date=${formatDate(
            currentWeekStart
          )}&end_date=${formatDate(weekEnd)}`,
          { credentials: "include" }
        ),
        fetch(`${baseUrl}/api/v1/driver-availability/my-templates`, {
          credentials: "include",
        }),
      ]);

      if (availRes.ok) {
        const data = await availRes.json();
        setAvailability(data.availability || []);
      }

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    if (!selectedDate) return;

    try {
      const res = await fetch(`${baseUrl}/api/v1/driver-availability/my-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: selectedDate,
          ...formData,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchData();
        setFormData({
          start_time: "06:00",
          end_time: "18:00",
          status: "AVAILABLE",
          note: "",
          recurrence_type: "NONE",
          recurrence_end_date: "",
        });
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to add slot");
      }
    } catch (error) {
      console.error("Failed to add slot:", error);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Xóa lịch rảnh này?")) return;

    try {
      const res = await fetch(
        `${baseUrl}/api/v1/driver-availability/my-availability/${slotId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete slot:", error);
    }
  };

  const handleAddTemplate = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/v1/driver-availability/my-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(templateForm),
      });

      if (res.ok) {
        setShowTemplateModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to add template");
      }
    } catch (error) {
      console.error("Failed to add template:", error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const res = await fetch(
        `${baseUrl}/api/v1/driver-availability/my-templates/${templateId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleApplyTemplates = async () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    try {
      const res = await fetch(
        `${baseUrl}/api/v1/driver-availability/apply-templates?start_date=${formatDate(
          currentWeekStart
        )}&end_date=${formatDate(weekEnd)}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to apply templates");
      }
    } catch (error) {
      console.error("Failed to apply templates:", error);
    }
  };

  const prevWeek = () => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const nextWeek = () => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-100 text-green-700 border-green-200";
      case "BUSY":
        return "bg-red-100 text-red-700 border-red-200";
      case "BLOCKED":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "Rảnh";
      case "BUSY":
        return "Bận";
      case "BLOCKED":
        return "Khóa";
      default:
        return status;
    }
  };

  if (!worker) {
    return null;
  }

  const weekDates = getWeekDates();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/workspace"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">
              Lịch làm việc
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1"
            >
              <Repeat className="w-4 h-4" />
              Lịch mẫu
            </button>
            {templates.length > 0 && (
              <button
                onClick={handleApplyTemplates}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Áp dụng mẫu
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevWeek}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-medium text-gray-900">
            {currentWeekStart.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
            })}{" "}
            -{" "}
            {weekDates[6].toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </h2>
          <button
            onClick={nextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekly Calendar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 divide-x divide-gray-200">
              {weekDates.map((date, idx) => {
                const dateStr = formatDate(date);
                const daySlots = availability.filter((s) => s.date === dateStr);
                const isToday =
                  formatDate(new Date()) === dateStr;

                return (
                  <div key={dateStr} className="min-h-[200px]">
                    {/* Day Header */}
                    <div
                      className={`p-2 text-center border-b ${
                        isToday ? "bg-blue-50" : "bg-gray-50"
                      }`}
                    >
                      <div className="text-xs text-gray-500">{DAYS[idx]}</div>
                      <div
                        className={`text-lg font-semibold ${
                          isToday ? "text-blue-600" : "text-gray-900"
                        }`}
                      >
                        {date.getDate()}
                      </div>
                    </div>

                    {/* Time Slots */}
                    <div className="p-2 space-y-2">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`p-2 rounded-lg border text-xs ${getStatusColor(
                            slot.status
                          )}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {slot.start_time.slice(0, 5)} -{" "}
                              {slot.end_time.slice(0, 5)}
                            </span>
                            {!slot.task_id && !slot.order_id && (
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="p-0.5 hover:bg-white/50 rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="mt-1">{getStatusLabel(slot.status)}</div>
                          {slot.order_id && (
                            <div className="mt-1 text-xs opacity-70">
                              Đã giao việc
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add Button */}
                      <button
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setShowAddModal(true);
                        }}
                        className="w-full p-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-blue-300 hover:text-blue-500 flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Templates Section */}
        {templates.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-blue-600" />
              Lịch mẫu hàng tuần
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-blue-50 border border-blue-100 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-blue-900">
                      {t.day_name}
                    </span>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="p-1 hover:bg-blue-100 rounded text-blue-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    {t.start_time.slice(0, 5)} - {t.end_time.slice(0, 5)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>Rảnh</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>Bận (đã có việc)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-500"></div>
            <span>Khóa</span>
          </div>
        </div>
      </main>

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              Thêm lịch rảnh - {selectedDate}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Từ giờ
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Đến giờ
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Trạng thái
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="AVAILABLE">Rảnh - sẵn sàng nhận việc</option>
                  <option value="BLOCKED">Khóa - không nhận việc</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Lặp lại
                </label>
                <select
                  value={formData.recurrence_type}
                  onChange={(e) =>
                    setFormData({ ...formData, recurrence_type: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="NONE">Không lặp</option>
                  <option value="DAILY">Hàng ngày</option>
                  <option value="WEEKLY">Hàng tuần</option>
                  <option value="MONTHLY">Hàng tháng</option>
                </select>
              </div>

              {formData.recurrence_type !== "NONE" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrence_end_date: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  placeholder="VD: Chỉ nhận đơn HCM"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleAddSlot}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Thêm lịch mẫu</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Ngày trong tuần
                </label>
                <select
                  value={templateForm.day_of_week}
                  onChange={(e) =>
                    setTemplateForm({
                      ...templateForm,
                      day_of_week: parseInt(e.target.value),
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {DAYS.map((day, idx) => (
                    <option key={idx} value={idx}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Từ giờ
                  </label>
                  <input
                    type="time"
                    value={templateForm.start_time}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        start_time: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Đến giờ
                  </label>
                  <input
                    type="time"
                    value={templateForm.end_time}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        end_time: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Đóng
              </button>
              <button
                onClick={handleAddTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Thêm mẫu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
