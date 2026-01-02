"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  ChevronLeft,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface PnLLineItem {
  account_code: string;
  account_name: string;
  current_period: number;
  previous_period: number;
  ytd_current: number;
  ytd_previous: number;
  level: number;
  is_total: boolean;
}

interface PnLSection {
  title: string;
  items: PnLLineItem[];
  total: PnLLineItem;
}

interface PnLReport {
  revenue: PnLSection;
  cost_of_sales: PnLSection;
  gross_profit: PnLLineItem;
  operating_expenses: PnLSection;
  operating_profit: PnLLineItem;
  other_income: PnLSection;
  other_expenses: PnLSection;
  profit_before_tax: PnLLineItem;
  income_tax: PnLLineItem;
  net_profit: PnLLineItem;
  period_from: string;
  period_to: string;
  currency: string;
}

export default function PnLReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<PnLReport | null>(null);
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

      const res = await apiFetch<PnLReport>(
        `/accounting/reports/pnl?${params.toString()}`
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
    return formatted;
  };

  const formatPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : current < 0 ? "-100%" : "0%";
    const change = ((current - previous) / Math.abs(previous)) * 100;
    const formatted = change.toFixed(1);
    return change >= 0 ? `+${formatted}%` : `${formatted}%`;
  };

  const renderLineItem = (item: PnLLineItem, showCode: boolean = true) => (
    <tr key={item.account_code} className={`${item.is_total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}`}>
      <td className="px-4 py-2 text-sm" style={{ paddingLeft: `${(item.level - 1) * 16 + 16}px` }}>
        {showCode && item.account_code && (
          <span className="font-mono text-gray-500 mr-2">{item.account_code}</span>
        )}
        {item.account_name}
      </td>
      <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.current_period)}</td>
      <td className="px-4 py-2 text-sm text-right text-gray-500">{formatCurrency(item.previous_period)}</td>
      <td className="px-4 py-2 text-sm text-right">
        <span className={item.current_period >= item.previous_period ? "text-green-600" : "text-red-600"}>
          {formatPercentChange(item.current_period, item.previous_period)}
        </span>
      </td>
      <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(item.ytd_current)}</td>
      <td className="px-4 py-2 text-sm text-right text-gray-500">{formatCurrency(item.ytd_previous)}</td>
    </tr>
  );

  const renderSection = (section: PnLSection) => (
    <>
      <tr className="bg-blue-50">
        <td colSpan={6} className="px-4 py-2 font-semibold text-blue-800">{section.title}</td>
      </tr>
      {section.items.map(item => renderLineItem(item))}
      {renderLineItem(section.total, false)}
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
            <h1 className="text-2xl font-bold text-gray-900">Báo cáo Lãi lỗ</h1>
            <p className="text-gray-600 mt-1">
              Profit & Loss Statement - {viewMode === "monthly" ? `Tháng ${selectedMonth}` : viewMode === "quarterly" ? `Quý ${Math.ceil(selectedMonth / 3)}` : "Năm"}/{selectedYear}
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Doanh thu</p>
                <p className="text-xl font-semibold text-blue-600">
                  {formatCurrency(report.revenue.total.current_period)}
                </p>
              </div>
              <div className={`flex items-center gap-1 ${
                report.revenue.total.current_period >= report.revenue.total.previous_period
                  ? "text-green-600" : "text-red-600"
              }`}>
                {report.revenue.total.current_period >= report.revenue.total.previous_period
                  ? <TrendingUp className="w-4 h-4" />
                  : <TrendingDown className="w-4 h-4" />
                }
                <span className="text-sm font-medium">
                  {formatPercentChange(report.revenue.total.current_period, report.revenue.total.previous_period)}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Lợi nhuận gộp</p>
                <p className="text-xl font-semibold text-green-600">
                  {formatCurrency(report.gross_profit.current_period)}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {report.revenue.total.current_period > 0
                  ? `${((report.gross_profit.current_period / report.revenue.total.current_period) * 100).toFixed(1)}%`
                  : "0%"
                }
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Lợi nhuận hoạt động</p>
                <p className={`text-xl font-semibold ${report.operating_profit.current_period >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(report.operating_profit.current_period)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Lợi nhuận sau thuế</p>
                <p className={`text-xl font-semibold ${report.net_profit.current_period >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(report.net_profit.current_period)}
                </p>
              </div>
              <div className={`flex items-center gap-1 ${
                report.net_profit.current_period >= report.net_profit.previous_period
                  ? "text-green-600" : "text-red-600"
              }`}>
                {report.net_profit.current_period >= report.net_profit.previous_period
                  ? <TrendingUp className="w-4 h-4" />
                  : <TrendingDown className="w-4 h-4" />
                }
                <span className="text-sm font-medium">
                  {formatPercentChange(report.net_profit.current_period, report.net_profit.previous_period)}
                </span>
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kỳ này</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kỳ trước</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Thay đổi</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lũy kế năm</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lũy kế năm trước</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : !report ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                <>
                  {renderSection(report.revenue)}
                  {renderSection(report.cost_of_sales)}
                  <tr className="bg-green-50 font-bold">
                    <td className="px-4 py-3">LỢI NHUẬN GỘP</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(report.gross_profit.current_period)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(report.gross_profit.previous_period)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={report.gross_profit.current_period >= report.gross_profit.previous_period ? "text-green-600" : "text-red-600"}>
                        {formatPercentChange(report.gross_profit.current_period, report.gross_profit.previous_period)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(report.gross_profit.ytd_current)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(report.gross_profit.ytd_previous)}</td>
                  </tr>
                  {renderSection(report.operating_expenses)}
                  <tr className="bg-yellow-50 font-bold">
                    <td className="px-4 py-3">LỢI NHUẬN TỪ HOẠT ĐỘNG KINH DOANH</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(report.operating_profit.current_period)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(report.operating_profit.previous_period)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={report.operating_profit.current_period >= report.operating_profit.previous_period ? "text-green-600" : "text-red-600"}>
                        {formatPercentChange(report.operating_profit.current_period, report.operating_profit.previous_period)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(report.operating_profit.ytd_current)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(report.operating_profit.ytd_previous)}</td>
                  </tr>
                  {renderSection(report.other_income)}
                  {renderSection(report.other_expenses)}
                  <tr className="bg-orange-50 font-bold">
                    <td className="px-4 py-3">LỢI NHUẬN TRƯỚC THUẾ</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(report.profit_before_tax.current_period)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(report.profit_before_tax.previous_period)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={report.profit_before_tax.current_period >= report.profit_before_tax.previous_period ? "text-green-600" : "text-red-600"}>
                        {formatPercentChange(report.profit_before_tax.current_period, report.profit_before_tax.previous_period)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(report.profit_before_tax.ytd_current)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(report.profit_before_tax.ytd_previous)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm pl-8">Thuế TNDN</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(report.income_tax.current_period)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-500">{formatCurrency(report.income_tax.previous_period)}</td>
                    <td className="px-4 py-2 text-sm text-right">-</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(report.income_tax.ytd_current)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-500">{formatCurrency(report.income_tax.ytd_previous)}</td>
                  </tr>
                  <tr className="bg-blue-100 font-bold text-lg">
                    <td className="px-4 py-4">LỢI NHUẬN SAU THUẾ</td>
                    <td className={`px-4 py-4 text-right ${report.net_profit.current_period >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {formatCurrency(report.net_profit.current_period)}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-500">{formatCurrency(report.net_profit.previous_period)}</td>
                    <td className="px-4 py-4 text-right">
                      <span className={report.net_profit.current_period >= report.net_profit.previous_period ? "text-green-600" : "text-red-600"}>
                        {formatPercentChange(report.net_profit.current_period, report.net_profit.previous_period)}
                      </span>
                    </td>
                    <td className={`px-4 py-4 text-right ${report.net_profit.ytd_current >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {formatCurrency(report.net_profit.ytd_current)}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-500">{formatCurrency(report.net_profit.ytd_previous)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
