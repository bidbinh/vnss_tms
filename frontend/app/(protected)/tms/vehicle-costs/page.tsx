"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Search,
  Filter,
  Truck,
  Calendar,
  DollarSign,
  FileText,
  RefreshCw,
  Edit2,
  Trash2,
  ChevronDown,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calculator,
  TrendingDown,
  Shield,
  FileCheck,
  Route,
  Satellite,
  Landmark,
  CreditCard,
  ParkingCircle,
  MoreHorizontal,
  Copy,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ============================================================================
// HELPERS
// ============================================================================

// Format number với dấu phẩy phân cách hàng nghìn
const formatCurrency = (value: number | string): string => {
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  if (isNaN(num)) return "";
  return num.toLocaleString("vi-VN");
};

// Parse số từ chuỗi có format
const parseCurrency = (value: string): number => {
  const num = parseFloat(value.replace(/[,.]/g, "").replace(/\s/g, ""));
  return isNaN(num) ? 0 : num;
};

// ============================================================================
// TYPES
// ============================================================================

interface CostCategory {
  value: string;
  name: string;
  cost_type: string;
  allocation_method: string;
  default_months: number;
  description: string;
  requires_vehicle: boolean;
}

interface VehicleCost {
  id: string;
  vehicle_id: string | null;
  vehicle_plate: string | null;
  category: string;
  category_name: string;
  cost_type: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  effective_date: string;
  expiry_date: string | null;
  allocation_method: string;
  allocation_months: number | null;
  monthly_amount: number;
  cost_month: number | null;
  cost_year: number | null;
  reference_no: string | null;
  vendor: string | null;
  payment_status: string;
  paid_amount: number;
  paid_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface Vehicle {
  id: string;
  plate_no: string;
  type: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_ICONS: Record<string, typeof DollarSign> = {
  depreciation: TrendingDown,
  insurance: Shield,
  registration: FileCheck,
  road_tax: Route,
  gps_fee: Satellite,
  loan_interest: Landmark,
  etc_toll: CreditCard,
  parking: ParkingCircle,
  other: MoreHorizontal,
};

const CATEGORY_COLORS: Record<string, string> = {
  depreciation: "bg-purple-100 text-purple-700",
  insurance: "bg-blue-100 text-blue-700",
  registration: "bg-green-100 text-green-700",
  road_tax: "bg-orange-100 text-orange-700",
  gps_fee: "bg-cyan-100 text-cyan-700",
  loan_interest: "bg-red-100 text-red-700",
  etc_toll: "bg-yellow-100 text-yellow-700",
  parking: "bg-gray-100 text-gray-700",
  other: "bg-slate-100 text-slate-700",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function VehicleCostsPage() {
  const t = useTranslations("tms.vehicleCostsPage");

  // Data states
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVehicle, setFilterVehicle] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");  // "" = tất cả
  const [filterMonth, setFilterMonth] = useState<string>("");  // "" = tất cả

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCost, setEditingCost] = useState<VehicleCost | null>(null);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    category: "",
    name: "",
    description: "",
    amount: 0,
    effective_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
    allocation_months: 12,
    cost_month: new Date().getMonth() + 1,
    cost_year: new Date().getFullYear(),
    reference_no: "",
    vendor: "",
    payment_status: "unpaid",
    paid_amount: 0,
    paid_date: "",
  });

  // Fetch data
  const fetchCosts = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/vehicle-costs?is_active=true`;
      if (filterYear) url += `&year=${filterYear}`;
      if (filterMonth) url += `&month=${filterMonth}`;
      if (filterVehicle) url += `&vehicle_id=${filterVehicle}`;
      if (filterCategory) url += `&category=${filterCategory}`;

      const data = await apiFetch<VehicleCost[]>(url);
      setCosts(data);
    } catch (err) {
      console.error("Failed to fetch costs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filterYear, filterMonth, filterVehicle, filterCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiFetch<CostCategory[]>("/vehicle-costs/categories");
      setCategories(data);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, []);

  const fetchVehicles = useCallback(async () => {
    try {
      const data = await apiFetch<Vehicle[]>("/vehicles");
      setVehicles(data);
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchVehicles();
  }, [fetchCategories, fetchVehicles]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  // Handle form
  const handleOpenModal = (cost?: VehicleCost) => {
    if (cost) {
      setEditingCost(cost);
      setFormData({
        vehicle_id: cost.vehicle_id || "",
        category: cost.category,
        name: cost.name,
        description: cost.description || "",
        amount: cost.amount,
        effective_date: cost.effective_date,
        expiry_date: cost.expiry_date || "",
        allocation_months: cost.allocation_months || 12,
        cost_month: cost.cost_month || new Date().getMonth() + 1,
        cost_year: cost.cost_year || new Date().getFullYear(),
        reference_no: cost.reference_no || "",
        vendor: cost.vendor || "",
        payment_status: cost.payment_status,
        paid_amount: cost.paid_amount,
        paid_date: cost.paid_date || "",
      });
    } else {
      setEditingCost(null);
      setFormData({
        vehicle_id: "",
        category: "",
        name: "",
        description: "",
        amount: 0,
        effective_date: new Date().toISOString().split("T")[0],
        expiry_date: "",
        allocation_months: 12,
        cost_month: new Date().getMonth() + 1,
        cost_year: new Date().getFullYear(),
        reference_no: "",
        vendor: "",
        payment_status: "unpaid",
        paid_amount: 0,
        paid_date: "",
      });
    }
    setShowModal(true);
  };

  const handleCategoryChange = (categoryValue: string) => {
    const cat = categories.find((c) => c.value === categoryValue);
    setFormData({
      ...formData,
      category: categoryValue,
      name: cat?.name || "",
      allocation_months: cat?.default_months || 12,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCost) {
        await apiFetch(`/vehicle-costs/${editingCost.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            amount: formData.amount,
            effective_date: formData.effective_date,
            expiry_date: formData.expiry_date || null,
            allocation_months: formData.allocation_months,
            cost_month: formData.cost_month,
            cost_year: formData.cost_year,
            reference_no: formData.reference_no || null,
            vendor: formData.vendor || null,
            payment_status: formData.payment_status,
            paid_amount: formData.paid_amount,
            paid_date: formData.paid_date || null,
          }),
        });
      } else {
        await apiFetch("/vehicle-costs", {
          method: "POST",
          body: JSON.stringify({
            vehicle_id: formData.vehicle_id || null,
            category: formData.category,
            name: formData.name,
            description: formData.description || null,
            amount: formData.amount,
            effective_date: formData.effective_date,
            expiry_date: formData.expiry_date || null,
            allocation_months: formData.allocation_months,
            cost_month: formData.cost_month,
            cost_year: formData.cost_year,
            reference_no: formData.reference_no || null,
            vendor: formData.vendor || null,
            payment_status: formData.payment_status,
            paid_amount: formData.paid_amount,
            paid_date: formData.paid_date || null,
          }),
        });
      }

      setShowModal(false);
      fetchCosts();
    } catch (err: any) {
      alert(err.message || t("errors.generic"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmations.delete"))) return;

    try {
      await apiFetch(`/vehicle-costs/${id}`, { method: "DELETE" });
      fetchCosts();
    } catch (err: any) {
      alert(err.message || t("errors.generic"));
    }
  };

  const handleDuplicate = (cost: VehicleCost) => {
    // Mở modal với dữ liệu từ cost hiện tại nhưng không có ID (tạo mới)
    setEditingCost(null);
    setFormData({
      vehicle_id: cost.vehicle_id || "",
      category: cost.category,
      name: cost.name,
      description: cost.description || "",
      amount: cost.amount,
      effective_date: cost.effective_date,
      expiry_date: cost.expiry_date || "",
      allocation_months: cost.allocation_months || 12,
      cost_month: cost.cost_month || new Date().getMonth() + 1,
      cost_year: cost.cost_year || new Date().getFullYear(),
      reference_no: cost.reference_no || "",
      vendor: cost.vendor || "",
      payment_status: cost.payment_status,
      paid_amount: cost.paid_amount,
      paid_date: cost.paid_date || "",
    });
    setShowModal(true);
  };

  // Calculate totals
  const totalAmount = costs.reduce((sum, c) => sum + c.amount, 0);

  // Phân bổ/tháng: Tính trung bình khi không chọn tháng cụ thể
  const calculateMonthlyTotal = () => {
    if (filterMonth && filterYear) {
      // Đã chọn tháng cụ thể: tính tổng phân bổ của tháng đó
      const seenRecurringCosts = new Set<string>();
      return Math.round(
        costs.reduce((sum, c) => {
          if (c.cost_type === "recurring") {
            if (!seenRecurringCosts.has(c.id)) {
              seenRecurringCosts.add(c.id);
              return sum + c.monthly_amount;
            }
            return sum;
          } else {
            return sum + c.monthly_amount;
          }
        }, 0)
      );
    } else {
      // Không chọn tháng cụ thể: tính trung bình theo số tháng có dữ liệu
      // CHÚ Ý: Chi phí recurring chỉ tính đến tháng hiện tại (không tính tương lai)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12

      // Group chi phí theo tháng/năm
      const monthlyTotals = new Map<string, number>();
      const seenRecurringPerMonth = new Map<string, Set<string>>();

      costs.forEach((c) => {
        // Xác định tháng/năm của chi phí
        let months: string[] = [];

        if (c.cost_type === "recurring") {
          // Chi phí recurring: phân bổ theo allocation_months từ effective_date
          // Nhưng chỉ tính đến tháng hiện tại (không tính tương lai)
          const startDate = new Date(c.effective_date);
          const allocationMonths = c.allocation_months || 12;
          for (let i = 0; i < allocationMonths; i++) {
            const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
            const allocYear = d.getFullYear();
            const allocMonth = d.getMonth() + 1;

            // Chỉ tính nếu <= tháng hiện tại
            if (allocYear < currentYear || (allocYear === currentYear && allocMonth <= currentMonth)) {
              months.push(`${allocYear}-${allocMonth}`);
            }
          }
        } else {
          // Chi phí variable: chỉ tính cho tháng cost_month/cost_year
          if (c.cost_month && c.cost_year) {
            // Variable cũng chỉ tính nếu <= tháng hiện tại
            if (c.cost_year < currentYear || (c.cost_year === currentYear && c.cost_month <= currentMonth)) {
              months.push(`${c.cost_year}-${c.cost_month}`);
            }
          }
        }

        // Cộng vào từng tháng
        months.forEach((monthKey) => {
          if (!monthlyTotals.has(monthKey)) {
            monthlyTotals.set(monthKey, 0);
            seenRecurringPerMonth.set(monthKey, new Set());
          }

          if (c.cost_type === "recurring") {
            const seen = seenRecurringPerMonth.get(monthKey)!;
            if (!seen.has(c.id)) {
              seen.add(c.id);
              monthlyTotals.set(monthKey, monthlyTotals.get(monthKey)! + c.monthly_amount);
            }
          } else {
            monthlyTotals.set(monthKey, monthlyTotals.get(monthKey)! + c.monthly_amount);
          }
        });
      });

      // Tính trung bình
      if (monthlyTotals.size === 0) return 0;
      const totalAllMonths = Array.from(monthlyTotals.values()).reduce((a, b) => a + b, 0);
      return Math.round(totalAllMonths / monthlyTotals.size);
    }
  };

  const totalMonthly = calculateMonthlyTotal();
  const isAverageMode = !filterMonth || !filterYear;

  // Filter costs
  const filteredCosts = costs.filter((c) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(search) ||
        c.vehicle_plate?.toLowerCase().includes(search) ||
        c.vendor?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Get selected category config
  const selectedCategory = categories.find((c) => c.value === formData.category);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-7 h-7 text-blue-600" />
            {t("title")}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("addCost")}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("summary.totalCosts")}</p>
              <p className="text-xl font-bold text-gray-900">
                {totalAmount.toLocaleString("vi-VN")} {t("currency")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {isAverageMode ? t("summary.monthlyAverage") : t("summary.monthlyAllocation")}
              </p>
              <p className="text-xl font-bold text-gray-900">
                {totalMonthly.toLocaleString("vi-VN")} {t("currency")}
              </p>
              {isAverageMode && (
                <p className="text-xs text-gray-400">({t("summary.average")})</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("summary.costItems")}</p>
              <p className="text-xl font-bold text-gray-900">{costs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("summary.vehiclesWithCosts")}</p>
              <p className="text-xl font-bold text-gray-900">
                {new Set(costs.filter((c) => c.vehicle_id).map((c) => c.vehicle_id)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Vehicle Filter */}
          <select
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("filters.allVehicles")}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate_no}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("filters.allTypes")}</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Year */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("filters.allYears")}</option>
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Month */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("filters.allMonths")}</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {t(`months.${m}`)}
              </option>
            ))}
          </select>

          {/* Refresh */}
          <button
            onClick={() => fetchCosts()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title={t("actions.refresh")}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Cost List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">{t("loading")}</div>
        ) : filteredCosts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{t("noData")}</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-2 text-blue-600 hover:underline"
            >
              {t("addNewCost")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("columns.costType")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("columns.nameDescription")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("columns.vehicle")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("columns.totalValue")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("columns.monthlyAllocation")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("columns.period")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("columns.payment")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCosts.map((cost) => {
                  const Icon = CATEGORY_ICONS[cost.category] || DollarSign;
                  const colorClass = CATEGORY_COLORS[cost.category] || "bg-gray-100 text-gray-700";
                  const paymentStatusColor = PAYMENT_STATUS_COLORS[cost.payment_status] || "bg-gray-100 text-gray-700";

                  return (
                    <tr key={cost.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg ${colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="font-medium text-gray-900">{cost.category_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{cost.name}</p>
                          {cost.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {cost.description}
                            </p>
                          )}
                          {cost.vendor && (
                            <p className="text-xs text-gray-400">{t("table.vendor")}: {cost.vendor}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {cost.vehicle_plate ? (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium">
                            {cost.vehicle_plate}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">{t("table.shared")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-900">
                          {cost.amount.toLocaleString("vi-VN")}
                        </span>
                        <span className="text-gray-500 text-sm ml-1">{t("currency")}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-blue-600 font-medium">
                          {Math.round(cost.monthly_amount).toLocaleString("vi-VN")}
                        </span>
                        <span className="text-gray-500 text-sm ml-1">{t("currency")}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {cost.cost_type === "recurring" ? (
                            <>
                              <p className="text-gray-900">
                                {new Date(cost.effective_date).toLocaleDateString("vi-VN")}
                              </p>
                              {cost.expiry_date && (
                                <p className="text-gray-500">
                                  → {new Date(cost.expiry_date).toLocaleDateString("vi-VN")}
                                </p>
                              )}
                              <p className="text-xs text-gray-400">
                                {cost.allocation_months} {t("table.months")}
                              </p>
                            </>
                          ) : (
                            <p className="text-gray-900">
                              {t(`months.${cost.cost_month}`)}/{cost.cost_year}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${paymentStatusColor}`}>
                          {t(`paymentStatuses.${cost.payment_status}`)}
                        </span>
                        {cost.paid_amount > 0 && cost.paid_amount < cost.amount && (
                          <p className="text-xs text-gray-500 mt-1">
                            {t("table.paid")}: {cost.paid_amount.toLocaleString("vi-VN")}{t("currency")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDuplicate(cost)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title={t("actions.duplicate")}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(cost)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                            title={t("actions.edit")}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cost.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title={t("actions.delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingCost ? t("modal.editTitle") : t("modal.createTitle")}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.costType")} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t("modal.selectCostType")}</option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.name} - {c.description}
                    </option>
                  ))}
                </select>
                {selectedCategory && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t("modal.type")}: {selectedCategory.cost_type === "recurring" ? t("modal.recurring") : t("modal.variable")} |
                    {t("modal.default")}: {selectedCategory.default_months} {t("table.months")}
                  </p>
                )}
              </div>

              {/* Vehicle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.vehicle")} {selectedCategory?.requires_vehicle && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required={selectedCategory?.requires_vehicle}
                >
                  <option value="">{t("modal.sharedAllVehicles")}</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate_no} - {v.type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.costName")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("modal.costNamePlaceholder")}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.amount")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formatCurrency(formData.amount)}
                  onChange={(e) => setFormData({ ...formData, amount: parseCurrency(e.target.value) })}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-right"
                  required
                />
              </div>

              {/* Dates - for recurring costs */}
              {selectedCategory?.cost_type === "recurring" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("modal.startDate")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.effective_date}
                      onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("modal.endDate")}
                    </label>
                    <input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Allocation months - for recurring */}
              {selectedCategory?.cost_type === "recurring" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("modal.allocationMonths")}
                  </label>
                  <input
                    type="number"
                    value={formData.allocation_months}
                    onChange={(e) =>
                      setFormData({ ...formData, allocation_months: Number(e.target.value) })
                    }
                    min={1}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t("modal.monthlyAllocationHint")}:{" "}
                    <span className="font-medium text-blue-600">
                      {Math.round(formData.amount / (formData.allocation_months || 1)).toLocaleString(
                        "vi-VN"
                      )}{" "}
                      {t("currency")}
                    </span>
                  </p>
                </div>
              )}

              {/* Month/Year - for variable costs */}
              {selectedCategory?.cost_type === "variable" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.month")}</label>
                    <select
                      value={formData.cost_month}
                      onChange={(e) =>
                        setFormData({ ...formData, cost_month: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {t(`months.${m}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.year")}</label>
                    <select
                      value={formData.cost_year}
                      onChange={(e) =>
                        setFormData({ ...formData, cost_year: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Vendor & Reference */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("modal.vendor")}
                  </label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder={t("modal.vendorPlaceholder")}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("modal.invoiceNumber")}
                  </label>
                  <input
                    type="text"
                    value={formData.reference_no}
                    onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                    placeholder={t("modal.invoiceNumberPlaceholder")}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Payment */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("modal.paymentStatus")}
                  </label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="unpaid">{t("paymentStatuses.unpaid")}</option>
                    <option value="partial">{t("paymentStatuses.partial")}</option>
                    <option value="paid">{t("paymentStatuses.paid")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.paidAmount")}</label>
                  <input
                    type="text"
                    value={formatCurrency(formData.paid_amount)}
                    onChange={(e) =>
                      setFormData({ ...formData, paid_amount: parseCurrency(e.target.value) })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.paidDate")}</label>
                  <input
                    type="date"
                    value={formData.paid_date}
                    onChange={(e) => setFormData({ ...formData, paid_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.notes")}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                >
                  {t("modal.cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCost ? t("modal.update") : t("modal.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
