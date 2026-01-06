"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import AIChatWidget from "@/components/AIChatWidget";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check auth using token from localStorage
    async function checkAuth() {
      console.log("[ProtectedLayout] Checking auth...");

      // Get token from localStorage
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.log("[ProtectedLayout] No token found, redirecting to login");
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch(`/api/v1/auth/me`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          credentials: "include",
        });
        console.log("[ProtectedLayout] /auth/me response:", res.status, res.ok);
        if (!res.ok) {
          console.log("[ProtectedLayout] Not authenticated, redirecting to login");
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          router.replace("/login");
          return;
        }
        // Update user info in localStorage
        const userData = await res.json();
        console.log("[ProtectedLayout] User authenticated:", userData.username);
        localStorage.setItem("user", JSON.stringify(userData));
      } catch (err) {
        console.error("[ProtectedLayout] Auth check error:", err);
        router.replace("/login");
        return;
      }
      setIsChecking(false);
    }
    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Đang kiểm tra đăng nhập...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <AIChatWidget />
    </div>
  );
}
