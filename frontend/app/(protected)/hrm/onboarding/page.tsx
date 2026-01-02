"use client";

import { useEffect, useState } from "react";
import {
  UserCheck,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Calendar,
  FileText,
  Users,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  position?: string;
  department?: string;
  start_date?: string;
}

interface OnboardingTask {
  id: string;
  name: string;
  is_completed: boolean;
  completed_date?: string;
}

interface Onboarding {
  id: string;
  employee_id: string;
  employee?: Employee;
  start_date: string;
  expected_end_date: string;
  status: string;
  mentor_id?: string;
  mentor?: Employee;
  tasks: OnboardingTask[];
  progress: number;
  notes?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: "Chưa bắt đầu", color: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "Đang thực hiện", color: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-700" },
  EXTENDED: { label: "Gia hạn", color: "bg-yellow-100 text-yellow-700" },
  FAILED: { label: "Không đạt", color: "bg-red-100 text-red-700" },
};

const DEFAULT_TASKS = [
  "Hoàn thành giấy tờ nhập việc",
  "Nhận tài khoản email & hệ thống",
  "Đào tạo quy trình công ty",
  "Gặp gỡ team và phòng ban",
  "Đào tạo kỹ năng chuyên môn",
  "Hoàn thành bài kiểm tra thử việc",
];

export default function OnboardingPage() {
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    fetchOnboardings();
  }, []);

  const fetchOnboardings = async () => {
    setLoading(true);
    try {
      // Mock data
      const mockData: Onboarding[] = [
        {
          id: "1",
          employee_id: "emp1",
          employee: {
            id: "emp1",
            employee_code: "NV-2024-010",
            full_name: "Nguyen Van New",
            position: "Software Engineer",
            department: "IT",
            start_date: "2024-12-15",
          },
          start_date: "2024-12-15",
          expected_end_date: "2025-02-15",
          status: "IN_PROGRESS",
          mentor: { id: "m1", employee_code: "NV001", full_name: "Senior Dev" },
          tasks: [
            { id: "t1", name: "Hoàn thành giấy tờ nhập việc", is_completed: true, completed_date: "2024-12-15" },
            { id: "t2", name: "Nhận tài khoản email & hệ thống", is_completed: true, completed_date: "2024-12-16" },
            { id: "t3", name: "Đào tạo quy trình công ty", is_completed: true, completed_date: "2024-12-18" },
            { id: "t4", name: "Gặp gỡ team và phòng ban", is_completed: true, completed_date: "2024-12-20" },
            { id: "t5", name: "Đào tạo kỹ năng chuyên môn", is_completed: false },
            { id: "t6", name: "Hoàn thành bài kiểm tra thử việc", is_completed: false },
          ],
          progress: 67,
        },
        {
          id: "2",
          employee_id: "emp2",
          employee: {
            id: "emp2",
            employee_code: "NV-2024-011",
            full_name: "Tran Thi Fresher",
            position: "HR Intern",
            department: "HR",
            start_date: "2024-12-20",
          },
          start_date: "2024-12-20",
          expected_end_date: "2025-01-20",
          status: "IN_PROGRESS",
          tasks: [
            { id: "t1", name: "Hoàn thành giấy tờ nhập việc", is_completed: true },
            { id: "t2", name: "Nhận tài khoản email & hệ thống", is_completed: true },
            { id: "t3", name: "Đào tạo quy trình công ty", is_completed: false },
            { id: "t4", name: "Gặp gỡ team và phòng ban", is_completed: false },
          ],
          progress: 50,
        },
        {
          id: "3",
          employee_id: "emp3",
          employee: {
            id: "emp3",
            employee_code: "NV-2024-008",
            full_name: "Le Van Graduate",
            position: "Accountant",
            department: "Finance",
            start_date: "2024-11-01",
          },
          start_date: "2024-11-01",
          expected_end_date: "2025-01-01",
          status: "COMPLETED",
          tasks: DEFAULT_TASKS.map((name, idx) => ({
            id: `t${idx}`,
            name,
            is_completed: true,
            completed_date: "2024-12-25",
          })),
          progress: 100,
        },
      ];
      setOnboardings(mockData);
    } catch (error) {
      console.error("Failed to fetch onboardings:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOnboardings = onboardings.filter((ob) => {
    const matchesSearch =
      ob.employee?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ob.employee?.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || ob.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const inProgressCount = onboardings.filter((ob) => ob.status === "IN_PROGRESS").length;
  const completedCount = onboardings.filter((ob) => ob.status === "COMPLETED").length;
  const avgProgress =
    onboardings.length > 0
      ? Math.round(onboardings.reduce((sum, ob) => sum + ob.progress, 0) / onboardings.length)
      : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding</h1>
          <p className="text-gray-600 mt-1">Quản lý quy trình tiếp nhận nhân viên mới</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm onboarding
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng số</div>
              <div className="text-2xl font-bold text-gray-900">{onboardings.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đang thực hiện</div>
              <div className="text-2xl font-bold text-yellow-600">{inProgressCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Hoàn thành</div>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">TB tiến độ</div>
              <div className="text-2xl font-bold text-purple-600">{avgProgress}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên, mã NV..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Onboarding List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredOnboardings.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center text-gray-500">
          Chưa có onboarding nào
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOnboardings.map((ob) => {
            const statusConfig = STATUS_CONFIG[ob.status];
            const completedTasks = ob.tasks.filter((t) => t.is_completed).length;
            const totalTasks = ob.tasks.length;
            const isOverdue =
              ob.status === "IN_PROGRESS" &&
              new Date(ob.expected_end_date) < new Date();

            return (
              <div
                key={ob.id}
                className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        {ob.employee?.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {ob.employee?.full_name}
                          </h3>
                          <span className="text-sm text-gray-500">
                            ({ob.employee?.employee_code})
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded ${statusConfig?.color}`}>
                            {statusConfig?.label}
                          </span>
                          {isOverdue && (
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Quá hạn
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {ob.employee?.position} - {ob.employee?.department}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(ob.start_date).toLocaleDateString("vi-VN")} -{" "}
                            {new Date(ob.expected_end_date).toLocaleDateString("vi-VN")}
                          </span>
                          {ob.mentor && (
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              Mentor: {ob.mentor.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{ob.progress}%</div>
                        <div className="text-xs text-gray-500">
                          {completedTasks}/{totalTasks} tasks
                        </div>
                      </div>
                      <div className="w-32">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              ob.progress === 100
                                ? "bg-green-500"
                                : ob.progress >= 50
                                ? "bg-blue-500"
                                : "bg-yellow-500"
                            }`}
                            style={{ width: `${ob.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                      {ob.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
                            task.is_completed
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {task.is_completed ? (
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span className="truncate">{task.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Thêm Onboarding</h3>
            </div>
            <div className="p-4 text-center text-gray-500">
              Tính năng đang được phát triển
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
