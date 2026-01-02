"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Download,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Filter,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Department {
  id: string;
  name: string;
}

interface AttendanceReport {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  total_days: number;
  present_days: number;
  late_days: number;
  absent_days: number;
  leave_days: number;
  ot_hours: number;
  attendance_rate: number;
}

interface ReportSummary {
  total_employees: number;
  avg_attendance_rate: number;
  total_ot_hours: number;
  total_late_count: number;
  total_absent_count: number;
}

export default function AttendanceReportPage() {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [reportData, setReportData] = useState<AttendanceReport[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7)
  );

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedDept, selectedMonth]);

  const fetchDepartments = async () => {
    try {
      const data = await apiFetch<Department[]>("/hrm/departments");
      setDepartments(data || []);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("month", selectedMonth);
      if (selectedDept) params.set("department_id", selectedDept);

      const data = await apiFetch<{ items: AttendanceReport[]; summary: ReportSummary }>(
        `/hrm/reports/attendance?${params.toString()}`
      );
      setReportData(data.items || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to fetch report:", error);
      setReportData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const avgAttendance = summary?.avg_attendance_rate || 0;
  const totalOT = summary?.total_ot_hours || 0;
  const totalAbsent = summary?.total_absent_count || 0;
  const totalLate = summary?.total_late_count || 0;

  const handleExport = () => {
    alert("Tính năng xuất báo cáo đang được phát triển");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo chấm công</h1>
          <p className="text-gray-600 mt-1">Tổng hợp chấm công theo tháng</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          Xuất Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tháng</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Phòng ban</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg min-w-[200px]"
            >
              <option value="">Tất cả</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tỷ lệ chấm công TB</div>
              <div className="text-2xl font-bold text-green-600">{avgAttendance}%</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng giờ OT</div>
              <div className="text-2xl font-bold text-blue-600">{totalOT}h</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng lần đi trễ</div>
              <div className="text-2xl font-bold text-yellow-600">{totalLate}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng ngày vắng</div>
              <div className="text-2xl font-bold text-red-600">{totalAbsent}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mã NV
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Họ tên
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phòng ban
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Ngày công
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Có mặt
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Đi trễ
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Vắng
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Nghỉ phép
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  OT (giờ)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Tỷ lệ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.map((row) => (
                <tr key={row.employee_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">
                    {row.employee_code}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.employee_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{row.department}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {row.total_days}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-green-600">
                    {row.present_days}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-yellow-600">
                    {row.late_days || "-"}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-red-600">
                    {row.absent_days || "-"}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {row.leave_days || "-"}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-blue-600">
                    {row.ot_hours || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 text-xs rounded font-medium ${
                        row.attendance_rate >= 95
                          ? "bg-green-100 text-green-700"
                          : row.attendance_rate >= 85
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {row.attendance_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
