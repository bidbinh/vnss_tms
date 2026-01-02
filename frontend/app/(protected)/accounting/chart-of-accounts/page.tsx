"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calculator,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  FolderOpen,
  FileText,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_name_en: string | null;
  parent_id: string | null;
  level: number;
  is_parent: boolean;
  classification: string;
  nature: string;
  category: string | null;
  is_active: boolean;
  is_system: boolean;
  allow_posting: boolean;
  currency: string;
  current_debit: number;
  current_credit: number;
}

interface FiscalYear {
  id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_closed: boolean;
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  ASSET: "Tài sản",
  LIABILITY: "Nợ phải trả",
  EQUITY: "Vốn chủ sở hữu",
  REVENUE: "Doanh thu",
  EXPENSE: "Chi phí",
  CONTRA: "Điều chỉnh",
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-700",
  LIABILITY: "bg-red-100 text-red-700",
  EQUITY: "bg-purple-100 text-purple-700",
  REVENUE: "bg-green-100 text-green-700",
  EXPENSE: "bg-orange-100 text-orange-700",
  CONTRA: "bg-gray-100 text-gray-700",
};

const NATURE_LABELS: Record<string, string> = {
  DEBIT: "Nợ",
  CREDIT: "Có",
  BOTH: "Nợ/Có",
};

export default function ChartOfAccountsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [classificationFilter, setClassificationFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");

  // Tree view
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchFiscalYears();
  }, [router]);

  useEffect(() => {
    fetchAccounts();
  }, [page, pageSize, search, classificationFilter, activeFilter]);

  const fetchFiscalYears = async () => {
    try {
      const res = await apiFetch<{ items: FiscalYear[] }>("/accounting/fiscal-years");
      setFiscalYears(res.items);
    } catch (error) {
      console.error("Failed to fetch fiscal years:", error);
    }
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());
      if (search) params.set("search", search);
      if (classificationFilter) params.set("classification", classificationFilter);
      if (activeFilter) params.set("is_active", activeFilter);

      const res = await apiFetch<{
        items: Account[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>(`/accounting/chart-of-accounts?${params.toString()}`);

      setAccounts(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);

      // Auto-expand first level
      const firstLevel = new Set<string>();
      res.items.filter(a => a.level === 1).forEach(a => firstLevel.add(a.id));
      setExpandedNodes(firstLevel);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (accountId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;

    try {
      await apiFetch(`/accounting/chart-of-accounts/${selectedAccount.id}`, {
        method: "DELETE",
      });
      setShowDeleteModal(false);
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error("Failed to delete account:", error);
      alert("Không thể xóa tài khoản này");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value);
  };

  // Build tree structure
  const buildTree = (accounts: Account[]): Map<string | null, Account[]> => {
    const tree = new Map<string | null, Account[]>();
    accounts.forEach((account) => {
      const parentId = account.parent_id;
      if (!tree.has(parentId)) {
        tree.set(parentId, []);
      }
      tree.get(parentId)!.push(account);
    });
    return tree;
  };

  const renderTreeNode = (
    account: Account,
    tree: Map<string | null, Account[]>,
    depth: number = 0
  ) => {
    const children = tree.get(account.id) || [];
    const hasChildren = children.length > 0 || account.is_parent;
    const isExpanded = expandedNodes.has(account.id);

    return (
      <div key={account.id}>
        <div
          className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-50 border-b border-gray-100 ${
            !account.is_active ? "opacity-50" : ""
          }`}
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
        >
          {/* Expand/Collapse button */}
          <button
            onClick={() => hasChildren && toggleNode(account.id)}
            className={`p-0.5 rounded ${hasChildren ? "hover:bg-gray-200" : ""}`}
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>

          {/* Icon */}
          {account.is_parent ? (
            <FolderOpen className="w-4 h-4 text-yellow-500" />
          ) : (
            <FileText className="w-4 h-4 text-gray-400" />
          )}

          {/* Account Code */}
          <span className="font-mono text-sm font-medium text-blue-600 w-24">
            {account.account_code}
          </span>

          {/* Account Name */}
          <span className="flex-1 text-sm text-gray-900">
            {account.account_name}
          </span>

          {/* Classification Badge */}
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded ${
              CLASSIFICATION_COLORS[account.classification] || "bg-gray-100 text-gray-700"
            }`}
          >
            {CLASSIFICATION_LABELS[account.classification] || account.classification}
          </span>

          {/* Nature */}
          <span className="text-xs text-gray-500 w-12 text-center">
            {NATURE_LABELS[account.nature] || account.nature}
          </span>

          {/* Allow Posting */}
          {account.allow_posting && (
            <span className="text-xs text-green-600">Cho phép hạch toán</span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 ml-2">
            <Link
              href={`/accounting/chart-of-accounts/${account.id}/edit`}
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
              title="Chỉnh sửa"
            >
              <Edit className="w-4 h-4" />
            </Link>
            {!account.is_system && !account.is_parent && (
              <button
                onClick={() => {
                  setSelectedAccount(account);
                  setShowDeleteModal(true);
                }}
                className="p-1 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                title="Xóa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Children */}
        {isExpanded &&
          children.map((child) => renderTreeNode(child, tree, depth + 1))}
      </div>
    );
  };

  const tree = buildTree(accounts);
  const rootAccounts = tree.get(null) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/accounting"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hệ thống tài khoản
            </h1>
            <p className="text-gray-600 mt-1">
              Danh mục tài khoản kế toán theo chuẩn VAS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/accounting/fiscal-years"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Năm tài chính
          </Link>
          <Link
            href="/accounting/chart-of-accounts/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Thêm tài khoản
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo mã hoặc tên tài khoản..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Classification Filter */}
          <select
            value={classificationFilter}
            onChange={(e) => {
              setClassificationFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả loại</option>
            {Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Active Filter */}
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Ngừng hoạt động</option>
          </select>

          {/* View Mode */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === "tree"
                  ? "bg-white text-gray-900 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Cây
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Danh sách
            </button>
          </div>
        </div>
      </div>

      {/* Account Tree/List */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
          <span className="font-mono text-xs font-medium text-gray-500 w-24">
            MÃ TK
          </span>
          <span className="flex-1 text-xs font-medium text-gray-500">
            TÊN TÀI KHOẢN
          </span>
          <span className="text-xs font-medium text-gray-500 w-20 text-center">
            LOẠI
          </span>
          <span className="text-xs font-medium text-gray-500 w-12 text-center">
            TÍNH CHẤT
          </span>
          <span className="text-xs font-medium text-gray-500 w-32 text-center">
            TRẠNG THÁI
          </span>
          <span className="text-xs font-medium text-gray-500 w-20"></span>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              <span className="ml-2 text-gray-600">Đang tải...</span>
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            Không tìm thấy tài khoản nào
          </div>
        ) : viewMode === "tree" ? (
          <div className="divide-y divide-gray-100">
            {rootAccounts.map((account) => renderTreeNode(account, tree))}
          </div>
        ) : (
          <table className="w-full">
            <tbody className="divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className={`hover:bg-gray-50 ${
                    !account.is_active ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-sm font-medium text-blue-600">
                    {account.account_code}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${(account.level - 1) * 16}px` }}
                    >
                      {account.is_parent ? (
                        <FolderOpen className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <FileText className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-900">
                        {account.account_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        CLASSIFICATION_COLORS[account.classification] ||
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {CLASSIFICATION_LABELS[account.classification] ||
                        account.classification}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 text-center">
                    {NATURE_LABELS[account.nature] || account.nature}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {account.allow_posting && (
                      <span className="text-xs text-green-600">
                        Cho phép hạch toán
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/accounting/chart-of-accounts/${account.id}/edit`}
                        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      {!account.is_system && !account.is_parent && (
                        <button
                          onClick={() => {
                            setSelectedAccount(account);
                            setShowDeleteModal(true);
                          }}
                          className="p-1 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Hiển thị {total > 0 ? (page - 1) * pageSize + 1 : 0} -{" "}
              {Math.min(page * pageSize, total)} / {total} tài khoản
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Xác nhận xóa
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn vô hiệu hóa tài khoản{" "}
              <strong>
                {selectedAccount.account_code} - {selectedAccount.account_name}
              </strong>
              ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAccount(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
