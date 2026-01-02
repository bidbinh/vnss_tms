"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Download,
  Building2,
  Briefcase,
  UserCheck,
  UserMinus,
  TrendingUp,
  PieChart,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface DepartmentHeadcount {
  department: string;
  total: number;
  active: number;
  probation: number;
  resigned: number;
  male: number;
  female: number;
}

interface PositionHeadcount {
  position: string;
  department: string;
  count: number;
}

interface ReportSummary {
  total_headcount: number;
  total_active: number;
  total_probation: number;
  total_resigned: number;
  total_male: number;
  total_female: number;
}

export default function HeadcountReportPage() {
  const [loading, setLoading] = useState(true);
  const [deptData, setDeptData] = useState<DepartmentHeadcount[]>([]);
  const [positionData, setPositionData] = useState<PositionHeadcount[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [selectedView, setSelectedView] = useState<"department" | "position">("department");

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        by_department: DepartmentHeadcount[];
        by_position: PositionHeadcount[];
        summary: ReportSummary;
      }>("/hrm/reports/headcount");

      setDeptData(data.by_department || []);
      setPositionData(data.by_position || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to fetch report:", error);
      setDeptData([]);
      setPositionData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const totalHeadcount = summary?.total_headcount || 0;
  const totalActive = summary?.total_active || 0;
  const totalProbation = summary?.total_probation || 0;
  const totalResigned = summary?.total_resigned || 0;
  const totalMale = summary?.total_male || 0;
  const totalFemale = summary?.total_female || 0;

  const handleExport = () => {
    alert("Tính năng xuất báo cáo đang được phát triển");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo nhân sự</h1>
          <p className="text-gray-600 mt-1">Thống kê số lượng nhân sự theo phòng ban, vị trí</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          Xuất Excel
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng số</div>
              <div className="text-2xl font-bold text-gray-900">{totalHeadcount}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Chính thức</div>
              <div className="text-2xl font-bold text-green-600">{totalActive}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Thử việc</div>
              <div className="text-2xl font-bold text-yellow-600">{totalProbation}</div>
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
              <div className="text-2xl font-bold text-red-600">{totalResigned}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Nam</div>
              <div className="text-2xl font-bold text-blue-600">{totalMale}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Users className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Nữ</div>
              <div className="text-2xl font-bold text-pink-600">{totalFemale}</div>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedView("department")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              selectedView === "department"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Theo phòng ban
          </button>
          <button
            onClick={() => setSelectedView("position")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              selectedView === "position"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Theo vị trí
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : selectedView === "department" ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phòng ban
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Tổng số
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Chính thức
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Thử việc
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Nghỉ việc
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Nam
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Nữ
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Tỷ lệ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deptData.map((row, index) => (
                <tr key={`${row.department}-${index}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      {row.department}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">{row.total}</td>
                  <td className="px-4 py-3 text-center text-green-600">{row.active}</td>
                  <td className="px-4 py-3 text-center text-yellow-600">{row.probation}</td>
                  <td className="px-4 py-3 text-center text-red-600">{row.resigned}</td>
                  <td className="px-4 py-3 text-center text-blue-600">{row.male}</td>
                  <td className="px-4 py-3 text-center text-pink-600">{row.female}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(row.total / totalHeadcount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {((row.total / totalHeadcount) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-medium">
              <tr>
                <td className="px-4 py-3 text-gray-700">Tổng cộng</td>
                <td className="px-4 py-3 text-center font-bold text-gray-900">{totalHeadcount}</td>
                <td className="px-4 py-3 text-center text-green-600">{totalActive}</td>
                <td className="px-4 py-3 text-center text-yellow-600">{totalProbation}</td>
                <td className="px-4 py-3 text-center text-red-600">{totalResigned}</td>
                <td className="px-4 py-3 text-center text-blue-600">{totalMale}</td>
                <td className="px-4 py-3 text-center text-pink-600">{totalFemale}</td>
                <td className="px-4 py-3 text-center text-gray-500">100%</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vị trí
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phòng ban
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Số lượng
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Tỷ lệ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {positionData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      {row.position}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{row.department}</td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">{row.count}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(row.count / totalHeadcount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {((row.count / totalHeadcount) * 100).toFixed(1)}%
                      </span>
                    </div>
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
