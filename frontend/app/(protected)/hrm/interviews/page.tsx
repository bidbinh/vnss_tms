"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Plus,
  Search,
  Calendar,
  Clock,
  User,
  MapPin,
  Video,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Candidate {
  id: string;
  full_name: string;
  email: string;
}

interface Employee {
  id: string;
  full_name: string;
}

interface Interview {
  id: string;
  candidate_id: string;
  candidate?: Candidate;
  job_title?: string;
  interview_type: string;
  interview_round: number;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  location?: string;
  meeting_link?: string;
  interviewers: Employee[];
  status: string;
  result?: string;
  feedback?: string;
  notes?: string;
}

const INTERVIEW_TYPES = [
  { value: "PHONE", label: "Điện thoại", icon: "phone" },
  { value: "VIDEO", label: "Video call", icon: "video" },
  { value: "ONSITE", label: "Trực tiếp", icon: "building" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "Đã lên lịch", color: "bg-blue-100 text-blue-700" },
  CONFIRMED: { label: "Đã xác nhận", color: "bg-green-100 text-green-700" },
  IN_PROGRESS: { label: "Đang diễn ra", color: "bg-yellow-100 text-yellow-700" },
  COMPLETED: { label: "Hoàn thành", color: "bg-gray-100 text-gray-700" },
  CANCELLED: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
  NO_SHOW: { label: "Không đến", color: "bg-red-100 text-red-700" },
};

const RESULT_CONFIG: Record<string, { label: string; color: string }> = {
  PASS: { label: "Đạt", color: "text-green-600" },
  FAIL: { label: "Không đạt", color: "text-red-600" },
  PENDING: { label: "Chờ đánh giá", color: "text-yellow-600" },
};

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ items: Interview[] }>("/hrm/recruitment/interviews?page_size=100");
      setInterviews(data.items || []);
    } catch (error) {
      console.error("Failed to fetch interviews:", error);
      // Mock data
      setInterviews([
        {
          id: "1",
          candidate_id: "c1",
          candidate: { id: "c1", full_name: "Nguyen Van A", email: "a@gmail.com" },
          job_title: "Senior Software Engineer",
          interview_type: "VIDEO",
          interview_round: 1,
          scheduled_date: "2024-12-28",
          scheduled_time: "09:00",
          duration_minutes: 60,
          meeting_link: "https://meet.google.com/abc-xyz",
          interviewers: [{ id: "e1", full_name: "Tech Lead" }],
          status: "SCHEDULED",
        },
        {
          id: "2",
          candidate_id: "c2",
          candidate: { id: "c2", full_name: "Tran Thi B", email: "b@gmail.com" },
          job_title: "HR Executive",
          interview_type: "ONSITE",
          interview_round: 2,
          scheduled_date: "2024-12-27",
          scheduled_time: "14:00",
          duration_minutes: 45,
          location: "Văn phòng HCM - Phòng họp A",
          interviewers: [
            { id: "e2", full_name: "HR Manager" },
            { id: "e3", full_name: "Department Head" },
          ],
          status: "COMPLETED",
          result: "PASS",
          feedback: "Ứng viên có kinh nghiệm tốt, giao tiếp lưu loát",
        },
        {
          id: "3",
          candidate_id: "c3",
          candidate: { id: "c3", full_name: "Le Van C", email: "c@gmail.com" },
          job_title: "Senior Software Engineer",
          interview_type: "PHONE",
          interview_round: 1,
          scheduled_date: "2024-12-26",
          scheduled_time: "10:30",
          duration_minutes: 30,
          interviewers: [{ id: "e1", full_name: "HR" }],
          status: "COMPLETED",
          result: "FAIL",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredInterviews = interviews.filter((interview) => {
    const matchesSearch =
      interview.candidate?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || interview.status === filterStatus;
    const matchesDate = !filterDate || interview.scheduled_date === filterDate;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const todayCount = interviews.filter(
    (i) => i.scheduled_date === new Date().toISOString().split("T")[0]
  ).length;
  const upcomingCount = interviews.filter(
    (i) => i.status === "SCHEDULED" || i.status === "CONFIRMED"
  ).length;
  const completedCount = interviews.filter((i) => i.status === "COMPLETED").length;

  const getInterviewTypeIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
        return <Video className="w-4 h-4" />;
      case "ONSITE":
        return <MapPin className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch phỏng vấn</h1>
          <p className="text-gray-600 mt-1">Quản lý và theo dõi lịch phỏng vấn ứng viên</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm lịch phỏng vấn
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Hôm nay</div>
              <div className="text-2xl font-bold text-blue-600">{todayCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Sắp tới</div>
              <div className="text-2xl font-bold text-yellow-600">{upcomingCount}</div>
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
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng số</div>
              <div className="text-2xl font-bold text-purple-600">{interviews.length}</div>
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
              placeholder="Tìm theo tên ứng viên, vị trí..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
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

      {/* Interviews List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center text-gray-500">
          Chưa có lịch phỏng vấn nào
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInterviews.map((interview) => {
            const statusConfig = STATUS_CONFIG[interview.status];
            const resultConfig = interview.result ? RESULT_CONFIG[interview.result] : null;
            const typeConfig = INTERVIEW_TYPES.find((t) => t.value === interview.interview_type);

            return (
              <div
                key={interview.id}
                className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      {getInterviewTypeIcon(interview.interview_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {interview.candidate?.full_name}
                        </h3>
                        <span className="text-sm text-gray-500">
                          - Vòng {interview.interview_round}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{interview.job_title}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(interview.scheduled_date).toLocaleDateString("vi-VN")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {interview.scheduled_time} ({interview.duration_minutes} phút)
                        </span>
                        <span className="flex items-center gap-1">
                          {getInterviewTypeIcon(interview.interview_type)}
                          {typeConfig?.label}
                        </span>
                      </div>
                      {(interview.location || interview.meeting_link) && (
                        <div className="mt-1 text-sm text-gray-500">
                          {interview.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {interview.location}
                            </span>
                          )}
                          {interview.meeting_link && (
                            <a
                              href={interview.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Video className="w-3 h-3" />
                              Link meeting
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`px-2 py-1 text-xs rounded ${statusConfig?.color}`}>
                          {statusConfig?.label}
                        </span>
                        {resultConfig && (
                          <span className={`text-sm font-medium ${resultConfig.color}`}>
                            {resultConfig.label}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <User className="w-3 h-3 inline mr-1" />
                        {interview.interviewers.map((i) => i.full_name).join(", ")}
                      </div>
                    </div>
                  </div>
                </div>

                {interview.feedback && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      <strong>Nhận xét:</strong> {interview.feedback}
                    </p>
                  </div>
                )}
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
              <h3 className="text-lg font-semibold">Thêm lịch phỏng vấn</h3>
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
