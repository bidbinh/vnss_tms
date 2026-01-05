"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Building2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import SearchableSelect from "@/components/SearchableSelect";

interface CustomerGroup {
  id: string;
  code: string;
  name: string;
}

const TYPE_OPTIONS = [
  { value: "CUSTOMER", label: "Khách hàng" },
  { value: "PROSPECT", label: "Tiềm năng" },
  { value: "PARTNER", label: "Đối tác" },
  { value: "VENDOR", label: "Nhà cung cấp" },
];

const INDUSTRY_OPTIONS = [
  { value: "LOGISTICS", label: "Logistics" },
  { value: "MANUFACTURING", label: "Sản xuất" },
  { value: "RETAIL", label: "Bán lẻ" },
  { value: "ECOMMERCE", label: "Thương mại điện tử" },
  { value: "FMCG", label: "FMCG" },
  { value: "CONSTRUCTION", label: "Xây dựng" },
  { value: "OTHER", label: "Khác" },
];

export default function NewAccountPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    account_type: "CUSTOMER",
    industry: "",
    customer_group_id: "",
    phone: "",
    email: "",
    website: "",
    tax_code: "",
    address: "",
    city: "",
    notes: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchCustomerGroups();
  }, [router]);

  const fetchCustomerGroups = async () => {
    try {
      const res = await apiFetch<{ items: CustomerGroup[] }>("/crm/customer-groups?page_size=100");
      setCustomerGroups(res.items || []);
    } catch (error) {
      console.error("Failed to fetch customer groups:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        customer_group_id: formData.customer_group_id || null,
      };

      await apiFetch("/crm/accounts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      router.push("/crm/accounts");
    } catch (error) {
      console.error("Failed to create account:", error);
      alert("Lỗi khi tạo khách hàng mới");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/crm/accounts"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Thêm khách hàng mới</h1>
            <p className="text-gray-600">Tạo tài khoản khách hàng mới</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Thông tin cơ bản */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên khách hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã khách hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="VD: KH001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại
              </label>
              <SearchableSelect
                options={TYPE_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                value={formData.account_type}
                onChange={(value) => handleChange("account_type", value)}
                placeholder="Chọn loại..."
                clearable={false}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngành nghề
              </label>
              <SearchableSelect
                options={INDUSTRY_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                value={formData.industry}
                onChange={(value) => handleChange("industry", value)}
                placeholder="Chọn ngành nghề..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nhóm khách hàng
              </label>
              <SearchableSelect
                options={customerGroups.map((group) => ({
                  value: group.id,
                  label: group.name,
                  subLabel: group.code,
                }))}
                value={formData.customer_group_id}
                onChange={(value) => handleChange("customer_group_id", value)}
                placeholder="Tìm và chọn nhóm..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã số thuế
              </label>
              <input
                type="text"
                value={formData.tax_code}
                onChange={(e) => handleChange("tax_code", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Thông tin liên hệ */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin liên hệ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thành phố
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Địa chỉ
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Ghi chú */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ghi chú</h2>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Thêm ghi chú về khách hàng này..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/crm/accounts"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Tạo khách hàng
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
