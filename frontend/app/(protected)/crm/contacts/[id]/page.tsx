"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Trash2,
  User,
  Building2,
  Phone,
  Mail,
  Smartphone,
  Calendar,
  Star,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Contact {
  id: string;
  code: string;
  full_name: string;
  account_id: string | null;
  account: {
    id: string;
    code: string;
    name: string;
  } | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  department: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<Contact | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchContact();
  }, [id, router]);

  const fetchContact = async () => {
    try {
      const data = await apiFetch<Contact>(`/crm/contacts/${id}`);
      setContact(data);
    } catch (error) {
      console.error("Failed to fetch contact:", error);
      router.push("/crm/contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/crm/contacts/${id}`, { method: "DELETE" });
      router.push("/crm/contacts");
    } catch (error) {
      console.error("Failed to delete contact:", error);
      alert("Không thể xóa liên hệ này");
    }
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

  if (!contact) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Không tìm thấy liên hệ</p>
        <Link href="/crm/contacts" className="text-blue-600 hover:underline mt-2 inline-block">
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
          href="/crm/contacts"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <User className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{contact.full_name}</h1>
                {contact.is_primary && (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                    <Star className="w-3 h-3" />
                    Liên hệ chính
                  </span>
                )}
              </div>
              <p className="text-gray-600">{contact.code}</p>
              {contact.title && (
                <p className="text-gray-500">{contact.title}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/crm/contacts/${id}/edit`}
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
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.mobile && (
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-gray-400" />
                  <a href={`tel:${contact.mobile}`} className="text-blue-600 hover:underline">
                    {contact.mobile}
                  </a>
                </div>
              )}
              {!contact.email && !contact.phone && !contact.mobile && (
                <p className="text-gray-500">Chưa có thông tin liên hệ</p>
              )}
            </div>
          </div>

          {/* Thông tin công việc */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin công việc</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Khách hàng</div>
                {contact.account ? (
                  <Link
                    href={`/crm/accounts/${contact.account.id}`}
                    className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Building2 className="w-4 h-4" />
                    {contact.account.name}
                  </Link>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-500">Phòng ban</div>
                <div className="font-medium">{contact.department || "-"}</div>
              </div>
            </div>
          </div>

          {/* Ghi chú */}
          {contact.notes && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ghi chú</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{contact.notes}</p>
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
                  {formatDate(contact.created_at)}
                </div>
              </div>
              {contact.updated_at && (
                <div>
                  <div className="text-sm text-gray-500">Cập nhật lần cuối</div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    {formatDate(contact.updated_at)}
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
              Bạn có chắc muốn xóa liên hệ <strong>{contact.full_name}</strong>?
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
