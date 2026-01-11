"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  Building2,
  Sparkles,
} from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import { defaultLocale, type Locale } from "@/i18n";

interface UserInfo {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role: string;
  system_role?: string;
  role_label?: string;
  tenant_name?: string;
  tenant_code?: string;
  avatar_url?: string;
}

interface TopbarProps {
  onAIClick?: () => void;
  isAIOpen?: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  TENANT_ADMIN: "bg-blue-100 text-blue-700",
  DISPATCHER: "bg-green-100 text-green-700",
  ACCOUNTANT: "bg-yellow-100 text-yellow-700",
  HR: "bg-pink-100 text-pink-700",
  DRIVER: "bg-gray-100 text-gray-700",
};

export default function Topbar({ onAIClick, isAIOpen }: TopbarProps) {
  const router = useRouter();
  const t = useTranslations();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<Locale>(defaultLocale);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load user from localStorage
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error("Failed to parse user:", e);
      }
    }

    // Load locale from cookie
    const localeCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("locale="))
      ?.split("=")[1] as Locale | undefined;
    if (localeCookie) {
      setCurrentLocale(localeCookie);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function logout() {
    try {
      await fetch(`/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      // Ignore errors, still proceed with logout
    }
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    router.replace("/login");
  }

  // Get display name
  const displayName = user?.full_name || user?.username || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Get role display
  const roleLabel = user?.role_label || user?.role || "User";
  const roleColor = ROLE_COLORS[user?.role || ""] || "bg-gray-100 text-gray-700";

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left side - Tenant info only (logo is in sidebar) */}
      <div className="flex items-center gap-3">
        {user?.tenant_name && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Building2 className="w-4 h-4 text-gray-500" />
            {user.tenant_name}
          </span>
        )}
      </div>

      {/* Right side - AI button, Language switcher & User dropdown */}
      <div className="flex items-center gap-2">
        {/* AI Assistant Button */}
        {onAIClick && (
          <button
            onClick={onAIClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              isAIOpen
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            }`}
            title="AI Assistant (Ctrl+K)"
          >
            <Sparkles className={`w-4 h-4 ${isAIOpen ? "animate-pulse" : ""}`} />
            <span className="text-sm font-medium hidden sm:inline">AI</span>
          </button>
        )}

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <LanguageSwitcher
          currentLocale={currentLocale}
          onChange={setCurrentLocale}
          showLabel={false}
        />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {/* Avatar */}
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                {initials}
              </div>
            )}

            {/* User info */}
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-gray-900">{displayName}</div>
              <div className="text-xs text-gray-500">{user?.email || user?.username}</div>
            </div>

            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              {/* User Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {displayName}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user?.email || user?.username}
                    </div>
                  </div>
                </div>

                {/* Role badge */}
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${roleColor}`}>
                    <Shield className="w-3 h-3" />
                    {roleLabel}
                  </span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <User className="w-4 h-4" />
                  {t("auth.myProfile")}
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Settings className="w-4 h-4" />
                  {t("common.settings")}
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-gray-100 pt-1">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                  }}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  {t("auth.logout")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
