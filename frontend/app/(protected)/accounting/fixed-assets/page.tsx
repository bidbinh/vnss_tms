"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Settings,
  TrendingDown,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface FixedAsset {
  id: string;
  asset_code: string;
  name: string;
  category_id: string;
  acquisition_date: string;
  acquisition_cost: number;
  accumulated_depreciation: number;
  book_value: number;
  status: string;
  location: string | null;
  serial_number: string | null;
  depreciation_method: string;
  useful_life_months: number;
}

interface AssetSummary {
  total_assets: number;
  total_cost: number;
  total_accumulated: number;
  total_book_value: number;
  status_counts: Record<string, number>;
  by_category: {
    category_name: string;
    count: number;
    total_cost: number;
    total_book_value: number;
  }[];
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang sử dụng",
  INACTIVE: "Tạm ngưng",
  UNDER_MAINTENANCE: "Đang bảo trì",
  FULLY_DEPRECIATED: "Hết khấu hao",
  DISPOSED: "Đã thanh lý",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-700",
  UNDER_MAINTENANCE: "bg-yellow-100 text-yellow-700",
  FULLY_DEPRECIATED: "bg-blue-100 text-blue-700",
  DISPOSED: "bg-red-100 text-red-700",
};

const DEPRECIATION_LABELS: Record<string, string> = {
  STRAIGHT_LINE: "Đường thẳng",
  DECLINING: "Số dư giảm dần",
  DOUBLE_DECLINING: "Số dư giảm dần kép",
  UNITS_OF_PRODUCTION: "Sản lượng",
  SUM_OF_YEARS: "Tổng số năm",
};

export default function FixedAssetsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchSummary();
  }, [router]);

  useEffect(() => {
    fetchAssets();
  }, [page, pageSize, search, statusFilter, categoryFilter]);

  const fetchSummary = async () => {
    try {
      const res = await apiFetch<AssetSummary>("/accounting/asset-summary");
      setSummary(res);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category_id", categoryFilter);

      const res = await apiFetch<{
        items: FixedAsset[];
        total: number;
        total_pages: number;
      }>(`/accounting/fixed-assets?${params.toString()}`);

      setAssets(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tài sản cố định</h1>
            <p className="text-gray-600 mt-1">Quản lý tài sản và khấu hao</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/accounting/fixed-assets/depreciation"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Calculator className="w-4 h-4" />
            Chạy khấu hao
          </Link>
          <Link
            href="/accounting/fixed-assets/categories"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            Danh mục
          </Link>
          <Link
            href="/accounting/fixed-assets/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Thêm tài sản
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Số lượng tài sản</p>
                <p className="text-lg font-semibold text-gray-900">
                  {summary.total_assets}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Nguyên giá</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(summary.total_cost)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calculator className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Khấu hao lũy kế</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(summary.total_accumulated)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-600">Giá trị còn lại</p>
                <p className="text-lg font-bold text-amber-700">
                  {formatCurrency(summary.total_book_value)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo mã, tên, số serial..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mã TS
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tên tài sản
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ngày mua
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Nguyên giá
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Khấu hao LK
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Giá trị CL
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  PP Khấu hao
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2 text-gray-600">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Không tìm thấy tài sản nào
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/accounting/fixed-assets/${asset.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {asset.asset_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {asset.name}
                        </p>
                        {asset.serial_number && (
                          <p className="text-xs text-gray-500">
                            S/N: {asset.serial_number}
                          </p>
                        )}
                        {asset.location && (
                          <p className="text-xs text-gray-500">
                            Vị trí: {asset.location}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(asset.acquisition_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(asset.acquisition_cost)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-orange-600">
                      {formatCurrency(asset.accumulated_depreciation)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(asset.book_value)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {DEPRECIATION_LABELS[asset.depreciation_method] ||
                        asset.depreciation_method}
                      <br />
                      <span className="text-gray-400">
                        ({asset.useful_life_months} tháng)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          STATUS_COLORS[asset.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {STATUS_LABELS[asset.status] || asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/accounting/fixed-assets/${asset.id}`}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {asset.status !== "DISPOSED" && (
                          <Link
                            href={`/accounting/fixed-assets/${asset.id}/edit`}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
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
          <div className="text-sm text-gray-600">
            Hiển thị {total > 0 ? (page - 1) * pageSize + 1 : 0} -{" "}
            {Math.min(page * pageSize, total)} / {total} tài sản
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
