"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Trash2,
  UserPlus,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Lead {
  id: string;
  code: string;
  full_name: string;
  company_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  source: string | null;
  status: string;
  estimated_value: number | null;
  service_interest: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  QUALIFIED: "Đủ điều kiện",
  UNQUALIFIED: "Không đủ ĐK",
  CONVERTED: "Đã chuyển đổi",
  LOST: "Thất bại",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-yellow-100 text-yellow-700",
  QUALIFIED: "bg-green-100 text-green-700",
  UNQUALIFIED: "bg-gray-100 text-gray-700",
  CONVERTED: "bg-purple-100 text-purple-700",
  LOST: "bg-red-100 text-red-700",
};

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Website",
  REFERRAL: "Giới thiệu",
  COLD_CALL: "Gọi điện",
  SOCIAL_MEDIA: "Mạng xã hội",
  TRADE_SHOW: "Triển lãm",
  ADVERTISEMENT: "Quảng cáo",
  EMAIL_CAMPAIGN: "Email marketing",
  PARTNER: "Đối tác",
  OTHER: "Khác",
};

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchLead();
  }, [id, router]);

  const fetchLead = async () => {
    try {
      const data = await apiFetch<Lead>(`/crm/leads/${id}`);
      setLead(data);
    } catch (error) {
      console.error("Failed to fetch lead:", error);
      router.push("/crm/leads");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/crm/leads/${id}`, { method: "DELETE" });
      router.push("/crm/leads");
    } catch (error) {
      console.error("Failed to delete lead:", error);
      alert("Không thể xóa lead này");
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      const result = await apiFetch<{
        success: boolean;
        account_id: string;
        contact_id: string;
        opportunity_id: string;
      }>(`/crm/leads/${id}/convert`, {
        method: "POST",
        body: JSON.stringify({ create_opportunity: true }),
      });

      if (result.opportunity_id) {
        router.push(`/crm/opportunities/${result.opportunity_id}`);
      } else {
        router.push("/crm/leads");
      }
    } catch (error) {
      console.error("Failed to convert lead:", error);
      alert("Không thể chuyển đổi lead này");
    } finally {
      setConverting(false);
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Không tìm thấy lead</p>
        <Link href="/crm/leads" className="text-blue-600 hover:underline mt-2 inline-block">
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
          href="/crm/leads"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserPlus className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{lead.full_name}</h1>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    STATUS_COLORS[lead.status] || "bg-gray-100"
                  }`}
                >
                  {STATUS_LABELS[lead.status] || lead.status}
                </span>
              </div>
              <p className="text-gray-600">{lead.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lead.status === "QUALIFIED" && (
              <button
                onClick={() => setShowConvertModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <ArrowRight className="w-4 h-4" />
                Chuyển đổi
              </button>
            )}
            <Link
              href={`/crm/leads/${id}/edit`}
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
          {/* Thông tin liên hệ */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin liên hệ</h2>
            <div className="space-y-3">
              {lead.title && (
                <div className="flex items-center gap-3 text-gray-600">
                  <UserPlus className="w-5 h-5 text-gray-400" />
                  <span>{lead.title}</span>
                </div>
              )}
              {lead.company_name && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <span>{lead.company_name}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.city && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span>{lead.city}</span>
                </div>
              )}
            </div>
          </div>

          {/* Thông tin kinh doanh */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin kinh doanh</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Nguồn</div>
                <div className="font-medium">
                  {lead.source ? SOURCE_LABELS[lead.source] || lead.source : "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Giá trị ước tính</div>
                <div className="font-medium text-green-600">
                  {lead.estimated_value ? formatCurrency(lead.estimated_value) : "-"}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-500">Dịch vụ quan tâm</div>
                <div className="font-medium">{lead.service_interest || "-"}</div>
              </div>
            </div>
          </div>

          {/* Ghi chú */}
          {lead.notes && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ghi chú</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{lead.notes}</p>
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
                  {formatDate(lead.created_at)}
                </div>
              </div>
              {lead.updated_at && (
                <div>
                  <div className="text-sm text-gray-500">Cập nhật lần cuối</div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    {formatDate(lead.updated_at)}
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
              Bạn có chắc muốn xóa lead <strong>{lead.full_name}</strong>?
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

      {/* Convert Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Chuyển đổi Lead</h3>
            <p className="text-gray-600 mb-4">
              Chuyển đổi lead <strong>{lead.full_name}</strong> thành:
            </p>
            <ul className="space-y-2 mb-6 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Khách hàng mới (Account)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Liên hệ mới (Contact)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Cơ hội mới (Opportunity)
              </li>
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={converting}
              >
                Hủy
              </button>
              <button
                onClick={handleConvert}
                disabled={converting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {converting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Đang chuyển đổi...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Chuyển đổi
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
