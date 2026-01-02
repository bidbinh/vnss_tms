"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Plus,
  Search,
  MapPin,
  Users,
  Calendar,
  Eye,
  Edit,
  MoreVertical,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Department {
  id: string;
  name: string;
}

interface JobPosting {
  id: string;
  code: string;
  title: string;
  department_id?: string;
  department?: Department;
  employment_type: string;
  experience_level: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  positions_count: number;
  hired_count: number;
  status: string;
  deadline?: string;
  created_at: string;
  candidate_count?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Nháp", color: "bg-gray-100 text-gray-700" },
  OPEN: { label: "Đang tuyển", color: "bg-green-100 text-green-700" },
  ON_HOLD: { label: "Tạm dừng", color: "bg-yellow-100 text-yellow-700" },
  CLOSED: { label: "Đã đóng", color: "bg-red-100 text-red-700" },
  FILLED: { label: "Đã tuyển đủ", color: "bg-blue-100 text-blue-700" },
};

const EMPLOYMENT_TYPES: Record<string, string> = {
  FULL_TIME: "Toàn thời gian",
  PART_TIME: "Bán thời gian",
  CONTRACT: "Hợp đồng",
  INTERNSHIP: "Thực tập",
};

const EXPERIENCE_LEVELS: Record<string, string> = {
  FRESHER: "Fresher",
  JUNIOR: "Junior (1-2 năm)",
  MIDDLE: "Middle (3-5 năm)",
  SENIOR: "Senior (5+ năm)",
  LEAD: "Lead/Manager",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDept, setFilterDept] = useState("");

  const [form, setForm] = useState({
    title: "",
    department_id: "",
    employment_type: "FULL_TIME",
    experience_level: "JUNIOR",
    location: "",
    positions_count: 1,
    salary_min: 0,
    salary_max: 0,
    deadline: "",
    description: "",
    requirements: "",
  });

  useEffect(() => {
    fetchJobs();
    fetchDepartments();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ items: JobPosting[] }>("/hrm/recruitment/jobs?page_size=100");
      setJobs(data.items || []);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      // Mock data
      setJobs([
        {
          id: "1",
          code: "JOB-2024-001",
          title: "Senior Software Engineer",
          department: { id: "1", name: "IT Department" },
          employment_type: "FULL_TIME",
          experience_level: "SENIOR",
          location: "Ho Chi Minh City",
          salary_min: 25000000,
          salary_max: 40000000,
          positions_count: 2,
          hired_count: 0,
          status: "OPEN",
          deadline: "2025-01-31",
          created_at: "2024-12-01",
          candidate_count: 15,
        },
        {
          id: "2",
          code: "JOB-2024-002",
          title: "HR Executive",
          department: { id: "2", name: "HR Department" },
          employment_type: "FULL_TIME",
          experience_level: "JUNIOR",
          location: "Ho Chi Minh City",
          salary_min: 12000000,
          salary_max: 18000000,
          positions_count: 1,
          hired_count: 0,
          status: "OPEN",
          deadline: "2025-02-15",
          created_at: "2024-12-15",
          candidate_count: 8,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await apiFetch<Department[]>("/hrm/departments");
      setDepartments(data || []);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  };

  const handleCreate = async () => {
    try {
      await apiFetch("/hrm/recruitment/jobs", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setShowModal(false);
      fetchJobs();
    } catch (error: any) {
      alert(error?.message || "Tạo tin tuyển dụng thất bại");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || job.status === filterStatus;
    const matchesDept = !filterDept || job.department_id === filterDept;
    return matchesSearch && matchesStatus && matchesDept;
  });

  const openCount = jobs.filter((j) => j.status === "OPEN").length;
  const totalPositions = jobs.reduce((sum, j) => sum + j.positions_count, 0);
  const totalCandidates = jobs.reduce((sum, j) => sum + (j.candidate_count || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tin tuyển dụng</h1>
          <p className="text-gray-600 mt-1">Quản lý các vị trí đang tuyển dụng</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm tin tuyển dụng
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng tin</div>
              <div className="text-2xl font-bold text-gray-900">{jobs.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đang tuyển</div>
              <div className="text-2xl font-bold text-green-600">{openCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Vị trí cần tuyển</div>
              <div className="text-2xl font-bold text-purple-600">{totalPositions}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Users className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Ứng viên</div>
              <div className="text-2xl font-bold text-yellow-600">{totalCandidates}</div>
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
              placeholder="Tìm theo tiêu đề, mã tin..."
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
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Tất cả phòng ban</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center text-gray-500">
          Chưa có tin tuyển dụng nào
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const statusConfig = STATUS_CONFIG[job.status];
            return (
              <div
                key={job.id}
                className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500">{job.code}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${statusConfig?.color}`}>
                        {statusConfig?.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-500">{job.department?.name}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{job.location || "Chưa xác định"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    <span>{EMPLOYMENT_TYPES[job.employment_type]}</span>
                    <span className="text-gray-400">|</span>
                    <span>{EXPERIENCE_LEVELS[job.experience_level]}</span>
                  </div>
                  {(job.salary_min || job.salary_max) && (
                    <div className="text-green-600 font-medium">
                      {job.salary_min && job.salary_max
                        ? `${formatCurrency(job.salary_min)} - ${formatCurrency(job.salary_max)}`
                        : job.salary_min
                        ? `Từ ${formatCurrency(job.salary_min)}`
                        : `Đến ${formatCurrency(job.salary_max!)}`}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {job.hired_count}/{job.positions_count} vị trí
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {job.candidate_count || 0} ứng viên
                    </span>
                  </div>
                  {job.deadline && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(job.deadline).toLocaleDateString("vi-VN")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Thêm tin tuyển dụng</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Senior Software Engineer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
                  <select
                    value={form.department_id}
                    onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="VD: Ho Chi Minh City"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại hình</label>
                  <select
                    value={form.employment_type}
                    onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {Object.entries(EMPLOYMENT_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kinh nghiệm</label>
                  <select
                    value={form.experience_level}
                    onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {Object.entries(EXPERIENCE_LEVELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                  <input
                    type="number"
                    min={1}
                    value={form.positions_count}
                    onChange={(e) => setForm({ ...form, positions_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lương tối thiểu</label>
                  <input
                    type="number"
                    value={form.salary_min}
                    onChange={(e) => setForm({ ...form, salary_min: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lương tối đa</label>
                  <input
                    type="number"
                    value={form.salary_max}
                    onChange={(e) => setForm({ ...form, salary_max: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hạn nộp</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả công việc</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  placeholder="Mô tả chi tiết công việc..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yêu cầu</label>
                <textarea
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  rows={4}
                  placeholder="Yêu cầu ứng viên..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.title}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Tạo mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
