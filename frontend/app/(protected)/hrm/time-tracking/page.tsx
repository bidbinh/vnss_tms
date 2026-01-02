"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Play,
  Pause,
  MapPin,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface TimeEntry {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_location: string | null;
  check_out_location: string | null;
  working_hours: number | null;
  status: string;
  check_in_source: string;
  notes: string | null;
  employee?: Employee;
}

interface CheckInPayload {
  employee_id?: string;
  location?: string;
  notes?: string;
}

export default function TimeTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [todayEntry, setTodayEntry] = useState<TimeEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchTodayEntry();
    fetchRecentEntries();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchTodayEntry();
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      const data = await apiFetch<{ items: Employee[] }>("/hrm/employees?page_size=200&status=ACTIVE");
      setEmployees(data.items || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const fetchTodayEntry = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const params = new URLSearchParams();
      params.set("date_from", today);
      params.set("date_to", today);
      if (selectedEmployee) params.set("employee_id", selectedEmployee);
      params.set("page_size", "1");

      const data = await apiFetch<{ items: TimeEntry[] }>(`/hrm/attendance/records?${params.toString()}`);
      setTodayEntry(data.items?.[0] || null);
    } catch (error) {
      console.error("Failed to fetch today entry:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentEntries = async () => {
    try {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const params = new URLSearchParams();
      params.set("date_from", weekAgo.toISOString().split("T")[0]);
      params.set("date_to", today.toISOString().split("T")[0]);
      if (selectedEmployee) params.set("employee_id", selectedEmployee);
      params.set("page_size", "7");

      const data = await apiFetch<{ items: TimeEntry[] }>(`/hrm/attendance/records?${params.toString()}`);
      setRecentEntries(data.items || []);
    } catch (error) {
      console.error("Failed to fetch recent entries:", error);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    setError(null);
    try {
      const payload: CheckInPayload = {
        location: location || undefined,
        notes: notes || undefined,
      };
      if (selectedEmployee) {
        payload.employee_id = selectedEmployee;
      }

      await apiFetch("/hrm/attendance/records/check-in", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await fetchTodayEntry();
      await fetchRecentEntries();
      setNotes("");
    } catch (error: any) {
      setError(error?.message || "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    setError(null);
    try {
      const payload: CheckInPayload = {
        location: location || undefined,
        notes: notes || undefined,
      };
      if (selectedEmployee) {
        payload.employee_id = selectedEmployee;
      }

      await apiFetch("/hrm/attendance/records/check-out", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await fetchTodayEntry();
      await fetchRecentEntries();
      setNotes("");
    } catch (error: any) {
      setError(error?.message || "Check-out failed");
    } finally {
      setCheckingOut(false);
    }
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return "--:--";
    return timeStr.substring(0, 5);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "text-green-600";
      case "LATE":
        return "text-yellow-600";
      case "ABSENT":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Time Tracking</h1>
        <p className="text-gray-600 mt-1">Check-in / Check-out hàng ngày</p>
      </div>

      {/* Employee Selector (for HR/Admin) */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chọn nhân viên (HR/Admin)
        </label>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Tất cả / Bản thân --</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.employee_code} - {emp.full_name}
            </option>
          ))}
        </select>
      </div>

      {/* Clock Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="text-5xl font-bold font-mono">
              {currentTime.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
            <div className="text-blue-200 mt-2">
              {currentTime.toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            {/* Today's Status */}
            <div className="bg-white/20 rounded-xl px-6 py-3 text-center">
              <div className="text-sm text-blue-200">Hôm nay</div>
              <div className="flex items-center gap-4 mt-1">
                <div>
                  <div className="text-xs text-blue-200">Vào</div>
                  <div className="text-xl font-bold">{formatTime(todayEntry?.check_in_time)}</div>
                </div>
                <div className="text-2xl text-blue-300">→</div>
                <div>
                  <div className="text-xs text-blue-200">Ra</div>
                  <div className="text-xl font-bold">{formatTime(todayEntry?.check_out_time)}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!todayEntry?.check_in_time ? (
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-60"
                >
                  <Play className="w-5 h-5" />
                  {checkingIn ? "Đang xử lý..." : "Check In"}
                </button>
              ) : !todayEntry?.check_out_time ? (
                <button
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-60"
                >
                  <Pause className="w-5 h-5" />
                  {checkingOut ? "Đang xử lý..." : "Check Out"}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-6 py-3 bg-white/20 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                  <span>Đã hoàn thành</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location & Notes */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-blue-200 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Vị trí (tùy chọn)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Văn phòng, công trường..."
              className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
          <div>
            <label className="block text-sm text-blue-200 mb-1">Ghi chú</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú thêm..."
              className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Weekly Summary */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            7 ngày gần nhất
          </h2>
        </div>

        {recentEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có dữ liệu chấm công
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500 w-20">{formatDate(entry.date)}</div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-green-500" />
                      <span className="font-medium">{formatTime(entry.check_in_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Pause className="w-4 h-4 text-red-500" />
                      <span className="font-medium">{formatTime(entry.check_out_time)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {entry.working_hours ? `${entry.working_hours}h` : "-"}
                  </span>
                  <span className={`text-sm font-medium ${getStatusColor(entry.status)}`}>
                    {entry.status === "PRESENT"
                      ? "Có mặt"
                      : entry.status === "LATE"
                      ? "Đi trễ"
                      : entry.status === "ABSENT"
                      ? "Vắng"
                      : entry.status}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      entry.check_in_source === "MOBILE"
                        ? "bg-blue-100 text-blue-700"
                        : entry.check_in_source === "FINGERPRINT"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {entry.check_in_source === "MOBILE"
                      ? "App"
                      : entry.check_in_source === "FINGERPRINT"
                      ? "Vân tay"
                      : "Web"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">Hướng dẫn</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>- Nhấn <strong>Check In</strong> khi bắt đầu làm việc</li>
          <li>- Nhấn <strong>Check Out</strong> khi kết thúc ngày làm việc</li>
          <li>- Có thể nhập vị trí và ghi chú để theo dõi</li>
          <li>- HR/Admin có thể chọn nhân viên để check-in/out hộ</li>
        </ul>
      </div>
    </div>
  );
}
