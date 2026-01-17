"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Save,
  Building2,
  Loader2,
  MapPin,
  CreditCard,
  Users,
  FileText,
  Settings,
  DollarSign,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import AddressManager from "@/components/customer/AddressManager";
import BankAccountManager from "@/components/customer/BankAccountManager";
import ContactManager from "@/components/customer/ContactManager";
import SearchableSelect from "@/components/SearchableSelect";

interface CustomerAddress {
  id?: string;
  account_id?: string;
  customer_id?: string;
  address_type: string;
  name?: string;
  address: string;
  ward?: string;
  district?: string;
  city?: string;
  country: string;
  postal_code?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  is_default: boolean;
  is_same_as_operating: boolean;
  notes?: string;
  is_active?: boolean;
}

interface CustomerBankAccount {
  id?: string;
  account_id?: string;
  customer_id?: string;
  bank_name: string;
  bank_code?: string;
  bank_bin?: string;
  bank_branch?: string;
  account_number: string;
  account_holder: string;
  is_primary: boolean;
  notes?: string;
  is_active?: boolean;
}

interface CustomerContact {
  id?: string;
  account_id?: string;
  customer_id?: string;
  contact_type: string;
  name: string;
  title?: string;
  department?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  is_primary: boolean;
  is_decision_maker: boolean;
  notes?: string;
  is_active?: boolean;
}

interface CustomerGroup {
  id: string;
  code: string;
  name: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  status: string;
  industry: string | null;
  customer_group_id: string | null;
  tax_code: string | null;
  business_license: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string;
  postal_code: string | null;
  payment_terms: string | null;
  credit_limit: number;
  credit_days: number;
  currency: string;
  assigned_to: string | null;
  source: string | null;
  notes: string | null;
  synced_to_tms: boolean;
  tms_customer_id: string | null;
  // Nested data
  addresses?: CustomerAddress[];
  bank_accounts?: CustomerBankAccount[];
  contacts?: CustomerContact[];
}

const TYPE_OPTIONS = [
  { value: "CUSTOMER", label: "Khách hàng" },
  { value: "VENDOR", label: "Nhà cung cấp" },
  { value: "PARTNER", label: "Đối tác" },
  { value: "BOTH", label: "KH & NCC" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
  { value: "PROSPECT", label: "Tiềm năng" },
  { value: "SUSPENDED", label: "Tạm ngừng" },
  { value: "BLACKLISTED", label: "Danh sách đen" },
];

const INDUSTRY_OPTIONS = [
  { value: "", label: "-- Chọn ngành nghề --" },
  { value: "LOGISTICS", label: "Logistics" },
  { value: "MANUFACTURING", label: "Sản xuất" },
  { value: "RETAIL", label: "Bán lẻ" },
  { value: "WHOLESALE", label: "Bán sỉ" },
  { value: "ECOMMERCE", label: "Thương mại điện tử" },
  { value: "IMPORT_EXPORT", label: "Xuất nhập khẩu" },
  { value: "FOOD_BEVERAGE", label: "Thực phẩm & Đồ uống" },
  { value: "CONSTRUCTION", label: "Xây dựng" },
  { value: "AGRICULTURE", label: "Nông nghiệp" },
  { value: "TECHNOLOGY", label: "Công nghệ" },
  { value: "HEALTHCARE", label: "Y tế" },
  { value: "OTHER", label: "Khác" },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: "", label: "-- Chọn điều khoản --" },
  { value: "COD", label: "COD - Thanh toán khi nhận hàng" },
  { value: "PREPAID", label: "Thanh toán trước" },
  { value: "NET15", label: "NET15 - Thanh toán sau 15 ngày" },
  { value: "NET30", label: "NET30 - Thanh toán sau 30 ngày" },
  { value: "NET45", label: "NET45 - Thanh toán sau 45 ngày" },
  { value: "NET60", label: "NET60 - Thanh toán sau 60 ngày" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "-- Chọn nguồn --" },
  { value: "REFERRAL", label: "Giới thiệu" },
  { value: "WEBSITE", label: "Website" },
  { value: "COLD_CALL", label: "Gọi điện" },
  { value: "EXHIBITION", label: "Triển lãm" },
  { value: "SOCIAL", label: "Mạng xã hội" },
  { value: "OTHER", label: "Khác" },
];

export default function AccountEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const t = useTranslations("tms.customerEdit");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [form, setForm] = useState<Partial<Account>>({});
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [bankAccounts, setBankAccounts] = useState<CustomerBankAccount[]>([]);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [accountData, groupsData] = await Promise.all([
        apiFetch<Account>(`/crm/accounts/${id}?include_relations=true`),
        apiFetch<{ items: CustomerGroup[] }>("/crm/customer-groups?page_size=100"),
      ]);

      setForm(accountData);
      setAddresses(accountData.addresses || []);
      setBankAccounts(accountData.bank_accounts || []);
      setContacts(accountData.contacts || []);
      setCustomerGroups(groupsData.items || []);
    } catch (error) {
      console.error("Failed to fetch account:", error);
      router.push("/crm/accounts");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [fetchData, router]);

  const handleChange = (field: keyof Account, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.code?.trim() || !form.name?.trim()) {
      alert("Vui lòng nhập mã và tên khách hàng");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/crm/accounts/${id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      router.push(`/crm/accounts/${id}`);
    } catch (error) {
      console.error("Failed to save account:", error);
      alert("Lỗi khi lưu thông tin");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "general", label: t("tabs.general"), icon: Settings },
    { id: "addresses", label: t("tabs.addresses"), icon: MapPin },
    { id: "bank_accounts", label: t("tabs.bankAccounts"), icon: CreditCard },
    { id: "contacts", label: t("tabs.contacts"), icon: Users },
    { id: "financial", label: t("tabs.financial"), icon: DollarSign },
    { id: "notes", label: t("tabs.notes"), icon: FileText },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/crm/accounts/${id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại chi tiết
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
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t("save")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        {/* Tab: Thông tin chung */}
        {activeTab === "general" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("general.code")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code || ""}
                  onChange={(e) => handleChange("code", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  required
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại KH</label>
                <SearchableSelect
                  options={TYPE_OPTIONS}
                  value={form.account_type || "CUSTOMER"}
                  onChange={(value) => handleChange("account_type", value)}
                  placeholder="Chọn loại..."
                  clearable={false}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("general.name")} <span className="text-red-500">*</span>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <SearchableSelect
                  options={STATUS_OPTIONS}
                  value={form.status || "ACTIVE"}
                  onChange={(value) => handleChange("status", value)}
                  placeholder="Chọn trạng thái..."
                  clearable={false}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm KH</label>
                <SearchableSelect
                  options={customerGroups.map((g) => ({
                    value: g.id,
                    label: g.name,
                    subLabel: g.code,
                  }))}
                  value={form.customer_group_id || ""}
                  onChange={(value) => handleChange("customer_group_id", value || null)}
                  placeholder="Chọn nhóm..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("general.taxCode")}</label>
                <input
                  type="text"
                  value={form.tax_code || ""}
                  onChange={(e) => handleChange("tax_code", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("general.businessLicense")}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("general.phone")}</label>
                <input
                  type="text"
                  value={form.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("general.email")}</label>
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("general.fax")}</label>
                <input
                  type="text"
                  value={form.fax || ""}
                  onChange={(e) => handleChange("fax", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("general.website")}</label>
                <input
                  type="url"
                  value={form.website || ""}
                  onChange={(e) => handleChange("website", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("general.industry")}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("general.source")}</label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
              <input
                type="text"
                value={form.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/TP</label>
                <input
                  type="text"
                  value={form.city || ""}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quận/Huyện</label>
                <input
                  type="text"
                  value={form.province || ""}
                  onChange={(e) => handleChange("province", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>
          </form>
        )}

        {/* Tab: Địa chỉ */}
        {activeTab === "addresses" && (
          <AddressManager
            customerId={id}
            addresses={addresses}
            onUpdate={fetchData}
            apiPrefix="/crm/accounts"
          />
        )}

        {/* Tab: Ngân hàng */}
        {activeTab === "bank_accounts" && (
          <BankAccountManager
            customerId={id}
            bankAccounts={bankAccounts}
            onUpdate={fetchData}
            apiPrefix="/crm/accounts"
          />
        )}

        {/* Tab: Liên hệ */}
        {activeTab === "contacts" && (
          <ContactManager
            customerId={id}
            contacts={contacts}
            onUpdate={fetchData}
            apiPrefix="/crm/accounts"
          />
        )}

        {/* Tab: Tài chính */}
        {activeTab === "financial" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900 border-b pb-2">{t("financial.title")}</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("financial.paymentTerms")}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("financial.creditDays")}</label>
                <input
                  type="number"
                  value={form.credit_days ?? 30}
                  onChange={(e) => handleChange("credit_days", parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("financial.creditLimit")}</label>
                <input
                  type="number"
                  value={form.credit_limit ?? 0}
                  onChange={(e) => handleChange("credit_limit", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                {t("financial.bankNote")}
              </p>
            </div>
          </div>
        )}

        {/* Tab: Ghi chú */}
        {activeTab === "notes" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("notes.label")}</label>
              <textarea
                value={form.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder={t("notes.placeholder")}
              />
            </div>
          </div>
        )}

        {/* Submit Button - only show for editable tabs */}
        {(activeTab === "general" || activeTab === "financial" || activeTab === "notes") && (
          <div className="mt-8 pt-6 border-t flex justify-end gap-3">
            <Link
              href={`/crm/accounts/${id}`}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t("cancel")}
            </Link>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t("saveChanges")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
