"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { useTenant } from "@/contexts/TenantContext";
import { redirectToTenantSubdomain } from "@/lib/tenant";

type LoginResponse = {
  access_token: string;
  user?: {
    id: string;
    username: string;
    role: string;
    system_role: string;
    tenant_id?: string;
    tenant_code?: string;
    tenant_name?: string;
  };
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";
  const { tenant, tenantCode, isLoading: tenantLoading } = useTenant();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Display name - tenant name or default
  const displayName = tenant?.name || "9log.tech";
  const displaySubtitle = tenant
    ? `${tenant.name} - Đăng nhập để tiếp tục`
    : "Logistics ERP Platform - Đăng nhập để tiếp tục";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Vui lòng nhập username và password.");
      return;
    }

    setSubmitting(true);
    try {
      const body = new URLSearchParams();
      body.set("username", username);
      body.set("password", password);

      const url = `${API_BASE}/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          // Send tenant code header if available
          ...(tenantCode ? { "X-Tenant-Code": tenantCode } : {}),
        },
        body: body.toString(),
      });

      if (!res.ok) {
        if (res.status === 401)
          throw new Error("Sai tài khoản hoặc mật khẩu.");
        const text = await res.text();
        throw new Error(text || "Đăng nhập thất bại.");
      }

      const data = (await res.json()) as LoginResponse;

      localStorage.setItem("access_token", data.access_token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

      // If user's tenant code doesn't match current subdomain, redirect
      if (data.user?.tenant_code) {
        redirectToTenantSubdomain(data.user.tenant_code);
      }

      router.replace(nextUrl);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Có lỗi xảy ra.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Header with tenant branding */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{
                  backgroundColor: tenant?.primary_color || "#000000",
                }}
              >
                {(tenant?.name || "9L").charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold">{displayName}</h1>
              {tenantCode && (
                <p className="text-xs text-gray-400">{tenantCode}.9log.tech</p>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">{displaySubtitle}</p>
        </div>

        <form className="p-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tài khoản
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Email, Username hoặc SĐT"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl text-white py-2.5 font-medium disabled:opacity-60 transition-colors"
            style={{
              backgroundColor: tenant?.primary_color || "#000000",
            }}
          >
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="text-center text-sm text-gray-500">
              Chưa có tài khoản?{" "}
              <a href="/register" className="text-blue-600 hover:underline font-medium">
                Đăng ký miễn phí
              </a>
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
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-500">Đang tải...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
