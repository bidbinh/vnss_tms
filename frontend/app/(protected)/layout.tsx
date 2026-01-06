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
    // Check auth by calling /auth/me - cookie will be sent automatically
    async function checkAuth() {
      console.log("[ProtectedLayout] Checking auth...");
      try {
        const res = await fetch(`/api/v1/auth/me`, {
          credentials: "include",
        });
        console.log("[ProtectedLayout] /auth/me response:", res.status, res.ok);
        if (!res.ok) {
          console.log("[ProtectedLayout] Not authenticated, redirecting to login");
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
