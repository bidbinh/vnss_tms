"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Building2,
  Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Customer {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  tax_code: string | null;
  business_license: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  ward: string | null;
  district: string | null;
  city: string | null;
  country: string;
  shipping_address: string | null;
  shipping_ward: string | null;
  shipping_district: string | null;
  shipping_city: string | null;
  payment_terms: string | null;
  credit_limit: number;
  credit_days: number;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account: string | null;
  bank_account_name: string | null;
  industry: string | null;
  source: string | null;
  customer_since: string | null;
  assigned_to: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_position: string | null;
  notes: string | null;
  is_active: boolean;
  crm_account_id: string | null;
}

const PAYMENT_TERMS_OPTIONS = [
  { value: "", label: "-- Chọn --" },
  { value: "COD", label: "COD - Thanh toán khi giao hàng" },
  { value: "PREPAID", label: "Thanh toán trước" },
  { value: "NET15", label: "NET15 - Thanh toán sau 15 ngày" },
  { value: "NET30", label: "NET30 - Thanh toán sau 30 ngày" },
  { value: "NET45", label: "NET45 - Thanh toán sau 45 ngày" },
  { value: "NET60", label: "NET60 - Thanh toán sau 60 ngày" },
];

const INDUSTRY_OPTIONS = [
  { value: "", label: "-- Chọn ngành nghề --" },
  { value: "LOGISTICS", label: "Logistics" },
  { value: "MANUFACTURING", label: "Sản xuất" },
  { value: "RETAIL", label: "Bán lẻ" },
  { value: "ECOMMERCE", label: "Thương mại điện tử" },
  { value: "FMCG", label: "FMCG" },
  { value: "CONSTRUCTION", label: "Xây dựng" },
  { value: "OTHER", label: "Khác" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "-- Chọn nguồn --" },
  { value: "REFERRAL", label: "Giới thiệu" },
  { value: "WEBSITE", label: "Website" },
  { value: "COLD_CALL", label: "Cold Call" },
  { value: "EXHIBITION", label: "Triển lãm" },
  { value: "SOCIAL", label: "Mạng xã hội" },
  { value: "OTHER", label: "Khác" },
];

export default function CustomerEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [form, setForm] = useState<Partial<Customer>>({});

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
      const data = await apiFetch<Customer>(`/api/v1/customers/${id}`);
      setForm(data);
    } catch (error) {
      console.error("Failed to fetch customer:", error);
      router.push("/tms/customers");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Customer, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code?.trim() || !form.name?.trim()) {
      alert("Mã và Tên khách hàng là bắt buộc!");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/api/v1/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      router.push(`/tms/customers/${id}`);
    } catch (error) {
      console.error("Failed to save customer:", error);
      alert("Không thể lưu. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "general", label: "Thông tin chung" },
    { id: "address", label: "Địa chỉ" },
    { id: "financial", label: "Tài chính" },
    { id: "contact", label: "Liên hệ" },
    { id: "notes", label: "Ghi chú" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/tms/customers/${id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa khách hàng</h1>
              <p className="text-gray-600">{form.code} - {form.name}</p>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6">
        {/* Tab: Thông tin chung */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code || ""}
                  onChange={(e) => handleChange("code", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên viết tắt</label>
                <input
                  type="text"
                  value={form.short_name || ""}
                  onChange={(e) => handleChange("short_name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên khách hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã số thuế</label>
                <input
                  type="text"
                  value={form.tax_code || ""}
                  onChange={(e) => handleChange("tax_code", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số ĐKKD</label>
                <input
                  type="text"
                  value={form.business_license || ""}
                  onChange={(e) => handleChange("business_license", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngành nghề</label>
                <select
                  value={form.industry || ""}
                  onChange={(e) => handleChange("industry", e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                >
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn khách hàng</label>
                <select
                  value={form.source || ""}
                  onChange={(e) => handleChange("source", e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                >
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Là khách hàng từ</label>
                <input
                  type="date"
                  value={form.customer_since || ""}
                  onChange={(e) => handleChange("customer_since", e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active ?? true}
                    onChange={(e) => handleChange("is_active", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Đang hoạt động</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Địa chỉ */}
        {activeTab === "address" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Địa chỉ công ty</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
              <input
                type="text"
                value={form.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phường/Xã</label>
                <input
                  type="text"
                  value={form.ward || ""}
                  onChange={(e) => handleChange("ward", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quận/Huyện</label>
                <input
                  type="text"
                  value={form.district || ""}
                  onChange={(e) => handleChange("district", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/TP</label>
                <input
                  type="text"
                  value={form.city || ""}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quốc gia</label>
              <input
                type="text"
                value={form.country || "Việt Nam"}
                onChange={(e) => handleChange("country", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>

            <h3 className="font-semibold text-gray-900 border-b pb-2 mt-8">Địa chỉ giao hàng mặc định</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ giao hàng</label>
              <input
                type="text"
                value={form.shipping_address || ""}
                onChange={(e) => handleChange("shipping_address", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phường/Xã</label>
                <input
                  type="text"
                  value={form.shipping_ward || ""}
                  onChange={(e) => handleChange("shipping_ward", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quận/Huyện</label>
                <input
                  type="text"
                  value={form.shipping_district || ""}
                  onChange={(e) => handleChange("shipping_district", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/TP</label>
                <input
                  type="text"
                  value={form.shipping_city || ""}
                  onChange={(e) => handleChange("shipping_city", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Tài chính */}
        {activeTab === "financial" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Điều khoản thanh toán</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Điều khoản</label>
                <select
                  value={form.payment_terms || ""}
                  onChange={(e) => handleChange("payment_terms", e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                >
                  {PAYMENT_TERMS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số ngày công nợ</label>
                <input
                  type="number"
                  value={form.credit_days ?? 30}
                  onChange={(e) => handleChange("credit_days", parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hạn mức công nợ</label>
                <input
                  type="number"
                  value={form.credit_limit ?? 0}
                  onChange={(e) => handleChange("credit_limit", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 border-b pb-2 mt-8">Thông tin ngân hàng</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
                <input
                  type="text"
                  value={form.bank_name || ""}
                  onChange={(e) => handleChange("bank_name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
                <input
                  type="text"
                  value={form.bank_branch || ""}
                  onChange={(e) => handleChange("bank_branch", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                <input
                  type="text"
                  value={form.bank_account || ""}
                  onChange={(e) => handleChange("bank_account", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên tài khoản</label>
                <input
                  type="text"
                  value={form.bank_account_name || ""}
                  onChange={(e) => handleChange("bank_account_name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Liên hệ */}
        {activeTab === "contact" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Thông tin liên hệ công ty</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
                <input
                  type="text"
                  value={form.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                <input
                  type="text"
                  value={form.fax || ""}
                  onChange={(e) => handleChange("fax", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={form.website || ""}
                  onChange={(e) => handleChange("website", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 border-b pb-2 mt-8">Người liên hệ chính</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
                <input
                  type="text"
                  value={form.contact_name || ""}
                  onChange={(e) => handleChange("contact_name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ</label>
                <input
                  type="text"
                  value={form.contact_position || ""}
                  onChange={(e) => handleChange("contact_position", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
                <input
                  type="text"
                  value={form.contact_phone || ""}
                  onChange={(e) => handleChange("contact_phone", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.contact_email || ""}
                  onChange={(e) => handleChange("contact_email", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Ghi chú */}
        {activeTab === "notes" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
              <textarea
                value={form.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder="Nhập ghi chú về khách hàng..."
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-8 pt-6 border-t flex justify-end gap-3">
          <Link
            href={`/tms/customers/${id}`}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  );
}
