"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  Package,
  Users,
  Users2,
  Calculator,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Route,
  Anchor,
  Zap,
  PiggyBank,
  FolderKanban,
  Workflow,
  FolderOpen,
  Factory,
  GripVertical,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// Default module order (same as sidebar)
const DEFAULT_MODULE_ORDER = [
  "tms", "wms", "fms", "pms", "ems", "mes",
  "crm", "hrm", "accounting", "controlling",
  "project", "workflow", "dms"
];

// Icon mapping for modules
const MODULE_ICONS: Record<string, LucideIcon> = {
  tms: Truck,
  wms: Package,
  fms: Route,
  pms: Anchor,
  ems: Zap,
  mes: Factory,
  crm: Users2,
  hrm: Users,
  accounting: Calculator,
  controlling: PiggyBank,
  project: FolderKanban,
  workflow: Workflow,
  dms: FolderOpen,
};

// Subtle pastel background colors for module headers
const MODULE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  tms: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500" },
  wms: { bg: "bg-purple-50", text: "text-purple-700", icon: "text-purple-500" },
  fms: { bg: "bg-indigo-50", text: "text-indigo-700", icon: "text-indigo-500" },
  pms: { bg: "bg-cyan-50", text: "text-cyan-700", icon: "text-cyan-500" },
  ems: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-500" },
  mes: { bg: "bg-slate-100", text: "text-slate-700", icon: "text-slate-500" },
  crm: { bg: "bg-orange-50", text: "text-orange-700", icon: "text-orange-500" },
  hrm: { bg: "bg-green-50", text: "text-green-700", icon: "text-green-500" },
  accounting: { bg: "bg-teal-50", text: "text-teal-700", icon: "text-teal-500" },
  controlling: { bg: "bg-pink-50", text: "text-pink-700", icon: "text-pink-500" },
  project: { bg: "bg-violet-50", text: "text-violet-700", icon: "text-violet-500" },
  workflow: { bg: "bg-rose-50", text: "text-rose-700", icon: "text-rose-500" },
  dms: { bg: "bg-yellow-50", text: "text-yellow-700", icon: "text-yellow-500" },
};

// Button outline colors for "Truy cập" button (border + text, hover fills bg)
const MODULE_BUTTON_COLORS: Record<string, string> = {
  tms: "border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white",
  wms: "border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white",
  fms: "border-indigo-500 text-indigo-600 hover:bg-indigo-500 hover:text-white",
  pms: "border-cyan-500 text-cyan-600 hover:bg-cyan-500 hover:text-white",
  ems: "border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white",
  mes: "border-slate-500 text-slate-600 hover:bg-slate-500 hover:text-white",
  crm: "border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white",
  hrm: "border-green-500 text-green-600 hover:bg-green-500 hover:text-white",
  accounting: "border-teal-500 text-teal-600 hover:bg-teal-500 hover:text-white",
  controlling: "border-pink-500 text-pink-600 hover:bg-pink-500 hover:text-white",
  project: "border-violet-500 text-violet-600 hover:bg-violet-500 hover:text-white",
  workflow: "border-rose-500 text-rose-600 hover:bg-rose-500 hover:text-white",
  dms: "border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-white",
};

// Default stats labels for each module
const MODULE_STAT_LABELS: Record<string, string[]> = {
  tms: ["Chuyến xe", "Xe", "Tài xế"],
  wms: ["Sản phẩm", "Đơn nhập", "Đơn xuất"],
  fms: ["Lô hàng", "Shipments", "Tờ khai"],
  pms: ["Cont trong bãi", "Xe chờ", "Tàu cập cảng"],
  ems: ["Đơn hôm nay", "Đang giao", "COD thu"],
  mes: ["Lệnh SX", "Đang SX", "Hoàn thành"],
  crm: ["Khách hàng", "Cơ hội", "Báo giá"],
  hrm: ["Nhân viên", "Nghỉ phép", "Tuyển dụng"],
  accounting: ["Phải thu", "Phải trả", "Số dư"],
  controlling: ["Cost Centers", "Ngân sách", "Variance"],
  project: ["Dự án", "Tasks", "Milestones"],
  workflow: ["Quy trình", "Chờ duyệt", "Hoàn thành"],
  dms: ["Tài liệu", "Thư mục", "Chia sẻ"],
};

interface ModuleFromAPI {
  id: string;
  name: string;
  fullName: string;
  description: string;
  color: string;
  href: string;
  enabled: boolean;
}

interface TenantMeResponse {
  tenant: {
    id: string;
    name: string;
    code: string;
    type: string;
    logo_url: string | null;
    primary_color: string | null;
    subscription_plan: string;
    subscription_status: string;
    timezone: string;
    currency: string;
    locale: string;
    is_active: boolean;
  };
  modules: ModuleFromAPI[];
  enabled_module_ids: string[];
}

interface ModuleCard {
  id: string;
  name: string;
  fullName: string;
  description: string;
  icon: LucideIcon;
  href: string;
  enabled: boolean;
  colors: { bg: string; text: string; icon: string };
  stats?: { label: string; value: string | number }[];
}

// Format number with K, M suffix
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

// Format currency
function formatCurrency(amount: number): string {
  if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + "B";
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + "M";
  if (amount >= 1000) return (amount / 1000).toFixed(0) + "K";
  return amount.toString();
}

export default function PlatformDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<ModuleCard[]>([]);
  const [tenantName, setTenantName] = useState<string>("");
  const [moduleStats, setModuleStats] = useState<Record<string, { label: string; value: string | number }[]>>({});
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [moduleOrder, setModuleOrder] = useState<string[]>([]);
  const [draggedModule, setDraggedModule] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    // Fetch tenant's enabled modules from API
    const fetchTenantModules = async () => {
      try {
        const data = await apiFetch<TenantMeResponse>("/tenant/me");
        setTenantName(data.tenant.name);

        // Initialize default stats
        const defaultStats: Record<string, { label: string; value: string | number }[]> = {};
        data.modules.forEach((m) => {
          const labels = MODULE_STAT_LABELS[m.id] || ["Item 1", "Item 2", "Item 3"];
          defaultStats[m.id] = labels.map((label) => ({ label, value: "-" }));
        });
        setModuleStats(defaultStats);

        // Map API response to ModuleCard format with icons
        const moduleCards: ModuleCard[] = data.modules.map((m) => ({
          id: m.id,
          name: m.name,
          fullName: m.fullName,
          description: m.description,
          icon: MODULE_ICONS[m.id] || Package,
          href: m.href,
          enabled: m.enabled,
          colors: MODULE_COLORS[m.id] || { bg: "bg-gray-50", text: "text-gray-700", icon: "text-gray-500" },
        }));

        // Load saved order from localStorage or use default
        const savedOrder = localStorage.getItem("dashboard_module_order");
        const orderToUse = savedOrder ? JSON.parse(savedOrder) : DEFAULT_MODULE_ORDER;
        setModuleOrder(orderToUse);

        // Sort modules by saved order, enabled first
        const sortedModules = moduleCards.sort((a, b) => {
          // Enabled modules first
          if (a.enabled && !b.enabled) return -1;
          if (!a.enabled && b.enabled) return 1;
          // Then by saved order
          const aIndex = orderToUse.indexOf(a.id);
          const bIndex = orderToUse.indexOf(b.id);
          return aIndex - bIndex;
        });

        setModules(sortedModules);

        // Fetch real stats for enabled modules
        fetchModuleStats(data.enabled_module_ids);
      } catch (error) {
        console.error("Failed to fetch tenant modules:", error);
        setModules([
          {
            id: "tms",
            name: "TMS",
            fullName: "Transportation Management",
            description: "Quản lý vận tải, đơn hàng, xe và tài xế",
            icon: Truck,
            href: "/tms",
            enabled: true,
            colors: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500" },
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantModules();
  }, [router]);

  // Fetch stats from various module APIs
  const fetchModuleStats = async (enabledModules: string[]) => {
    const stats: Record<string, { label: string; value: string | number }[]> = {};

    // TMS Stats - uses dashboard API endpoints
    if (enabledModules.includes("tms")) {
      try {
        interface TMSDashboardStats {
          tractors: { total: number; active: number; inactive: number };
          trailers: { total: number; active: number; inactive: number };
          drivers: { active: number };
        }
        interface TMSTripStats {
          total_trips: number;
          total_active_drivers: number;
        }
        const [dashboardStats, tripStats] = await Promise.all([
          apiFetch<TMSDashboardStats>("/dashboard/stats").catch(() => null),
          apiFetch<TMSTripStats>("/dashboard/trip-stats").catch(() => null),
        ]);
        const totalVehicles = (dashboardStats?.tractors?.total || 0) + (dashboardStats?.trailers?.total || 0);
        stats.tms = [
          { label: "Chuyến xe", value: formatNumber(tripStats?.total_trips || 0) },
          { label: "Xe", value: formatNumber(totalVehicles) },
          { label: "Tài xế", value: formatNumber(dashboardStats?.drivers?.active || 0) },
        ];
      } catch (e) {
        console.error("TMS stats error:", e);
      }
    }

    // HRM Stats
    if (enabledModules.includes("hrm")) {
      try {
        const [employeesRes, leavesRes, jobsRes] = await Promise.all([
          apiFetch<{ total: number; items: unknown[] }>("/hrm/employees?page_size=1").catch(() => ({ total: 0, items: [] })),
          apiFetch<{ items: unknown[] }>("/hrm/leaves?page_size=1&status=PENDING").catch(() => ({ items: [] })),
          apiFetch<{ items: unknown[] }>("/hrm/recruitment/jobs?status=OPEN").catch(() => ({ items: [] })),
        ]);
        stats.hrm = [
          { label: "Nhân viên", value: formatNumber(employeesRes.total || employeesRes.items?.length || 0) },
          { label: "Nghỉ phép", value: formatNumber((leavesRes as { total?: number }).total || leavesRes.items?.length || 0) },
          { label: "Tuyển dụng", value: formatNumber((jobsRes as { total?: number }).total || jobsRes.items?.length || 0) },
        ];
        setTotalUsers(employeesRes.total || employeesRes.items?.length || 0);
      } catch (e) {
        console.error("HRM stats error:", e);
      }
    }

    // CRM Stats
    if (enabledModules.includes("crm")) {
      try {
        const [accountsRes, opportunitiesRes, quotesRes] = await Promise.all([
          apiFetch<{ total: number; items: unknown[] }>("/crm/accounts?page_size=1").catch(() => ({ total: 0, items: [] })),
          apiFetch<{ total: number; items: unknown[] }>("/crm/opportunities?page_size=1").catch(() => ({ total: 0, items: [] })),
          apiFetch<{ total: number; items: unknown[] }>("/crm/quotes?page_size=1").catch(() => ({ total: 0, items: [] })),
        ]);
        stats.crm = [
          { label: "Khách hàng", value: formatNumber(accountsRes.total || accountsRes.items?.length || 0) },
          { label: "Cơ hội", value: formatNumber(opportunitiesRes.total || opportunitiesRes.items?.length || 0) },
          { label: "Báo giá", value: formatNumber(quotesRes.total || quotesRes.items?.length || 0) },
        ];
      } catch (e) {
        console.error("CRM stats error:", e);
      }
    }

    // WMS Stats
    if (enabledModules.includes("wms")) {
      try {
        const [productsRes, receiptsRes, deliveriesRes] = await Promise.all([
          apiFetch<{ total: number; items: unknown[] }>("/wms/products?page_size=1").catch(() => ({ total: 0, items: [] })),
          apiFetch<{ total: number; items: unknown[] }>("/wms/goods-receipts?page_size=1").catch(() => ({ total: 0, items: [] })),
          apiFetch<{ total: number; items: unknown[] }>("/wms/delivery-orders?page_size=1").catch(() => ({ total: 0, items: [] })),
        ]);
        stats.wms = [
          { label: "Sản phẩm", value: formatNumber(productsRes.total || productsRes.items?.length || 0) },
          { label: "Đơn nhập", value: formatNumber(receiptsRes.total || receiptsRes.items?.length || 0) },
          { label: "Đơn xuất", value: formatNumber(deliveriesRes.total || deliveriesRes.items?.length || 0) },
        ];
      } catch (e) {
        console.error("WMS stats error:", e);
      }
    }

    // FMS Stats
    if (enabledModules.includes("fms")) {
      try {
        const [shipmentsRes, ratesRes] = await Promise.all([
          apiFetch<{ total: number; items: unknown[] }>("/fms/shipments?page_size=1").catch(() => ({ total: 0, items: [] })),
          apiFetch<{ total: number; items: unknown[] }>("/fms/rates?page_size=1").catch(() => ({ total: 0, items: [] })),
        ]);
        stats.fms = [
          { label: "Shipments", value: formatNumber(shipmentsRes.total || shipmentsRes.items?.length || 0) },
          { label: "Rates", value: formatNumber(ratesRes.total || ratesRes.items?.length || 0) },
          { label: "Tờ khai", value: "-" },
        ];
      } catch (e) {
        console.error("FMS stats error:", e);
      }
    }

    // Accounting Stats
    if (enabledModules.includes("accounting")) {
      try {
        const [invoicesRes, billsRes, journalRes] = await Promise.all([
          apiFetch<{ total: number; items: unknown[] }>("/accounting/invoices?page_size=1").catch(() => ({ total: 0, items: [] })),
          apiFetch<{ total: number; items: unknown[] }>("/accounting/bills?page_size=1").catch(() => ({ total: 0, items: [] })),
          apiFetch<{ total: number; items: unknown[] }>("/accounting/journal-entries?page_size=1").catch(() => ({ total: 0, items: [] })),
        ]);
        stats.accounting = [
          { label: "Hóa đơn", value: formatNumber(invoicesRes.total || invoicesRes.items?.length || 0) },
          { label: "Chi phí", value: formatNumber(billsRes.total || billsRes.items?.length || 0) },
          { label: "Bút toán", value: formatNumber(journalRes.total || journalRes.items?.length || 0) },
        ];
      } catch (e) {
        console.error("Accounting stats error:", e);
      }
    }

    // Workflow Stats
    if (enabledModules.includes("workflow")) {
      try {
        const [definitionsRes] = await Promise.all([
          apiFetch<{ items: unknown[] }>("/workflow/workflow-definitions").catch(() => ({ items: [] })),
        ]);
        stats.workflow = [
          { label: "Quy trình", value: formatNumber(definitionsRes.items?.length || 0) },
          { label: "Chờ duyệt", value: "-" },
          { label: "Hoàn thành", value: "-" },
        ];
      } catch (e) {
        console.error("Workflow stats error:", e);
      }
    }

    // DMS Stats
    if (enabledModules.includes("dms")) {
      try {
        const [documentsRes, foldersRes] = await Promise.all([
          apiFetch<{ total: number; items: unknown[] }>("/dms/documents?page_size=1").catch(() => ({ total: 0, items: [] })),
          apiFetch<{ total: number; items: unknown[] }>("/dms/folders?page_size=1").catch(() => ({ total: 0, items: [] })),
        ]);
        stats.dms = [
          { label: "Tài liệu", value: formatNumber(documentsRes.total || documentsRes.items?.length || 0) },
          { label: "Thư mục", value: formatNumber(foldersRes.total || foldersRes.items?.length || 0) },
          { label: "Chia sẻ", value: "-" },
        ];
      } catch (e) {
        console.error("DMS stats error:", e);
      }
    }

    // MES Stats
    if (enabledModules.includes("mes")) {
      try {
        const [productionOrdersRes] = await Promise.all([
          apiFetch<{ total: number; items: unknown[] }>("/mes/production-orders?page_size=1").catch(() => ({ total: 0, items: [] })),
        ]);
        stats.mes = [
          { label: "Lệnh SX", value: formatNumber(productionOrdersRes.total || productionOrdersRes.items?.length || 0) },
          { label: "Đang SX", value: "-" },
          { label: "Hoàn thành", value: "-" },
        ];
      } catch (e) {
        console.error("MES stats error:", e);
      }
    }

    // Update state with fetched stats
    setModuleStats((prev) => ({ ...prev, ...stats }));
  };

  // Drag & Drop handlers
  const handleDragStart = useCallback((moduleId: string) => {
    setDraggedModule(moduleId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetModuleId: string) => {
    e.preventDefault();
    if (!draggedModule || draggedModule === targetModuleId) return;
  }, [draggedModule]);

  const handleDrop = useCallback((targetModuleId: string) => {
    if (!draggedModule || draggedModule === targetModuleId) return;

    setModules((prevModules) => {
      const newModules = [...prevModules];
      const draggedIndex = newModules.findIndex((m) => m.id === draggedModule);
      const targetIndex = newModules.findIndex((m) => m.id === targetModuleId);

      if (draggedIndex === -1 || targetIndex === -1) return prevModules;

      // Only allow reordering within enabled or disabled groups
      const draggedEnabled = newModules[draggedIndex].enabled;
      const targetEnabled = newModules[targetIndex].enabled;
      if (draggedEnabled !== targetEnabled) return prevModules;

      // Swap positions
      const [draggedItem] = newModules.splice(draggedIndex, 1);
      newModules.splice(targetIndex, 0, draggedItem);

      // Save new order to localStorage
      const newOrder = newModules.map((m) => m.id);
      localStorage.setItem("dashboard_module_order", JSON.stringify(newOrder));
      setModuleOrder(newOrder);

      return newModules;
    });

    setDraggedModule(null);
  }, [draggedModule]);

  const handleDragEnd = useCallback(() => {
    setDraggedModule(null);
  }, []);

  const enabledCount = modules.filter((m) => m.enabled).length;
  const totalCount = modules.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tenantName || "9log.tech Platform"}
          </h1>
          <p className="text-gray-600 mt-1">Logistics ERP - Chọn module để bắt đầu</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Modules Active</div>
              <div className="text-xl font-bold">{enabledCount} / {totalCount}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Nhân viên</div>
              <div className="text-xl font-bold">{totalUsers > 0 ? formatNumber(totalUsers) : "-"}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Pending Tasks</div>
              <div className="text-xl font-bold">-</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Alerts</div>
              <div className="text-xl font-bold">-</div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Modules ({totalCount})</h2>
          <span className="text-xs text-gray-400">Kéo thả để sắp xếp</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            const stats = module.enabled ? moduleStats[module.id] : undefined;
            const isDragging = draggedModule === module.id;
            return (
              <div
                key={module.id}
                draggable={module.enabled}
                onDragStart={() => handleDragStart(module.id)}
                onDragOver={(e) => handleDragOver(e, module.id)}
                onDrop={() => handleDrop(module.id)}
                onDragEnd={handleDragEnd}
                className={`bg-white rounded-xl shadow border overflow-hidden transition-all ${
                  module.enabled ? "border-gray-200 cursor-grab active:cursor-grabbing" : "border-gray-100 opacity-60"
                } ${isDragging ? "opacity-50 scale-95" : ""}`}
              >
                {/* Module Header - Subtle pastel style */}
                <div className={`${module.colors.bg} p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-8 h-8 ${module.colors.icon}`} />
                      <div>
                        <h3 className={`font-bold text-lg ${module.colors.text}`}>{module.name}</h3>
                        {module.enabled ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Drag handle */}
                    {module.enabled && (
                      <GripVertical className="w-5 h-5 text-gray-400 opacity-50 hover:opacity-100" />
                    )}
                  </div>
                </div>

                {/* Module Body */}
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{module.fullName}</p>
                  <p className="text-sm text-gray-600 mb-4">{module.description}</p>

                  {/* Stats (if enabled) */}
                  {module.enabled && stats && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {stats.map((stat, idx) => (
                        <div key={idx} className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-lg font-bold text-gray-800">{stat.value}</div>
                          <div className="text-xs text-gray-500">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Button - Outline style */}
                  {module.enabled ? (
                    <Link
                      href={module.href}
                      className={`flex items-center justify-center gap-2 w-full py-2 px-4 bg-white border-2 rounded-lg transition-all ${MODULE_BUTTON_COLORS[module.id] || "border-gray-400 text-gray-600 hover:bg-gray-400 hover:text-white"}`}
                    >
                      <span>Truy cập</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                    >
                      <span>Liên hệ kích hoạt</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-800">Cần thêm modules?</h3>
            <p className="text-sm text-gray-600">
              Liên hệ với chúng tôi để kích hoạt thêm modules cho doanh nghiệp của bạn
            </p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Liên hệ
          </button>
        </div>
      </div>
    </div>
  );
}
