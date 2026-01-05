"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Lock,
  Phone,
  Briefcase,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

export default function WorkerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    phone: "",
    job_title: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: "" });

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Check username availability with debounce
  const checkUsername = async (username: string) => {
    if (username.length < 3) {
      setUsernameStatus({ checking: false, available: null, message: "Username phải có ít nhất 3 ký tự" });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: "" });

    try {
      const res = await fetch(
        `${baseUrl}/api/v1/worker/check-username/${username}`,
        {
          credentials: "include",
          signal: AbortSignal.timeout(5000), // 5s timeout
        }
      );

      if (!res.ok) {
        // API error - still allow registration, backend will validate
        setUsernameStatus({
          checking: false,
          available: true, // Allow to proceed
          message: `https://${username}.9log.tech`,
        });
        return;
      }

      const data = await res.json();

      setUsernameStatus({
        checking: false,
        available: data.available,
        message: data.available
          ? `${data.workspace_url} sẵn sàng!`
          : data.reason || "Username không khả dụng",
      });
    } catch {
      // Network error - still allow registration, backend will validate
      setUsernameStatus({
        checking: false,
        available: true, // Allow to proceed
        message: `https://${username}.9log.tech`,
      });
    }
  };

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    setForm({ ...form, username: sanitized });

    // Debounce check
    clearTimeout((window as unknown as { usernameTimeout: number }).usernameTimeout);
    (window as unknown as { usernameTimeout: number }).usernameTimeout = window.setTimeout(() => {
      checkUsername(sanitized);
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (form.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (usernameStatus.available === false) {
      setError("Username đã được sử dụng, vui lòng chọn username khác");
      return;
    }

    if (form.username.length < 3) {
      setError("Username phải có ít nhất 3 ký tự");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(`${baseUrl}/api/v1/worker/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone || null,
          job_title: form.job_title || null,
        }),
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Đăng ký thất bại");
      }

      // Redirect to dashboard
      router.push("/workspace");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Kết nối quá chậm, vui lòng thử lại");
      } else {
        setError(err instanceof Error ? err.message : "Đăng ký thất bại. Vui lòng kiểm tra kết nối.");
      }
      setLoading(false); // Reset loading on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            9log<span className="text-blue-600">.tech</span>
          </h1>
          <p className="text-gray-600 mt-2">Tạo Personal Workspace của bạn</p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Đăng ký tài khoản
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username (địa chỉ workspace của bạn)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="vd: minhtaixe"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus.checking && (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  )}
                  {usernameStatus.available === true && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {usernameStatus.available === false && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              {usernameStatus.message && (
                <p
                  className={`text-xs mt-1 ${
                    usernameStatus.available ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {usernameStatus.message}
                </p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ và tên
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại (tùy chọn)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0901234567"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nghề nghiệp (tùy chọn)
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={form.job_title}
                  onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                  placeholder="Tài xế, Kế toán, Developer..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm({ ...form, confirmPassword: e.target.value })
                  }
                  placeholder="Nhập lại mật khẩu"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || usernameStatus.checking || usernameStatus.available === false}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : usernameStatus.checking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                <>
                  Tạo tài khoản
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-gray-600 text-sm mt-6">
            Đã có tài khoản?{" "}
            <Link href="/workspace/login" className="text-blue-600 hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p className="font-medium mb-2">Khi có Personal Workspace, bạn có thể:</p>
          <ul className="space-y-1">
            <li>✓ Nhận việc từ nhiều công ty</li>
            <li>✓ Quản lý tất cả công việc tại một nơi</li>
            <li>✓ Xây dựng hồ sơ & danh tiếng cá nhân</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
