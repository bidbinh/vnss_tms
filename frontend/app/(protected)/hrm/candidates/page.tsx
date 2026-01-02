"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  FileText,
  Star,
  ChevronRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface JobPosting {
  id: string;
  code: string;
  title: string;
}

interface Candidate {
  id: string;
  code: string;
  full_name: string;
  email: string;
  phone?: string;
  job_id?: string;
  job?: JobPosting;
  status: string;
  source: string;
  applied_date: string;
  resume_url?: string;
  rating?: number;
  notes?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NEW: { label: "Mới", color: "bg-blue-100 text-blue-700" },
  SCREENING: { label: "Sàng lọc", color: "bg-yellow-100 text-yellow-700" },
  INTERVIEW_1: { label: "PV vòng 1", color: "bg-purple-100 text-purple-700" },
  INTERVIEW_2: { label: "PV vòng 2", color: "bg-purple-100 text-purple-700" },
  INTERVIEW_FINAL: { label: "PV cuối", color: "bg-indigo-100 text-indigo-700" },
  OFFER: { label: "Đề nghị", color: "bg-green-100 text-green-700" },
  HIRED: { label: "Đã tuyển", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Từ chối", color: "bg-red-100 text-red-700" },
  WITHDRAWN: { label: "Rút hồ sơ", color: "bg-gray-100 text-gray-700" },
};

const SOURCE_OPTIONS = [
  { value: "WEBSITE", label: "Website" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "REFERRAL", label: "Giới thiệu" },
  { value: "JOBSITE", label: "Trang tuyển dụng" },
  { value: "OTHER", label: "Khác" },
];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterJob, setFilterJob] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    job_id: "",
    source: "WEBSITE",
    notes: "",
  });

  useEffect(() => {
    fetchCandidates();
    fetchJobs();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ items: Candidate[] }>("/hrm/recruitment/candidates?page_size=100");
      setCandidates(data.items || []);
    } catch (error) {
      console.error("Failed to fetch candidates:", error);
      // Mock data
      setCandidates([
        {
          id: "1",
          code: "UV-2024-001",
          full_name: "Nguyen Van A",
          email: "nguyenvana@gmail.com",
          phone: "0901234567",
          job: { id: "1", code: "JOB-001", title: "Senior Software Engineer" },
          status: "INTERVIEW_1",
          source: "LINKEDIN",
          applied_date: "2024-12-20",
          rating: 4,
        },
        {
          id: "2",
          code: "UV-2024-002",
          full_name: "Tran Thi B",
          email: "tranthib@gmail.com",
          phone: "0909876543",
          job: { id: "1", code: "JOB-001", title: "Senior Software Engineer" },
          status: "SCREENING",
          source: "REFERRAL",
          applied_date: "2024-12-22",
          rating: 3,
        },
        {
          id: "3",
          code: "UV-2024-003",
          full_name: "Le Van C",
          email: "levanc@gmail.com",
          phone: "0912345678",
          job: { id: "2", code: "JOB-002", title: "HR Executive" },
          status: "NEW",
          source: "WEBSITE",
          applied_date: "2024-12-25",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const data = await apiFetch<{ items: JobPosting[] }>("/hrm/recruitment/jobs?status=OPEN");
      setJobs(data.items || []);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    }
  };

  const handleCreate = async () => {
    try {
      await apiFetch("/hrm/recruitment/candidates", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setShowModal(false);
      fetchCandidates();
    } catch (error: any) {
      alert(error?.message || "Thêm ứng viên thất bại");
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || c.status === filterStatus;
    const matchesJob = !filterJob || c.job_id === filterJob;
    return matchesSearch && matchesStatus && matchesJob;
  });

  const newCount = candidates.filter((c) => c.status === "NEW").length;
  const interviewCount = candidates.filter((c) =>
    ["INTERVIEW_1", "INTERVIEW_2", "INTERVIEW_FINAL"].includes(c.status)
  ).length;
  const hiredCount = candidates.filter((c) => c.status === "HIRED").length;

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý ứng viên</h1>
          <p className="text-gray-600 mt-1">Theo dõi và quản lý hồ sơ ứng viên</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm ứng viên
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
              <div className="text-sm text-gray-600">Tổng ứng viên</div>
              <div className="text-2xl font-bold text-gray-900">{candidates.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Users className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Mới nhận</div>
              <div className="text-2xl font-bold text-yellow-600">{newCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đang phỏng vấn</div>
              <div className="text-2xl font-bold text-purple-600">{interviewCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đã tuyển</div>
              <div className="text-2xl font-bold text-green-600">{hiredCount}</div>
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
              placeholder="Tìm theo tên, email, mã UV..."
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
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Tất cả vị trí</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Chưa có ứng viên nào</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ứng viên
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vị trí
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nguồn
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Đánh giá
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Ngày nộp
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCandidates.map((candidate) => {
                const statusConfig = STATUS_CONFIG[candidate.status];
                const sourceConfig = SOURCE_OPTIONS.find((s) => s.value === candidate.source);

                return (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{candidate.full_name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {candidate.email}
                        </span>
                        {candidate.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {candidate.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{candidate.job?.title || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {sourceConfig?.label || candidate.source}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {renderStars(candidate.rating)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {new Date(candidate.applied_date).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded ${statusConfig?.color}`}>
                        {statusConfig?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Thêm ứng viên</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí ứng tuyển</label>
                  <select
                    value={form.job_id}
                    onChange={(e) => setForm({ ...form, job_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">-- Chọn vị trí --</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.full_name || !form.email}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Thêm mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
