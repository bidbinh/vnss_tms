"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Users,
  UserPlus,
  Calendar,
  Plus,
  Eye,
  Edit,
  Check,
  X,
  ChevronRight,
  Search,
  Building2,
  Clock,
  FileText,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface JobPosting {
  id: string;
  code: string;
  title: string;
  department_id: string | null;
  department_name: string | null;
  position_name: string | null;
  job_type: string;
  headcount: number;
  salary_min: number | null;
  salary_max: number | null;
  work_location: string | null;
  deadline: string | null;
  status: string;
  candidate_count: number;
  created_at: string;
}

interface Candidate {
  id: string;
  job_posting_id: string;
  job_title: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  current_company: string | null;
  current_position: string | null;
  experience_years: number | null;
  expected_salary: number | null;
  source: string | null;
  status: string;
  created_at: string;
}

interface DashboardStats {
  open_jobs: number;
  total_candidates: number;
  new_candidates: number;
  in_interview: number;
  hired: number;
  upcoming_interviews: number;
}

interface Department {
  id: string;
  name: string;
}

const JOB_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Nháp", color: "bg-gray-100 text-gray-700" },
  OPEN: { label: "Đang tuyển", color: "bg-green-100 text-green-700" },
  ON_HOLD: { label: "Tạm dừng", color: "bg-yellow-100 text-yellow-700" },
  CLOSED: { label: "Đã đóng", color: "bg-red-100 text-red-700" },
  FILLED: { label: "Đã tuyển đủ", color: "bg-blue-100 text-blue-700" },
};

const CANDIDATE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NEW: { label: "Mới", color: "bg-blue-100 text-blue-700" },
  SCREENING: { label: "Sàng lọc", color: "bg-yellow-100 text-yellow-700" },
  INTERVIEW_1: { label: "PV vòng 1", color: "bg-purple-100 text-purple-700" },
  INTERVIEW_2: { label: "PV vòng 2", color: "bg-indigo-100 text-indigo-700" },
  OFFER: { label: "Đã gửi offer", color: "bg-orange-100 text-orange-700" },
  HIRED: { label: "Đã tuyển", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Loại", color: "bg-red-100 text-red-700" },
  WITHDRAWN: { label: "Rút hồ sơ", color: "bg-gray-100 text-gray-700" },
};

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Toàn thời gian",
  PART_TIME: "Bán thời gian",
  CONTRACT: "Hợp đồng",
  INTERN: "Thực tập",
};

export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState<"jobs" | "candidates">("jobs");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [jobStatusFilter, setJobStatusFilter] = useState("");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");

  // Modals
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Job form
  const [jobForm, setJobForm] = useState({
    title: "",
    department_id: "",
    job_type: "FULL_TIME",
    headcount: 1,
    salary_min: "",
    salary_max: "",
    work_location: "",
    description: "",
    requirements: "",
    benefits: "",
    deadline: "",
  });

  // Candidate form
  const [candidateForm, setCandidateForm] = useState({
    job_posting_id: "",
    full_name: "",
    email: "",
    phone: "",
    current_company: "",
    current_position: "",
    experience_years: "",
    expected_salary: "",
    source: "",
    notes: "",
  });

  useEffect(() => {
    fetchDashboard();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === "jobs") {
      fetchJobs();
    } else {
      fetchCandidates();
    }
  }, [activeTab, jobStatusFilter, candidateStatusFilter, selectedJobId]);

  const fetchDashboard = async () => {
    try {
      const data = await apiFetch<DashboardStats>("/hrm/recruitment/dashboard");
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
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

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (jobStatusFilter) params.set("status", jobStatusFilter);

      const data = await apiFetch<{ items: JobPosting[] }>(`/hrm/recruitment/jobs?${params.toString()}`);
      setJobs(data.items || []);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (candidateStatusFilter) params.set("status", candidateStatusFilter);
      if (selectedJobId) params.set("job_id", selectedJobId);

      const data = await apiFetch<{ items: Candidate[] }>(`/hrm/recruitment/candidates?${params.toString()}`);
      setCandidates(data.items || []);
    } catch (error) {
      console.error("Failed to fetch candidates:", error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async () => {
    if (!jobForm.title) {
      setError("Vui lòng nhập tiêu đề tin tuyển dụng");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/hrm/recruitment/jobs", {
        method: "POST",
        body: JSON.stringify({
          ...jobForm,
          salary_min: jobForm.salary_min ? parseFloat(jobForm.salary_min) : null,
          salary_max: jobForm.salary_max ? parseFloat(jobForm.salary_max) : null,
          department_id: jobForm.department_id || null,
        }),
      });

      setShowJobModal(false);
      resetJobForm();
      fetchJobs();
      fetchDashboard();
    } catch (err: any) {
      setError(err.message || "Không thể tạo tin tuyển dụng");
    } finally {
      setSaving(false);
    }
  };

  const handlePublishJob = async (jobId: string) => {
    try {
      await apiFetch(`/hrm/recruitment/jobs/${jobId}/publish`, { method: "POST" });
      fetchJobs();
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || "Không thể đăng tin");
    }
  };

  const handleCloseJob = async (jobId: string) => {
    if (!confirm("Bạn có chắc muốn đóng tin tuyển dụng này?")) return;
    try {
      await apiFetch(`/hrm/recruitment/jobs/${jobId}/close`, { method: "POST" });
      fetchJobs();
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || "Không thể đóng tin");
    }
  };

  const handleCreateCandidate = async () => {
    if (!candidateForm.job_posting_id || !candidateForm.full_name) {
      setError("Vui lòng chọn vị trí và nhập tên ứng viên");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/hrm/recruitment/candidates", {
        method: "POST",
        body: JSON.stringify({
          ...candidateForm,
          experience_years: candidateForm.experience_years ? parseFloat(candidateForm.experience_years) : null,
          expected_salary: candidateForm.expected_salary ? parseFloat(candidateForm.expected_salary) : null,
        }),
      });

      setShowCandidateModal(false);
      resetCandidateForm();
      fetchCandidates();
      fetchDashboard();
    } catch (err: any) {
      setError(err.message || "Không thể thêm ứng viên");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCandidateStatus = async (candidateId: string, status: string) => {
    try {
      await apiFetch(`/hrm/recruitment/candidates/${candidateId}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      fetchCandidates();
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || "Không thể cập nhật trạng thái");
    }
  };

  const resetJobForm = () => {
    setJobForm({
      title: "",
      department_id: "",
      job_type: "FULL_TIME",
      headcount: 1,
      salary_min: "",
      salary_max: "",
      work_location: "",
      description: "",
      requirements: "",
      benefits: "",
      deadline: "",
    });
    setError(null);
  };

  const resetCandidateForm = () => {
    setCandidateForm({
      job_posting_id: "",
      full_name: "",
      email: "",
      phone: "",
      current_company: "",
      current_position: "",
      experience_years: "",
      expected_salary: "",
      source: "",
      notes: "",
    });
    setError(null);
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tuyển dụng</h1>
          <p className="text-gray-600 mt-1">Quản lý tin tuyển dụng và ứng viên</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetCandidateForm();
              setShowCandidateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <UserPlus className="w-4 h-4" />
            Thêm ứng viên
          </button>
          <button
            onClick={() => {
              resetJobForm();
              setShowJobModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Đăng tin tuyển dụng
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Đang tuyển</div>
                <div className="text-xl font-bold text-blue-600">{stats.open_jobs}</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Tổng UV</div>
                <div className="text-xl font-bold text-purple-600">{stats.total_candidates}</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">CV mới</div>
                <div className="text-xl font-bold text-yellow-600">{stats.new_candidates}</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Đang PV</div>
                <div className="text-xl font-bold text-indigo-600">{stats.in_interview}</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Đã tuyển</div>
                <div className="text-xl font-bold text-green-600">{stats.hired}</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">PV tuần này</div>
                <div className="text-xl font-bold text-orange-600">{stats.upcoming_interviews}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("jobs")}
              className={`px-6 py-3 font-medium ${
                activeTab === "jobs"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Briefcase className="w-4 h-4 inline mr-2" />
              Tin tuyển dụng
            </button>
            <button
              onClick={() => setActiveTab("candidates")}
              className={`px-6 py-3 font-medium ${
                activeTab === "candidates"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Ứng viên
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          {activeTab === "jobs" ? (
            <div className="flex items-center gap-4">
              <select
                value={jobStatusFilter}
                onChange={(e) => setJobStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(JOB_STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tất cả vị trí</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
              <select
                value={candidateStatusFilter}
                onChange={(e) => setCandidateStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(CANDIDATE_STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : activeTab === "jobs" ? (
          /* Jobs List */
          jobs.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>Chưa có tin tuyển dụng nào</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {jobs.map((job) => {
                const statusConfig = JOB_STATUS_CONFIG[job.status] || JOB_STATUS_CONFIG.DRAFT;

                return (
                  <div key={job.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-gray-900">{job.title}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>{job.code}</span>
                          {job.department_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {job.department_name}
                            </span>
                          )}
                          <span>{JOB_TYPE_LABELS[job.job_type] || job.job_type}</span>
                          <span>SL: {job.headcount}</span>
                          {job.deadline && <span>Hạn: {formatDate(job.deadline)}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Ứng viên</div>
                          <div className="font-bold text-lg text-blue-600">{job.candidate_count}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          {job.status === "DRAFT" && (
                            <button
                              onClick={() => handlePublishJob(job.id)}
                              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Đăng tin
                            </button>
                          )}
                          {job.status === "OPEN" && (
                            <button
                              onClick={() => handleCloseJob(job.id)}
                              className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Đóng
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Candidates List */
          candidates.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>Chưa có ứng viên nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Ứng viên
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Vị trí
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Kinh nghiệm
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Nguồn
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Trạng thái
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {candidates.map((cand) => {
                    const statusConfig = CANDIDATE_STATUS_CONFIG[cand.status] || CANDIDATE_STATUS_CONFIG.NEW;

                    return (
                      <tr key={cand.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{cand.full_name}</div>
                          <div className="text-sm text-gray-500">
                            {cand.email || cand.phone || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {cand.job_title || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {cand.experience_years ? `${cand.experience_years} năm` : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {cand.source || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <select
                            value={cand.status}
                            onChange={(e) => handleUpdateCandidateStatus(cand.id, e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded"
                          >
                            {Object.entries(CANDIDATE_STATUS_CONFIG).map(([key, config]) => (
                              <option key={key} value={key}>
                                {config.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Create Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Đăng tin tuyển dụng</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="VD: Tuyển tài xế xe tải"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
                  <select
                    value={jobForm.department_id}
                    onChange={(e) => setJobForm({ ...jobForm, department_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Chọn phòng ban</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại công việc</label>
                  <select
                    value={jobForm.job_type}
                    onChange={(e) => setJobForm({ ...jobForm, job_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {Object.entries(JOB_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                  <input
                    type="number"
                    value={jobForm.headcount}
                    onChange={(e) => setJobForm({ ...jobForm, headcount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lương từ</label>
                  <input
                    type="number"
                    value={jobForm.salary_min}
                    onChange={(e) => setJobForm({ ...jobForm, salary_min: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="VNĐ"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lương đến</label>
                  <input
                    type="number"
                    value={jobForm.salary_max}
                    onChange={(e) => setJobForm({ ...jobForm, salary_max: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="VNĐ"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm</label>
                  <input
                    type="text"
                    value={jobForm.work_location}
                    onChange={(e) => setJobForm({ ...jobForm, work_location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="VD: TP.HCM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hạn nộp hồ sơ</label>
                  <input
                    type="date"
                    value={jobForm.deadline}
                    onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả công việc</label>
                <textarea
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yêu cầu</label>
                <textarea
                  value={jobForm.requirements}
                  onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button
                onClick={() => setShowJobModal(false)}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateJob}
                disabled={saving}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Tạo tin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Candidate Modal */}
      {showCandidateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Thêm ứng viên</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vị trí ứng tuyển <span className="text-red-500">*</span>
                </label>
                <select
                  value={candidateForm.job_posting_id}
                  onChange={(e) => setCandidateForm({ ...candidateForm, job_posting_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Chọn vị trí</option>
                  {jobs.filter(j => j.status === "OPEN").map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={candidateForm.full_name}
                  onChange={(e) => setCandidateForm({ ...candidateForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={candidateForm.email}
                    onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
                  <input
                    type="tel"
                    value={candidateForm.phone}
                    onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số năm KN</label>
                  <input
                    type="number"
                    value={candidateForm.experience_years}
                    onChange={(e) => setCandidateForm({ ...candidateForm, experience_years: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn</label>
                  <select
                    value={candidateForm.source}
                    onChange={(e) => setCandidateForm({ ...candidateForm, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Chọn nguồn</option>
                    <option value="WEBSITE">Website</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="TOPCV">TopCV</option>
                    <option value="REFERRAL">Giới thiệu</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={candidateForm.notes}
                  onChange={(e) => setCandidateForm({ ...candidateForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button
                onClick={() => setShowCandidateModal(false)}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateCandidate}
                disabled={saving}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Thêm ứng viên"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
