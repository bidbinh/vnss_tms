"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface BankAccount {
  id: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  branch_name: string | null;
  account_type: string;
  currency: string;
  current_balance: number;
  status: string;
  last_transaction_date: string | null;
}

interface BankTransaction {
  id: string;
  bank_account_id: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  description: string;
  reference: string | null;
  status: string;
  running_balance: number;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: "Thanh toán",
  SAVINGS: "Tiết kiệm",
  CASH: "Tiền mặt",
  CREDIT: "Tín dụng",
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Nạp tiền",
  WITHDRAWAL: "Rút tiền",
  TRANSFER_IN: "Nhận chuyển khoản",
  TRANSFER_OUT: "Chuyển khoản",
  FEE: "Phí",
  INTEREST: "Lãi suất",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-700",
  FROZEN: "bg-blue-100 text-blue-700",
  CLOSED: "bg-red-100 text-red-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-green-100 text-green-700",
};

export default function BankingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // Transaction filters
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchAccounts();
  }, [router]);

  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions();
    }
  }, [selectedAccount, page]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: BankAccount[] }>("/accounting/bank-accounts");
      setAccounts(res.items);
      if (res.items.length > 0 && !selectedAccount) {
        setSelectedAccount(res.items[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch bank accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!selectedAccount) return;

    try {
      const params = new URLSearchParams();
      params.set("bank_account_id", selectedAccount);
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());

      const res = await apiFetch<{
        items: BankTransaction[];
        total: number;
        total_pages: number;
      }>(`/accounting/bank-transactions?${params.toString()}`);

      setTransactions(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    }
  };

  const formatCurrency = (value: number, currency: string = "VND") => {
    return new Intl.NumberFormat("vi-VN").format(value) + (currency === "VND" ? " đ" : ` ${currency}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const selectedAccountData = accounts.find((a) => a.id === selectedAccount);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ngân hàng & Tiền mặt</h1>
            <p className="text-gray-600 mt-1">Quản lý tài khoản ngân hàng và giao dịch</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/accounting/banking/reconciliation"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Đối chiếu
          </Link>
          <Link
            href="/accounting/banking/accounts/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Thêm tài khoản
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Bank Accounts List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-semibold text-gray-900">Tài khoản</h2>
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                Chưa có tài khoản nào
              </div>
            ) : (
              accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    setSelectedAccount(account.id);
                    setPage(1);
                  }}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedAccount === account.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {account.bank_name}
                      </span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                        STATUS_COLORS[account.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {account.status === "ACTIVE" ? "HĐ" : account.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {account.account_number}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-gray-900">
                    {formatCurrency(account.current_balance, account.currency)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Account Details & Transactions */}
        <div className="lg:col-span-3 space-y-6">
          {selectedAccountData ? (
            <>
              {/* Account Summary */}
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedAccountData.bank_name}
                      </h3>
                    </div>
                    <p className="text-gray-500 mt-1">
                      {selectedAccountData.account_number}
                      {selectedAccountData.branch_name && ` - ${selectedAccountData.branch_name}`}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedAccountData.account_name} ({ACCOUNT_TYPE_LABELS[selectedAccountData.account_type] || selectedAccountData.account_type})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Số dư hiện tại</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(selectedAccountData.current_balance, selectedAccountData.currency)}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3">
                  <Link
                    href={`/accounting/banking/transactions/new?account=${selectedAccountData.id}&type=DEPOSIT`}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <ArrowDownRight className="w-4 h-4 text-green-500" />
                    Thu tiền
                  </Link>
                  <Link
                    href={`/accounting/banking/transactions/new?account=${selectedAccountData.id}&type=WITHDRAWAL`}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <ArrowUpRight className="w-4 h-4 text-red-500" />
                    Chi tiền
                  </Link>
                  <Link
                    href={`/accounting/banking/transfers/new?from=${selectedAccountData.id}`}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    Chuyển khoản
                  </Link>
                  <Link
                    href={`/accounting/banking/accounts/${selectedAccountData.id}/edit`}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm ml-auto"
                  >
                    <Edit className="w-4 h-4" />
                    Chỉnh sửa
                  </Link>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Giao dịch gần đây</h3>
                  <Link
                    href={`/accounting/banking/transactions?account=${selectedAccountData.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Xem tất cả
                  </Link>
                </div>
                <div className="divide-y divide-gray-200">
                  {transactions.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      Chưa có giao dịch nào
                    </div>
                  ) : (
                    transactions.map((txn) => (
                      <div key={txn.id} className="px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                ["DEPOSIT", "TRANSFER_IN", "INTEREST"].includes(txn.transaction_type)
                                  ? "bg-green-100"
                                  : "bg-red-100"
                              }`}
                            >
                              {["DEPOSIT", "TRANSFER_IN", "INTEREST"].includes(txn.transaction_type) ? (
                                <ArrowDownRight className="w-4 h-4 text-green-600" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {txn.description}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(txn.transaction_date)} -{" "}
                                {TRANSACTION_TYPE_LABELS[txn.transaction_type] || txn.transaction_type}
                              </p>
                              {txn.reference && (
                                <p className="text-xs text-gray-400">Ref: {txn.reference}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-semibold ${
                                ["DEPOSIT", "TRANSFER_IN", "INTEREST"].includes(txn.transaction_type)
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {["DEPOSIT", "TRANSFER_IN", "INTEREST"].includes(txn.transaction_type)
                                ? "+"
                                : "-"}
                              {formatCurrency(txn.amount)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Số dư: {formatCurrency(txn.running_balance)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {total} giao dịch
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-600">
                        {page} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Chưa có tài khoản ngân hàng
              </h3>
              <p className="mt-2 text-gray-500">
                Thêm tài khoản ngân hàng để bắt đầu quản lý giao dịch
              </p>
              <Link
                href="/accounting/banking/accounts/new"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Thêm tài khoản
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
