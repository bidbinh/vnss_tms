"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Clock,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Download,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface AttendanceRecord {
  id: string;
  employee_id: string;
  work_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  actual_hours: number | null;
  status: string;
  source: string;
  notes: string | null;
  employee: {
    id: string;
    employee_code: string;
    full_name: string;
  } | null;
  shift_name: string | null;
}

interface AttendanceResponse {
  items: AttendanceRecord[];
  total: number;
  page: number;
  page_size: number;
}

interface DailySummary {
  date: string;
  total_employees: number;
  present: number;
  late: number;
  absent: number;
  on_leave: number;
  attendance_rate: number;
}

const STATUS_COLORS: Record<string, { color: string; icon: React.ElementType }> = {
  PRESENT: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  LATE: { color: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
  ABSENT: { color: "bg-red-100 text-red-700", icon: XCircle },
  ON_LEAVE: { color: "bg-blue-100 text-blue-700", icon: Calendar },
  HALF_DAY: { color: "bg-purple-100 text-purple-700", icon: Clock },
};

export default function AttendancePage() {
  const t = useTranslations("hrm.attendancePage");
  const tCommon = useTranslations("common");

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    fetchAttendance();
    fetchSummary();
  }, [selectedDate, page]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("date_from", selectedDate);
      params.set("date_to", selectedDate);
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());

      const data = await apiFetch<AttendanceResponse>(`/hrm/attendance/records?${params.toString()}`);
      setRecords(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await apiFetch<DailySummary>(
        `/hrm/attendance/records/daily-summary?date=${selectedDate}`
      );
      setSummary(data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "-";
    return timeStr.substring(0, 5); // HH:MM
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <Download className="w-4 h-4" />
            {t("exportExcel")}
          </button>
        </div>
      </div>

      {/* Daily Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">{t("stats.totalEmployees")}</div>
                <div className="text-xl font-bold text-gray-900">{summary.total_employees}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">{t("stats.present")}</div>
                <div className="text-xl font-bold text-green-600">{summary.present}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">{t("stats.late")}</div>
                <div className="text-xl font-bold text-yellow-600">{summary.late}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">{t("stats.absent")}</div>
                <div className="text-xl font-bold text-red-600">{summary.absent}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">{t("stats.rate")}</div>
                <div className="text-xl font-bold text-purple-600">{summary.attendance_rate}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold">
            {t("tableTitle")} {new Date(selectedDate).toLocaleDateString("vi-VN")}
          </h2>
          <span className="text-sm text-gray-500">{t("totalRecords", { count: total })}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            {t("noData")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.employee")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.shift")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.checkIn")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.checkOut")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.hours")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.source")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((record) => {
                  const statusConfig = STATUS_COLORS[record.status] || STATUS_COLORS.ABSENT;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {record.employee?.full_name || "-"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.employee?.employee_code}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {record.shift_name || t("noShift")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span
                            className={
                              record.status === "LATE" ? "text-yellow-600 font-medium" : "text-gray-900"
                            }
                          >
                            {formatTime(record.check_in_time)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatTime(record.check_out_time)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {record.actual_hours ? `${record.actual_hours}h` : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded ${
                            record.source === "MOBILE"
                              ? "bg-blue-100 text-blue-700"
                              : record.source === "FINGERPRINT"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {t(`source.${record.source}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {t(`status.${record.status}`)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Progress Bar */}
      {summary && summary.total_employees > 0 && (
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">{t("dailyOverview")}</h3>
          <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-green-500"
              style={{ width: `${(summary.present / summary.total_employees) * 100}%` }}
            />
            <div
              className="absolute top-0 h-full bg-yellow-500"
              style={{
                left: `${(summary.present / summary.total_employees) * 100}%`,
                width: `${(summary.late / summary.total_employees) * 100}%`,
              }}
            />
            <div
              className="absolute top-0 h-full bg-blue-500"
              style={{
                left: `${((summary.present + summary.late) / summary.total_employees) * 100}%`,
                width: `${(summary.on_leave / summary.total_employees) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>{t("stats.present")} ({summary.present})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded" />
              <span>{t("stats.late")} ({summary.late})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>{t("onLeave")} ({summary.on_leave})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-200 rounded" />
              <span>{t("stats.absent")} ({summary.absent})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
