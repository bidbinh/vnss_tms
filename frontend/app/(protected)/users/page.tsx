"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import Pagination, { PageSizeSelector } from "@/components/Pagination";

// Types
type User = {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  role_label: string;
  status: string;
  driver_id: string | null;
  notes: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

type Driver = {
  id: string;
  name: string;
  phone: string | null;
  status: string;
};

type RoleInfo = {
  role: string;
  label: string;
  description: string;
  permissions: { module: string; actions: string[] }[];
};

type UserStats = {
  total: number;
  by_role: Record<string, { count: number; label: string }>;
  by_status: Record<string, number>;
};

type UserForm = {
  username: string;
  password: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  driver_id: string;
  notes: string;
};

// Role badges styling
const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-gradient-to-r from-purple-500 to-purple-600 text-white",
  DISPATCHER: "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
  ACCOUNTANT: "bg-gradient-to-r from-green-500 to-green-600 text-white",
  HR: "bg-gradient-to-r from-orange-500 to-orange-600 text-white",
  DRIVER: "bg-gradient-to-r from-gray-500 to-gray-600 text-white",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  INACTIVE: "bg-gray-100 text-gray-800 border-gray-200",
  SUSPENDED: "bg-red-100 text-red-800 border-red-200",
};

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Pagination
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // Password change modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordUser, setPasswordUser] = useState<User | null>(null);

  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Permission view modal
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [viewingRole, setViewingRole] = useState<RoleInfo | null>(null);

  const emptyForm: UserForm = {
    username: "",
    password: "",
    full_name: "",
    email: "",
    phone: "",
    role: "DRIVER",
    status: "ACTIVE",
    driver_id: "",
    notes: "",
  };

  const [form, setForm] = useState<UserForm>(emptyForm);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load data
  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filterRole) params.append("role", filterRole);
      if (filterStatus) params.append("status", filterStatus);
      params.append("limit", "500");

      const data = await apiFetch<{ users: User[]; total: number }>(
        `/api/v1/users?${params.toString()}`
      );
      setUsers(data.users);
    } catch (e: any) {
      if (e?.message?.includes("401")) {
        setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      } else if (e?.message?.includes("403")) {
        setError("Bạn không có quyền truy cập chức năng này.");
      } else {
        setError(e?.message || "Không thể tải danh sách người dùng");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles() {
    try {
      const data = await apiFetch<{ roles: RoleInfo[] }>("/api/v1/users/roles");
      setRoles(data.roles);
    } catch (e) {
      console.error("Failed to load roles:", e);
    }
  }

  async function loadStats() {
    try {
      const data = await apiFetch<UserStats>("/api/v1/users/stats");
      setStats(data);
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  }

  async function loadDrivers() {
    try {
      const data = await apiFetch<Driver[]>("/api/v1/drivers");
      setDrivers(data);
    } catch (e) {
      console.error("Failed to load drivers:", e);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [debouncedSearch, filterRole, filterStatus]);

  useEffect(() => {
    loadRoles();
    loadStats();
    loadDrivers();
  }, []);

  // Pagination
  const filteredCount = users.length;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, currentPage, pageSize]);
  const totalPages = Math.ceil(users.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterRole, filterStatus, pageSize]);

  // Modal handlers
  function openCreate() {
    setMode("create");
    setEditingUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setMode("edit");
    setEditingUser(user);
    setForm({
      username: user.username,
      password: "",
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role,
      status: user.status,
      driver_id: user.driver_id || "",
      notes: user.notes || "",
    });
    setModalOpen(true);
  }

  function openView(user: User) {
    setMode("view");
    setEditingUser(user);
    setForm({
      username: user.username,
      password: "",
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role,
      status: user.status,
      driver_id: user.driver_id || "",
      notes: user.notes || "",
    });
    setModalOpen(true);
  }

  function openPasswordChange(user: User) {
    setPasswordUser(user);
    setNewPassword("");
    setPasswordModalOpen(true);
  }

  function openDelete(user: User) {
    setDeletingUser(user);
    setDeleteModalOpen(true);
  }

  function openPermissions(role: RoleInfo) {
    setViewingRole(role);
    setPermissionModalOpen(true);
  }

  // Save user
  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      if (!form.username.trim()) {
        throw new Error("Tên đăng nhập là bắt buộc");
      }
      if (mode === "create" && !form.password) {
        throw new Error("Mật khẩu là bắt buộc khi tạo mới");
      }
      if (mode === "create" && form.password.length < 6) {
        throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
      }

      const payload: any = {
        username: form.username.trim(),
        full_name: form.full_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role,
        status: form.status,
        driver_id: form.driver_id || null,
        notes: form.notes.trim() || null,
      };

      if (mode === "create") {
        payload.password = form.password;
        await apiFetch("/api/v1/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/api/v1/users/${editingUser!.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      setModalOpen(false);
      await loadUsers();
      await loadStats();
    } catch (e: any) {
      setError(e?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  // Change password
  async function onChangePassword() {
    if (!passwordUser) return;
    setSaving(true);
    try {
      if (newPassword.length < 6) {
        throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
      }
      await apiFetch(`/api/v1/users/${passwordUser.id}/password`, {
        method: "PUT",
        body: JSON.stringify({ new_password: newPassword }),
      });
      setPasswordModalOpen(false);
      alert("Đổi mật khẩu thành công!");
    } catch (e: any) {
      alert(e?.message || "Đổi mật khẩu thất bại");
    } finally {
      setSaving(false);
    }
  }

  // Delete user
  async function onDelete() {
    if (!deletingUser) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/users/${deletingUser.id}`, {
        method: "DELETE",
      });
      setDeleteModalOpen(false);
      await loadUsers();
      await loadStats();
    } catch (e: any) {
      alert(e?.message || "Xóa thất bại");
    } finally {
      setSaving(false);
    }
  }

  // Toggle status
  async function toggleStatus(user: User, newStatus: string) {
    try {
      await apiFetch(`/api/v1/users/${user.id}/status?new_status=${newStatus}`, {
        method: "PUT",
      });
      await loadUsers();
      await loadStats();
    } catch (e: any) {
      alert(e?.message || "Cập nhật trạng thái thất bại");
    }
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý tài khoản và phân quyền người dùng trong hệ thống
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm người dùng
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-blue-100 text-sm mt-1">Tổng người dùng</div>
          </div>
          {Object.entries(stats.by_role).map(([role, data]) => (
            <div
              key={role}
              className={`rounded-2xl p-4 text-white shadow-lg cursor-pointer hover:scale-105 transition-transform ${ROLE_COLORS[role] || "bg-gray-500"}`}
              onClick={() => {
                const roleInfo = roles.find((r) => r.role === role);
                if (roleInfo) openPermissions(roleInfo);
              }}
            >
              <div className="text-3xl font-bold">{data.count}</div>
              <div className="text-white/80 text-sm mt-1">{data.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm theo tên, email, SĐT..."
                autoComplete="off"
                name="user-search"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
              />
            </div>
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 min-w-[150px]"
          >
            <option value="">Tất cả vai trò</option>
            {roles.map((r) => (
              <option key={r.role} value={r.role}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 min-w-[150px]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
            <option value="SUSPENDED">Tạm khóa</option>
          </select>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {loading ? "Đang tải..." : `${filteredCount} người dùng`}
            </span>
            <PageSizeSelector pageSize={pageSize} onPageSizeChange={setPageSize} />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-gray-700">Người dùng</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">Liên hệ</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">Vai trò</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">Trạng thái</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">Đăng nhập</th>
                <th className="text-right px-4 py-3 font-bold text-gray-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                      <span className="text-gray-500">Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="font-medium">Không tìm thấy người dùng</p>
                      <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc tạo người dùng mới</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${ROLE_COLORS[user.role] || "bg-gray-400"}`}>
                          {(user.full_name || user.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.full_name || user.username}
                          </div>
                          <div className="text-xs text-gray-500">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {user.email && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm">{user.email}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-sm">{user.phone}</span>
                          </div>
                        )}
                        {!user.email && !user.phone && (
                          <span className="text-gray-400 text-sm">Chưa cập nhật</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-800"}`}>
                        {user.role_label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative inline-block">
                        <select
                          value={user.status}
                          onChange={(e) => toggleStatus(user, e.target.value)}
                          className={`appearance-none px-3 py-1.5 pr-8 rounded-full text-xs font-semibold border cursor-pointer ${STATUS_COLORS[user.status] || "bg-gray-100"}`}
                        >
                          <option value="ACTIVE">Hoạt động</option>
                          <option value="INACTIVE">Ngừng hoạt động</option>
                          <option value="SUSPENDED">Tạm khóa</option>
                        </select>
                        <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleString("vi-VN")
                        : "Chưa đăng nhập"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openView(user)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                          title="Xem chi tiết"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEdit(user)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openPasswordChange(user)}
                          className="p-2 rounded-lg hover:bg-yellow-50 text-yellow-600 transition-colors"
                          title="Đổi mật khẩu"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDelete(user)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                          title="Xóa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredCount}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="người dùng"
        />
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
              <div className="text-white">
                <h2 className="font-semibold text-lg">
                  {mode === "create"
                    ? "Thêm người dùng mới"
                    : mode === "edit"
                    ? "Chỉnh sửa người dùng"
                    : "Chi tiết người dùng"}
                </h2>
                {editingUser && (
                  <p className="text-blue-100 text-sm">@{editingUser.username}</p>
                )}
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Account Info */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Thông tin tài khoản
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Tên đăng nhập <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.username}
                      onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                      disabled={mode !== "create"}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                      placeholder="username"
                    />
                  </div>
                  {mode === "create" && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Mật khẩu <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="******"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Họ và tên</label>
                    <input
                      value={form.full_name}
                      onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))}
                      disabled={mode === "view"}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Thông tin liên hệ
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                      disabled={mode === "view"}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Số điện thoại</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                      disabled={mode === "view"}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                      placeholder="0901234567"
                    />
                  </div>
                </div>
              </div>

              {/* Role & Status */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Vai trò & Trạng thái
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Vai trò</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
                      disabled={mode === "view"}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                    >
                      {roles.map((r) => (
                        <option key={r.role} value={r.role}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    {roles.find((r) => r.role === form.role) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {roles.find((r) => r.role === form.role)?.description}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Trạng thái</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                      disabled={mode === "view"}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                    >
                      <option value="ACTIVE">Hoạt động</option>
                      <option value="INACTIVE">Ngừng hoạt động</option>
                      <option value="SUSPENDED">Tạm khóa</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Driver Link */}
              {form.role === "DRIVER" && (
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Liên kết tài xế
                  </h3>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Chọn tài xế</label>
                    <select
                      value={form.driver_id}
                      onChange={(e) => setForm((s) => ({ ...s, driver_id: e.target.value }))}
                      disabled={mode === "view"}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                    >
                      <option value="">-- Không liên kết --</option>
                      {drivers
                        .filter((d) => d.status === "ACTIVE")
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.phone ? `(${d.phone})` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Ghi chú
                </h3>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                  disabled={mode === "view"}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 resize-none"
                  placeholder="Ghi chú về người dùng..."
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                {mode === "view" ? "Đóng" : "Hủy"}
              </button>
              {mode !== "view" && (
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-60 hover:shadow-lg transition-all"
                >
                  {saving ? "Đang lưu..." : mode === "create" ? "Tạo mới" : "Lưu thay đổi"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {passwordModalOpen && passwordUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-yellow-500 to-yellow-600">
              <div className="text-white">
                <h2 className="font-semibold text-lg">Đổi mật khẩu</h2>
                <p className="text-yellow-100 text-sm">@{passwordUser.username}</p>
              </div>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {/* Hidden fields to prevent browser autofill */}
              <input type="text" name="fake-username" autoComplete="username" style={{ display: 'none' }} />
              <input type="password" name="fake-password" autoComplete="current-password" style={{ display: 'none' }} />

              <label className="block text-sm text-gray-700 mb-2">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="off"
                name={`new-pwd-${Date.now()}`}
                data-lpignore="true"
                data-form-type="other"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-200"
                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
              />
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={onChangePassword}
                disabled={saving || newPassword.length < 6}
                className="rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : "Đổi mật khẩu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600">
              <h2 className="font-semibold text-lg text-white">Xác nhận xóa</h2>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Bạn có chắc muốn xóa người dùng này?
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-semibold">{deletingUser.full_name || deletingUser.username}</span> (@{deletingUser.username})
                  </p>
                </div>
              </div>
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.
              </p>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={onDelete}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Đang xóa..." : "Xóa người dùng"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {permissionModalOpen && viewingRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className={`px-6 py-4 border-b ${ROLE_COLORS[viewingRole.role] || "bg-gray-500"}`}>
              <h2 className="font-semibold text-lg text-white">{viewingRole.label}</h2>
              <p className="text-white/80 text-sm">{viewingRole.description}</p>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Quyền truy cập</h3>
              <div className="grid grid-cols-2 gap-3">
                {viewingRole.permissions.map((perm) => (
                  <div
                    key={perm.module}
                    className="rounded-xl border border-gray-200 p-4 bg-gray-50"
                  >
                    <div className="font-medium text-gray-800 capitalize mb-2">
                      {perm.module.replace(/_/g, " ")}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {perm.actions.map((action) => (
                        <span
                          key={action}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            action === "view"
                              ? "bg-blue-100 text-blue-700"
                              : action === "create"
                              ? "bg-green-100 text-green-700"
                              : action === "edit"
                              ? "bg-yellow-100 text-yellow-700"
                              : action === "delete"
                              ? "bg-red-100 text-red-700"
                              : action === "export"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setPermissionModalOpen(false)}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-100"
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
