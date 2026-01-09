"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Company types
const COMPANY_TYPES = [
  { value: "CARRIER", label: "Vận tải (Carrier)", description: "Công ty vận tải, xe tải, container" },
  { value: "FORWARDER", label: "Giao nhận (Forwarder)", description: "Công ty giao nhận, logistics" },
  { value: "SHIPPER", label: "Chủ hàng (Shipper)", description: "Doanh nghiệp sản xuất, thương mại" },
  { value: "WAREHOUSE", label: "Kho bãi (Warehouse)", description: "Dịch vụ kho bãi, lưu trữ" },
  { value: "EXPRESS", label: "Chuyển phát (Express)", description: "Chuyển phát nhanh, last-mile" },
  { value: "OTHER", label: "Khác", description: "Loại hình khác" },
];

type SubdomainStatus = {
  available: boolean;
  message: string;
  checking: boolean;
};

export default function RegisterPage() {
  const router = useRouter();

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [companyType, setCompanyType] = useState("CARRIER");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    subdomain: string;
    loginUrl: string;
  } | null>(null);

  // Subdomain availability check
  const [subdomainStatus, setSubdomainStatus] = useState<SubdomainStatus>({
    available: false,
    message: "",
    checking: false,
  });

  // Auto-generate subdomain from company name
  useEffect(() => {
    if (companyName && !subdomain) {
      const generated = companyName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 20);
      if (generated.length >= 3) {
        setSubdomain(generated);
      }
    }
  }, [companyName]);

  // Check subdomain availability with debounce
  useEffect(() => {
    if (subdomain.length < 3) {
      setSubdomainStatus({ available: false, message: "", checking: false });
      return;
    }

    setSubdomainStatus((prev) => ({ ...prev, checking: true }));

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/tenant/check-subdomain/${subdomain}`
        );
        const data = await res.json();
        setSubdomainStatus({
          available: data.available,
          message: data.message,
          checking: false,
        });
      } catch {
        setSubdomainStatus({
          available: false,
          message: "Không thể kiểm tra subdomain",
          checking: false,
        });
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [subdomain]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!companyName.trim()) {
      setError("Vui lòng nhập tên công ty");
      return;
    }
    if (!subdomain || subdomain.length < 3) {
      setError("Subdomain phải có ít nhất 3 ký tự");
      return;
    }
    if (!subdomainStatus.available) {
      setError("Subdomain không khả dụng");
      return;
    }
    if (!adminEmail.trim()) {
      setError("Vui lòng nhập email");
      return;
    }
    if (!adminFullName.trim()) {
      setError("Vui lòng nhập họ tên");
      return;
    }
    if (adminPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (adminPassword !== adminPasswordConfirm) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/v1/tenant/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_name: companyName,
          subdomain: subdomain,
          company_type: companyType,
          admin_email: adminEmail,
          admin_password: adminPassword,
          admin_full_name: adminFullName,
          admin_phone: adminPhone || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Đăng ký thất bại");
      }

      const data = await res.json();

      setSuccess({
        subdomain: data.subdomain,
        loginUrl: data.login_url,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Có lỗi xảy ra";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Đăng ký thành công!
          </h1>

          <p className="text-gray-600 mb-6">
            Workspace của bạn đã được tạo tại:
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="text-lg font-mono font-semibold text-blue-600">
              {success.subdomain}.9log.tech
            </div>
          </div>

          <a
            href={`http://localhost:3000/login`}
            className="block w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            Đăng nhập ngay
          </a>

          <p className="text-xs text-gray-400 mt-4">
            Trên production: {success.loginUrl}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold">Đăng ký miễn phí</h1>
          <p className="text-gray-500 mt-1">
            Tạo workspace riêng cho doanh nghiệp của bạn
          </p>
        </div>

        <form className="p-6 space-y-5" onSubmit={onSubmit}>
          {/* Company Info Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Thông tin công ty
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tên công ty <span className="text-red-500">*</span>
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="VD: Công ty TNHH Logistics ABC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Subdomain <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex items-center">
                <input
                  className={`flex-1 rounded-l-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 ${
                    subdomainStatus.available
                      ? "border-green-400 focus:border-green-400"
                      : subdomain.length >= 3
                      ? "border-red-300 focus:border-red-400"
                      : "border-gray-300 focus:border-blue-400"
                  }`}
                  value={subdomain}
                  onChange={(e) =>
                    setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  placeholder="abc-logistics"
                />
                <span className="bg-gray-100 border border-l-0 border-gray-300 px-4 py-2.5 rounded-r-xl text-gray-500 text-sm">
                  .9log.tech
                </span>
              </div>
              {subdomain.length >= 3 && (
                <p
                  className={`text-sm mt-1 ${
                    subdomainStatus.checking
                      ? "text-gray-500"
                      : subdomainStatus.available
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {subdomainStatus.checking
                    ? "Đang kiểm tra..."
                    : subdomainStatus.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Loại hình doanh nghiệp
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value)}
              >
                {COMPANY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Admin Account Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Tài khoản quản trị
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  Số điện thoại
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="0912345678"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@company.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                />
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting || !subdomainStatus.available}
            className="w-full bg-black text-white py-3 rounded-xl font-medium disabled:opacity-50 hover:bg-gray-800 transition-colors"
          >
            {submitting ? "Đang tạo workspace..." : "Tạo workspace miễn phí"}
          </button>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-100">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Đăng nhập
            </Link>
          </div>

          <div className="text-center text-xs text-gray-400">
            Powered by{" "}
            <a
              href="https://9log.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:underline"
            >
              9log.tech
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
