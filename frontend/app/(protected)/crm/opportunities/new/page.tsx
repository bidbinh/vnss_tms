"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Target } from "lucide-react";
import { apiFetch } from "@/lib/api";
import SearchableSelect from "@/components/SearchableSelect";

interface Account {
  id: string;
  code: string;
  name: string;
}

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
}

const STAGE_OPTIONS = [
  { value: "QUALIFICATION", label: "Đánh giá" },
  { value: "NEEDS_ANALYSIS", label: "Phân tích nhu cầu" },
  { value: "PROPOSAL", label: "Đề xuất" },
  { value: "NEGOTIATION", label: "Đàm phán" },
];

const PROBABILITY_BY_STAGE: Record<string, number> = {
  QUALIFICATION: 10,
  NEEDS_ANALYSIS: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
};

export default function NewOpportunityPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    account_id: "",
    contact_id: "",
    stage: "QUALIFICATION",
    probability: 10,
    amount: "",
    expected_close_date: "",
    service_type: "",
    description: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchAccounts();
  }, [router]);

  useEffect(() => {
    if (formData.account_id) {
      fetchContacts(formData.account_id);
    } else {
      setContacts([]);
    }
  }, [formData.account_id]);

  const fetchAccounts = async () => {
    try {
      const res = await apiFetch<{ items: Account[] }>("/crm/accounts?page_size=100");
      setAccounts(res.items || []);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    }
  };

  const fetchContacts = async (accountId: string) => {
    try {
      const res = await apiFetch<{ items: Contact[] }>(`/crm/contacts?account_id=${accountId}&page_size=100`);
      setContacts(res.items || []);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        amount: formData.amount ? Number(formData.amount) : 0,
        contact_id: formData.contact_id || null,
        expected_close_date: formData.expected_close_date || null,
      };

      await apiFetch("/crm/opportunities", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      router.push("/crm/opportunities");
    } catch (error) {
      console.error("Failed to create opportunity:", error);
      alert("Lỗi khi tạo cơ hội mới");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-update probability when stage changes
      if (field === "stage" && typeof value === "string") {
        updated.probability = PROBABILITY_BY_STAGE[value] || 10;
      }
      return updated;
    });
  };

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
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-100 rounded-lg">
            <Target className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Thêm cơ hội mới</h1>
            <p className="text-gray-600">Tạo cơ hội bán hàng mới</p>
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
                Tên cơ hội <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="VD: Hợp đồng vận tải quý 1/2025"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Khách hàng <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={accounts.map((acc) => ({
                  value: acc.id,
                  label: acc.name,
                  subLabel: acc.code,
                }))}
                value={formData.account_id}
                onChange={(value) => handleChange("account_id", value)}
                placeholder="Tìm và chọn khách hàng..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Người liên hệ
              </label>
              <SearchableSelect
                options={contacts.map((contact) => ({
                  value: contact.id,
                  label: contact.full_name,
                  subLabel: contact.email || undefined,
                }))}
                value={formData.contact_id}
                onChange={(value) => handleChange("contact_id", value)}
                placeholder="Tìm và chọn người liên hệ..."
                disabled={!formData.account_id}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại dịch vụ
              </label>
              <input
                type="text"
                value={formData.service_type}
                onChange={(e) => handleChange("service_type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="VD: Vận tải đường bộ"
              />
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giai đoạn
              </label>
              <select
                value={formData.stage}
                onChange={(e) => handleChange("stage", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xác suất thành công (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => handleChange("probability", Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giá trị (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dự kiến chốt
              </label>
              <input
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => handleChange("expected_close_date", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Mô tả */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mô tả</h2>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Mô tả chi tiết về cơ hội này..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/crm/opportunities"
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
                Tạo cơ hội
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
