"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTenant } from "@/contexts/TenantContext";
import { redirectToTenantSubdomain } from "@/lib/tenant";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { defaultLocale, type Locale } from "@/i18n";

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
  const t = useTranslations();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocale, setCurrentLocale] = useState<Locale>(defaultLocale);

  // Load locale from cookie on mount
  useEffect(() => {
    const localeCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("locale="))
      ?.split("=")[1] as Locale | undefined;
    if (localeCookie) {
      setCurrentLocale(localeCookie);
    }
  }, []);

  // Display name - tenant name or default
  const displayName = tenant?.name || "9log.tech";
  const displaySubtitle = tenant
    ? `${tenant.name} - ${t("auth.signInToContinue")}`
    : `Logistics ERP Platform - ${t("auth.signInToContinue")}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError(t("errors.requiredField"));
      return;
    }

    setSubmitting(true);
    try {
      const body = new URLSearchParams();
      body.set("username", username);
      body.set("password", password);

      const url = `/api/v1/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          // Send tenant code header if available
          ...(tenantCode ? { "X-Tenant-Code": tenantCode } : {}),
        },
        body: body.toString(),
        credentials: "include", // Allow cookie to be set by backend
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 401)
          throw new Error(t("auth.invalidCredentials"));
        const text = await res.text();
        throw new Error(text || t("auth.loginFailed"));
      }

      const data = (await res.json()) as LoginResponse;
      console.log("[Login] Success, user:", data.user);

      // Store token in localStorage (cookies may be blocked by browser privacy settings)
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
      }
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // If user's tenant code doesn't match current subdomain, redirect
      if (data.user?.tenant_code) {
        console.log("[Login] Checking tenant redirect for:", data.user.tenant_code);
        redirectToTenantSubdomain(data.user.tenant_code);
      }

      // Use window.location to ensure data is properly set before navigation
      console.log("[Login] Redirecting to:", nextUrl);
      window.location.href = nextUrl;
    } catch (err: unknown) {
      let errorMessage = t("errors.general");
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = "Connection timeout. Please check if backend is running.";
        } else {
          errorMessage = err.message;
        }
      }
      console.error("[Login] Error:", err);
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {tenant?.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div className="flex items-center">
                  <span className="bg-gradient-to-br from-red-500 to-red-600 rounded px-1.5 py-0.5 text-white font-bold text-xl shadow-lg shadow-red-500/30">9</span>
                  <span className="text-xl font-bold text-slate-900">
                    log<span className="text-red-500">.tech</span>
                  </span>
                </div>
              )}
              <div>
                {tenant && <h1 className="text-xl font-semibold">{displayName}</h1>}
                {tenantCode && (
                  <p className="text-xs text-gray-400">{tenantCode}.9log.tech</p>
                )}
              </div>
            </div>
            <LanguageSwitcher
              currentLocale={currentLocale}
              onChange={setCurrentLocale}
              showLabel={false}
            />
          </div>
          <p className="text-sm text-gray-500 mt-3">{displaySubtitle}</p>
        </div>

        <form className="p-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("auth.username")}
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder={t("auth.username")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("auth.password")}
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300"
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
            className="w-full rounded-xl text-white py-2.5 font-medium disabled:opacity-60 transition-colors bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30"
          >
            {submitting ? t("common.loading") : t("auth.login")}
          </button>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="text-center text-sm text-gray-500">
              {t("auth.noAccount")}{" "}
              <a href="/register" className="text-red-600 hover:underline font-medium">
                {t("auth.createAccount")}
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

function LoginPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-500">Loading...</div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginForm />
    </Suspense>
  );
}
