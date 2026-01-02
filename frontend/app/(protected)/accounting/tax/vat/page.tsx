"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Receipt,
  Plus,
  ChevronLeft,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface VATTransaction {
  id: string;
  transaction_date: string;
  invoice_number: string;
  invoice_date: string;
  counterparty_name: string;
  counterparty_tax_code: string;
  description: string;
  tax_type: string;
  taxable_amount: number;
  vat_amount: number;
  vat_rate: number;
  currency: string;
  is_included_in_declaration: boolean;
  declaration_period: string;
}

interface PaginatedResponse {
  items: VATTransaction[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface VATSummary {
  input_vat: number;
  output_vat: number;
  net_vat: number;
}

export default function VATTransactionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<VATTransaction[]>([]);
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<VATSummary>({ input_vat: 0, output_vat: 0, net_vat: 0 });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchTransactions();
  }, [router, pagination.page, search, typeFilter, selectedMonth, selectedYear]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        size: pagination.size.toString(),
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });
      if (search) params.append("search", search);
      if (typeFilter) params.append("tax_type", typeFilter);

      const res = await apiFetch<PaginatedResponse & { summary: VATSummary }>(
        `/accounting/vat-transactions?${params.toString()}`
      );
      setTransactions(res.items);
      setPagination({ ...pagination, total: res.total, pages: res.pages });
      if (res.summary) setSummary(res.summary);
    } catch (error) {
      console.error("Failed to fetch VAT transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = "VND") => {
    return new Intl.NumberFormat("vi-VN").format(value) + " " + currency;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting/tax" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Giao dịch VAT</h1>
            <p className="text-gray-600 mt-1">Thuế GTGT đầu vào và đầu ra</p>
          </div>
        </div>
        <Link
          href="/accounting/tax/vat/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm giao dịch
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowDownLeft className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">VAT đầu vào</p>
              <p className="text-xl font-semibold text-green-600">
                {formatCurrency(summary.input_vat)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">VAT đầu ra</p>
              <p className="text-xl font-semibold text-blue-600">
                {formatCurrency(summary.output_vat)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${summary.net_vat >= 0 ? "bg-red-100" : "bg-green-100"}`}>
              <Receipt className={`w-5 h-5 ${summary.net_vat >= 0 ? "text-red-600" : "text-green-600"}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {summary.net_vat >= 0 ? "VAT phải nộp" : "VAT được hoàn"}
              </p>
              <p className={`text-xl font-semibold ${summary.net_vat >= 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(Math.abs(summary.net_vat))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm theo số hóa đơn, đối tác..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả loại</option>
            <option value="INPUT">VAT đầu vào</option>
            <option value="OUTPUT">VAT đầu ra</option>
          </select>
          <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số HĐ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày HĐ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đối tác</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MST</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá trị</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">TS%</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">VAT</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Kỳ KK</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                      tx.tax_type === "INPUT"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {tx.tax_type === "INPUT" ? (
                        <><ArrowDownLeft className="w-3 h-3" /> Đầu vào</>
                      ) : (
                        <><ArrowUpRight className="w-3 h-3" /> Đầu ra</>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-blue-600">{tx.invoice_number}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(tx.invoice_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{tx.counterparty_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tx.counterparty_tax_code}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {formatCurrency(tx.taxable_amount, tx.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">{tx.vat_rate}%</td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${
                    tx.tax_type === "INPUT" ? "text-green-600" : "text-blue-600"
                  }`}>
                    {formatCurrency(tx.vat_amount, tx.currency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tx.is_included_in_declaration ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                        {tx.declaration_period}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        Chưa KK
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Hiển thị {transactions.length} / {pagination.total} giao dịch
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-gray-600">
              Trang {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
