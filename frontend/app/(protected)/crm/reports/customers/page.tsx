"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  UserPlus,
  TrendingUp,
  PieChart,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface LeadConversionStats {
  total_leads: number;
  converted: number;
  lost: number;
  open: number;
  conversion_rate: number;
  by_source: {
    source: string;
    total: number;
    converted: number;
    rate: number;
  }[];
}

interface DashboardSummary {
  accounts: { total: number; active: number };
  contacts: { total: number };
  leads: { total: number; new: number; qualified: number };
}

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Website",
  REFERRAL: "Gioi thieu",
  COLD_CALL: "Goi dien",
  SOCIAL_MEDIA: "Mang xa hoi",
  TRADE_SHOW: "Trien lam",
  ADVERTISEMENT: "Quang cao",
  EMAIL_CAMPAIGN: "Email marketing",
  PARTNER: "Doi tac",
  DIRECT: "Truc tiep",
  OTHER: "Khac",
  UNKNOWN: "Khong xac dinh",
};

export default function CustomerAnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [leadStats, setLeadStats] = useState<LeadConversionStats | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, leadRes] = await Promise.all([
        apiFetch<DashboardSummary>("/crm/dashboard/summary"),
        apiFetch<LeadConversionStats>("/crm/dashboard/lead-conversion?period_days=365"),
      ]);

      setSummary(summaryRes);
      setLeadStats(leadRes);
    } catch (error) {
      console.error("Failed to fetch customer data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Phan tich Khach hang</h1>
        <p className="text-gray-600 mt-1">Thong ke khach hang va chuyen doi Lead</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/crm/accounts" className="block">
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Tong khach hang</div>
                <div className="text-2xl font-bold">{summary?.accounts.total || 0}</div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Dang hoat dong: {summary?.accounts.active || 0}
            </div>
          </div>
        </Link>
        <Link href="/crm/contacts" className="block">
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Lien he</div>
                <div className="text-2xl font-bold">{summary?.contacts.total || 0}</div>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/crm/leads" className="block">
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <UserPlus className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Tong Leads</div>
                <div className="text-2xl font-bold">{leadStats?.total_leads || 0}</div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Moi: {summary?.leads.new || 0} | Qualified: {summary?.leads.qualified || 0}
            </div>
          </div>
        </Link>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Ty le chuyen doi</div>
              <div className="text-2xl font-bold">{leadStats?.conversion_rate || 0}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Trang thai Lead</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-gray-700">Dang mo</span>
              <span className="text-xl font-bold text-blue-600">{leadStats?.open || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-gray-700">Da chuyen doi</span>
              <span className="text-xl font-bold text-green-600">{leadStats?.converted || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-gray-700">That bai</span>
              <span className="text-xl font-bold text-red-600">{leadStats?.lost || 0}</span>
            </div>
          </div>

          {/* Visual bar */}
          <div className="mt-6">
            <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden flex">
              {leadStats && leadStats.total_leads > 0 && (
                <>
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: `${(leadStats.converted / leadStats.total_leads) * 100}%` }}
                    title={`Chuyen doi: ${leadStats.converted}`}
                  />
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${(leadStats.open / leadStats.total_leads) * 100}%` }}
                    title={`Dang mo: ${leadStats.open}`}
                  />
                  <div
                    className="bg-red-500 h-full"
                    style={{ width: `${(leadStats.lost / leadStats.total_leads) * 100}%` }}
                    title={`That bai: ${leadStats.lost}`}
                  />
                </>
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500 rounded" /> Chuyen doi
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-500 rounded" /> Dang mo
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-500 rounded" /> That bai
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Lead theo nguon</h2>
          {leadStats && leadStats.by_source.length > 0 ? (
            <div className="space-y-3">
              {leadStats.by_source.map((source) => (
                <div key={source.source}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      {SOURCE_LABELS[source.source] || source.source}
                    </span>
                    <span className="font-medium">
                      {source.converted}/{source.total} ({source.rate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${source.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Chua co du lieu nguon Lead
            </div>
          )}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Pheu chuyen doi khach hang</h2>
        <div className="flex items-center justify-center gap-4 py-6">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto bg-yellow-100 rounded-lg flex items-center justify-center">
              <div>
                <div className="text-3xl font-bold text-yellow-600">{leadStats?.total_leads || 0}</div>
                <div className="text-sm text-gray-600">Leads</div>
              </div>
            </div>
          </div>
          <div className="text-gray-400">→</div>
          <div className="text-center">
            <div className="w-28 h-28 mx-auto bg-blue-100 rounded-lg flex items-center justify-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">{leadStats?.converted || 0}</div>
                <div className="text-sm text-gray-600">Chuyen doi</div>
              </div>
            </div>
          </div>
          <div className="text-gray-400">→</div>
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-green-100 rounded-lg flex items-center justify-center">
              <div>
                <div className="text-3xl font-bold text-green-600">{summary?.accounts.active || 0}</div>
                <div className="text-sm text-gray-600">Khach hang</div>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center text-gray-500">
          Ty le chuyen doi tong: <span className="font-bold text-green-600">{leadStats?.conversion_rate || 0}%</span>
        </div>
      </div>
    </div>
  );
}
