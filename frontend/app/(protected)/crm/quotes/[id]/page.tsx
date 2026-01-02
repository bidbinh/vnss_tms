"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Building2,
  Target,
  Calendar,
  CheckCircle,
  XCircle,
  Send,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

interface Quote {
  id: string;
  code: string;
  account_id: string;
  account: {
    id: string;
    code: string;
    name: string;
  } | null;
  opportunity_id: string | null;
  opportunity: {
    id: string;
    code: string;
    name: string;
  } | null;
  status: string;
  valid_until: string | null;
  total_amount: number;
  notes: string | null;
  items: QuoteItem[];
  created_at: string;
  updated_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  SENT: "Đã gửi",
  ACCEPTED: "Chấp nhận",
  REJECTED: "Từ chối",
  EXPIRED: "Hết hạn",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-yellow-100 text-yellow-700",
};

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchQuote();
  }, [id, router]);

  const fetchQuote = async () => {
    try {
      const data = await apiFetch<Quote>(`/crm/quotes/${id}`);
      setQuote(data);
    } catch (error) {
      console.error("Failed to fetch quote:", error);
      router.push("/crm/quotes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/crm/quotes/${id}`, { method: "DELETE" });
      router.push("/crm/quotes");
    } catch (error) {
      console.error("Failed to delete quote:", error);
      alert("Không thể xóa báo giá này");
    }
  };

  const handleStatusChange = async () => {
    setProcessing(true);
    try {
      await apiFetch(`/crm/quotes/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      fetchQuote();
      setShowStatusModal(false);
    } catch (error) {
      console.error("Failed to update quote status:", error);
      alert("Không thể cập nhật trạng thái");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Không tìm thấy báo giá</p>
        <Link href="/crm/quotes" className="text-blue-600 hover:underline mt-2 inline-block">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/crm/quotes"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <FileText className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Báo giá {quote.code}</h1>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    STATUS_COLORS[quote.status] || "bg-gray-100"
                  }`}
                >
                  {STATUS_LABELS[quote.status] || quote.status}
                </span>
              </div>
              <p className="text-gray-600">
                {quote.account?.name || "Không xác định"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {quote.status === "DRAFT" && (
              <button
                onClick={() => {
                  setNewStatus("SENT");
                  setShowStatusModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
                Gửi báo giá
              </button>
            )}
            {quote.status === "SENT" && (
              <>
                <button
                  onClick={() => {
                    setNewStatus("ACCEPTED");
                    setShowStatusModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Chấp nhận
                </button>
                <button
                  onClick={() => {
                    setNewStatus("REJECTED");
                    setShowStatusModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4" />
                  Từ chối
                </button>
              </>
            )}
            <Link
              href={`/crm/quotes/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" />
              Sửa
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Xóa
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Khách hàng</div>
                {quote.account ? (
                  <Link
                    href={`/crm/accounts/${quote.account.id}`}
                    className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Building2 className="w-4 h-4" />
                    {quote.account.name}
                  </Link>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-500">Cơ hội liên quan</div>
                {quote.opportunity ? (
                  <Link
                    href={`/crm/opportunities/${quote.opportunity.id}`}
                    className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Target className="w-4 h-4" />
                    {quote.opportunity.name}
                  </Link>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-500">Hiệu lực đến</div>
                <div className="font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {quote.valid_until ? formatDate(quote.valid_until) : "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Tổng giá trị</div>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(quote.total_amount)}
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết báo giá</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Mô tả
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      SL
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Đơn giá
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      CK (%)
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {quote.items && quote.items.length > 0 ? (
                    quote.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3 text-gray-900">{item.description}</td>
                        <td className="px-3 py-3 text-right text-gray-600">{item.quantity}</td>
                        <td className="px-3 py-3 text-right text-gray-600">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-600">{item.discount}%</td>
                        <td className="px-3 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                        Chưa có chi tiết báo giá
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-right font-semibold text-gray-900">
                      Tổng cộng:
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-lg text-green-600">
                      {formatCurrency(quote.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ghi chú</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin hệ thống</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Ngày tạo</div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4" />
                  {formatDate(quote.created_at)}
                </div>
              </div>
              {quote.updated_at && (
                <div>
                  <div className="text-sm text-gray-500">Cập nhật lần cuối</div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    {formatDate(quote.updated_at)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn xóa báo giá <strong>{quote.code}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
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

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cập nhật trạng thái
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn chuyển báo giá sang trạng thái{" "}
              <strong>{STATUS_LABELS[newStatus]}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={processing}
              >
                Hủy
              </button>
              <button
                onClick={handleStatusChange}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
