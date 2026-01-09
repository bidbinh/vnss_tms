"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  RefreshCw,
  X,
  UserPlus,
  Crown,
  Shield,
  Eye,
  Briefcase,
  Calendar,
  Percent,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Project {
  id: string;
  code: string;
  name: string;
}

interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  department: string;
  position: string;
  allocation_percent: number;
  hourly_rate: number;
  billing_rate: number;
  join_date: string;
  leave_date: string | null;
  is_active: boolean;
  notes: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  department_name?: string;
  position_name?: string;
}

const ROLES = [
  { value: "MANAGER", label: "Quản lý dự án", icon: Crown, color: "text-yellow-600 bg-yellow-100" },
  { value: "LEAD", label: "Trưởng nhóm", icon: Shield, color: "text-blue-600 bg-blue-100" },
  { value: "MEMBER", label: "Thành viên", icon: Users, color: "text-green-600 bg-green-100" },
  { value: "VIEWER", label: "Người xem", icon: Eye, color: "text-gray-600 bg-gray-100" },
  { value: "STAKEHOLDER", label: "Bên liên quan", icon: Briefcase, color: "text-purple-600 bg-purple-100" },
];

export default function ProjectMembersPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    user_id: "",
    user_name: "",
    user_email: "",
    role: "MEMBER",
    allocation_percent: 100,
    hourly_rate: 0,
    billing_rate: 0,
    join_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: Project[] }>("/project/projects?size=200");
      setProjects(data.items || []);
      if (data.items?.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data.items[0].id);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  }, [selectedProjectId]);

  const fetchMembers = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<{ members: ProjectMember[] }>(`/project/projects/${selectedProjectId}`);
      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: User[] }>("/users?size=200");
      setUsers(data.items || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, [fetchProjects, fetchUsers]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchMembers();
    }
  }, [selectedProjectId, fetchMembers]);

  const handleAdd = async () => {
    if (!formData.user_id) {
      setFormError("Vui lòng chọn thành viên");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch("/project/project-members", {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProjectId,
          user_id: formData.user_id,
          user_name: formData.user_name,
          user_email: formData.user_email,
          role: formData.role,
          allocation_percent: formData.allocation_percent,
          hourly_rate: formData.hourly_rate,
          join_date: formData.join_date || null,
        }),
      });
      setShowAddModal(false);
      resetForm();
      fetchMembers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Bạn có chắc muốn xóa thành viên này khỏi dự án?")) return;

    try {
      await apiFetch(`/project/project-members/${memberId}`, {
        method: "DELETE",
      });
      fetchMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: "",
      user_name: "",
      user_email: "",
      role: "MEMBER",
      allocation_percent: 100,
      hourly_rate: 0,
      billing_rate: 0,
      join_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setFormError(null);
  };

  const handleUserSelect = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setFormData({
        ...formData,
        user_id: userId,
        user_name: user.full_name,
        user_email: user.email,
      });
    }
  };

  const getRoleInfo = (role: string) => {
    return ROLES.find((r) => r.value === role) || ROLES[2];
  };

  const filteredMembers = members.filter(
    (m) =>
      m.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  if (loading && !selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thành viên dự án</h1>
          <p className="text-gray-500">Quản lý thành viên tham gia dự án</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMembers}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            disabled={!selectedProjectId}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            Thêm thành viên
          </button>
        </div>
      </div>

      {/* Project Selector */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Chọn dự án</label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Chọn dự án --</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code} - {project.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProjectId && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {ROLES.map((role) => {
              const count = members.filter((m) => m.role === role.value && m.is_active).length;
              const Icon = role.icon;
              return (
                <div key={role.value} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${role.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm text-gray-500">{role.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm thành viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-red-500">{error}</p>
              <button
                onClick={fetchMembers}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4" /> Thử lại
              </button>
            </div>
          )}

          {/* Members Table */}
          {!error && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Thành viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vai trò
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Phân bổ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ngày tham gia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        {searchTerm ? "Không tìm thấy thành viên" : "Chưa có thành viên nào"}
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => {
                      const roleInfo = getRoleInfo(member.role);
                      const RoleIcon = roleInfo.icon;
                      return (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium">
                                  {member.user_name?.charAt(0)?.toUpperCase() || "?"}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{member.user_name}</p>
                                <p className="text-sm text-gray-500">{member.user_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${roleInfo.color}`}
                            >
                              <RoleIcon className="w-3 h-3" />
                              {roleInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Percent className="w-4 h-4 text-gray-400" />
                              <span>{member.allocation_percent}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {member.join_date || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {member.is_active ? (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                Đang hoạt động
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                                Đã rời
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleRemove(member.id)}
                              className="p-1 hover:bg-gray-100 rounded text-red-500"
                              title="Xóa khỏi dự án"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Thêm thành viên</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn người dùng *</label>
                <select
                  value={formData.user_id}
                  onChange={(e) => handleUserSelect(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn người dùng --</option>
                  {users
                    .filter((u) => !members.some((m) => m.user_id === u.id && m.is_active))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phân bổ (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.allocation_percent}
                    onChange={(e) =>
                      setFormData({ ...formData, allocation_percent: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tham gia</label>
                  <input
                    type="date"
                    value={formData.join_date}
                    onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (VND)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleAdd}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Đang thêm..." : "Thêm thành viên"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
