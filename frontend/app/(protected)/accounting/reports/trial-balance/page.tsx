"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Scale,
  ChevronLeft,
  Download,
  Printer,
  Filter,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface TrialBalanceAccount {
  account_code: string;
  account_name: string;
  classification: string;
  level: number;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
  has_children: boolean;
  children?: TrialBalanceAccount[];
}

interface TrialBalanceTotals {
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
}

interface TrialBalanceReport {
  accounts: TrialBalanceAccount[];
  totals: TrialBalanceTotals;
  period_from: string;
  period_to: string;
  generated_at: string;
}

export default function TrialBalancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [showZeroBalances, setShowZeroBalances] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchReport();
  }, [router, selectedMonth, selectedYear, showZeroBalances]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
        show_zero: showZeroBalances.toString(),
      });

      const res = await apiFetch<TrialBalanceReport>(
        `/accounting/reports/trial-balance?${params.toString()}`
      );
      setReport(res);
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (accountCode: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountCode)) {
      newExpanded.delete(accountCode);
    } else {
      newExpanded.add(accountCode);
    }
    setExpandedAccounts(newExpanded);
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return "-";
    return new Intl.NumberFormat("vi-VN").format(value);
  };

  const renderAccount = (account: TrialBalanceAccount, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedAccounts.has(account.account_code);
    const hasNonZeroBalance = account.opening_debit !== 0 || account.opening_credit !== 0 ||
      account.period_debit !== 0 || account.period_credit !== 0 ||
      account.closing_debit !== 0 || account.closing_credit !== 0;

    if (!showZeroBalances && !hasNonZeroBalance && !account.has_children) {
      return null;
    }

    return (
      <React.Fragment key={account.account_code}>
        <tr className={`hover:bg-gray-50 ${account.level === 1 ? "bg-gray-100 font-semibold" : ""}`}>
          <td className="px-4 py-2">
            <div className="flex items-center" style={{ paddingLeft: `${depth * 16}px` }}>
              {account.has_children ? (
                <button
                  onClick={() => toggleExpand(account.account_code)}
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
              <span className="font-mono text-sm">{account.account_code}</span>
            </div>
          </td>
          <td className="px-4 py-2 text-sm">{account.account_name}</td>
          <td className="px-4 py-2 text-sm text-right">{formatCurrency(account.opening_debit)}</td>
          <td className="px-4 py-2 text-sm text-right">{formatCurrency(account.opening_credit)}</td>
          <td className="px-4 py-2 text-sm text-right">{formatCurrency(account.period_debit)}</td>
          <td className="px-4 py-2 text-sm text-right">{formatCurrency(account.period_credit)}</td>
          <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(account.closing_debit)}</td>
          <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(account.closing_credit)}</td>
        </tr>
        {isExpanded && account.children?.map(child => renderAccount(child, depth + 1))}
      </React.Fragment>
    );
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Bảng cân đối phát sinh</h1>
            <p className="text-gray-600 mt-1">Trial Balance - Tháng {selectedMonth}/{selectedYear}</p>
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Kỳ:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {months.map((m) => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showZeroBalances}
              onChange={(e) => setShowZeroBalances(e.target.checked)}
              className="rounded border-gray-300"
            />
            Hiển thị tài khoản số dư = 0
          </label>
          <button
            onClick={() => setExpandedAccounts(new Set())}
            className="text-sm text-blue-600 hover:underline"
          >
            Thu gọn tất cả
          </button>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th rowSpan={2} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r">
                  Mã TK
                </th>
                <th rowSpan={2} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r">
                  Tên tài khoản
                </th>
                <th colSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-b">
                  Số dư đầu kỳ
                </th>
                <th colSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-b">
                  Phát sinh trong kỳ
                </th>
                <th colSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  Số dư cuối kỳ
                </th>
              </tr>
              <tr>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-r">Nợ</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-r">Có</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-r">Nợ</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-r">Có</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-r">Nợ</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Có</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : !report || report.accounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                report.accounts.map(account => renderAccount(account))
              )}
            </tbody>
            {report && (
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr className="font-bold">
                  <td colSpan={2} className="px-4 py-3 text-right">TỔNG CỘNG</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(report.totals.opening_debit)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(report.totals.opening_credit)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(report.totals.period_debit)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(report.totals.period_credit)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(report.totals.closing_debit)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(report.totals.closing_credit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Balance Check */}
      {report && (
        <div className={`p-4 rounded-lg ${
          report.totals.closing_debit === report.totals.closing_credit
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
        }`}>
          <div className="flex items-center gap-2">
            <Scale className={`w-5 h-5 ${
              report.totals.closing_debit === report.totals.closing_credit
                ? "text-green-600"
                : "text-red-600"
            }`} />
            <span className={`font-medium ${
              report.totals.closing_debit === report.totals.closing_credit
                ? "text-green-700"
                : "text-red-700"
            }`}>
              {report.totals.closing_debit === report.totals.closing_credit
                ? "Cân đối: Tổng Nợ = Tổng Có"
                : `Không cân đối: Chênh lệch ${formatCurrency(Math.abs(report.totals.closing_debit - report.totals.closing_credit))} VND`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

import React from "react";
