"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, FileText, Plus, Trash2, Truck, Warehouse, Car, Ship, Package } from "lucide-react";
import { apiFetch } from "@/lib/api";
import SearchableSelect from "@/components/SearchableSelect";

interface Account {
  id: string;
  code: string;
  name: string;
}

interface Opportunity {
  id: string;
  code: string;
  name: string;
}

// Service categories
const SERVICE_CATEGORIES = [
  { value: "TMS", label: "Vận tải (TMS)", icon: Truck, color: "bg-blue-100 text-blue-600" },
  { value: "WMS", label: "Kho bãi (WMS)", icon: Warehouse, color: "bg-green-100 text-green-600" },
  { value: "FMS", label: "Quản lý đội xe (FMS)", icon: Car, color: "bg-purple-100 text-purple-600" },
  { value: "CUSTOMS", label: "Thủ tục hải quan", icon: Ship, color: "bg-orange-100 text-orange-600" },
  { value: "FREIGHT", label: "Giao nhận vận tải", icon: Package, color: "bg-cyan-100 text-cyan-600" },
  { value: "VALUE_ADDED", label: "Dịch vụ GTGT", icon: Package, color: "bg-pink-100 text-pink-600" },
  { value: "OTHER", label: "Khác", icon: Package, color: "bg-gray-100 text-gray-600" },
];

// Service types by category
const SERVICE_TYPES: Record<string, { value: string; label: string }[]> = {
  TMS: [
    { value: "FTL", label: "Nguyên xe (FTL)" },
    { value: "LTL", label: "Ghép hàng (LTL)" },
    { value: "FCL", label: "Nguyên container (FCL)" },
    { value: "LCL", label: "Lẻ container (LCL)" },
    { value: "ROAD", label: "Đường bộ" },
    { value: "SEA", label: "Đường biển" },
    { value: "AIR", label: "Đường hàng không" },
    { value: "RAIL", label: "Đường sắt" },
  ],
  WMS: [
    { value: "STORAGE", label: "Lưu kho" },
    { value: "HANDLING", label: "Bốc xếp" },
    { value: "PACKING", label: "Đóng gói" },
    { value: "CROSS_DOCK", label: "Cross-docking" },
    { value: "FULFILLMENT", label: "Fulfillment" },
  ],
  FMS: [
    { value: "LEASE", label: "Cho thuê xe" },
    { value: "MAINTENANCE", label: "Bảo trì" },
    { value: "GPS_TRACKING", label: "Giám sát GPS" },
    { value: "FUEL", label: "Quản lý nhiên liệu" },
  ],
  CUSTOMS: [
    { value: "IMPORT", label: "Nhập khẩu" },
    { value: "EXPORT", label: "Xuất khẩu" },
    { value: "TRANSIT", label: "Quá cảnh" },
    { value: "CONSULTING", label: "Tư vấn" },
  ],
  FREIGHT: [
    { value: "DOMESTIC", label: "Nội địa" },
    { value: "INTERNATIONAL", label: "Quốc tế" },
    { value: "PROJECT_CARGO", label: "Hàng dự án" },
  ],
  VALUE_ADDED: [
    { value: "INSURANCE", label: "Bảo hiểm" },
    { value: "CONSULTING", label: "Tư vấn" },
    { value: "DOCUMENTATION", label: "Chứng từ" },
  ],
  OTHER: [{ value: "OTHER", label: "Khác" }],
};

// Units by category
const UNITS: Record<string, { value: string; label: string }[]> = {
  TMS: [
    { value: "TRIP", label: "Chuyến" },
    { value: "CONT", label: "Container" },
    { value: "KG", label: "Kg" },
    { value: "TON", label: "Tấn" },
    { value: "CBM", label: "CBM" },
  ],
  WMS: [
    { value: "PALLET", label: "Pallet" },
    { value: "CBM", label: "CBM" },
    { value: "DAY", label: "Ngày" },
    { value: "MONTH", label: "Tháng" },
    { value: "PIECE", label: "Kiện" },
  ],
  FMS: [
    { value: "VEHICLE", label: "Xe" },
    { value: "DAY", label: "Ngày" },
    { value: "MONTH", label: "Tháng" },
    { value: "KM", label: "Km" },
  ],
  CUSTOMS: [
    { value: "SHIPMENT", label: "Lô hàng" },
    { value: "DECLARATION", label: "Tờ khai" },
  ],
  FREIGHT: [
    { value: "SHIPMENT", label: "Lô hàng" },
    { value: "CONT", label: "Container" },
    { value: "KG", label: "Kg" },
    { value: "CBM", label: "CBM" },
  ],
  VALUE_ADDED: [
    { value: "ITEM", label: "Đơn vị" },
    { value: "SHIPMENT", label: "Lô hàng" },
  ],
  OTHER: [{ value: "ITEM", label: "Đơn vị" }],
};

interface QuoteItem {
  service_category: string;
  service_type: string;
  description: string;
  route: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
}

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAccountId = searchParams.get("account_id");
  const preselectedOppId = searchParams.get("opportunity_id");

  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [formData, setFormData] = useState({
    account_id: preselectedAccountId || "",
    opportunity_id: preselectedOppId || "",
    valid_days: 30,
    payment_terms: "",
    notes: "",
  });
  const [items, setItems] = useState<QuoteItem[]>([
    {
      service_category: "TMS",
      service_type: "FTL",
      description: "",
      route: "",
      quantity: 1,
      unit: "TRIP",
      unit_price: 0,
      discount_percent: 0,
    },
  ]);

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
      fetchOpportunities(formData.account_id);
    } else {
      setOpportunities([]);
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

  const fetchOpportunities = async (accountId: string) => {
    try {
      const res = await apiFetch<{ items: Opportunity[] }>(
        `/crm/opportunities?account_id=${accountId}&page_size=50`
      );
      setOpportunities(res.items || []);
    } catch (error) {
      console.error("Failed to fetch opportunities:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        account_id: formData.account_id,
        opportunity_id: formData.opportunity_id || null,
        valid_days: formData.valid_days,
        payment_terms: formData.payment_terms || null,
        notes: formData.notes || null,
        items: items
          .filter((item) => item.description)
          .map((item) => ({
            service_category: item.service_category,
            service_type: item.service_type,
            description: item.description,
            route: item.route || null,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
          })),
      };

      await apiFetch("/crm/quotes", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      router.push("/crm/quotes");
    } catch (error) {
      console.error("Failed to create quote:", error);
      alert("Lỗi khi tạo báo giá mới");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Reset service_type and unit when category changes
      if (field === "service_category") {
        const category = value as string;
        const serviceTypes = SERVICE_TYPES[category] || [];
        const units = UNITS[category] || [];
        updated[index].service_type = serviceTypes[0]?.value || "";
        updated[index].unit = units[0]?.value || "";
      }

      return updated;
    });
  };

  const addItem = (category: string = "TMS") => {
    const serviceTypes = SERVICE_TYPES[category] || [];
    const units = UNITS[category] || [];
    setItems((prev) => [
      ...prev,
      {
        service_category: category,
        service_type: serviceTypes[0]?.value || "",
        description: "",
        route: "",
        quantity: 1,
        unit: units[0]?.value || "",
        unit_price: 0,
        discount_percent: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const calculateItemTotal = (item: QuoteItem) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = (subtotal * item.discount_percent) / 100;
    return subtotal - discountAmount;
  };

  const totalAmount = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const getCategoryIcon = (category: string) => {
    const cat = SERVICE_CATEGORIES.find((c) => c.value === category);
    return cat?.icon || Package;
  };

  const getCategoryColor = (category: string) => {
    const cat = SERVICE_CATEGORIES.find((c) => c.value === category);
    return cat?.color || "bg-gray-100 text-gray-600";
  };

  // Group items by category
  const itemsByCategory = items.reduce((acc, item, index) => {
    if (!acc[item.service_category]) {
      acc[item.service_category] = [];
    }
    acc[item.service_category].push({ ...item, index });
    return acc;
  }, {} as Record<string, (QuoteItem & { index: number })[]>);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/crm/quotes"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-lg">
            <FileText className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tạo báo giá mới</h1>
            <p className="text-gray-600">Tạo báo giá đa dịch vụ cho khách hàng</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Thông tin cơ bản */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                Cơ hội liên quan
              </label>
              <SearchableSelect
                options={opportunities.map((opp) => ({
                  value: opp.id,
                  label: opp.name,
                  subLabel: opp.code,
                }))}
                value={formData.opportunity_id}
                onChange={(value) => handleChange("opportunity_id", value)}
                placeholder="Tìm và chọn cơ hội..."
                disabled={!formData.account_id}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hiệu lực (ngày)
              </label>
              <input
                type="number"
                min="1"
                value={formData.valid_days}
                onChange={(e) => handleChange("valid_days", Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Điều khoản thanh toán
              </label>
              <input
                type="text"
                value={formData.payment_terms}
                onChange={(e) => handleChange("payment_terms", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="VD: 30 ngày sau khi..."
              />
            </div>
          </div>
        </div>

        {/* Quick add buttons */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Thêm dịch vụ nhanh</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {SERVICE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => addItem(cat.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cat.color} hover:opacity-80 transition`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chi tiết báo giá */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Chi tiết báo giá</h2>
            <div className="text-sm text-gray-500">
              Tổng: <span className="font-bold text-green-600 text-lg">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const Icon = getCategoryIcon(item.service_category);
              const colorClass = getCategoryColor(item.service_category);
              const serviceTypes = SERVICE_TYPES[item.service_category] || [];
              const units = UNITS[item.service_category] || [];

              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
                >
                  <div className="flex items-start gap-4">
                    {/* Category Icon */}
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Item Content */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3">
                      {/* Category */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Danh mục
                        </label>
                        <SearchableSelect
                          options={SERVICE_CATEGORIES.map((c) => ({
                            value: c.value,
                            label: c.label,
                          }))}
                          value={item.service_category}
                          onChange={(value) => handleItemChange(index, "service_category", value)}
                          placeholder="Chọn..."
                          clearable={false}
                        />
                      </div>

                      {/* Service Type */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Loại dịch vụ
                        </label>
                        <SearchableSelect
                          options={serviceTypes.map((t) => ({
                            value: t.value,
                            label: t.label,
                          }))}
                          value={item.service_type}
                          onChange={(value) => handleItemChange(index, "service_type", value)}
                          placeholder="Chọn..."
                          clearable={false}
                        />
                      </div>

                      {/* Description */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Mô tả <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                          placeholder="VD: Vận chuyển HCM - HN"
                        />
                      </div>

                      {/* Route (for TMS) */}
                      {item.service_category === "TMS" && (
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Tuyến đường
                          </label>
                          <input
                            type="text"
                            value={item.route}
                            onChange={(e) => handleItemChange(index, "route", e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                            placeholder="VD: HCM - Hà Nội"
                          />
                        </div>
                      )}
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Pricing row */}
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Số lượng
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Đơn vị
                      </label>
                      <SearchableSelect
                        options={units.map((u) => ({
                          value: u.value,
                          label: u.label,
                        }))}
                        value={item.unit}
                        onChange={(value) => handleItemChange(index, "unit", value)}
                        placeholder="Chọn..."
                        clearable={false}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Đơn giá
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, "unit_price", Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Chiết khấu (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount_percent}
                        onChange={(e) =>
                          handleItemChange(index, "discount_percent", Number(e.target.value))
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Thành tiền
                      </label>
                      <div className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right font-semibold text-green-600">
                        {formatCurrency(calculateItemTotal(item))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="mt-6 pt-4 border-t-2 border-gray-200 flex justify-end">
            <div className="text-right">
              <div className="text-sm text-gray-500">Tổng cộng</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
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
            placeholder="Điều khoản, điều kiện thanh toán, ghi chú khác..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/crm/quotes"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={saving || !formData.account_id}
            className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Tạo báo giá
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewQuotePage() {
  return (
    <Suspense fallback={<div className="p-6">Đang tải...</div>}>
      <PageContent />
    </Suspense>
  );
}
