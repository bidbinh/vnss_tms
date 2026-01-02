"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Target,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Building2,
  Calendar,
  User,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface PipelineStage {
  stage: string;
  count: number;
  total_value: number;
  weighted_value: number;
}

interface Opportunity {
  id: string;
  code: string;
  name: string;
  account_id: string;
  stage: string;
  probability: number;
  amount: number;
  expected_close_date: string | null;
  assigned_to: string | null;
  created_at: string | null;
}

interface Account {
  id: string;
  code: string;
  name: string;
}

const STAGE_LABELS: Record<string, string> = {
  QUALIFICATION: "Đánh giá",
  NEEDS_ANALYSIS: "Phân tích nhu cầu",
  PROPOSAL: "Báo giá",
  NEGOTIATION: "Đàm phán",
  CLOSED_WON: "Thành công",
  CLOSED_LOST: "Thất bại",
};

const STAGE_COLORS: Record<string, string> = {
  QUALIFICATION: "bg-gray-500",
  NEEDS_ANALYSIS: "bg-blue-500",
  PROPOSAL: "bg-yellow-500",
  NEGOTIATION: "bg-orange-500",
  CLOSED_WON: "bg-green-500",
  CLOSED_LOST: "bg-red-500",
};

const STAGE_BG_COLORS: Record<string, string> = {
  QUALIFICATION: "bg-gray-50 border-gray-200",
  NEEDS_ANALYSIS: "bg-blue-50 border-blue-200",
  PROPOSAL: "bg-yellow-50 border-yellow-200",
  NEGOTIATION: "bg-orange-50 border-orange-200",
  CLOSED_WON: "bg-green-50 border-green-200",
  CLOSED_LOST: "bg-red-50 border-red-200",
};

export default function PipelineReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [accounts, setAccounts] = useState<Record<string, Account>>({});
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

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
      const [pipelineRes, oppsRes] = await Promise.all([
        apiFetch<{ stages: PipelineStage[] }>("/crm/dashboard/pipeline"),
        apiFetch<{ items: Opportunity[]; total: number }>("/crm/opportunities?page_size=100"),
      ]);

      setPipeline(pipelineRes.stages);
      setOpportunities(oppsRes.items);

      // Fetch accounts
      const accountIds = [...new Set(oppsRes.items.filter((o) => o.account_id).map((o) => o.account_id))];
      const accountMap: Record<string, Account> = {};
      for (const id of accountIds.slice(0, 30)) {
        try {
          const acc = await apiFetch<Account>(`/crm/accounts/${id}`);
          accountMap[id] = acc;
        } catch {
          // Ignore
        }
      }
      setAccounts(accountMap);
    } catch (error) {
      console.error("Failed to fetch pipeline data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + " tỷ";
    }
    if (value >= 1000000) {
      return (value / 1000000).toFixed(0) + " triệu";
    }
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  // Calculate totals
  const openPipeline = pipeline.filter((s) => !["CLOSED_WON", "CLOSED_LOST"].includes(s.stage));
  const totalPipelineValue = openPipeline.reduce((sum, s) => sum + s.total_value, 0);
  const totalWeightedValue = openPipeline.reduce((sum, s) => sum + s.weighted_value, 0);
  const totalOpportunities = openPipeline.reduce((sum, s) => sum + s.count, 0);

  const closedWon = pipeline.find((s) => s.stage === "CLOSED_WON");
  const closedLost = pipeline.find((s) => s.stage === "CLOSED_LOST");
  const winRate = closedWon && closedLost
    ? ((closedWon.count / (closedWon.count + closedLost.count)) * 100).toFixed(1)
    : "0";

  // Filter opportunities by selected stage
  const filteredOpportunities = selectedStage
    ? opportunities.filter((o) => o.stage === selectedStage)
    : opportunities.filter((o) => !["CLOSED_WON", "CLOSED_LOST"].includes(o.stage));

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo Pipeline</h1>
          <p className="text-gray-600 mt-1">Phân tích quy trình bán hàng và cơ hội</p>
        </div>
        <Link
          href="/crm/opportunities"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Target className="w-4 h-4" />
          Xem tất cả cơ hội
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Cơ hội đang mở</div>
              <div className="text-2xl font-bold">{totalOpportunities}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng giá trị Pipeline</div>
              <div className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Giá trị gia quyền</div>
              <div className="text-2xl font-bold">{formatCurrency(totalWeightedValue)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tỷ lệ thắng</div>
              <div className="text-2xl font-bold">{winRate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Pipeline theo giai đoạn</h2>
        <div className="space-y-3">
          {openPipeline.map((stage, index) => {
            const maxValue = Math.max(...openPipeline.map((s) => s.total_value));
            const widthPercent = maxValue > 0 ? (stage.total_value / maxValue) * 100 : 0;

            return (
              <div
                key={stage.stage}
                className={`relative cursor-pointer rounded-lg border p-4 transition-all ${
                  selectedStage === stage.stage
                    ? "ring-2 ring-blue-500 " + STAGE_BG_COLORS[stage.stage]
                    : STAGE_BG_COLORS[stage.stage]
                }`}
                onClick={() => setSelectedStage(selectedStage === stage.stage ? null : stage.stage)}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${STAGE_COLORS[stage.stage]}`} />
                    <div>
                      <div className="font-medium text-gray-900">
                        {STAGE_LABELS[stage.stage] || stage.stage}
                      </div>
                      <div className="text-sm text-gray-600">
                        {stage.count} cơ hội
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      {formatCurrency(stage.total_value)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Gia quyền: {formatCurrency(stage.weighted_value)}
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 h-1 rounded-b-lg overflow-hidden w-full">
                  <div
                    className={`h-full ${STAGE_COLORS[stage.stage]}`}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Closed Summary */}
        <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-600">Thành công</div>
                <div className="text-xl font-bold text-green-700">{closedWon?.count || 0} cơ hội</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-700">
                  {formatCurrency(closedWon?.total_value || 0)}
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-red-600">Thất bại</div>
                <div className="text-xl font-bold text-red-700">{closedLost?.count || 0} cơ hội</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-red-700">
                  {formatCurrency(closedLost?.total_value || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold">
            {selectedStage
              ? `Cơ hội - ${STAGE_LABELS[selectedStage] || selectedStage}`
              : "Tất cả cơ hội đang mở"}
          </h2>
          {selectedStage && (
            <button
              onClick={() => setSelectedStage(null)}
              className="text-sm text-blue-600 hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
        <div className="divide-y divide-gray-200">
          {filteredOpportunities.map((opp) => (
            <Link
              key={opp.id}
              href={`/crm/opportunities/${opp.id}`}
              className="block p-4 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${STAGE_COLORS[opp.stage]}`} />
                  <div>
                    <div className="font-medium text-gray-900">{opp.name}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-3 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                        {opp.code}
                      </span>
                      {opp.account_id && accounts[opp.account_id] && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {accounts[opp.account_id].name}
                        </span>
                      )}
                      {opp.expected_close_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {opp.expected_close_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    {formatCurrency(opp.amount)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {opp.probability}% xác suất
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {filteredOpportunities.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Không có cơ hội nào
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
