"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Loader2,
  RefreshCw,
  Truck,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import SearchableSelect from "@/components/SearchableSelect";
import BankSelect from "@/components/BankSelect";

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
  bank_name: string | null;
  bank_branch: string | null;
  bank_account: string | null;
  bank_account_name: string | null;
  default_pickup_address: string | null;
  default_delivery_address: string | null;
  commodity_types: string | null;
  volume_category: string | null;
  service_preferences: string | null;
  assigned_to: string | null;
  source: string | null;
  notes: string | null;
  synced_to_tms: boolean;
  tms_customer_id: string | null;
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
  { value: "COD", label: "COD - Thanh toán khi nhận hàng" },
  { value: "NET7", label: "NET7 - Thanh toán sau 7 ngày" },
  { value: "NET15", label: "NET15 - Thanh toán sau 15 ngày" },
  { value: "NET30", label: "NET30 - Thanh toán sau 30 ngày" },
  { value: "NET45", label: "NET45 - Thanh toán sau 45 ngày" },
  { value: "NET60", label: "NET60 - Thanh toán sau 60 ngày" },
  { value: "PREPAID", label: "Thanh toán trước" },
];

const SOURCE_OPTIONS = [
  { value: "REFERRAL", label: "Giới thiệu" },
  { value: "WEBSITE", label: "Website" },
  { value: "COLD_CALL", label: "Gọi điện" },
  { value: "EXHIBITION", label: "Triển lãm" },
  { value: "SOCIAL_MEDIA", label: "Mạng xã hội" },
  { value: "ADVERTISEMENT", label: "Quảng cáo" },
  { value: "OTHER", label: "Khác" },
];

export default function EditAccountPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  const [activeTab, setActiveTab] = useState<"general" | "financial" | "logistics" | "notes">("general");

  const [formData, setFormData] = useState({
    name: "",
    account_type: "CUSTOMER",
    status: "ACTIVE",
    industry: "",
    customer_group_id: "",
    tax_code: "",
    business_license: "",
    phone: "",
    fax: "",
    email: "",
    website: "",
    address: "",
    city: "",
    province: "",
    country: "VN",
    postal_code: "",
    payment_terms: "",
    credit_limit: 0,
    credit_days: 30,
    currency: "VND",
    bank_name: "",
    bank_branch: "",
    bank_account: "",
    bank_account_name: "",
    default_pickup_address: "",
    default_delivery_address: "",
    commodity_types: "",
    volume_category: "",
    service_preferences: "",
    assigned_to: "",
    source: "",
    notes: "",
  });

  const [syncInfo, setSyncInfo] = useState<{
    synced_to_tms: boolean;
    tms_customer_id: string | null;
  }>({
    synced_to_tms: false,
    tms_customer_id: null,
  });

  useEffect(() => {
    fetchData();
  }, [accountId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accountData, groupsData] = await Promise.all([
        apiFetch<Account>(`/crm/accounts/${accountId}`),
        apiFetch<{ items: CustomerGroup[] }>("/crm/customer-groups?page_size=100"),
      ]);

      setFormData({
        name: accountData.name || "",
        account_type: accountData.account_type || "CUSTOMER",
        status: accountData.status || "ACTIVE",
        industry: accountData.industry || "",
        customer_group_id: accountData.customer_group_id || "",
        tax_code: accountData.tax_code || "",
        business_license: accountData.business_license || "",
        phone: accountData.phone || "",
        fax: accountData.fax || "",
        email: accountData.email || "",
        website: accountData.website || "",
        address: accountData.address || "",
        city: accountData.city || "",
        province: accountData.province || "",
        country: accountData.country || "VN",
        postal_code: accountData.postal_code || "",
        payment_terms: accountData.payment_terms || "",
        credit_limit: accountData.credit_limit || 0,
        credit_days: accountData.credit_days || 30,
        currency: accountData.currency || "VND",
        bank_name: accountData.bank_name || "",
        bank_branch: accountData.bank_branch || "",
        bank_account: accountData.bank_account || "",
        bank_account_name: accountData.bank_account_name || "",
        default_pickup_address: accountData.default_pickup_address || "",
        default_delivery_address: accountData.default_delivery_address || "",
        commodity_types: accountData.commodity_types || "",
        volume_category: accountData.volume_category || "",
        service_preferences: accountData.service_preferences || "",
        assigned_to: accountData.assigned_to || "",
        source: accountData.source || "",
        notes: accountData.notes || "",
      });

      setSyncInfo({
        synced_to_tms: accountData.synced_to_tms,
        tms_customer_id: accountData.tms_customer_id,
      });

      setCustomerGroups(groupsData.items || []);
    } catch (error) {
      console.error("Failed to fetch account:", error);
      alert("Không thể tải thông tin khách hàng");
      router.push("/crm/accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await apiFetch(`/crm/accounts/${accountId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          customer_group_id: formData.customer_group_id || null,
        }),
      });

      router.push(`/crm/accounts/${accountId}`);
    } catch (error) {
      console.error("Failed to update account:", error);
      alert("Lỗi khi cập nhật khách hàng");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToTMS = async () => {
    setSyncing(true);
    try {
      const result = await apiFetch<{
        success: boolean;
        message: string;
        tms_customer_id: string;
      }>(`/crm/accounts/${accountId}/sync-to-tms`, {
        method: "POST",
      });

      if (result.success) {
        setSyncInfo({
          synced_to_tms: true,
          tms_customer_id: result.tms_customer_id,
        });
        alert("Đồng bộ sang TMS thành công!");
      }
    } catch (error) {
      console.error("Failed to sync to TMS:", error);
      alert("Lỗi khi đồng bộ sang TMS");
    } finally {
      setSyncing(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const tabs = [
    { id: "general", label: "Thông tin chung", icon: Building2 },
    { id: "financial", label: "Tài chính", icon: CreditCard },
    { id: "logistics", label: "Vận tải", icon: Truck },
    { id: "notes", label: "Ghi chú", icon: FileText },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/crm/accounts/${accountId}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại chi tiết
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa khách hàng</h1>
              <p className="text-gray-600">{formData.name}</p>
            </div>
          </div>

          {/* Sync to TMS Button */}
          <div className="flex items-center gap-3">
            {syncInfo.synced_to_tms ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                <Truck className="w-4 h-4" />
                <span className="text-sm">Đã sync TMS</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSyncToTMS}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 border border-orange-200"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Sync to TMS</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tab: General */}
        {activeTab === "general" && (
          <>
            {/* Thông tin cơ bản */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Thông tin cơ bản
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên khách hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                  <SearchableSelect
                    options={TYPE_OPTIONS}
                    value={formData.account_type}
                    onChange={(value) => handleChange("account_type", value)}
                    placeholder="Chọn loại..."
                    clearable={false}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <SearchableSelect
                    options={STATUS_OPTIONS}
                    value={formData.status}
                    onChange={(value) => handleChange("status", value)}
                    placeholder="Chọn trạng thái..."
                    clearable={false}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngành nghề</label>
                  <SearchableSelect
                    options={INDUSTRY_OPTIONS}
                    value={formData.industry}
                    onChange={(value) => handleChange("industry", value)}
                    placeholder="Chọn ngành nghề..."
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
                    value={formData.customer_group_id}
                    onChange={(value) => handleChange("customer_group_id", value)}
                    placeholder="Chọn nhóm..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã số thuế</label>
                  <input
                    type="text"
                    value={formData.tax_code}
                    onChange={(e) => handleChange("tax_code", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số ĐKKD</label>
                  <input
                    type="text"
                    value={formData.business_license}
                    onChange={(e) => handleChange("business_license", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn KH</label>
                  <SearchableSelect
                    options={SOURCE_OPTIONS}
                    value={formData.source}
                    onChange={(value) => handleChange("source", value)}
                    placeholder="Chọn nguồn..."
                  />
                </div>
              </div>
            </div>

            {/* Thông tin liên hệ */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-600" />
                Thông tin liên hệ
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                  <input
                    type="tel"
                    value={formData.fax}
                    onChange={(e) => handleChange("fax", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://"
                  />
                </div>
              </div>
            </div>

            {/* Địa chỉ */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                Địa chỉ
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/TP</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quận/Huyện</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => handleChange("province", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab: Financial */}
        {activeTab === "financial" && (
          <>
            {/* Thông tin thanh toán */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Thông tin thanh toán
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Điều khoản TT</label>
                  <SearchableSelect
                    options={PAYMENT_TERMS_OPTIONS}
                    value={formData.payment_terms}
                    onChange={(value) => handleChange("payment_terms", value)}
                    placeholder="Chọn điều khoản..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số ngày công nợ</label>
                  <input
                    type="number"
                    value={formData.credit_days}
                    onChange={(e) => handleChange("credit_days", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hạn mức công nợ</label>
                  <input
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => handleChange("credit_limit", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiền tệ</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Thông tin ngân hàng */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin ngân hàng</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
                  <BankSelect
                    value={formData.bank_name}
                    onChange={(value) => handleChange("bank_name", value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
                  <input
                    type="text"
                    value={formData.bank_branch}
                    onChange={(e) => handleChange("bank_branch", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                  <input
                    type="text"
                    value={formData.bank_account}
                    onChange={(e) => handleChange("bank_account", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên chủ TK</label>
                  <input
                    type="text"
                    value={formData.bank_account_name}
                    onChange={(e) => handleChange("bank_account_name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab: Logistics */}
        {activeTab === "logistics" && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-600" />
              Thông tin vận tải
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ lấy hàng mặc định
                </label>
                <input
                  type="text"
                  value={formData.default_pickup_address}
                  onChange={(e) => handleChange("default_pickup_address", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ giao hàng mặc định
                </label>
                <input
                  type="text"
                  value={formData.default_delivery_address}
                  onChange={(e) => handleChange("default_delivery_address", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại hàng hóa thường vận chuyển
                </label>
                <input
                  type="text"
                  value={formData.commodity_types}
                  onChange={(e) => handleChange("commodity_types", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Bao bì, Nhựa, Thực phẩm..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phân loại khối lượng
                </label>
                <select
                  value={formData.volume_category}
                  onChange={(e) => handleChange("volume_category", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chưa phân loại</option>
                  <option value="LOW">Thấp (dưới 10 chuyến/tháng)</option>
                  <option value="MEDIUM">Trung bình (10-50 chuyến/tháng)</option>
                  <option value="HIGH">Cao (trên 50 chuyến/tháng)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yêu cầu đặc biệt
                </label>
                <textarea
                  value={formData.service_preferences}
                  onChange={(e) => handleChange("service_preferences", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Xe có GPS, tài xế có CCCD, giao hàng trước 8h sáng..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Notes */}
        {activeTab === "notes" && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Ghi chú
            </h2>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ghi chú về khách hàng..."
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href={`/crm/accounts/${accountId}`}
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
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
