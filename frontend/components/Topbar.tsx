"use client";

import { useRouter } from "next/navigation";

export default function Topbar() {
  const router = useRouter();

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    router.replace("/login");
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="text-sm text-gray-600">
        9log.tech - Logistics ERP
      </div>

      <button
        onClick={logout}
        className="text-sm text-red-600 hover:underline"
      >
        Logout
      </button>
    </header>
  );
}
