"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpDown,
  Plus,
  ChevronLeft,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Filter,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface BankTransaction {
  id: string;
  transaction_number: string;
  transaction_date: string;
  transaction_type: string;
  bank_account_name: string;
  counterparty_name: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  currency: string;
  reference_type: string;
  reference_number: string;
  is_reconciled: boolean;
}

interface PaginatedResponse {
  items: BankTransaction[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export default function BankTransactionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchTransactions();
  }, [router, pagination.page, search, typeFilter, dateFrom, dateTo]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        size: pagination.size.toString(),
      });
      if (search) params.append("search", search);
      if (typeFilter) params.append("transaction_type", typeFilter);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const res = await apiFetch<PaginatedResponse>(
        `/accounting/bank-transactions?${params.toString()}`
      );
      setTransactions(res.items);
      setPagination({ ...pagination, total: res.total, pages: res.pages });
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "DEPOSIT":
      case "RECEIPT":
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case "WITHDRAWAL":
      case "PAYMENT":
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case "TRANSFER":
        return <ArrowLeftRight className="w-4 h-4 text-blue-600" />;
      default:
        return <ArrowUpDown className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      DEPOSIT: "Nộp tiền",
      WITHDRAWAL: "Rút tiền",
      TRANSFER: "Chuyển khoản",
      RECEIPT: "Thu từ KH",
      PAYMENT: "Chi cho NCC",
      INTEREST: "Lãi tiền gửi",
      FEE: "Phí ngân hàng",
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting/banking" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Giao dịch Ngân hàng</h1>
            <p className="text-gray-600 mt-1">Lịch sử giao dịch tất cả tài khoản ngân hàng</p>
          </div>
        </div>
        <Link
          href="/accounting/banking/transactions/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tạo giao dịch
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm theo số giao dịch, mô tả..."
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
            <option value="DEPOSIT">Nộp tiền</option>
            <option value="WITHDRAWAL">Rút tiền</option>
            <option value="TRANSFER">Chuyển khoản</option>
            <option value="RECEIPT">Thu từ KH</option>
            <option value="PAYMENT">Chi cho NCC</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số GD</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tài khoản</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đối tác</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thu</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Chi</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số dư</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">ĐC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-blue-600">{tx.transaction_number}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(tx.transaction_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(tx.transaction_type)}
                      <span className="text-sm">{getTransactionLabel(tx.transaction_type)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{tx.bank_account_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tx.counterparty_name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">{tx.description}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                    {tx.credit_amount > 0 ? formatCurrency(tx.credit_amount, tx.currency) : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                    {tx.debit_amount > 0 ? formatCurrency(tx.debit_amount, tx.currency) : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {formatCurrency(tx.running_balance, tx.currency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tx.is_reconciled ? (
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full" title="Đã đối chiếu" />
                    ) : (
                      <span className="inline-block w-3 h-3 bg-gray-300 rounded-full" title="Chưa đối chiếu" />
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
