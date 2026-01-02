"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Scale,
  ChevronLeft,
  Download,
  Printer,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import React from "react";

interface BalanceSheetItem {
  account_code: string;
  account_name: string;
  current_balance: number;
  previous_balance: number;
  level: number;
  is_total: boolean;
  has_children: boolean;
  children?: BalanceSheetItem[];
}

interface BalanceSheetSection {
  title: string;
  items: BalanceSheetItem[];
  total: BalanceSheetItem;
}

interface BalanceSheetReport {
  assets: {
    current_assets: BalanceSheetSection;
    non_current_assets: BalanceSheetSection;
    total_assets: BalanceSheetItem;
  };
  liabilities: {
    current_liabilities: BalanceSheetSection;
    non_current_liabilities: BalanceSheetSection;
    total_liabilities: BalanceSheetItem;
  };
  equity: BalanceSheetSection;
  total_liabilities_equity: BalanceSheetItem;
  as_of_date: string;
  currency: string;
}

export default function BalanceSheetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchReport();
  }, [router, asOfDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ as_of_date: asOfDate });
      const res = await apiFetch<BalanceSheetReport>(
        `/accounting/reports/balance-sheet?${params.toString()}`
      );
      setReport(res);
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    const formatted = new Intl.NumberFormat("vi-VN").format(absValue);
    if (value < 0) return `(${formatted})`;
    if (value === 0) return "-";
    return formatted;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const renderItem = (item: BalanceSheetItem, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedItems.has(item.account_code);

    return (
      <React.Fragment key={item.account_code}>
        <tr className={`${item.is_total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}`}>
          <td className="px-4 py-2 text-sm" style={{ paddingLeft: `${depth * 16 + 16}px` }}>
            <div className="flex items-center">
              {item.has_children ? (
                <button
                  onClick={() => toggleExpand(item.account_code)}
                  className="p-1 hover:bg-gray-200 rounded mr-1"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              ) : (
                <span className="w-6" />
              )}
              {item.account_code && (
                <span className="font-mono text-gray-500 mr-2">{item.account_code}</span>
              )}
              {item.account_name}
            </div>
          </td>
          <td className="px-4 py-2 text-sm text-right font-medium">
            {formatCurrency(item.current_balance)}
          </td>
          <td className="px-4 py-2 text-sm text-right text-gray-500">
            {formatCurrency(item.previous_balance)}
          </td>
        </tr>
        {isExpanded && item.children?.map(child => renderItem(child, depth + 1))}
      </React.Fragment>
    );
  };

  const renderSection = (section: BalanceSheetSection, showTotal: boolean = true) => (
    <>
      <tr className="bg-blue-50">
        <td colSpan={3} className="px-4 py-2 font-semibold text-blue-800">{section.title}</td>
      </tr>
      {section.items.map(item => renderItem(item))}
      {showTotal && (
        <tr className="bg-gray-100 font-semibold border-t border-gray-300">
          <td className="px-4 py-2 text-sm pl-8">{section.total.account_name}</td>
          <td className="px-4 py-2 text-sm text-right">{formatCurrency(section.total.current_balance)}</td>
          <td className="px-4 py-2 text-sm text-right text-gray-500">{formatCurrency(section.total.previous_balance)}</td>
        </tr>
      )}
    </>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting/reports" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bảng cân đối kế toán</h1>
            <p className="text-gray-600 mt-1">Balance Sheet - Tại ngày {formatDate(asOfDate)}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Tổng Tài sản</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(report.assets.total_assets.current_balance)}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Kỳ trước: {formatCurrency(report.assets.total_assets.previous_balance)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Tổng Nợ phải trả</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(report.liabilities.total_liabilities.current_balance)}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Kỳ trước: {formatCurrency(report.liabilities.total_liabilities.previous_balance)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Vốn chủ sở hữu</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(report.equity.total.current_balance)}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Kỳ trước: {formatCurrency(report.equity.total.previous_balance)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Tại ngày:</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAsOfDate(new Date().toISOString().split("T")[0])}
              className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Hôm nay
            </button>
            <button
              onClick={() => {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                lastMonth.setDate(0);
                setAsOfDate(lastMonth.toISOString().split("T")[0]);
              }}
              className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cuối tháng trước
            </button>
            <button
              onClick={() => {
                const lastYear = new Date();
                lastYear.setFullYear(lastYear.getFullYear() - 1);
                lastYear.setMonth(11);
                lastYear.setDate(31);
                setAsOfDate(lastYear.toISOString().split("T")[0]);
              }}
              className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              31/12 năm trước
            </button>
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số cuối kỳ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số đầu năm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : !report ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                <>
                  {/* TÀI SẢN */}
                  <tr className="bg-indigo-100">
                    <td colSpan={3} className="px-4 py-3 font-bold text-indigo-800 text-lg">
                      A. TÀI SẢN
                    </td>
                  </tr>
                  {renderSection(report.assets.current_assets)}
                  {renderSection(report.assets.non_current_assets)}
                  <tr className="bg-indigo-200 font-bold">
                    <td className="px-4 py-3">TỔNG TÀI SẢN</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(report.assets.total_assets.current_balance)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(report.assets.total_assets.previous_balance)}</td>
                  </tr>

                  {/* NỢ PHẢI TRẢ */}
                  <tr className="bg-red-100">
                    <td colSpan={3} className="px-4 py-3 font-bold text-red-800 text-lg">
                      B. NỢ PHẢI TRẢ
                    </td>
                  </tr>
                  {renderSection(report.liabilities.current_liabilities)}
                  {renderSection(report.liabilities.non_current_liabilities)}
                  <tr className="bg-red-200 font-bold">
                    <td className="px-4 py-3">TỔNG NỢ PHẢI TRẢ</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(report.liabilities.total_liabilities.current_balance)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(report.liabilities.total_liabilities.previous_balance)}</td>
                  </tr>

                  {/* VỐN CHỦ SỞ HỮU */}
                  <tr className="bg-green-100">
                    <td colSpan={3} className="px-4 py-3 font-bold text-green-800 text-lg">
                      C. VỐN CHỦ SỞ HỮU
                    </td>
                  </tr>
                  {renderSection(report.equity, true)}

                  {/* TỔNG CỘNG NGUỒN VỐN */}
                  <tr className="bg-purple-200 font-bold text-lg">
                    <td className="px-4 py-4">TỔNG NGUỒN VỐN (B + C)</td>
                    <td className="px-4 py-4 text-right">{formatCurrency(report.total_liabilities_equity.current_balance)}</td>
                    <td className="px-4 py-4 text-right">{formatCurrency(report.total_liabilities_equity.previous_balance)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Check */}
      {report && (
        <div className={`p-4 rounded-lg ${
          report.assets.total_assets.current_balance === report.total_liabilities_equity.current_balance
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
        }`}>
          <div className="flex items-center gap-2">
            <Scale className={`w-5 h-5 ${
              report.assets.total_assets.current_balance === report.total_liabilities_equity.current_balance
                ? "text-green-600"
                : "text-red-600"
            }`} />
            <span className={`font-medium ${
              report.assets.total_assets.current_balance === report.total_liabilities_equity.current_balance
                ? "text-green-700"
                : "text-red-700"
            }`}>
              {report.assets.total_assets.current_balance === report.total_liabilities_equity.current_balance
                ? "Cân đối: Tổng Tài sản = Tổng Nguồn vốn"
                : `Không cân đối: Chênh lệch ${formatCurrency(Math.abs(report.assets.total_assets.current_balance - report.total_liabilities_equity.current_balance))} VND`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
