"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  LayoutDashboard,
  Bot,
  Brain,
  Home,
  ClipboardList,
  RotateCcw,
  Fuel,
  Wallet,
  CircleDollarSign,
  Truck,
  Users,
  Building2,
  MapPin,
  MapPinned,
  DollarSign,
  Settings,
  FileText,
  UserCog,
  Shield,
  Calendar,
  History,
  BarChart3,
  PieChart,
  Receipt,
  Wrench,
  Package,
  Users2,
  Calculator,
  Banknote,
  Star,
  GripVertical,
  Satellite,
  // CRM Icons
  Contact,
  Target,
  Handshake,
  Phone,
  Mail,
  MessageSquare,
  TrendingUp,
  Award,
  // HRM Icons
  UserCheck,
  Clock,
  GraduationCap,
  Briefcase,
  Heart,
  CreditCard,
  FileCheck,
  Building,
  UserPlus,
  // Accounting Icons
  BookOpen,
  ArrowUpDown,
  Landmark,
  FileSpreadsheet,
  Scale,
  Percent,
  BadgeDollarSign,
  ClipboardCheck,
  // WMS Icons
  Warehouse,
  PackageCheck,
  PackagePlus,
  PackageMinus,
  Boxes,
  ScanLine,
  ClipboardCopy,
  ArrowLeftRight,
  // FMS Icons (Forwarding)
  Route,
  Shield as ShieldIcon,
  // PMS Icons (Port/Terminal)
  Anchor,
  Ship,
  // EMS Icons (Express)
  Zap,
  PackageSearch,
  // Controlling Icons
  PiggyBank,
  Layers,
  GitBranch,
  // Project Management Icons
  FolderKanban,
  ListChecks,
  Milestone,
  // Workflow Icons
  Workflow,
  CheckSquare,
  Bell,
  // DMS Icons
  FolderOpen,
  File,
  Share2,
  Archive,
  FileCode,
  // MES Icons (Manufacturing)
  Factory,
  Hammer,
  Cog,
  GitMerge,
  type LucideIcon,
} from "lucide-react";

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface MenuGroup {
  key: string;
  label: string;
  items: MenuItem[];
}

interface ModuleConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  dashboard: MenuItem[];
  groups: MenuGroup[];
}

// =====================================================
// PLATFORM LEVEL - Main Menu
// =====================================================
const MAIN_MENU: MenuItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Assistant", href: "/ai-assistant", icon: Bot },
];

// =====================================================
// MODULE CONFIGURATIONS
// =====================================================

const TMS_CONFIG: ModuleConfig = {
  key: "tms",
  label: "TMS - Vận tải",
  icon: Truck,
  dashboard: [{ label: "TMS Dashboard", href: "/tms", icon: Truck }],
  groups: [
    {
      key: "tmsOperations",
      label: "Operations",
      items: [
        { label: "AI Dispatch", href: "/tms/dispatch", icon: Brain },
        { label: "Orders", href: "/tms/orders", icon: ClipboardList },
        { label: "Empty Returns", href: "/tms/empty-returns", icon: RotateCcw },
      ],
    },
    {
      key: "tmsFinance",
      label: "Finance",
      items: [
        { label: "Trip Revenue", href: "/tms/trip-revenue", icon: Receipt },
        { label: "Advance Payments", href: "/tms/advance-payments", icon: Wallet },
        { label: "Driver Salary", href: "/tms/driver-salary-management", icon: CircleDollarSign },
        { label: "Fuel Logs", href: "/tms/fuel-logs", icon: Fuel },
        { label: "Vehicle Costs", href: "/tms/vehicle-costs", icon: Calculator },
        { label: "Invoice Automation", href: "/tms/invoice-automation", icon: FileText },
      ],
    },
    {
      key: "tmsMasterData",
      label: "Master Data",
      items: [
        { label: "Vehicles", href: "/tms/vehicles", icon: Truck },
        { label: "Drivers", href: "/tms/drivers", icon: Users },
        { label: "Customers", href: "/tms/customers", icon: Building2 },
        { label: "Locations", href: "/tms/locations", icon: MapPin },
        { label: "Sites", href: "/tms/sites", icon: MapPinned },
        { label: "Rates", href: "/tms/rates", icon: DollarSign },
        { label: "GPS Settings", href: "/tms/gps-settings", icon: Satellite },
        { label: "Salary Settings", href: "/tms/driver-salary-settings", icon: Settings },
      ],
    },
    {
      key: "tmsMaintenance",
      label: "Maintenance",
      items: [
        { label: "Schedules", href: "/tms/maintenance/schedules", icon: Calendar },
        { label: "Records", href: "/tms/maintenance/records", icon: History },
      ],
    },
    {
      key: "tmsReports",
      label: "Reports",
      items: [
        { label: "Fuel Reports", href: "/tms/fuel-reports", icon: Fuel },
        { label: "Revenue Reports", href: "/tms/revenue-reports", icon: BarChart3 },
        { label: "P&L Reports", href: "/tms/pl-reports", icon: TrendingUp },
        { label: "Salary Reports", href: "/tms/driver-salary-reports", icon: PieChart },
        { label: "Maintenance Reports", href: "/tms/maintenance-reports", icon: Wrench },
      ],
    },
  ],
};

const CRM_CONFIG: ModuleConfig = {
  key: "crm",
  label: "CRM - Khách hàng",
  icon: Users2,
  dashboard: [{ label: "CRM Dashboard", href: "/crm", icon: Users2 }],
  groups: [
    {
      key: "crmSales",
      label: "Sales",
      items: [
        { label: "Leads", href: "/crm/leads", icon: Target },
        { label: "Opportunities", href: "/crm/opportunities", icon: TrendingUp },
        { label: "Quotes", href: "/crm/quotes", icon: FileText },
        { label: "Contracts", href: "/crm/contracts", icon: Handshake },
        { label: "Sales Orders", href: "/crm/sales-orders", icon: ClipboardList },
      ],
    },
    {
      key: "crmCustomers",
      label: "Customers",
      items: [
        { label: "Accounts", href: "/crm/accounts", icon: Building2 },
        { label: "Contacts", href: "/crm/contacts", icon: Contact },
        { label: "Customer Groups", href: "/crm/customer-groups", icon: Users },
      ],
    },
    {
      key: "crmCommunication",
      label: "Communication",
      items: [
        { label: "Chat Inbox", href: "/crm/chat", icon: MessageSquare },
        { label: "Calls", href: "/crm/calls", icon: Phone },
        { label: "Emails", href: "/crm/emails", icon: Mail },
        { label: "SMS", href: "/crm/messages", icon: MessageSquare },
        { label: "Activities", href: "/crm/activities", icon: Calendar },
      ],
    },
    {
      key: "crmReports",
      label: "Reports",
      items: [
        { label: "Sales Pipeline", href: "/crm/reports/pipeline", icon: BarChart3 },
        { label: "Revenue Analysis", href: "/crm/reports/revenue", icon: TrendingUp },
        { label: "Customer Analysis", href: "/crm/reports/customers", icon: PieChart },
        { label: "Sales Performance", href: "/crm/reports/performance", icon: Award },
      ],
    },
  ],
};

const HRM_CONFIG: ModuleConfig = {
  key: "hrm",
  label: "HRM - Nhân sự",
  icon: Users,
  dashboard: [{ label: "HRM Dashboard", href: "/hrm", icon: Users }],
  groups: [
    {
      key: "hrmEmployees",
      label: "Employees",
      items: [
        { label: "Employee List", href: "/hrm/employees", icon: Users },
        { label: "External Workers", href: "/hrm/workers", icon: UserPlus },
        { label: "Branches", href: "/hrm/branches", icon: Building2 },
        { label: "Departments", href: "/hrm/departments", icon: Building },
        { label: "Teams", href: "/hrm/teams", icon: Users2 },
        { label: "Positions", href: "/hrm/positions", icon: Briefcase },
        { label: "Organization Chart", href: "/hrm/org-chart", icon: Users },
      ],
    },
    {
      key: "hrmContracts",
      label: "Contracts & Advances",
      items: [
        { label: "Contracts", href: "/hrm/contracts", icon: FileCheck },
        { label: "Advances", href: "/hrm/advances", icon: Banknote },
      ],
    },
    {
      key: "hrmAttendance",
      label: "Attendance",
      items: [
        { label: "Time Tracking", href: "/hrm/time-tracking", icon: Clock },
        { label: "Attendance", href: "/hrm/attendance", icon: UserCheck },
        { label: "Leave Requests", href: "/hrm/leaves", icon: Calendar },
        { label: "Overtime", href: "/hrm/overtime", icon: History },
      ],
    },
    {
      key: "hrmPayroll",
      label: "Payroll",
      items: [
        { label: "Payroll", href: "/hrm/payroll", icon: CreditCard },
        { label: "Salary Structure", href: "/hrm/salary-structure", icon: DollarSign },
        { label: "Income Tax Settings", href: "/hrm/income-tax-settings", icon: FileText },
        { label: "Bonuses", href: "/hrm/bonuses", icon: Award },
        { label: "Deductions", href: "/hrm/deductions", icon: Percent },
      ],
    },
    {
      key: "hrmRecruitment",
      label: "Recruitment",
      items: [
        { label: "Job Postings", href: "/hrm/jobs", icon: Briefcase },
        { label: "Candidates", href: "/hrm/candidates", icon: Users },
        { label: "Interviews", href: "/hrm/interviews", icon: MessageSquare },
        { label: "Onboarding", href: "/hrm/onboarding", icon: UserCheck },
      ],
    },
    {
      key: "hrmTraining",
      label: "Training",
      items: [
        { label: "Training Programs", href: "/hrm/training", icon: GraduationCap },
        { label: "Certifications", href: "/hrm/certifications", icon: Award },
        { label: "Skills Matrix", href: "/hrm/skills", icon: Target },
      ],
    },
    {
      key: "hrmReports",
      label: "Reports",
      items: [
        { label: "Attendance Report", href: "/hrm/reports/attendance", icon: Clock },
        { label: "Payroll Report", href: "/hrm/reports/payroll", icon: FileSpreadsheet },
        { label: "Headcount Report", href: "/hrm/reports/headcount", icon: BarChart3 },
        { label: "Turnover Report", href: "/hrm/reports/turnover", icon: TrendingUp },
      ],
    },
  ],
};

const ACCOUNTING_CONFIG: ModuleConfig = {
  key: "accounting",
  label: "Accounting - Kế toán",
  icon: Calculator,
  dashboard: [{ label: "Accounting Dashboard", href: "/accounting", icon: Calculator }],
  groups: [
    {
      key: "accGeneralLedger",
      label: "General Ledger",
      items: [
        { label: "Chart of Accounts", href: "/accounting/chart-of-accounts", icon: BookOpen },
        { label: "Journal Entries", href: "/accounting/journal-entries", icon: FileText },
      ],
    },
    {
      key: "accReceivable",
      label: "Receivable (AR)",
      items: [
        { label: "Customer Invoices", href: "/accounting/accounts-receivable", icon: FileText },
        { label: "Payment Receipts", href: "/accounting/accounts-receivable/receipts", icon: Banknote },
        { label: "Credit Notes", href: "/accounting/accounts-receivable/credit-notes", icon: Receipt },
      ],
    },
    {
      key: "accPayable",
      label: "Payable (AP)",
      items: [
        { label: "Vendor Invoices", href: "/accounting/accounts-payable", icon: ClipboardList },
        { label: "Payment Vouchers", href: "/accounting/accounts-payable/vouchers", icon: CreditCard },
        { label: "Debit Notes", href: "/accounting/accounts-payable/debit-notes", icon: Receipt },
      ],
    },
    {
      key: "accBanking",
      label: "Banking",
      items: [
        { label: "Bank Accounts", href: "/accounting/banking", icon: Landmark },
        { label: "Transactions", href: "/accounting/banking/transactions", icon: ArrowUpDown },
        { label: "Reconciliation", href: "/accounting/banking/reconciliation", icon: ClipboardCheck },
      ],
    },
    {
      key: "accAssets",
      label: "Fixed Assets",
      items: [
        { label: "Fixed Assets", href: "/accounting/fixed-assets", icon: Package },
        { label: "Depreciation", href: "/accounting/fixed-assets/depreciation", icon: TrendingUp },
      ],
    },
    {
      key: "accTax",
      label: "Tax Management",
      items: [
        { label: "Tax Management", href: "/accounting/tax", icon: Percent },
        { label: "VAT Transactions", href: "/accounting/tax/vat", icon: Receipt },
        { label: "Tax Declarations", href: "/accounting/tax/vat-declarations", icon: FileSpreadsheet },
      ],
    },
    {
      key: "accReports",
      label: "Reports",
      items: [
        { label: "Trial Balance", href: "/accounting/reports/trial-balance", icon: Scale },
        { label: "Profit & Loss", href: "/accounting/reports/pnl", icon: BarChart3 },
        { label: "Balance Sheet", href: "/accounting/reports/balance-sheet", icon: Scale },
        { label: "Cash Flow", href: "/accounting/reports/cash-flow", icon: TrendingUp },
      ],
    },
  ],
};

const WMS_CONFIG: ModuleConfig = {
  key: "wms",
  label: "WMS - Kho hàng",
  icon: Package,
  dashboard: [{ label: "WMS Dashboard", href: "/wms", icon: Package }],
  groups: [
    {
      key: "wmsInventory",
      label: "Inventory",
      items: [
        { label: "Stock Overview", href: "/wms/stock", icon: Boxes },
        { label: "Products", href: "/wms/products", icon: Package },
        { label: "Categories", href: "/wms/categories", icon: ClipboardList },
        { label: "Stock Adjustment", href: "/wms/adjustments", icon: ArrowUpDown },
      ],
    },
    {
      key: "wmsInbound",
      label: "Inbound",
      items: [
        { label: "Purchase Orders", href: "/wms/purchase-orders", icon: ClipboardList },
        { label: "Goods Receipt", href: "/wms/goods-receipt", icon: PackagePlus },
        { label: "Quality Check", href: "/wms/quality-check", icon: PackageCheck },
        { label: "Put Away", href: "/wms/put-away", icon: Warehouse },
      ],
    },
    {
      key: "wmsOutbound",
      label: "Outbound",
      items: [
        { label: "Sales Orders", href: "/wms/sales-orders", icon: ClipboardCopy },
        { label: "Picking", href: "/wms/picking", icon: ScanLine },
        { label: "Packing", href: "/wms/packing", icon: Package },
        { label: "Shipping", href: "/wms/shipping", icon: Truck },
      ],
    },
    {
      key: "wmsTransfers",
      label: "Transfers",
      items: [
        { label: "Stock Transfers", href: "/wms/transfers", icon: ArrowLeftRight },
        { label: "Warehouse Locations", href: "/wms/locations", icon: MapPin },
        { label: "Bin Management", href: "/wms/bins", icon: Boxes },
      ],
    },
    {
      key: "wmsReports",
      label: "Reports",
      items: [
        { label: "Inventory Report", href: "/wms/reports/inventory", icon: BarChart3 },
        { label: "Stock Movement", href: "/wms/reports/movement", icon: TrendingUp },
        { label: "Aging Report", href: "/wms/reports/aging", icon: Clock },
        { label: "Valuation Report", href: "/wms/reports/valuation", icon: DollarSign },
      ],
    },
  ],
};

const FMS_CONFIG: ModuleConfig = {
  key: "fms",
  label: "FMS - Giao nhận",
  icon: Route,
  dashboard: [{ label: "FMS Dashboard", href: "/fms", icon: Route }],
  groups: [
    {
      key: "fmsOperations",
      label: "Operations",
      items: [
        { label: "Shipments", href: "/fms/shipments", icon: Package },
        { label: "Quotations", href: "/fms/quotations", icon: FileText },
        { label: "Consolidations", href: "/fms/consolidations", icon: Boxes },
        { label: "Tracking", href: "/fms/tracking", icon: MapPin },
      ],
    },
    {
      key: "fmsSeaFreight",
      label: "Sea Freight",
      items: [
        { label: "Containers", href: "/fms/containers", icon: Package },
        { label: "Bill of Lading", href: "/fms/bills-of-lading", icon: FileText },
      ],
    },
    {
      key: "fmsAirFreight",
      label: "Air Freight",
      items: [{ label: "Airway Bills", href: "/fms/airway-bills", icon: FileText }],
    },
    {
      key: "fmsCustoms",
      label: "Customs",
      items: [
        { label: "Customs Declarations", href: "/fms/customs", icon: FileText },
        { label: "HS Codes", href: "/fms/hs-codes", icon: ClipboardList },
      ],
    },
    {
      key: "fmsMasterData",
      label: "Master Data",
      items: [
        { label: "Agents/Partners", href: "/fms/agents", icon: Users },
        { label: "Freight Rates", href: "/fms/rates", icon: DollarSign },
      ],
    },
    {
      key: "fmsReports",
      label: "Reports",
      items: [
        { label: "Shipment Report", href: "/fms/reports/shipments", icon: BarChart3 },
        { label: "Profit Analysis", href: "/fms/reports/profit", icon: TrendingUp },
        { label: "Agent Performance", href: "/fms/reports/agents", icon: Award },
      ],
    },
  ],
};

const PMS_CONFIG: ModuleConfig = {
  key: "pms",
  label: "PMS - Cảng/Depot",
  icon: Anchor,
  dashboard: [{ label: "PMS Dashboard", href: "/pms", icon: Anchor }],
  groups: [
    {
      key: "pmsVessel",
      label: "Vessel",
      items: [
        { label: "Vessel Schedule", href: "/pms/vessels", icon: Ship },
        { label: "Berth Planning", href: "/pms/berth", icon: Anchor },
        { label: "Voyage Management", href: "/pms/voyages", icon: Route },
      ],
    },
    {
      key: "pmsYard",
      label: "Yard",
      items: [
        { label: "Yard Overview", href: "/pms/yard", icon: MapPin },
        { label: "Block Management", href: "/pms/blocks", icon: Boxes },
        { label: "Reefer Monitoring", href: "/pms/reefer", icon: Clock },
        { label: "Equipment Tracking", href: "/pms/equipment", icon: Truck },
      ],
    },
    {
      key: "pmsGate",
      label: "Gate",
      items: [
        { label: "Gate Operations", href: "/pms/gate", icon: Building },
        { label: "Truck Appointments", href: "/pms/appointments", icon: Calendar },
        { label: "eIR (Interchange)", href: "/pms/eir", icon: FileCheck },
        { label: "Queue Management", href: "/pms/queue", icon: Users },
      ],
    },
    {
      key: "pmsContainer",
      label: "Container",
      items: [
        { label: "Container Tracking", href: "/pms/containers", icon: Package },
        { label: "Container Inventory", href: "/pms/container-inventory", icon: Boxes },
        { label: "M&R (Damage)", href: "/pms/damage", icon: Wrench },
        { label: "Detention/Demurrage", href: "/pms/detention", icon: Clock },
      ],
    },
    {
      key: "pmsBilling",
      label: "Billing",
      items: [
        { label: "THC Charges", href: "/pms/thc", icon: DollarSign },
        { label: "Storage Fees", href: "/pms/storage-fees", icon: Banknote },
        { label: "Equipment Rental", href: "/pms/rental", icon: Receipt },
        { label: "Tariff Management", href: "/pms/tariffs", icon: FileText },
      ],
    },
    {
      key: "pmsReports",
      label: "Reports",
      items: [
        { label: "Throughput Report", href: "/pms/reports/throughput", icon: BarChart3 },
        { label: "Dwell Time", href: "/pms/reports/dwell-time", icon: Clock },
        { label: "Productivity KPIs", href: "/pms/reports/productivity", icon: TrendingUp },
        { label: "Capacity Forecast", href: "/pms/reports/capacity", icon: PieChart },
      ],
    },
  ],
};

const EMS_CONFIG: ModuleConfig = {
  key: "ems",
  label: "EMS - Chuyển phát",
  icon: Zap,
  dashboard: [{ label: "EMS Dashboard", href: "/ems", icon: Zap }],
  groups: [
    {
      key: "emsOrders",
      label: "Orders",
      items: [
        { label: "Parcel Orders", href: "/ems/orders", icon: Package },
        { label: "COD Orders", href: "/ems/cod", icon: Banknote },
        { label: "Returns", href: "/ems/returns", icon: RotateCcw },
        { label: "Bulk Upload", href: "/ems/bulk-upload", icon: FileSpreadsheet },
      ],
    },
    {
      key: "emsSorting",
      label: "Sorting",
      items: [
        { label: "Sorting Center", href: "/ems/sorting", icon: Boxes },
        { label: "Hub Management", href: "/ems/hubs", icon: Building },
        { label: "Cross-docking", href: "/ems/crossdock", icon: ArrowLeftRight },
        { label: "Outbound Dispatch", href: "/ems/dispatch", icon: Truck },
      ],
    },
    {
      key: "emsDelivery",
      label: "Delivery",
      items: [
        { label: "Route Planning", href: "/ems/routes", icon: Route },
        { label: "Driver Assignment", href: "/ems/assignments", icon: Users },
        { label: "Live Tracking", href: "/ems/tracking", icon: MapPin },
        { label: "Proof of Delivery", href: "/ems/pod", icon: FileCheck },
        { label: "Failed Deliveries", href: "/ems/failed", icon: RotateCcw },
      ],
    },
    {
      key: "emsShipper",
      label: "Shipper Portal",
      items: [
        { label: "Shipper Portal", href: "/ems/shipper-portal", icon: Building2 },
        { label: "API Management", href: "/ems/api", icon: Settings },
        { label: "Tracking Widget", href: "/ems/widget", icon: PackageSearch },
      ],
    },
    {
      key: "emsPricing",
      label: "Pricing",
      items: [
        { label: "Zone Pricing", href: "/ems/zones", icon: MapPinned },
        { label: "Service Levels", href: "/ems/service-levels", icon: Zap },
        { label: "Weight Calculator", href: "/ems/calculator", icon: Calculator },
        { label: "Surcharges", href: "/ems/surcharges", icon: Percent },
      ],
    },
    {
      key: "emsSettlement",
      label: "Settlement",
      items: [
        { label: "COD Reconciliation", href: "/ems/cod-recon", icon: ClipboardCheck },
        { label: "Driver Settlement", href: "/ems/driver-settlement", icon: CreditCard },
        { label: "Partner Commission", href: "/ems/commission", icon: Handshake },
      ],
    },
    {
      key: "emsReports",
      label: "Reports",
      items: [
        { label: "Delivery Report", href: "/ems/reports/delivery", icon: BarChart3 },
        { label: "SLA Performance", href: "/ems/reports/sla", icon: TrendingUp },
        { label: "COD Report", href: "/ems/reports/cod", icon: DollarSign },
        { label: "Zone Analysis", href: "/ems/reports/zones", icon: PieChart },
      ],
    },
  ],
};

const MES_CONFIG: ModuleConfig = {
  key: "mes",
  label: "MES - Sản xuất",
  icon: Factory,
  dashboard: [{ label: "MES Dashboard", href: "/mes", icon: Factory }],
  groups: [
    {
      key: "mesPlanning",
      label: "Planning",
      items: [
        { label: "Production Orders", href: "/mes/production-orders", icon: ClipboardList },
        { label: "Work Orders", href: "/mes/work-orders", icon: Hammer },
      ],
    },
    {
      key: "mesEngineering",
      label: "Engineering",
      items: [
        { label: "Bill of Materials", href: "/mes/bom", icon: GitMerge },
        { label: "Routings", href: "/mes/routings", icon: Route },
        { label: "Workstations", href: "/mes/workstations", icon: Cog },
      ],
    },
    {
      key: "mesQuality",
      label: "Quality",
      items: [{ label: "Quality Control", href: "/mes/quality", icon: ClipboardCheck }],
    },
    {
      key: "mesMaintenance",
      label: "Maintenance",
      items: [{ label: "Equipment Maintenance", href: "/mes/maintenance", icon: Wrench }],
    },
  ],
};

const CONTROLLING_CONFIG: ModuleConfig = {
  key: "controlling",
  label: "Controlling - Chi phí",
  icon: PiggyBank,
  dashboard: [{ label: "Controlling Dashboard", href: "/controlling", icon: PiggyBank }],
  groups: [
    {
      key: "ctrlCostCenters",
      label: "Cost Centers",
      items: [
        { label: "Cost Centers", href: "/controlling/cost-centers", icon: Layers },
        { label: "Cost Allocation", href: "/controlling/cost-allocation", icon: GitBranch },
      ],
    },
    {
      key: "ctrlBudgets",
      label: "Budgets",
      items: [
        { label: "Budgets", href: "/controlling/budgets", icon: Calculator },
        { label: "Budget Versions", href: "/controlling/budget-versions", icon: FileText },
        { label: "Budget Transfer", href: "/controlling/budget-transfer", icon: ArrowLeftRight },
      ],
    },
    {
      key: "ctrlProfit",
      label: "Profit Centers",
      items: [
        { label: "Profit Centers", href: "/controlling/profit-centers", icon: TrendingUp },
        { label: "Profit Analysis", href: "/controlling/profit-analysis", icon: BarChart3 },
        { label: "Segment Reports", href: "/controlling/segment-reports", icon: PieChart },
      ],
    },
    {
      key: "ctrlOrders",
      label: "Internal Orders",
      items: [{ label: "Internal Orders", href: "/controlling/internal-orders", icon: ClipboardList }],
    },
    {
      key: "ctrlAbc",
      label: "Activity-Based Costing",
      items: [
        { label: "Activity Types", href: "/controlling/activity-types", icon: Briefcase },
        { label: "Activities", href: "/controlling/activities", icon: Target },
        { label: "Activity Rates", href: "/controlling/activity-rates", icon: DollarSign },
      ],
    },
  ],
};

const PROJECT_CONFIG: ModuleConfig = {
  key: "project",
  label: "Project - Dự án",
  icon: FolderKanban,
  dashboard: [{ label: "Project Dashboard", href: "/project", icon: FolderKanban }],
  groups: [
    {
      key: "prjProjects",
      label: "Projects",
      items: [
        { label: "Projects", href: "/project/projects", icon: FolderKanban },
        { label: "Phases", href: "/project/phases", icon: Layers },
        { label: "Members", href: "/project/members", icon: Users },
      ],
    },
    {
      key: "prjTasks",
      label: "Tasks",
      items: [
        { label: "Tasks", href: "/project/tasks", icon: ListChecks },
        { label: "Kanban Board", href: "/project/kanban", icon: ClipboardList },
        { label: "Gantt Chart", href: "/project/gantt", icon: BarChart3 },
      ],
    },
    {
      key: "prjMilestones",
      label: "Milestones",
      items: [{ label: "Milestones", href: "/project/milestones", icon: Milestone }],
    },
    {
      key: "prjResources",
      label: "Resources",
      items: [
        { label: "Resources", href: "/project/resources", icon: Users },
        { label: "Allocations", href: "/project/allocations", icon: Calendar },
        { label: "Timesheets", href: "/project/timesheets", icon: Clock },
      ],
    },
    {
      key: "prjRisks",
      label: "Risks & Issues",
      items: [
        { label: "Risks", href: "/project/risks", icon: ShieldIcon },
        { label: "Issues", href: "/project/issues", icon: MessageSquare },
      ],
    },
  ],
};

const WORKFLOW_CONFIG: ModuleConfig = {
  key: "workflow",
  label: "Workflow - Quy trình",
  icon: Workflow,
  dashboard: [{ label: "Workflow Dashboard", href: "/workflow", icon: Workflow }],
  groups: [
    {
      key: "wfDefinitions",
      label: "Definitions",
      items: [
        { label: "Workflow Definitions", href: "/workflow/definitions", icon: GitBranch },
        { label: "Steps & Transitions", href: "/workflow/steps", icon: Layers },
      ],
    },
    {
      key: "wfInstances",
      label: "Instances",
      items: [
        { label: "Running Workflows", href: "/workflow/instances", icon: Workflow },
        { label: "Workflow History", href: "/workflow/history", icon: History },
      ],
    },
    {
      key: "wfApprovals",
      label: "Approvals",
      items: [
        { label: "Pending Approvals", href: "/workflow/approvals", icon: CheckSquare },
        { label: "My Requests", href: "/workflow/my-requests", icon: FileText },
        { label: "Delegation", href: "/workflow/delegation", icon: Users },
      ],
    },
    {
      key: "wfTasks",
      label: "Tasks",
      items: [
        { label: "My Tasks", href: "/workflow/tasks", icon: ListChecks },
        { label: "Notifications", href: "/workflow/notifications", icon: Bell },
      ],
    },
  ],
};

const DMS_CONFIG: ModuleConfig = {
  key: "dms",
  label: "DMS - Tài liệu",
  icon: FolderOpen,
  dashboard: [{ label: "DMS Dashboard", href: "/dms", icon: FolderOpen }],
  groups: [
    {
      key: "dmsFolders",
      label: "Folders & Documents",
      items: [
        { label: "Folders", href: "/dms/folders", icon: FolderOpen },
        { label: "Documents", href: "/dms/documents", icon: File },
        { label: "My Documents", href: "/dms/my-documents", icon: FileText },
      ],
    },
    {
      key: "dmsSharing",
      label: "Sharing",
      items: [
        { label: "Shared with Me", href: "/dms/shared", icon: Share2 },
        { label: "Share Links", href: "/dms/share-links", icon: Share2 },
      ],
    },
    {
      key: "dmsArchive",
      label: "Archive & Retention",
      items: [
        { label: "Archive Policies", href: "/dms/archive-policies", icon: Archive },
        { label: "Archived Documents", href: "/dms/archived", icon: Archive },
        { label: "Retention", href: "/dms/retention", icon: Clock },
      ],
    },
    {
      key: "dmsTemplates",
      label: "Templates",
      items: [
        { label: "Templates", href: "/dms/templates", icon: FileCode },
        { label: "Generated Documents", href: "/dms/generated", icon: FileText },
      ],
    },
  ],
};

const SETTINGS_CONFIG: ModuleConfig = {
  key: "settings",
  label: "Settings - Cài đặt",
  icon: Settings,
  dashboard: [
    { label: "System Settings", href: "/settings", icon: Settings },
    { label: "Billing", href: "/settings/billing", icon: CreditCard },
  ],
  groups: [
    {
      key: "platformSettings",
      label: "Platform",
      items: [
        { label: "Users Management", href: "/users", icon: UserCog },
        { label: "Role Permissions", href: "/role-permissions", icon: Shield },
      ],
    },
  ],
};

// All modules in default order
const ALL_MODULES: ModuleConfig[] = [
  ACCOUNTING_CONFIG,
  CRM_CONFIG,
  HRM_CONFIG,
  TMS_CONFIG,
  WMS_CONFIG,
  FMS_CONFIG,
  PMS_CONFIG,
  EMS_CONFIG,
  MES_CONFIG,
  CONTROLLING_CONFIG,
  PROJECT_CONFIG,
  WORKFLOW_CONFIG,
  DMS_CONFIG,
];

const SUPER_ADMIN_MENU: MenuItem[] = [
  { label: "Admin Console", href: "/admin/tenants", icon: Building2 },
  { label: "Billing", href: "/admin/billing", icon: BadgeDollarSign },
  { label: "Activity Logs", href: "/admin/activity-logs", icon: History },
];

// LocalStorage keys
const STARRED_MENUS_KEY = "sidebar_starred_menus";
const MODULE_ORDER_KEY = "sidebar_module_order";
const GROUP_ITEM_ORDER_KEY = "sidebar_group_item_order";

// API base URL - using Next.js rewrites, so just use relative path
const API_BASE_URL = "/api/v1";

// =====================================================
// SORTABLE COMPONENTS
// =====================================================

interface SortableModuleProps {
  module: ModuleConfig;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  collapsed: boolean;
}

function SortableModule({ module, isExpanded, onToggle, children, collapsed }: SortableModuleProps) {
  const pathname = usePathname();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Check if any child route is active
  const isChildActive = useMemo(() => {
    // Check dashboard items
    if (module.dashboard.some(item => pathname === item.href || pathname.startsWith(item.href + "/"))) {
      return true;
    }
    // Check group items
    for (const group of module.groups) {
      if (group.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"))) {
        return true;
      }
    }
    return false;
  }, [pathname, module]);

  if (collapsed) {
    return <div ref={setNodeRef} style={style}>{children}</div>;
  }

  const Icon = module.icon;

  return (
    <div ref={setNodeRef} style={style}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 mt-3 text-sm font-semibold hover:bg-gray-100 group ${
          isChildActive ? "bg-blue-50 text-blue-700 border-l-4 border-l-blue-500" : "text-gray-800"
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          <Icon className="w-5 h-5" />
          <span>{module.label}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {children}
    </div>
  );
}

interface SortableMenuItemProps {
  item: MenuItem;
  isSubItem?: boolean;
  isActive: boolean;
  isStarred: boolean;
  onToggleStar: (e: React.MouseEvent) => void;
  collapsed: boolean;
}

function SortableMenuItem({ item, isSubItem, isActive, isStarred, onToggleStar, collapsed }: SortableMenuItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.href,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = item.icon;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center group">
      {!collapsed && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity p-1"
        >
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>
      )}
      <Link
        href={item.href}
        className={`flex-1 flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-lg px-3 py-2 text-sm
          ${isActive ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`}
        title={collapsed ? item.label : undefined}
      >
        <Icon className={`${isSubItem ? "w-4 h-4" : "w-5 h-5"} flex-shrink-0`} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
      {!collapsed && (
        <button
          onClick={onToggleStar}
          className={`p-1 rounded hover:bg-gray-200 transition-colors ${
            isStarred ? "text-yellow-500" : "text-gray-300 opacity-0 group-hover:opacity-100"
          }`}
          title={isStarred ? "Bỏ mặc định" : "Đặt mặc định"}
        >
          <Star className={`w-3.5 h-3.5 ${isStarred ? "fill-yellow-500" : ""}`} />
        </button>
      )}
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [starredMenus, setStarredMenus] = useState<Record<string, boolean>>({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [enabledModules, setEnabledModules] = useState<string[]>(["tms", "wms", "mes", "crm", "hrm", "accounting", "fms"]);

  // Hydration fix - only render DnD after mount
  const [isMounted, setIsMounted] = useState(false);

  // Module order state
  const [moduleOrder, setModuleOrder] = useState<string[]>(ALL_MODULES.map((m) => m.key));

  // Group item order state - stores custom order for items within each group
  const [groupItemOrder, setGroupItemOrder] = useState<Record<string, string[]>>({});

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<"module" | "item" | null>(null);

  // Module expand/collapse state
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Menu state for each group
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  // Set mounted after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check if user is Super Admin and load enabled modules
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsSuperAdmin(user.system_role === "SUPER_ADMIN");
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }

    // Fetch enabled modules from API
    const fetchEnabledModules = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/tenant/enabled-modules`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const modules = await res.json();
          setEnabledModules(modules);
        }
      } catch (e) {
        console.error("Failed to fetch enabled modules", e);
      }
    };

    fetchEnabledModules();
  }, []);

  // Load saved orders from localStorage
  useEffect(() => {
    // Load module order
    const savedModuleOrder = localStorage.getItem(MODULE_ORDER_KEY);
    if (savedModuleOrder) {
      try {
        const parsed = JSON.parse(savedModuleOrder);
        setModuleOrder(parsed);
      } catch (e) {
        console.error("Failed to parse module order", e);
      }
    }

    // Load group item order
    const savedGroupItemOrder = localStorage.getItem(GROUP_ITEM_ORDER_KEY);
    if (savedGroupItemOrder) {
      try {
        const parsed = JSON.parse(savedGroupItemOrder);
        setGroupItemOrder(parsed);
      } catch (e) {
        console.error("Failed to parse group item order", e);
      }
    }

    // Load starred menus
    const saved = localStorage.getItem(STARRED_MENUS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStarredMenus(parsed);
      } catch (e) {
        console.error("Failed to parse starred menus", e);
      }
    }
  }, []);

  // Get ordered modules
  const orderedModules = useMemo(() => {
    const moduleMap = new Map(ALL_MODULES.map((m) => [m.key, m]));
    const ordered: ModuleConfig[] = [];

    // First add modules in saved order
    for (const key of moduleOrder) {
      const module = moduleMap.get(key);
      if (module && enabledModules.includes(key)) {
        ordered.push(module);
        moduleMap.delete(key);
      }
    }

    // Add any remaining enabled modules not in saved order
    for (const [key, module] of moduleMap) {
      if (enabledModules.includes(key)) {
        ordered.push(module);
      }
    }

    return ordered;
  }, [moduleOrder, enabledModules]);

  // Get ordered items for a group
  const getOrderedItems = (groupKey: string, items: MenuItem[]): MenuItem[] => {
    const customOrder = groupItemOrder[groupKey];
    if (!customOrder) return items;

    const itemMap = new Map(items.map((item) => [item.href, item]));
    const ordered: MenuItem[] = [];

    for (const href of customOrder) {
      const item = itemMap.get(href);
      if (item) {
        ordered.push(item);
        itemMap.delete(href);
      }
    }

    // Add remaining items not in saved order
    for (const item of itemMap.values()) {
      ordered.push(item);
    }

    return ordered;
  };

  // Check if a module is enabled
  const isModuleEnabled = (moduleId: string): boolean => {
    return enabledModules.includes(moduleId);
  };

  const toggleModule = (key: string) => {
    setExpandedModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleStar = (menuKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredMenus((prev) => {
      const newState = { ...prev, [menuKey]: !prev[menuKey] };
      localStorage.setItem(STARRED_MENUS_KEY, JSON.stringify(newState));
      return newState;
    });
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    // Determine if dragging a module or an item
    if (ALL_MODULES.some((m) => m.key === active.id)) {
      setActiveDragType("module");
    } else {
      setActiveDragType("item");
    }
  };

  // Handle drag end for modules
  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveDragType(null);

    if (!over || active.id === over.id) return;

    setModuleOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      const newOrder = arrayMove(prev, oldIndex, newIndex);
      localStorage.setItem(MODULE_ORDER_KEY, JSON.stringify(newOrder));
      return newOrder;
    });
  };

  // Handle drag end for items within a group
  const handleItemDragEnd = (groupKey: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveDragType(null);

    if (!over || active.id === over.id) return;

    setGroupItemOrder((prev) => {
      // Get current order for this group or create from default
      const module = ALL_MODULES.find((m) => m.groups.some((g) => g.key === groupKey));
      const group = module?.groups.find((g) => g.key === groupKey);
      if (!group) return prev;

      const currentOrder = prev[groupKey] || group.items.map((i) => i.href);
      const oldIndex = currentOrder.indexOf(active.id as string);
      const newIndex = currentOrder.indexOf(over.id as string);
      const newOrder = arrayMove(currentOrder, oldIndex, newIndex);

      const updated = { ...prev, [groupKey]: newOrder };
      localStorage.setItem(GROUP_ITEM_ORDER_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Render menu item (non-sortable version for starred section)
  const renderMenuItem = (item: MenuItem, isSubItem = false) => {
    const active = pathname === item.href;
    const Icon = item.icon;
    const itemKey = item.href.replace(/\//g, "_");
    const isStarred = starredMenus[itemKey];

    return (
      <div key={item.href} className="flex items-center group">
        <Link
          href={item.href}
          className={`flex-1 flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-lg px-3 py-2 text-sm
            ${active ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`}
          title={collapsed ? item.label : undefined}
        >
          <Icon className={`${isSubItem ? "w-4 h-4" : "w-5 h-5"} flex-shrink-0`} />
          {!collapsed && <span>{item.label}</span>}
        </Link>
        {!collapsed && (
          <button
            onClick={(e) => toggleStar(itemKey, e)}
            className={`p-1 rounded hover:bg-gray-200 transition-colors ${
              isStarred ? "text-yellow-500" : "text-gray-300 opacity-0 group-hover:opacity-100"
            }`}
            title={isStarred ? "Bỏ mặc định" : "Đặt mặc định"}
          >
            <Star className={`w-3.5 h-3.5 ${isStarred ? "fill-yellow-500" : ""}`} />
          </button>
        )}
      </div>
    );
  };

  // Render group with sortable items
  const renderGroup = (group: MenuGroup) => {
    const isOpen = openMenus[group.key];
    const orderedItems = getOrderedItems(group.key, group.items);

    // Check if any item in this group is active
    const isGroupActive = group.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"));

    // Render items without DnD (for SSR or before mount)
    const renderItemsWithoutDnd = () => (
      <div className={collapsed ? "" : "ml-3 mt-1 space-y-1 border-l border-gray-200 pl-2"}>
        {orderedItems.map((item) => {
          const itemKey = item.href.replace(/\//g, "_");
          return (
            <div key={item.href} className="flex items-center group">
              <Link
                href={item.href}
                className={`flex-1 flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-lg px-3 py-2 text-sm
                  ${pathname === item.href ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`${!collapsed ? "w-4 h-4" : "w-5 h-5"} flex-shrink-0`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </div>
          );
        })}
      </div>
    );

    // Render items with DnD (after mount)
    const renderItemsWithDnd = () => (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleItemDragEnd(group.key)}
      >
        <SortableContext items={orderedItems.map((i) => i.href)} strategy={verticalListSortingStrategy}>
          <div className={collapsed ? "" : "ml-3 mt-1 space-y-1 border-l border-gray-200 pl-2"}>
            {orderedItems.map((item) => {
              const itemKey = item.href.replace(/\//g, "_");
              return (
                <SortableMenuItem
                  key={item.href}
                  item={item}
                  isSubItem={!collapsed}
                  isActive={pathname === item.href}
                  isStarred={starredMenus[itemKey] || false}
                  onToggleStar={(e) => toggleStar(itemKey, e)}
                  collapsed={collapsed}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    );

    return (
      <div key={group.key} className="pt-1">
        {!collapsed && (
          <button
            onClick={() => toggleMenu(group.key)}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-gray-100 ${
              isGroupActive ? "bg-blue-50 text-blue-700 border-l-4 border-l-blue-500" : "text-gray-700"
            }`}
          >
            <span className="font-medium">{group.label}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        {(collapsed || isOpen) && (isMounted ? renderItemsWithDnd() : renderItemsWithoutDnd())}
      </div>
    );
  };

  // Render module content
  const renderModuleContent = (module: ModuleConfig) => {
    if (collapsed) {
      return (
        <>
          {module.dashboard.map((item) => renderMenuItem(item))}
          {module.groups.map((group) => renderGroup(group))}
        </>
      );
    }

    if (!expandedModules[module.key]) return null;

    return (
      <div className="ml-2 border-l border-gray-200 pl-2">
        {module.dashboard.map((item) => renderMenuItem(item))}
        {module.groups.map((group) => renderGroup(group))}
      </div>
    );
  };

  // Get all menu items for starred section
  const getAllMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [...MAIN_MENU];
    for (const module of ALL_MODULES) {
      items.push(...module.dashboard);
      for (const group of module.groups) {
        items.push(...group.items);
      }
    }
    items.push(...SETTINGS_CONFIG.dashboard);
    for (const group of SETTINGS_CONFIG.groups) {
      items.push(...group.items);
    }
    return items;
  };

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-72"
      } bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300 flex flex-col h-full`}
    >
      <div className="px-4 py-4 border-b font-semibold flex items-center justify-between flex-shrink-0">
        {!collapsed && <span className="text-lg">9log.tech</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-gray-100 rounded"
          title={collapsed ? "Mở rộng" : "Thu gọn"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
            />
          </svg>
        </button>
      </div>

      <nav className="p-2 space-y-1 overflow-y-auto flex-1 pb-20">
        {/* Platform Level */}
        {MAIN_MENU.map((item) => renderMenuItem(item))}

        {/* Starred/Favorites Section */}
        {!collapsed && Object.keys(starredMenus).filter((k) => starredMenus[k]).length > 0 && (
          <div className="pt-2 pb-1">
            <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              Ưa thích
            </div>
            <div className="space-y-0.5">
              {Object.keys(starredMenus)
                .filter((k) => starredMenus[k])
                .map((itemKey) => {
                  const href = itemKey.replace(/_/g, "/");
                  const allMenuItems = getAllMenuItems();
                  const menuItem = allMenuItems.find((m) => m.href === href);
                  if (!menuItem) return null;

                  const active = pathname === menuItem.href;
                  const Icon = menuItem.icon;

                  return (
                    <div key={itemKey} className="flex items-center group">
                      <Link
                        href={menuItem.href}
                        className={`flex-1 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm
                          ${
                            active
                              ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{menuItem.label}</span>
                      </Link>
                      <button
                        onClick={(e) => toggleStar(itemKey, e)}
                        className="p-1 rounded hover:bg-gray-200 text-yellow-500"
                        title="Bỏ ưa thích"
                      >
                        <Star className="w-3 h-3 fill-yellow-500" />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Modules with drag & drop */}
        {isMounted ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleModuleDragEnd}
          >
            <SortableContext items={orderedModules.map((m) => m.key)} strategy={verticalListSortingStrategy}>
              {orderedModules.map((module) => (
                <SortableModule
                  key={module.key}
                  module={module}
                  isExpanded={expandedModules[module.key] || false}
                  onToggle={() => toggleModule(module.key)}
                  collapsed={collapsed}
                >
                  {renderModuleContent(module)}
                </SortableModule>
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          // SSR fallback without DnD
          orderedModules.map((module) => {
            // Check if any child route is active for this module
            const isChildActive = module.dashboard.some(item => pathname === item.href || pathname.startsWith(item.href + "/")) ||
              module.groups.some(group => group.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/")));

            return (
            <div key={module.key}>
              {!collapsed ? (
                <button
                  onClick={() => toggleModule(module.key)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 mt-3 text-sm font-semibold hover:bg-gray-100 ${
                    isChildActive ? "bg-blue-50 text-blue-700 border-l-4 border-l-blue-500" : "text-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <module.icon className="w-5 h-5" />
                    <span>{module.label}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedModules[module.key] ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : null}
              {renderModuleContent(module)}
            </div>
          )})
        )}

        {/* Settings Module - always visible, not draggable */}
        {!collapsed ? (
          <>
            <button
              onClick={() => toggleModule("settings")}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 mt-3 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <span>{SETTINGS_CONFIG.label}</span>
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${expandedModules["settings"] ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedModules["settings"] && (
              <div className="ml-2 border-l border-gray-200 pl-2">
                {SETTINGS_CONFIG.dashboard.map((item) => renderMenuItem(item))}
                {isSuperAdmin && SUPER_ADMIN_MENU.map((item) => renderMenuItem(item))}
                {SETTINGS_CONFIG.groups.map((group) => renderGroup(group))}
              </div>
            )}
          </>
        ) : (
          <>
            {SETTINGS_CONFIG.dashboard.map((item) => renderMenuItem(item))}
            {isSuperAdmin && SUPER_ADMIN_MENU.map((item) => renderMenuItem(item))}
          </>
        )}
      </nav>
    </aside>
  );
}
