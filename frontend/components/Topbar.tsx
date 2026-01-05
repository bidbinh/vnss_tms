"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  Building2,
} from "lucide-react";

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

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  TENANT_ADMIN: "bg-blue-100 text-blue-700",
  DISPATCHER: "bg-green-100 text-green-700",
  ACCOUNTANT: "bg-yellow-100 text-yellow-700",
  HR: "bg-pink-100 text-pink-700",
  DRIVER: "bg-gray-100 text-gray-700",
};

export default function Topbar() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
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
      {/* Left side - Platform info */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">9log.tech - Logistics ERP</span>
        {user?.tenant_name && (
          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            <Building2 className="w-3 h-3" />
            {user.tenant_name}
          </span>
        )}
      </div>

      {/* Right side - User dropdown */}
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
                Thong tin ca nhan
              </Link>

              <Link
                href="/settings"
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Settings className="w-4 h-4" />
                Cai dat
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
                Dang xuat
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
