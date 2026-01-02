"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  ChevronLeft,
  Download,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface CashFlowItem {
  description: string;
  amount: number;
  note: string;
  level: number;
  is_total: boolean;
}

interface CashFlowSection {
  title: string;
  items: CashFlowItem[];
  net_flow: number;
}

interface CashFlowReport {
  operating_activities: CashFlowSection;
  investing_activities: CashFlowSection;
  financing_activities: CashFlowSection;
  net_change_in_cash: number;
  beginning_cash: number;
  ending_cash: number;
  period_from: string;
  period_to: string;
  currency: string;
}

export default function CashFlowPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<CashFlowReport | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<"monthly" | "quarterly" | "yearly">("monthly");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchReport();
  }, [router, selectedMonth, selectedYear, viewMode]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
        view_mode: viewMode,
      });

      const res = await apiFetch<CashFlowReport>(
        `/accounting/reports/cash-flow?${params.toString()}`
      );
      setReport(res);
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    const formatted = new Intl.NumberFormat("vi-VN").format(absValue);
    if (value < 0) return `(${formatted})`;
    if (value === 0) return "-";
    return formatted;
  };

  const renderSection = (section: CashFlowSection, color: string) => (
    <>
      <tr className={`bg-${color}-50`}>
        <td colSpan={2} className={`px-4 py-3 font-bold text-${color}-800`}>{section.title}</td>
      </tr>
      {section.items.map((item, idx) => (
        <tr key={idx} className={`${item.is_total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}`}>
          <td className="px-4 py-2 text-sm" style={{ paddingLeft: `${item.level * 16 + 16}px` }}>
            {item.description}
            {item.note && <span className="text-gray-400 ml-2">({item.note})</span>}
          </td>
          <td className={`px-4 py-2 text-sm text-right font-medium ${
            item.amount >= 0 ? "text-green-600" : "text-red-600"
          }`}>
            {formatCurrency(item.amount)}
          </td>
        </tr>
      ))}
      <tr className={`bg-${color}-100 font-bold border-t border-${color}-200`}>
        <td className="px-4 py-3">Lưu chuyển tiền thuần từ {section.title.toLowerCase()}</td>
        <td className={`px-4 py-3 text-right ${section.net_flow >= 0 ? "text-green-700" : "text-red-700"}`}>
          {formatCurrency(section.net_flow)}
        </td>
      </tr>
    </>
  );

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting/reports" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Báo cáo Lưu chuyển tiền tệ</h1>
            <p className="text-gray-600 mt-1">
              Cash Flow Statement - {viewMode === "monthly" ? `Tháng ${selectedMonth}` : viewMode === "quarterly" ? `Quý ${Math.ceil(selectedMonth / 3)}` : "Năm"}/{selectedYear}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Printer className="w-4 h-4" />
            In
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${report.operating_activities.net_flow >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                {report.operating_activities.net_flow >= 0
                  ? <ArrowDownLeft className="w-5 h-5 text-green-600" />
                  : <ArrowUpRight className="w-5 h-5 text-red-600" />
                }
              </div>
              <div>
                <p className="text-sm text-gray-500">Hoạt động KD</p>
                <p className={`text-lg font-semibold ${report.operating_activities.net_flow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(report.operating_activities.net_flow)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${report.investing_activities.net_flow >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                {report.investing_activities.net_flow >= 0
                  ? <ArrowDownLeft className="w-5 h-5 text-green-600" />
                  : <ArrowUpRight className="w-5 h-5 text-red-600" />
                }
              </div>
              <div>
                <p className="text-sm text-gray-500">Hoạt động đầu tư</p>
                <p className={`text-lg font-semibold ${report.investing_activities.net_flow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(report.investing_activities.net_flow)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${report.financing_activities.net_flow >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                {report.financing_activities.net_flow >= 0
                  ? <ArrowDownLeft className="w-5 h-5 text-green-600" />
                  : <ArrowUpRight className="w-5 h-5 text-red-600" />
                }
              </div>
              <div>
                <p className="text-sm text-gray-500">Hoạt động tài chính</p>
                <p className={`text-lg font-semibold ${report.financing_activities.net_flow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(report.financing_activities.net_flow)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tiền cuối kỳ</p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatCurrency(report.ending_cash)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Kỳ:</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="monthly">Tháng</option>
              <option value="quarterly">Quý</option>
              <option value="yearly">Năm</option>
            </select>
            {viewMode === "monthly" && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {months.map((m) => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            )}
            {viewMode === "quarterly" && (
              <select
                value={Math.ceil(selectedMonth / 3)}
                onChange={(e) => setSelectedMonth(Number(e.target.value) * 3)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>Quý {q}</option>
                ))}
              </select>
            )}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khoản mục</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : !report ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                <>
                  {/* I. Hoạt động kinh doanh */}
                  <tr className="bg-blue-100">
                    <td colSpan={2} className="px-4 py-3 font-bold text-blue-800 text-lg">
                      I. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG KINH DOANH
                    </td>
                  </tr>
                  {report.operating_activities.items.map((item, idx) => (
                    <tr key={`op-${idx}`} className={`${item.is_total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}`}>
                      <td className="px-4 py-2 text-sm" style={{ paddingLeft: `${item.level * 16 + 16}px` }}>
                        {item.description}
                      </td>
                      <td className={`px-4 py-2 text-sm text-right font-medium ${
                        item.amount >= 0 ? "" : "text-red-600"
                      }`}>
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-blue-200 font-bold">
                    <td className="px-4 py-3">Lưu chuyển tiền thuần từ hoạt động kinh doanh</td>
                    <td className={`px-4 py-3 text-right ${report.operating_activities.net_flow >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {formatCurrency(report.operating_activities.net_flow)}
                    </td>
                  </tr>

                  {/* II. Hoạt động đầu tư */}
                  <tr className="bg-orange-100">
                    <td colSpan={2} className="px-4 py-3 font-bold text-orange-800 text-lg">
                      II. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG ĐẦU TƯ
                    </td>
                  </tr>
                  {report.investing_activities.items.map((item, idx) => (
                    <tr key={`inv-${idx}`} className={`${item.is_total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}`}>
                      <td className="px-4 py-2 text-sm" style={{ paddingLeft: `${item.level * 16 + 16}px` }}>
                        {item.description}
                      </td>
                      <td className={`px-4 py-2 text-sm text-right font-medium ${
                        item.amount >= 0 ? "" : "text-red-600"
                      }`}>
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-orange-200 font-bold">
                    <td className="px-4 py-3">Lưu chuyển tiền thuần từ hoạt động đầu tư</td>
                    <td className={`px-4 py-3 text-right ${report.investing_activities.net_flow >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {formatCurrency(report.investing_activities.net_flow)}
                    </td>
                  </tr>

                  {/* III. Hoạt động tài chính */}
                  <tr className="bg-purple-100">
                    <td colSpan={2} className="px-4 py-3 font-bold text-purple-800 text-lg">
                      III. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG TÀI CHÍNH
                    </td>
                  </tr>
                  {report.financing_activities.items.map((item, idx) => (
                    <tr key={`fin-${idx}`} className={`${item.is_total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}`}>
                      <td className="px-4 py-2 text-sm" style={{ paddingLeft: `${item.level * 16 + 16}px` }}>
                        {item.description}
                      </td>
                      <td className={`px-4 py-2 text-sm text-right font-medium ${
                        item.amount >= 0 ? "" : "text-red-600"
                      }`}>
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-purple-200 font-bold">
                    <td className="px-4 py-3">Lưu chuyển tiền thuần từ hoạt động tài chính</td>
                    <td className={`px-4 py-3 text-right ${report.financing_activities.net_flow >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {formatCurrency(report.financing_activities.net_flow)}
                    </td>
                  </tr>

                  {/* Tổng hợp */}
                  <tr className="bg-gray-200 font-bold">
                    <td className="px-4 py-3">Lưu chuyển tiền thuần trong kỳ (I + II + III)</td>
                    <td className={`px-4 py-3 text-right ${report.net_change_in_cash >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {formatCurrency(report.net_change_in_cash)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">Tiền và tương đương tiền đầu kỳ</td>
                    <td className="px-4 py-2 text-sm text-right font-medium">
                      {formatCurrency(report.beginning_cash)}
                    </td>
                  </tr>
                  <tr className="bg-green-100 font-bold text-lg">
                    <td className="px-4 py-4">Tiền và tương đương tiền cuối kỳ</td>
                    <td className="px-4 py-4 text-right text-green-700">
                      {formatCurrency(report.ending_cash)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Flow Verification */}
      {report && (
        <div className={`p-4 rounded-lg ${
          report.beginning_cash + report.net_change_in_cash === report.ending_cash
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
        }`}>
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-5 h-5 ${
              report.beginning_cash + report.net_change_in_cash === report.ending_cash
                ? "text-green-600"
                : "text-red-600"
            }`} />
            <span className={`font-medium ${
              report.beginning_cash + report.net_change_in_cash === report.ending_cash
                ? "text-green-700"
                : "text-red-700"
            }`}>
              {report.beginning_cash + report.net_change_in_cash === report.ending_cash
                ? "Khớp: Tiền đầu kỳ + Thay đổi = Tiền cuối kỳ"
                : `Không khớp: Chênh lệch ${formatCurrency(Math.abs(report.beginning_cash + report.net_change_in_cash - report.ending_cash))} VND`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
