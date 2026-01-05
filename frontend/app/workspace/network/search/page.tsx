"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Truck,
  Users,
  UserPlus,
  Check,
  Building2,
  MapPin,
  Loader2,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000";

interface WorkerSearchResult {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  company_name?: string;
  avatar_url?: string;
  bio?: string;
  operating_regions?: string[];
  connection_status?: "NONE" | "PENDING" | "CONNECTED";
  pending_connection_id?: string;
}

type RoleFilter = "ALL" | "DRIVER" | "DISPATCHER";

export default function SearchWorkersPage() {
  const { worker } = useWorker();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role") as RoleFilter) || "ALL";

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(initialRole);
  const [results, setResults] = useState<WorkerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ q: query.trim() });
      if (roleFilter !== "ALL") {
        params.append("role", roleFilter);
      }

      const res = await fetch(
        `${API_BASE}/api/v1/worker-connections/search-workers?${params}`,
        {
          credentials: "include",
        }
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.workers || []);
      }
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (targetWorkerId: string, asRole: "DISPATCHER" | "DRIVER") => {
    setConnecting(targetWorkerId);
    try {
      const endpoint =
        asRole === "DISPATCHER"
          ? "/api/v1/worker-connections/invite-driver"
          : "/api/v1/worker-connections/request-join";

      const body =
        asRole === "DISPATCHER"
          ? { target_worker_id: targetWorkerId }
          : { target_worker_id: targetWorkerId };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setResults(
          results.map((r) =>
            r.id === targetWorkerId
              ? { ...r, connection_status: "PENDING" }
              : r
          )
        );
      } else {
        const err = await res.json();
        alert(err.detail || "Không thể gửi yêu cầu kết nối");
      }
    } catch (e) {
      console.error("Connect failed:", e);
    } finally {
      setConnecting(null);
    }
  };

  if (!worker) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/workspace/network"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Tìm kết nối mới
              </h1>
              <p className="text-gray-500 text-sm">
                Tìm tài xế hoặc điều phối viên để kết nối
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Search Input */}
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Nhập tên, số điện thoại hoặc email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Role Filter */}
          <div className="flex gap-2">
            {[
              { value: "ALL", label: "Tất cả" },
              { value: "DRIVER", label: "Tài xế", icon: Truck },
              { value: "DISPATCHER", label: "Điều phối", icon: Users },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRoleFilter(opt.value as RoleFilter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  roleFilter === opt.value
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt.icon && <opt.icon className="w-4 h-4" />}
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleSearch}
            disabled={!query.trim() || loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Tìm kiếm
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
            Đang tìm kiếm...
          </div>
        ) : searched && results.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Không tìm thấy kết quả</p>
            <p className="text-sm text-gray-400 mt-1">
              Thử tìm với từ khóa khác
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result) => (
              <div
                key={result.id}
                className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    {result.avatar_url ? (
                      <img
                        src={result.avatar_url}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {result.full_name}
                    </h3>

                    {result.company_name && (
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {result.company_name}
                      </p>
                    )}

                    <p className="text-sm text-gray-500">{result.phone}</p>

                    {result.bio && (
                      <p className="text-sm text-gray-600 mt-2">{result.bio}</p>
                    )}

                    {result.operating_regions &&
                      result.operating_regions.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {result.operating_regions.slice(0, 3).join(", ")}
                          {result.operating_regions.length > 3 &&
                            ` +${result.operating_regions.length - 3}`}
                        </div>
                      )}
                  </div>

                  {/* Connection Button */}
                  <div>
                    {result.connection_status === "CONNECTED" ? (
                      <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Đã kết nối
                      </span>
                    ) : result.connection_status === "PENDING" ? (
                      <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm">
                        Đang chờ
                      </span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {/* Show appropriate button based on search filter */}
                        {(roleFilter === "DRIVER" || roleFilter === "ALL") && (
                          <button
                            onClick={() => handleConnect(result.id, "DISPATCHER")}
                            disabled={connecting === result.id}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm flex items-center gap-1"
                          >
                            {connecting === result.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserPlus className="w-4 h-4" />
                            )}
                            Mời làm tài xế
                          </button>
                        )}
                        {(roleFilter === "DISPATCHER" || roleFilter === "ALL") && (
                          <button
                            onClick={() => handleConnect(result.id, "DRIVER")}
                            disabled={connecting === result.id}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm flex items-center gap-1"
                          >
                            {connecting === result.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserPlus className="w-4 h-4" />
                            )}
                            Xin làm tài xế
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tips */}
        {!searched && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-medium text-blue-800 mb-2">Gợi ý tìm kiếm</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Nhập số điện thoại để tìm chính xác</li>
              <li>• Nhập tên để tìm theo tên người dùng</li>
              <li>• Chọn loại để lọc theo vai trò (Tài xế/Điều phối)</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
