"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Calendar,
  Save,
  ArrowLeft,
  Key,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role: string;
  system_role?: string;
  role_label?: string;
  status: string;
  tenant_id: string;
  tenant_code?: string;
  tenant_name?: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quan tri vien",
  SUPER_ADMIN: "Quan tri vien he thong",
  TENANT_ADMIN: "Quan tri vien cong ty",
  DISPATCHER: "Dieu phoi vien",
  ACCOUNTANT: "Ke toan",
  HR: "Nhan su",
  DRIVER: "Tai xe",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Dang hoat dong", color: "bg-green-100 text-green-700" },
  INACTIVE: { label: "Khong hoat dong", color: "bg-gray-100 text-gray-700" },
  SUSPENDED: { label: "Bi dinh chi", color: "bg-red-100 text-red-700" },
  PENDING_VERIFICATION: { label: "Cho xac minh", color: "bg-yellow-100 text-yellow-700" },
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Book flip state
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"forward" | "backward" | null>(null);
  const bookRef = useRef<HTMLDivElement>(null);

  const totalPages = 2;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await apiFetch<UserProfile>("/auth/me");
      setProfile(data);
      setFullName(data.full_name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setError("Khong the tai thong tin tai khoan");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/users/${profile?.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName,
          email: email || null,
          phone: phone || null,
        }),
      });

      // Update localStorage
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        user.full_name = fullName;
        user.email = email;
        localStorage.setItem("user", JSON.stringify(user));
      }

      setSuccess("Cap nhat thong tin thanh cong!");
      fetchProfile();
    } catch (err: any) {
      setError(err.message || "Khong the cap nhat thong tin");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Mat khau xac nhan khong khop");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Mat khau moi phai co it nhat 6 ky tu");
      return;
    }

    setChangingPassword(true);

    try {
      await apiFetch(`/users/${profile?.id}/change-password`, {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      setPasswordSuccess("Doi mat khau thanh cong!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (err: any) {
      setPasswordError(err.message || "Khong the doi mat khau");
    } finally {
      setChangingPassword(false);
    }
  };

  const flipToPage = (pageIndex: number) => {
    if (isFlipping || pageIndex === currentPage || pageIndex < 0 || pageIndex >= totalPages) return;

    setIsFlipping(true);
    setFlipDirection(pageIndex > currentPage ? "forward" : "backward");

    setTimeout(() => {
      setCurrentPage(pageIndex);
      setTimeout(() => {
        setIsFlipping(false);
        setFlipDirection(null);
      }, 100);
    }, 700);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      flipToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      flipToPage(currentPage - 1);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const roleLabel = ROLE_LABELS[profile?.role || ""] || profile?.role || "User";
  const statusInfo = STATUS_LABELS[profile?.status || ""] || { label: profile?.status, color: "bg-gray-100 text-gray-700" };

  // Page 1: Profile Overview & Basic Info
  const Page1Front = () => (
    <div className="p-8 h-full overflow-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Profile Card */}
        <div className="flex flex-col">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 flex-1">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-4xl font-bold mb-4 shadow-lg">
                {(profile?.full_name || profile?.username || "U")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {profile?.full_name || profile?.username}
              </h2>
              <p className="text-gray-500 mb-4">@{profile?.username}</p>

              {/* Role & Status badges */}
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full bg-blue-100 text-blue-700 shadow-sm">
                  <Shield className="w-4 h-4" />
                  {roleLabel}
                </span>
                <span className={`inline-flex px-4 py-1.5 text-sm font-medium rounded-full shadow-sm ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>

            {/* Tenant info */}
            {profile?.tenant_name && (
              <div className="mt-6 pt-6 border-t border-blue-200/50">
                <div className="flex items-center gap-3 text-gray-600 justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">{profile.tenant_name}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Basic Info Form */}
        <div className="flex flex-col">
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex-1 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Thong tin co ban
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ten dang nhap
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={profile?.username || ""}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ho va ten
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Nhap ho va ten"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  So dien thoai
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="0901234567"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Dang luu..." : "Luu thay doi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  // Page 2: Security Settings
  const Page2Front = () => (
    <div className="p-8 h-full overflow-auto">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Key className="w-6 h-6 text-blue-600" />
              Bao mat tai khoan
            </h3>
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                <Key className="w-4 h-4" />
                Doi mat khau
              </button>
            )}
          </div>

          {showPasswordForm ? (
            <form onSubmit={handleChangePassword} className="space-y-5">
              {passwordError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {passwordSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mat khau hien tai
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mat khau moi
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Mat khau phai co it nhat 6 ky tu</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Xac nhan mat khau moi
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordError("");
                  }}
                  className="px-5 py-2.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Huy
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
                >
                  <Key className="w-4 h-4" />
                  {changingPassword ? "Dang xu ly..." : "Doi mat khau"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Mat khau</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      De bao mat tai khoan, ban nen thay doi mat khau dinh ky va su dung mat khau manh.
                    </p>
                    <ul className="text-sm text-gray-500 space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        Su dung it nhat 8 ky tu
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        Ket hop chu hoa, chu thuong va so
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        Khong su dung thong tin ca nhan
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const pages = [
    { component: <Page1Front />, label: "Thong tin" },
    { component: <Page2Front />, label: "Bao mat" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thong tin ca nhan</h1>
          <p className="text-gray-600">Quan ly thong tin tai khoan cua ban</p>
        </div>
      </div>

      {/* Book Container */}
      <div className="book-container relative">
        <div
          ref={bookRef}
          className="book relative"
          style={{ minHeight: "600px" }}
        >
          {/* Book spine shadow */}
          <div className="book-spine-shadow"></div>

          {/* Pages */}
          {pages.map((page, index) => {
            const isCurrentPage = index === currentPage;
            const isPreviousPage = index < currentPage;
            const isFlippingThisPage = isFlipping && (
              (flipDirection === "forward" && index === currentPage) ||
              (flipDirection === "backward" && index === currentPage - 1)
            );

            return (
              <div
                key={index}
                className={`book-page ${isFlippingThisPage ? "flipping" : ""} ${
                  flipDirection === "forward" && isFlippingThisPage ? "flip-forward" : ""
                } ${flipDirection === "backward" && isFlippingThisPage ? "flip-backward" : ""}`}
                style={{
                  transform: isPreviousPage ? "rotateY(-180deg)" : "rotateY(0deg)",
                  zIndex: isCurrentPage ? 50 : isPreviousPage ? 40 - index : 30 - index,
                  display: Math.abs(index - currentPage) > 1 && !isFlipping ? "none" : "block",
                }}
              >
                <div className="book-page-front bg-gradient-to-br from-white to-gray-50">
                  {page.component}
                </div>
                <div className="book-page-back bg-gradient-to-bl from-white to-gray-50">
                  {/* Back of page - can show previous page content or decorative pattern */}
                  <div className="h-full flex items-center justify-center">
                    <div className="text-gray-300 text-6xl font-serif">{index + 1}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Static content for current page (always visible) */}
          <div
            className="relative bg-white rounded-r-lg shadow-lg overflow-hidden"
            style={{ minHeight: "600px" }}
          >
            {!isFlipping && pages[currentPage]?.component}
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 0 || isFlipping}
            className="book-nav-btn prev"
            title="Trang truoc"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages - 1 || isFlipping}
            className="book-nav-btn next"
            title="Trang sau"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Page Indicators */}
        <div className="page-indicator mt-8">
          {pages.map((page, index) => (
            <button
              key={index}
              onClick={() => flipToPage(index)}
              disabled={isFlipping}
              className={`page-dot ${index === currentPage ? "active" : ""}`}
              title={page.label}
            />
          ))}
        </div>

        {/* Page Labels */}
        <div className="flex justify-center gap-8 mt-4">
          {pages.map((page, index) => (
            <button
              key={index}
              onClick={() => flipToPage(index)}
              disabled={isFlipping}
              className={`text-sm font-medium transition-all ${
                index === currentPage
                  ? "text-blue-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {page.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
