"use client";

import { useEffect, useState } from "react";
import {
  GraduationCap,
  Users,
  Calendar,
  Plus,
  Play,
  CheckCircle,
  Clock,
  Award,
  AlertTriangle,
  BookOpen,
  FileText,
  UserPlus,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Training {
  id: string;
  code: string;
  name: string;
  training_type: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_hours: number;
  location: string | null;
  format: string;
  trainer_name: string | null;
  max_participants: number | null;
  passing_score: number;
  is_mandatory: boolean;
  status: string;
  participant_count: number;
  completed_count: number;
  created_at: string;
}

interface Participant {
  id: string;
  employee_id: string;
  status: string;
  score: number | null;
  is_passed: boolean | null;
  completion_date: string | null;
  employee?: {
    id: string;
    employee_code: string;
    full_name: string;
  };
}

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface DashboardStats {
  active_trainings: number;
  planned_trainings: number;
  total_participants: number;
  completed_participants: number;
  expiring_certificates: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PLANNED: { label: "Kế hoạch", color: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "Đang diễn ra", color: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  ONBOARDING: { label: "Hội nhập", color: "bg-blue-100 text-blue-700" },
  SKILL: { label: "Kỹ năng", color: "bg-green-100 text-green-700" },
  SAFETY: { label: "An toàn", color: "bg-red-100 text-red-700" },
  COMPLIANCE: { label: "Tuân thủ", color: "bg-purple-100 text-purple-700" },
  LEADERSHIP: { label: "Lãnh đạo", color: "bg-yellow-100 text-yellow-700" },
  TECHNICAL: { label: "Kỹ thuật", color: "bg-indigo-100 text-indigo-700" },
  DRIVER: { label: "Tài xế", color: "bg-orange-100 text-orange-700" },
};

const FORMAT_LABELS: Record<string, string> = {
  OFFLINE: "Trực tiếp",
  ONLINE: "Trực tuyến",
  HYBRID: "Kết hợp",
  E_LEARNING: "E-Learning",
};

export default function TrainingPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected training for details
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({
    name: "",
    training_type: "SKILL",
    description: "",
    start_date: "",
    end_date: "",
    duration_hours: 8,
    location: "",
    format: "OFFLINE",
    trainer_name: "",
    max_participants: "",
    passing_score: 70,
    is_mandatory: false,
  });

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  useEffect(() => {
    fetchDashboard();
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchTrainings();
  }, [statusFilter, typeFilter]);

  const fetchDashboard = async () => {
    try {
      const data = await apiFetch<DashboardStats>("/hrm/training/dashboard");
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
      // Fallback mock data when API unavailable
      setStats({
        active_trainings: 0,
        planned_trainings: 0,
        total_participants: 0,
        completed_participants: 0,
        expiring_certificates: 0,
      });
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await apiFetch<{ items: Employee[] }>("/hrm/employees?page_size=200&status=ACTIVE");
      setEmployees(data.items || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const fetchTrainings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("training_type", typeFilter);

      const data = await apiFetch<{ items: Training[] }>(`/hrm/training/courses?${params.toString()}`);
      setTrainings(data.items || []);
    } catch (error) {
      console.error("Failed to fetch trainings:", error);
      setTrainings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainingDetails = async (trainingId: string) => {
    setLoadingParticipants(true);
    try {
      const data = await apiFetch<Training & { participants: Participant[] }>(
        `/hrm/training/courses/${trainingId}`
      );
      setSelectedTraining(data);
      setParticipants(data.participants || []);
    } catch (error) {
      console.error("Failed to fetch training details:", error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name) {
      setError("Vui lòng nhập tên khóa đào tạo");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/hrm/training/courses", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        }),
      });

      setShowCreateModal(false);
      resetForm();
      fetchTrainings();
      fetchDashboard();
    } catch (err: any) {
      setError(err.message || "Không thể tạo khóa đào tạo");
    } finally {
      setSaving(false);
    }
  };

  const handleStartTraining = async (trainingId: string) => {
    try {
      await apiFetch(`/hrm/training/courses/${trainingId}/start`, { method: "POST" });
      fetchTrainings();
      fetchDashboard();
      if (selectedTraining?.id === trainingId) {
        fetchTrainingDetails(trainingId);
      }
    } catch (err: any) {
      alert(err.message || "Không thể bắt đầu khóa đào tạo");
    }
  };

  const handleCompleteTraining = async (trainingId: string) => {
    if (!confirm("Bạn có chắc muốn kết thúc khóa đào tạo này?")) return;
    try {
      await apiFetch(`/hrm/training/courses/${trainingId}/complete`, { method: "POST" });
      fetchTrainings();
      fetchDashboard();
      if (selectedTraining?.id === trainingId) {
        fetchTrainingDetails(trainingId);
      }
    } catch (err: any) {
      alert(err.message || "Không thể kết thúc khóa đào tạo");
    }
  };

  const handleAddParticipants = async () => {
    if (!selectedTraining || selectedEmployeeIds.length === 0) return;

    setSaving(true);
    try {
      await apiFetch(`/hrm/training/courses/${selectedTraining.id}/participants/bulk`, {
        method: "POST",
        body: JSON.stringify({ employee_ids: selectedEmployeeIds }),
      });

      setShowAddParticipantModal(false);
      setSelectedEmployeeIds([]);
      fetchTrainingDetails(selectedTraining.id);
      fetchTrainings();
    } catch (err: any) {
      alert(err.message || "Không thể thêm học viên");
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteParticipant = async (participantId: string, score: number) => {
    try {
      await apiFetch(`/hrm/training/participants/${participantId}/complete`, {
        method: "POST",
        body: JSON.stringify({ score }),
      });

      if (selectedTraining) {
        fetchTrainingDetails(selectedTraining.id);
      }
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || "Không thể cập nhật");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      training_type: "SKILL",
      description: "",
      start_date: "",
      end_date: "",
      duration_hours: 8,
      location: "",
      format: "OFFLINE",
      trainer_name: "",
      max_participants: "",
      passing_score: 70,
      is_mandatory: false,
    });
    setError(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Đào tạo</h1>
          <p className="text-gray-600 mt-1">Quản lý các khóa đào tạo nhân viên</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tạo khóa đào tạo
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Play className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Đang diễn ra</div>
                <div className="text-xl font-bold text-blue-600">{stats.active_trainings}</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Kế hoạch</div>
                <div className="text-xl font-bold text-yellow-600">{stats.planned_trainings}</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Học viên năm nay</div>
                <div className="text-xl font-bold text-purple-600">{stats.total_participants}</div>
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
                <div className="text-xl font-bold text-green-600">{stats.completed_participants}</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">CC sắp hết hạn</div>
                <div className="text-xl font-bold text-red-600">{stats.expiring_certificates}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Tất cả loại</option>
            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trainings List */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold">Danh sách khóa đào tạo</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : trainings.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>Chưa có khóa đào tạo nào</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {trainings.map((tr) => {
                const statusConfig = STATUS_CONFIG[tr.status] || STATUS_CONFIG.PLANNED;
                const typeConfig = TYPE_CONFIG[tr.training_type] || TYPE_CONFIG.SKILL;

                return (
                  <div
                    key={tr.id}
                    onClick={() => fetchTrainingDetails(tr.id)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      selectedTraining?.id === tr.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{tr.name}</h3>
                          {tr.is_mandatory && (
                            <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                              Bắt buộc
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>{tr.code}</span>
                          <span className={`px-2 py-0.5 text-xs rounded ${typeConfig.color}`}>
                            {typeConfig.label}
                          </span>
                          <span>{FORMAT_LABELS[tr.format] || tr.format}</span>
                          <span>{tr.duration_hours}h</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-gray-500">
                            {formatDate(tr.start_date)} - {formatDate(tr.end_date)}
                          </span>
                          <span className="text-blue-600">
                            <Users className="w-4 h-4 inline mr-1" />
                            {tr.participant_count} học viên
                          </span>
                          <span className="text-green-600">
                            <CheckCircle className="w-4 h-4 inline mr-1" />
                            {tr.completed_count} hoàn thành
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        {tr.status === "PLANNED" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTraining(tr.id);
                            }}
                            className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                            title="Bắt đầu"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {tr.status === "IN_PROGRESS" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteTraining(tr.id);
                            }}
                            className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                            title="Kết thúc"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Training Details / Participants */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          {!selectedTraining ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>Chọn khóa đào tạo để xem chi tiết</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{selectedTraining.name}</h2>
                  <p className="text-sm text-gray-500">{selectedTraining.code}</p>
                </div>
                {selectedTraining.status !== "COMPLETED" && selectedTraining.status !== "CANCELLED" && (
                  <button
                    onClick={() => setShowAddParticipantModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    <UserPlus className="w-4 h-4" />
                    Thêm HV
                  </button>
                )}
              </div>

              {/* Participants */}
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">
                  Học viên ({participants.length})
                </h3>
              </div>

              {loadingParticipants ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : participants.length === 0 ? (
                <div className="text-center p-6 text-gray-500 text-sm">
                  Chưa có học viên nào
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {participants.map((p) => (
                    <div key={p.id} className="px-4 py-2 border-b border-gray-100 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {p.employee?.full_name || "-"}
                          </div>
                          <div className="text-xs text-gray-500">{p.employee?.employee_code}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.is_passed === true && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                              Đạt {p.score}đ
                            </span>
                          )}
                          {p.is_passed === false && (
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                              Không đạt {p.score}đ
                            </span>
                          )}
                          {p.status === "IN_PROGRESS" && (
                            <button
                              onClick={() => {
                                const score = prompt("Nhập điểm (0-100):");
                                if (score !== null) {
                                  handleCompleteParticipant(p.id, parseFloat(score));
                                }
                              }}
                              className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Chấm điểm
                            </button>
                          )}
                          {p.status === "ENROLLED" && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              Chờ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Training Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Tạo khóa đào tạo</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên khóa đào tạo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="VD: Đào tạo an toàn lao động 2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại đào tạo</label>
                  <select
                    value={form.training_type}
                    onChange={(e) => setForm({ ...form, training_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hình thức</label>
                  <select
                    value={form.format}
                    onChange={(e) => setForm({ ...form, format: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {Object.entries(FORMAT_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời lượng (giờ)</label>
                  <input
                    type="number"
                    value={form.duration_hours}
                    onChange={(e) => setForm({ ...form, duration_hours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SL tối đa</label>
                  <input
                    type="number"
                    value={form.max_participants}
                    onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Điểm đạt</label>
                  <input
                    type="number"
                    value={form.passing_score}
                    onChange={(e) => setForm({ ...form, passing_score: parseFloat(e.target.value) || 70 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giảng viên</label>
                  <input
                    type="text"
                    value={form.trainer_name}
                    onChange={(e) => setForm({ ...form, trainer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_mandatory}
                    onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Đào tạo bắt buộc</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Tạo khóa đào tạo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Participants Modal */}
      {showAddParticipantModal && selectedTraining && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Thêm học viên</h2>

            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              {employees
                .filter((emp) => !participants.some((p) => p.employee_id === emp.id))
                .map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployeeIds([...selectedEmployeeIds, emp.id]);
                        } else {
                          setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== emp.id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <div className="font-medium text-sm">{emp.full_name}</div>
                      <div className="text-xs text-gray-500">{emp.employee_code}</div>
                    </div>
                  </label>
                ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => {
                  setShowAddParticipantModal(false);
                  setSelectedEmployeeIds([]);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={handleAddParticipants}
                disabled={saving || selectedEmployeeIds.length === 0}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Đang thêm..." : `Thêm ${selectedEmployeeIds.length} học viên`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
