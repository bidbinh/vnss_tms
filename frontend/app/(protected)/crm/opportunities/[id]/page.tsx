"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Target,
  Building2,
  User,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  TrendingUp,
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
    email: string | null;
  } | null;
  stage: string;
  probability: number;
  amount: number;
  currency: string;
  expected_close_date: string | null;
  service_type: string | null;
  description: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string | null;
  closed_at: string | null;
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

export default function OpportunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeType, setCloseType] = useState<"won" | "lost">("won");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchOpportunity();
  }, [id, router]);

  const fetchOpportunity = async () => {
    try {
      const data = await apiFetch<Opportunity>(`/crm/opportunities/${id}`);
      setOpportunity(data);
    } catch (error) {
      console.error("Failed to fetch opportunity:", error);
      router.push("/crm/opportunities");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/crm/opportunities/${id}`, { method: "DELETE" });
      router.push("/crm/opportunities");
    } catch (error) {
      console.error("Failed to delete opportunity:", error);
      alert("Không thể xóa cơ hội này");
    }
  };

  const handleClose = async () => {
    setProcessing(true);
    try {
      const endpoint = closeType === "won" ? "close-won" : "close-lost";
      await apiFetch(`/crm/opportunities/${id}/${endpoint}`, { method: "POST" });
      fetchOpportunity();
      setShowCloseModal(false);
    } catch (error) {
      console.error(`Failed to close opportunity:`, error);
      alert("Không thể đóng cơ hội này");
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

  const isClosedStage = (stage: string) => {
    return stage === "CLOSED_WON" || stage === "CLOSED_LOST";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Không tìm thấy cơ hội</p>
        <Link href="/crm/opportunities" className="text-blue-600 hover:underline mt-2 inline-block">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/crm/opportunities"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Target className="w-8 h-8 text-yellow-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{opportunity.name}</h1>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    STAGE_COLORS[opportunity.stage] || "bg-gray-100"
                  }`}
                >
                  {STAGE_LABELS[opportunity.stage] || opportunity.stage}
                </span>
              </div>
              <p className="text-gray-600">{opportunity.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isClosedStage(opportunity.stage) && (
              <>
                <button
                  onClick={() => {
                    setCloseType("won");
                    setShowCloseModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Thành công
                </button>
                <button
                  onClick={() => {
                    setCloseType("lost");
                    setShowCloseModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4" />
                  Thất bại
                </button>
              </>
            )}
            <Link
              href={`/crm/opportunities/${id}/edit`}
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
          {/* Giá trị */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">Giá trị</div>
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency(opportunity.amount)}
                </div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-sm text-gray-600">Xác suất</div>
                <div className="text-xl font-bold text-yellow-600">
                  {opportunity.probability}%
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600">Giá trị gia quyền</div>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(opportunity.amount * opportunity.probability / 100)}
                </div>
              </div>
            </div>
          </div>

          {/* Thông tin chi tiết */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin chi tiết</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Khách hàng</div>
                {opportunity.account ? (
                  <Link
                    href={`/crm/accounts/${opportunity.account.id}`}
                    className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Building2 className="w-4 h-4" />
                    {opportunity.account.name}
                  </Link>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-500">Người liên hệ</div>
                {opportunity.contact ? (
                  <div className="font-medium flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {opportunity.contact.full_name}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-500">Loại dịch vụ</div>
                <div className="font-medium">{opportunity.service_type || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Dự kiến chốt</div>
                <div className="font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {opportunity.expected_close_date || "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Mô tả */}
          {opportunity.description && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Mô tả</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{opportunity.description}</p>
            </div>
          )}

          {/* Pipeline */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tiến trình Pipeline</h2>
            <div className="flex items-center gap-2">
              {Object.entries(STAGE_LABELS).map(([stage, label], index) => {
                const stages = Object.keys(STAGE_LABELS);
                const currentIndex = stages.indexOf(opportunity.stage);
                const stageIndex = stages.indexOf(stage);
                const isPast = stageIndex < currentIndex;
                const isCurrent = stage === opportunity.stage;
                const isClosed = stage === "CLOSED_WON" || stage === "CLOSED_LOST";

                if (isClosed && opportunity.stage !== stage) return null;

                return (
                  <div key={stage} className="flex items-center gap-2 flex-1">
                    <div
                      className={`flex-1 p-2 text-center text-xs rounded ${
                        isCurrent
                          ? STAGE_COLORS[stage]
                          : isPast
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {label}
                    </div>
                    {index < stages.length - 3 && (
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
                  {formatDate(opportunity.created_at)}
                </div>
              </div>
              {opportunity.updated_at && (
                <div>
                  <div className="text-sm text-gray-500">Cập nhật lần cuối</div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    {formatDate(opportunity.updated_at)}
                  </div>
                </div>
              )}
              {opportunity.closed_at && (
                <div>
                  <div className="text-sm text-gray-500">Ngày đóng</div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    {formatDate(opportunity.closed_at)}
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
              Bạn có chắc muốn xóa cơ hội <strong>{opportunity.name}</strong>?
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

      {/* Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {closeType === "won" ? "Đánh dấu thành công" : "Đánh dấu thất bại"}
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn đánh dấu cơ hội này là{" "}
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
                  <span className="font-medium">Giá trị: {formatCurrency(opportunity.amount)}</span>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCloseModal(false)}
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
