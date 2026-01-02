"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  ChevronLeft,
  Play,
  CheckCircle,
  Clock,
  Calendar,
  DollarSign,
  Package,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface AssetSummary {
  total_assets: number;
  total_cost: number;
  total_accumulated: number;
  total_book_value: number;
  by_category: {
    category_name: string;
    count: number;
    total_cost: number;
    total_book_value: number;
  }[];
}

export default function DepreciationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [runningDepreciation, setRunningDepreciation] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<AssetSummary>("/accounting/asset-summary");
      setSummary(res);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunDepreciation = async () => {
    if (!confirm("Bạn có chắc muốn chạy khấu hao cho kỳ hiện tại?")) return;

    setRunningDepreciation(true);
    setMessage(null);
    try {
      const res = await apiFetch<{ message: string; assets_processed: number; total_depreciation: number }>(
        "/accounting/run-bulk-depreciation",
        { method: "POST" }
      );
      setMessage({
        type: "success",
        text: `Đã chạy khấu hao thành công cho ${res.assets_processed} tài sản`
      });
      fetchData();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Không thể chạy khấu hao"
      });
    } finally {
      setRunningDepreciation(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting/fixed-assets" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Khấu hao Tài sản</h1>
            <p className="text-gray-600 mt-1">Tính và ghi nhận khấu hao tài sản cố định</p>
          </div>
        </div>
        <button
          onClick={handleRunDepreciation}
          disabled={runningDepreciation}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {runningDepreciation ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Đang xử lý...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Chạy khấu hao tháng {currentMonth}
            </>
          )}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng tài sản</p>
              <p className="text-xl font-semibold text-gray-900">
                {loading ? "..." : summary?.total_assets || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Nguyên giá</p>
              <p className="text-lg font-semibold text-green-600">
                {loading ? "..." : formatCurrency(summary?.total_cost || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Đã khấu hao</p>
              <p className="text-lg font-semibold text-orange-600">
                {loading ? "..." : formatCurrency(summary?.total_accumulated || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Giá trị còn lại</p>
              <p className="text-lg font-semibold text-purple-600">
                {loading ? "..." : formatCurrency(summary?.total_book_value || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* By Category */}
      {summary?.by_category && summary.by_category.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Khấu hao theo loại tài sản</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại tài sản</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nguyên giá</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá trị còn lại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summary.by_category.map((cat, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cat.category_name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 text-sm bg-gray-100 rounded-full">{cat.count}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(cat.total_cost)}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{formatCurrency(cat.total_book_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && (!summary || summary.total_assets === 0) && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có tài sản</h3>
          <p className="text-gray-600 mb-4">Bạn cần thêm tài sản cố định trước khi chạy khấu hao.</p>
          <Link
            href="/accounting/fixed-assets/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Thêm tài sản mới
          </Link>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Hướng dẫn khấu hao</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Nhấn "Chạy khấu hao" để tính khấu hao cho tất cả tài sản trong kỳ hiện tại</li>
          <li>• Hệ thống sử dụng phương pháp đường thẳng (Straight-line) theo quy định VAS</li>
          <li>• Khấu hao được tính theo tháng, từ ngày đưa vào sử dụng</li>
          <li>• Các tài sản đã khấu hao hết hoặc đã thanh lý sẽ không được tính</li>
        </ul>
      </div>
    </div>
  );
}
