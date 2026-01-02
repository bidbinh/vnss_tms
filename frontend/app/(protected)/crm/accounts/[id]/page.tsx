"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  Users,
  Target,
  FileText,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  industry: string | null;
  customer_group_id: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_code: string | null;
  address: string | null;
  city: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
}

interface Opportunity {
  id: string;
  code: string;
  name: string;
  stage: string;
  amount: number;
}

const TYPE_LABELS: Record<string, string> = {
  CUSTOMER: "Khách hàng",
  PROSPECT: "Tiềm năng",
  PARTNER: "Đối tác",
  VENDOR: "Nhà cung cấp",
};

const INDUSTRY_LABELS: Record<string, string> = {
  LOGISTICS: "Logistics",
  MANUFACTURING: "Sản xuất",
  RETAIL: "Bán lẻ",
  ECOMMERCE: "Thương mại điện tử",
  FMCG: "FMCG",
  CONSTRUCTION: "Xây dựng",
  OTHER: "Khác",
};

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [id, router]);

  const fetchData = async () => {
    try {
      const [accountData, contactsData, oppsData] = await Promise.all([
        apiFetch<Account>(`/crm/accounts/${id}`),
        apiFetch<{ items: Contact[] }>(`/crm/contacts?account_id=${id}&page_size=10`),
        apiFetch<{ items: Opportunity[] }>(`/crm/opportunities?account_id=${id}&page_size=10`),
      ]);
      setAccount(accountData);
      setContacts(contactsData.items || []);
      setOpportunities(oppsData.items || []);
    } catch (error) {
      console.error("Failed to fetch account:", error);
      router.push("/crm/accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/crm/accounts/${id}`, { method: "DELETE" });
      router.push("/crm/accounts");
    } catch (error) {
      console.error("Failed to delete account:", error);
      alert("Không thể xóa khách hàng này");
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

  if (!account) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Không tìm thấy khách hàng</p>
        <Link href="/crm/accounts" className="text-blue-600 hover:underline mt-2 inline-block">
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
          href="/crm/accounts"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                  {TYPE_LABELS[account.type] || account.type}
                </span>
              </div>
              <p className="text-gray-600">{account.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/crm/accounts/${id}/edit`}
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
            <div className="grid grid-cols-2 gap-4">
              {account.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <a href={`tel:${account.phone}`} className="text-blue-600 hover:underline">
                    {account.phone}
                  </a>
                </div>
              )}
              {account.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <a href={`mailto:${account.email}`} className="text-blue-600 hover:underline">
                    {account.email}
                  </a>
                </div>
              )}
              {account.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {account.website}
                  </a>
                </div>
              )}
              {(account.address || account.city) && (
                <div className="flex items-center gap-3 col-span-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">
                    {[account.address, account.city].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Thông tin kinh doanh */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin kinh doanh</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Ngành nghề</div>
                <div className="font-medium">
                  {account.industry ? INDUSTRY_LABELS[account.industry] || account.industry : "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Mã số thuế</div>
                <div className="font-medium">{account.tax_code || "-"}</div>
              </div>
            </div>
          </div>

          {/* Mô tả */}
          {account.description && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Mô tả</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{account.description}</p>
            </div>
          )}

          {/* Liên hệ */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Liên hệ ({contacts.length})
              </h2>
              <Link
                href={`/crm/contacts/new?account_id=${id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                + Thêm liên hệ
              </Link>
            </div>
            {contacts.length > 0 ? (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <Link
                    key={contact.id}
                    href={`/crm/contacts/${contact.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{contact.full_name}</div>
                      {contact.title && (
                        <div className="text-sm text-gray-500">{contact.title}</div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {contact.email || contact.phone}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Chưa có liên hệ nào</p>
            )}
          </div>

          {/* Cơ hội */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Cơ hội ({opportunities.length})
              </h2>
              <Link
                href={`/crm/opportunities/new?account_id=${id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                + Thêm cơ hội
              </Link>
            </div>
            {opportunities.length > 0 ? (
              <div className="space-y-3">
                {opportunities.map((opp) => (
                  <Link
                    key={opp.id}
                    href={`/crm/opportunities/${opp.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{opp.name}</div>
                      <div className="text-sm text-gray-500">{opp.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">{formatCurrency(opp.amount)}</div>
                      <div className="text-sm text-gray-500">{opp.stage}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Chưa có cơ hội nào</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin hệ thống</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Trạng thái</div>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    account.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {account.is_active ? "Đang hoạt động" : "Ngừng hoạt động"}
                </span>
              </div>
              <div>
                <div className="text-sm text-gray-500">Ngày tạo</div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4" />
                  {formatDate(account.created_at)}
                </div>
              </div>
              {account.updated_at && (
                <div>
                  <div className="text-sm text-gray-500">Cập nhật lần cuối</div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    {formatDate(account.updated_at)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
            <div className="space-y-2">
              <Link
                href={`/crm/contacts/new?account_id=${id}`}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Users className="w-4 h-4" />
                Thêm liên hệ
              </Link>
              <Link
                href={`/crm/opportunities/new?account_id=${id}`}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Target className="w-4 h-4" />
                Tạo cơ hội
              </Link>
              <Link
                href={`/crm/quotes/new?account_id=${id}`}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FileText className="w-4 h-4" />
                Tạo báo giá
              </Link>
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
              Bạn có chắc muốn xóa khách hàng <strong>{account.name}</strong>?
              Thao tác này sẽ xóa cả các liên hệ và cơ hội liên quan.
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
    </div>
  );
}
