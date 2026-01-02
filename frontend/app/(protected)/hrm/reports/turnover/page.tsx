"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Users,
  UserPlus,
  UserMinus,
  Calendar,
  Building2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface MonthlyTurnover {
  month: string;
  hired: number;
  resigned: number;
  headcount_start: number;
  headcount_end: number;
  turnover_rate: number;
}

interface DepartmentTurnover {
  department: string;
  hired: number;
  resigned: number;
  current: number;
  turnover_rate: number;
}

interface ResignReason {
  reason: string;
  count: number;
  percentage: number;
}

interface ReportSummary {
  total_hired: number;
  total_resigned: number;
  net_change: number;
  avg_turnover_rate: number;
}

export default function TurnoverReportPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyTurnover[]>([]);
  const [deptData, setDeptData] = useState<DepartmentTurnover[]>([]);
  const [reasonData, setReasonData] = useState<ResignReason[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchReport();
  }, [selectedYear]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        monthly: MonthlyTurnover[];
        by_department: DepartmentTurnover[];
        resign_reasons: ResignReason[];
        summary: ReportSummary;
      }>(`/hrm/reports/turnover?year=${selectedYear}`);

      setMonthlyData(data.monthly || []);
      setDeptData(data.by_department || []);
      setReasonData(data.resign_reasons || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to fetch report:", error);
      setMonthlyData([]);
      setDeptData([]);
      setReasonData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const totalHired = summary?.total_hired || 0;
  const totalResigned = summary?.total_resigned || 0;
  const avgTurnover = summary?.avg_turnover_rate || 0;
  const netChange = summary?.net_change || 0;

  const handleExport = () => {
    alert("Tính năng xuất báo cáo đang được phát triển");
  };

  const years = [2024, 2023, 2022];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo biến động nhân sự</h1>
          <p className="text-gray-600 mt-1">Thống kê vào/ra, tỷ lệ nghỉ việc</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                Năm {year}
              </option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tuyển mới</div>
              <div className="text-2xl font-bold text-green-600">+{totalHired}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <UserMinus className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Nghỉ việc</div>
              <div className="text-2xl font-bold text-red-600">-{totalResigned}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${netChange >= 0 ? "bg-blue-100" : "bg-orange-100"}`}>
              {netChange >= 0 ? (
                <TrendingUp className="w-5 h-5 text-blue-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-orange-600" />
              )}
            </div>
            <div>
              <div className="text-sm text-gray-600">Biến động ròng</div>
              <div
                className={`text-2xl font-bold ${
                  netChange >= 0 ? "text-blue-600" : "text-orange-600"
                }`}
              >
                {netChange >= 0 ? `+${netChange}` : netChange}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Turnover TB</div>
              <div className="text-2xl font-bold text-purple-600">{avgTurnover}%</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Monthly Chart - Simple Bar */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              Biến động theo tháng
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Tháng
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Vào
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Ra
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Đầu kỳ
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Cuối kỳ
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Turnover
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">
                      Biểu đồ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {monthlyData.map((row) => (
                    <tr key={row.month} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{row.month}</td>
                      <td className="px-3 py-2 text-center text-sm text-green-600 font-medium">
                        +{row.hired}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-red-600 font-medium">
                        -{row.resigned}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-600">
                        {row.headcount_start}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-600">
                        {row.headcount_end}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 text-xs rounded font-medium ${
                            row.turnover_rate <= 1.5
                              ? "bg-green-100 text-green-700"
                              : row.turnover_rate <= 3
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.turnover_rate}%
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <div
                            className="h-3 bg-green-500 rounded-l"
                            style={{ width: `${row.hired * 8}px` }}
                          />
                          <div
                            className="h-3 bg-red-500 rounded-r"
                            style={{ width: `${row.resigned * 8}px` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Department */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-500" />
                Theo phòng ban
              </h3>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Phòng ban
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Vào
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Ra
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Turnover
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {deptData.map((row, index) => (
                    <tr key={`${row.department}-${index}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{row.department}</td>
                      <td className="px-3 py-2 text-center text-green-600">+{row.hired}</td>
                      <td className="px-3 py-2 text-center text-red-600">-{row.resigned}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 text-xs rounded font-medium ${
                            row.turnover_rate <= 15
                              ? "bg-green-100 text-green-700"
                              : row.turnover_rate <= 25
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.turnover_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resign Reasons */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-gray-500" />
                Lý do nghỉ việc
              </h3>
              <div className="space-y-3">
                {reasonData.map((row) => (
                  <div key={row.reason}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{row.reason}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {row.count} ({row.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${row.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
