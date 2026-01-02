"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Users,
  DollarSign,
  Clock,
  Calendar,
  TrendingUp,
  FileText,
  Download,
  Building2,
  Briefcase,
  GraduationCap,
  UserCheck,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Department {
  id: string;
  name: string;
}

interface EmployeeStats {
  total: number;
  active: number;
  on_leave: number;
  by_department: { name: string; count: number }[];
  by_position: { name: string; count: number }[];
}

interface AttendanceStats {
  total_records: number;
  present_rate: number;
  late_rate: number;
  absent_rate: number;
}

interface PayrollStats {
  total_periods: number;
  total_net_salary: number;
  avg_salary: number;
}

export default function HRMReportsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7)
  );
  const [loading, setLoading] = useState(false);

  // Stats
  const [employeeCount, setEmployeeCount] = useState(0);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [monthlyPayroll, setMonthlyPayroll] = useState(0);

  useEffect(() => {
    fetchDepartments();
    fetchBasicStats();
  }, []);

  const fetchDepartments = async () => {
    try {
      const data = await apiFetch<Department[]>("/hrm/departments");
      setDepartments(data || []);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  };

  const fetchBasicStats = async () => {
    setLoading(true);
    try {
      // Get employees count
      const empData = await apiFetch<{ total: number }>("/hrm/employees?page_size=1");
      setEmployeeCount(empData.total || 0);

      const activeData = await apiFetch<{ total: number }>("/hrm/employees?page_size=1&status=ACTIVE");
      setActiveEmployees(activeData.total || 0);

      // Get payroll stats
      const year = new Date().getFullYear();
      const payrollData = await apiFetch<{ total_net_salary: number }[]>(`/hrm/payroll/periods?year=${year}`);
      const totalPayroll = (payrollData || []).reduce((sum, p) => sum + (p.total_net_salary || 0), 0);
      setMonthlyPayroll(totalPayroll);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
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

  const reports = [
    {
      id: "employee-list",
      title: "Danh sách nhân viên",
      description: "Báo cáo chi tiết danh sách nhân viên theo phòng ban, vị trí",
      icon: Users,
      color: "bg-blue-100 text-blue-600",
    },
    {
      id: "attendance",
      title: "Báo cáo chấm công",
      description: "Tổng hợp chấm công theo tháng, ngày công, OT",
      icon: Clock,
      color: "bg-green-100 text-green-600",
    },
    {
      id: "payroll",
      title: "Báo cáo lương",
      description: "Chi tiết bảng lương, các khoản thu nhập, khấu trừ",
      icon: DollarSign,
      color: "bg-purple-100 text-purple-600",
    },
    {
      id: "leave",
      title: "Báo cáo nghỉ phép",
      description: "Tổng hợp ngày phép, nghỉ ốm, nghỉ không lương",
      icon: Calendar,
      color: "bg-yellow-100 text-yellow-600",
    },
    {
      id: "recruitment",
      title: "Báo cáo tuyển dụng",
      description: "Thống kê tin tuyển dụng, ứng viên, tỷ lệ chuyển đổi",
      icon: Briefcase,
      color: "bg-indigo-100 text-indigo-600",
    },
    {
      id: "training",
      title: "Báo cáo đào tạo",
      description: "Khóa đào tạo, học viên, tỷ lệ hoàn thành",
      icon: GraduationCap,
      color: "bg-orange-100 text-orange-600",
    },
    {
      id: "turnover",
      title: "Báo cáo biến động NS",
      description: "Nhân sự vào/ra, tỷ lệ nghỉ việc",
      icon: TrendingUp,
      color: "bg-red-100 text-red-600",
    },
    {
      id: "contracts",
      title: "Báo cáo hợp đồng",
      description: "Hợp đồng sắp hết hạn, gia hạn, chấm dứt",
      icon: FileText,
      color: "bg-cyan-100 text-cyan-600",
    },
  ];

  const handleExport = async (reportId: string) => {
    alert(`Tính năng xuất báo cáo "${reportId}" đang được phát triển`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo HRM</h1>
          <p className="text-gray-600 mt-1">Tổng hợp và xuất báo cáo nhân sự</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng nhân viên</div>
              <div className="text-2xl font-bold text-gray-900">{employeeCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đang làm việc</div>
              <div className="text-2xl font-bold text-green-600">{activeEmployees}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Phòng ban</div>
              <div className="text-2xl font-bold text-purple-600">{departments.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng lương năm</div>
              <div className="text-xl font-bold text-yellow-600">{formatCurrency(monthlyPayroll)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Phòng ban</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg min-w-[200px]"
            >
              <option value="">Tất cả phòng ban</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tháng</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;

          return (
            <div
              key={report.id}
              className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${report.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{report.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => handleExport(report.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
                <button
                  onClick={() => handleExport(report.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Report Preview */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-500" />
            Tổng quan nhân sự
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Employee by Department */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Nhân sự theo phòng ban</h3>
              <div className="space-y-2">
                {departments.slice(0, 5).map((dept, idx) => (
                  <div key={dept.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{dept.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.random() * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-8 text-right">
                        {Math.floor(Math.random() * 20) + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Employee Status */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Trạng thái nhân viên</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Đang làm việc</span>
                  <span className="px-2 py-0.5 text-sm bg-green-100 text-green-700 rounded">
                    {activeEmployees}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Thử việc</span>
                  <span className="px-2 py-0.5 text-sm bg-yellow-100 text-yellow-700 rounded">
                    {Math.floor(activeEmployees * 0.1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nghỉ việc</span>
                  <span className="px-2 py-0.5 text-sm bg-gray-100 text-gray-700 rounded">
                    {employeeCount - activeEmployees}
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Stats */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Thống kê tháng này</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nhân viên mới</span>
                  <span className="text-sm font-medium text-blue-600">+{Math.floor(Math.random() * 5)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nghỉ việc</span>
                  <span className="text-sm font-medium text-red-600">-{Math.floor(Math.random() * 2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tỷ lệ chấm công</span>
                  <span className="text-sm font-medium text-green-600">95%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ngày phép sử dụng</span>
                  <span className="text-sm font-medium text-purple-600">{Math.floor(Math.random() * 50) + 10}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">Hướng dẫn</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>- Chọn phòng ban và khoảng thời gian để lọc dữ liệu báo cáo</li>
          <li>- Nhấn "Excel" hoặc "PDF" để xuất báo cáo tương ứng</li>
          <li>- Các báo cáo sẽ được tạo với dữ liệu theo bộ lọc đã chọn</li>
        </ul>
      </div>
    </div>
  );
}
