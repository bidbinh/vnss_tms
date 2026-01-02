"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Download,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  CreditCard,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Department {
  id: string;
  name: string;
}

interface PayrollReport {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  position: string;
  basic_salary: number;
  allowances: number;
  overtime: number;
  gross_salary: number;
  insurance: number;
  tax: number;
  deductions: number;
  net_salary: number;
}

interface ReportSummary {
  total_employees: number;
  total_gross: number;
  total_net: number;
  total_deductions: number;
  avg_salary: number;
}

export default function PayrollReportPage() {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [reportData, setReportData] = useState<PayrollReport[]>([]);
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

      const data = await apiFetch<{ items: PayrollReport[]; summary: ReportSummary }>(
        `/hrm/reports/payroll?${params.toString()}`
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalGross = summary?.total_gross || 0;
  const totalNet = summary?.total_net || 0;
  const totalDeductions = summary?.total_deductions || 0;
  const avgSalary = summary?.avg_salary || 0;

  const handleExport = () => {
    alert("Tính năng xuất báo cáo đang được phát triển");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo lương</h1>
          <p className="text-gray-600 mt-1">Tổng hợp bảng lương theo tháng</p>
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng thu nhập</div>
              <div className="text-lg font-bold text-blue-600">{formatCurrency(totalGross)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Thực lĩnh</div>
              <div className="text-lg font-bold text-green-600">{formatCurrency(totalNet)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng khấu trừ</div>
              <div className="text-lg font-bold text-red-600">{formatCurrency(totalDeductions)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Lương TB</div>
              <div className="text-lg font-bold text-purple-600">{formatCurrency(avgSalary)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Lương CB
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Phụ cấp
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Tăng ca
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Tổng TN
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  BHXH
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Thuế
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Khấu trừ
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Thực lĩnh
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
                  <td className="px-4 py-3 text-right text-sm text-gray-700">
                    {formatCurrency(row.basic_salary)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">
                    {formatCurrency(row.allowances)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-blue-600">
                    {row.overtime ? formatCurrency(row.overtime) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(row.gross_salary)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-red-600">
                    -{formatCurrency(row.insurance)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-red-600">
                    -{formatCurrency(row.tax)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-red-600">
                    {row.deductions ? `-${formatCurrency(row.deductions)}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">
                    {formatCurrency(row.net_salary)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-medium">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm text-gray-700">
                  Tổng cộng ({reportData.length} nhân viên)
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-700">
                  {formatCurrency(reportData.reduce((sum, r) => sum + r.basic_salary, 0))}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-700">
                  {formatCurrency(reportData.reduce((sum, r) => sum + r.allowances, 0))}
                </td>
                <td className="px-4 py-3 text-right text-sm text-blue-600">
                  {formatCurrency(reportData.reduce((sum, r) => sum + r.overtime, 0))}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                  {formatCurrency(totalGross)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-red-600">
                  -{formatCurrency(reportData.reduce((sum, r) => sum + r.insurance, 0))}
                </td>
                <td className="px-4 py-3 text-right text-sm text-red-600">
                  -{formatCurrency(reportData.reduce((sum, r) => sum + r.tax, 0))}
                </td>
                <td className="px-4 py-3 text-right text-sm text-red-600">
                  -{formatCurrency(reportData.reduce((sum, r) => sum + r.deductions, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-green-600">
                  {formatCurrency(totalNet)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
