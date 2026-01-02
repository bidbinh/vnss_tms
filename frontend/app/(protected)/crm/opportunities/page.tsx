"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Target,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  DollarSign,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Opportunity {
  id: string;
  code: string;
  name: string;
  account_id: string;
  account: {
    id: string;
    code: string;
    name: string;
  } | null;
  contact: {
    id: string;
    full_name: string;
  } | null;
  stage: string;
  probability: number;
  amount: number;
  currency: string;
  expected_close_date: string | null;
  service_type: string | null;
  assigned_to: string | null;
  created_at: string;
}

const STAGE_LABELS: Record<string, string> = {
  QUALIFICATION: "Đánh giá",
  NEEDS_ANALYSIS: "Phân tích nhu cầu",
  PROPOSAL: "Đề xuất",
  NEGOTIATION: "Đàm phán",
  CLOSED_WON: "Thành công",
  CLOSED_LOST: "Thất bại",
};

const STAGE_COLORS: Record<string, string> = {
  QUALIFICATION: "bg-gray-100 text-gray-700",
  NEEDS_ANALYSIS: "bg-blue-100 text-blue-700",
  PROPOSAL: "bg-yellow-100 text-yellow-700",
  NEGOTIATION: "bg-orange-100 text-orange-700",
  CLOSED_WON: "bg-green-100 text-green-700",
  CLOSED_LOST: "bg-red-100 text-red-700",
};

export default function OpportunitiesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("");

  // Sorting
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeType, setCloseType] = useState<"won" | "lost">("won");
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
  }, [router]);

  useEffect(() => {
    fetchOpportunities();
  }, [page, pageSize, search, stageFilter, sortField, sortOrder]);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());
      if (search) params.set("search", search);
      if (stageFilter) params.set("stage", stageFilter);
      if (sortField) params.set("sort_by", sortField);
      if (sortOrder) params.set("sort_order", sortOrder);

      const res = await apiFetch<{
        items: Opportunity[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>(`/crm/opportunities?${params.toString()}`);

      setOpportunities(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (error) {
      console.error("Failed to fetch opportunities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOpp) return;

    try {
      await apiFetch(`/crm/opportunities/${selectedOpp.id}`, {
        method: "DELETE",
      });
      setShowDeleteModal(false);
      setSelectedOpp(null);
      fetchOpportunities();
    } catch (error) {
      console.error("Failed to delete opportunity:", error);
      alert("Không thể xóa cơ hội này");
    }
  };

  const handleClose = async () => {
    if (!selectedOpp) return;
    setProcessing(true);

    try {
      const endpoint = closeType === "won" ? "close-won" : "close-lost";
      await apiFetch(`/crm/opportunities/${selectedOpp.id}/${endpoint}`, {
        method: "POST",
      });
      setShowCloseModal(false);
      setSelectedOpp(null);
      fetchOpportunities();
    } catch (error) {
      console.error(`Failed to close opportunity as ${closeType}:`, error);
      alert("Không thể đóng cơ hội này");
    } finally {
      setProcessing(false);
    }
  };

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const isClosedStage = (stage: string) => {
    return stage === "CLOSED_WON" || stage === "CLOSED_LOST";
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-600" />
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cơ hội bán hàng</h1>
          <p className="text-gray-600 mt-1">Quản lý pipeline và cơ hội</p>
        </div>
        <Link
          href="/crm/opportunities/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm cơ hội
        </Link>
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
                placeholder="Tìm theo mã, tên cơ hội..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả giai đoạn</option>
            {Object.entries(STAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("code")}
                >
                  <div className="flex items-center gap-1">
                    Mã
                    <SortIcon field="code" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Tên cơ hội
                    <SortIcon field="name" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Khách hàng
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("stage")}
                >
                  <div className="flex items-center gap-1">
                    Giai đoạn
                    <SortIcon field="stage" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("probability")}
                >
                  <div className="flex items-center gap-1">
                    Xác suất
                    <SortIcon field="probability" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("amount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Giá trị
                    <SortIcon field="amount" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("expected_close_date")}
                >
                  <div className="flex items-center gap-1">
                    Dự kiến chốt
                    <SortIcon field="expected_close_date" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2 text-gray-600">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : opportunities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Không tìm thấy cơ hội nào
                  </td>
                </tr>
              ) : (
                opportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      <Link href={`/crm/opportunities/${opp.id}`} className="hover:underline">
                        {opp.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-yellow-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{opp.name}</div>
                          {opp.service_type && (
                            <div className="text-xs text-gray-500">{opp.service_type}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {opp.account ? (
                        <Link
                          href={`/crm/accounts/${opp.account.id}`}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Building2 className="w-3 h-3" />
                          {opp.account.name}
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STAGE_COLORS[opp.stage] || "bg-gray-100 text-gray-700"}`}>
                        {STAGE_LABELS[opp.stage] || opp.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${opp.probability >= 75 ? 'bg-green-500' : opp.probability >= 50 ? 'bg-yellow-500' : 'bg-gray-400'}`}
                            style={{ width: `${opp.probability}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{opp.probability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(opp.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Gia quyền: {formatCurrency(opp.amount * opp.probability / 100)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {opp.expected_close_date || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/crm/opportunities/${opp.id}`}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/crm/opportunities/${opp.id}/edit`}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {!isClosedStage(opp.stage) && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedOpp(opp);
                                setCloseType("won");
                                setShowCloseModal(true);
                              }}
                              className="p-1.5 rounded hover:bg-green-100 text-gray-500 hover:text-green-600"
                              title="Đánh dấu thành công"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedOpp(opp);
                                setCloseType("lost");
                                setShowCloseModal(true);
                              }}
                              className="p-1.5 rounded hover:bg-orange-100 text-gray-500 hover:text-orange-600"
                              title="Đánh dấu thất bại"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setSelectedOpp(opp);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Hiển thị {total > 0 ? ((page - 1) * pageSize) + 1 : 0} - {Math.min(page * pageSize, total)} / {total} cơ hội
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Hiển thị</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600">dòng</span>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && selectedOpp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Xác nhận xóa
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn xóa cơ hội <strong>{selectedOpp.name}</strong>?
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedOpp(null);
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

      {/* Close Modal */}
      {showCloseModal && selectedOpp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {closeType === "won" ? "Đánh dấu thành công" : "Đánh dấu thất bại"}
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn đánh dấu cơ hội <strong>{selectedOpp.name}</strong> là{" "}
              {closeType === "won" ? (
                <span className="text-green-600 font-medium">thành công</span>
              ) : (
                <span className="text-red-600 font-medium">thất bại</span>
              )}?
            </p>
            {closeType === "won" && (
              <div className="p-4 bg-green-50 rounded-lg mb-6">
                <div className="flex items-center gap-2 text-green-700">
                  <DollarSign className="w-5 h-5" />
                  <span className="font-medium">Giá trị: {formatCurrency(selectedOpp.amount)}</span>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setSelectedOpp(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={processing}
              >
                Hủy
              </button>
              <button
                onClick={handleClose}
                disabled={processing}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${
                  closeType === "won" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    {closeType === "won" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    Xác nhận
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
