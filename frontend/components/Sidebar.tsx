"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
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
  ClipboardCheck,
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
  // OMS Icons
  ShoppingCart,
  PackageOpen,
  type LucideIcon,
} from "lucide-react";

interface MenuItem {
  labelKey: string;
  href: string;
  icon: LucideIcon;
}

interface MenuGroup {
  key: string;
  labelKey: string;
  items: MenuItem[];
}

interface ModuleConfig {
  key: string;
  labelKey: string;
  icon: LucideIcon;
  dashboard: MenuItem[];
  groups: MenuGroup[];
}

// =====================================================
// PLATFORM LEVEL - Main Menu
// =====================================================
const MAIN_MENU: MenuItem[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.myTasks", href: "/my-tasks", icon: ClipboardCheck },
];

// =====================================================
// MODULE CONFIGURATIONS
// =====================================================

const TMS_CONFIG: ModuleConfig = {
  key: "tms",
  labelKey: "nav.modules.tms",
  icon: Truck,
  dashboard: [{ labelKey: "nav.tmsDashboard", href: "/tms", icon: Truck }],
  groups: [
    {
      key: "tmsOperations",
      labelKey: "nav.groups.operations",
      items: [
        { labelKey: "tms.aiDispatch", href: "/tms/dispatch", icon: Brain },
        { labelKey: "tms.orders", href: "/tms/orders", icon: ClipboardList },
        { labelKey: "tms.emptyReturns", href: "/tms/empty-returns", icon: RotateCcw },
      ],
    },
    {
      key: "tmsFinance",
      labelKey: "nav.groups.finance",
      items: [
        { labelKey: "tms.tripRevenue", href: "/tms/trip-revenue", icon: Receipt },
        { labelKey: "tms.advancePayments", href: "/tms/advance-payments", icon: Wallet },
        { labelKey: "tms.driverSalary", href: "/tms/driver-salary-management", icon: CircleDollarSign },
        { labelKey: "tms.fuelLogs", href: "/tms/fuel-logs", icon: Fuel },
        { labelKey: "tms.vehicleCosts", href: "/tms/vehicle-costs", icon: Calculator },
        { labelKey: "tms.invoiceAutomation", href: "/tms/invoice-automation", icon: FileText },
      ],
    },
    {
      key: "tmsMasterData",
      labelKey: "nav.groups.masterData",
      items: [
        { labelKey: "tms.vehicles.title", href: "/tms/vehicles", icon: Truck },
        { labelKey: "tms.drivers.title", href: "/tms/drivers", icon: Users },
        { labelKey: "tms.customers.title", href: "/tms/customers", icon: Building2 },
        { labelKey: "tms.locations.title", href: "/tms/locations", icon: MapPin },
        { labelKey: "tms.sites", href: "/tms/sites", icon: MapPinned },
        { labelKey: "tms.rates", href: "/tms/rates", icon: DollarSign },
        { labelKey: "tms.gpsSettings", href: "/tms/gps-settings", icon: Satellite },
        { labelKey: "tms.salarySettings", href: "/tms/driver-salary-settings", icon: Settings },
      ],
    },
    {
      key: "tmsMaintenance",
      labelKey: "nav.groups.maintenance",
      items: [
        { labelKey: "tms.maintenanceSchedules", href: "/tms/maintenance/schedules", icon: Calendar },
        { labelKey: "tms.maintenanceRecords", href: "/tms/maintenance/records", icon: History },
      ],
    },
    {
      key: "tmsReports",
      labelKey: "nav.groups.reports",
      items: [
        { labelKey: "tms.fuelReports", href: "/tms/fuel-reports", icon: Fuel },
        { labelKey: "tms.revenueReports", href: "/tms/revenue-reports", icon: BarChart3 },
        { labelKey: "tms.plReports", href: "/tms/pl-reports", icon: TrendingUp },
        { labelKey: "tms.salaryReports", href: "/tms/driver-salary-reports", icon: PieChart },
        { labelKey: "tms.maintenanceReports", href: "/tms/maintenance-reports", icon: Wrench },
      ],
    },
  ],
};

const CRM_CONFIG: ModuleConfig = {
  key: "crm",
  labelKey: "nav.modules.crm",
  icon: Users2,
  dashboard: [{ labelKey: "nav.crmDashboard", href: "/crm", icon: Users2 }],
  groups: [
    {
      key: "crmSales",
      labelKey: "nav.groups.sales",
      items: [
        { labelKey: "crm.leads", href: "/crm/leads", icon: Target },
        { labelKey: "crm.opportunities", href: "/crm/opportunities", icon: TrendingUp },
        { labelKey: "crm.quotes", href: "/crm/quotes", icon: FileText },
        { labelKey: "crm.contracts", href: "/crm/contracts", icon: Handshake },
        { labelKey: "crm.salesOrders", href: "/crm/sales-orders", icon: ClipboardList },
      ],
    },
    {
      key: "crmCustomers",
      labelKey: "nav.groups.customers",
      items: [
        { labelKey: "crm.accounts", href: "/crm/accounts", icon: Building2 },
        { labelKey: "crm.contacts", href: "/crm/contacts", icon: Contact },
        { labelKey: "crm.customerGroups", href: "/crm/customer-groups", icon: Users },
      ],
    },
    {
      key: "crmCommunication",
      labelKey: "nav.groups.communication",
      items: [
        { labelKey: "crm.chatInbox", href: "/crm/chat", icon: MessageSquare },
        { labelKey: "crm.calls", href: "/crm/calls", icon: Phone },
        { labelKey: "crm.emails", href: "/crm/emails", icon: Mail },
        { labelKey: "crm.sms", href: "/crm/messages", icon: MessageSquare },
        { labelKey: "crm.activities", href: "/crm/activities", icon: Calendar },
      ],
    },
    {
      key: "crmReports",
      labelKey: "nav.groups.reports",
      items: [
        { labelKey: "crm.salesPipeline", href: "/crm/reports/pipeline", icon: BarChart3 },
        { labelKey: "crm.revenueAnalysis", href: "/crm/reports/revenue", icon: TrendingUp },
        { labelKey: "crm.customerAnalysis", href: "/crm/reports/customers", icon: PieChart },
        { labelKey: "crm.salesPerformance", href: "/crm/reports/performance", icon: Award },
      ],
    },
  ],
};

const HRM_CONFIG: ModuleConfig = {
  key: "hrm",
  labelKey: "nav.modules.hrm",
  icon: Users,
  dashboard: [{ labelKey: "nav.hrmDashboard", href: "/hrm", icon: Users }],
  groups: [
    {
      key: "hrmEmployees",
      labelKey: "nav.groups.employees",
      items: [
        { labelKey: "hrm.employeeList", href: "/hrm/employees", icon: Users },
        { labelKey: "hrm.externalWorkers", href: "/hrm/workers", icon: UserPlus },
        { labelKey: "hrm.branches", href: "/hrm/branches", icon: Building2 },
        { labelKey: "hrm.departments", href: "/hrm/departments", icon: Building },
        { labelKey: "hrm.teams", href: "/hrm/teams", icon: Users2 },
        { labelKey: "hrm.positions", href: "/hrm/positions", icon: Briefcase },
        { labelKey: "hrm.orgChart", href: "/hrm/org-chart", icon: Users },
      ],
    },
    {
      key: "hrmContracts",
      labelKey: "nav.groups.contractsAdvances",
      items: [
        { labelKey: "hrm.contracts", href: "/hrm/contracts", icon: FileCheck },
        { labelKey: "hrm.advances", href: "/hrm/advances", icon: Banknote },
      ],
    },
    {
      key: "hrmAttendance",
      labelKey: "nav.groups.attendance",
      items: [
        { labelKey: "hrm.timeTracking", href: "/hrm/time-tracking", icon: Clock },
        { labelKey: "hrm.attendance", href: "/hrm/attendance", icon: UserCheck },
        { labelKey: "hrm.leaveRequests", href: "/hrm/leaves", icon: Calendar },
        { labelKey: "hrm.overtime", href: "/hrm/overtime", icon: History },
      ],
    },
    {
      key: "hrmPayroll",
      labelKey: "nav.groups.payroll",
      items: [
        { labelKey: "hrm.payroll", href: "/hrm/payroll", icon: CreditCard },
        { labelKey: "hrm.salaryStructure", href: "/hrm/salary-structure", icon: DollarSign },
        { labelKey: "hrm.incomeTaxSettings", href: "/hrm/income-tax-settings", icon: FileText },
        { labelKey: "hrm.bonuses", href: "/hrm/bonuses", icon: Award },
        { labelKey: "hrm.deductions", href: "/hrm/deductions", icon: Percent },
      ],
    },
    {
      key: "hrmRecruitment",
      labelKey: "nav.groups.recruitment",
      items: [
        { labelKey: "hrm.jobPostings", href: "/hrm/jobs", icon: Briefcase },
        { labelKey: "hrm.candidates", href: "/hrm/candidates", icon: Users },
        { labelKey: "hrm.interviews", href: "/hrm/interviews", icon: MessageSquare },
        { labelKey: "hrm.onboarding", href: "/hrm/onboarding", icon: UserCheck },
      ],
    },
    {
      key: "hrmTraining",
      labelKey: "nav.groups.training",
      items: [
        { labelKey: "hrm.trainingPrograms", href: "/hrm/training", icon: GraduationCap },
        { labelKey: "hrm.certifications", href: "/hrm/certifications", icon: Award },
        { labelKey: "hrm.skillsMatrix", href: "/hrm/skills", icon: Target },
      ],
    },
    {
      key: "hrmReports",
      labelKey: "nav.groups.reports",
      items: [
        { labelKey: "hrm.attendanceReport", href: "/hrm/reports/attendance", icon: Clock },
        { labelKey: "hrm.payrollReport", href: "/hrm/reports/payroll", icon: FileSpreadsheet },
        { labelKey: "hrm.headcountReport", href: "/hrm/reports/headcount", icon: BarChart3 },
        { labelKey: "hrm.turnoverReport", href: "/hrm/reports/turnover", icon: TrendingUp },
      ],
    },
  ],
};

const ACCOUNTING_CONFIG: ModuleConfig = {
  key: "accounting",
  labelKey: "nav.modules.accounting",
  icon: Calculator,
  dashboard: [{ labelKey: "nav.accountingDashboard", href: "/accounting", icon: Calculator }],
  groups: [
    {
      key: "accGeneralLedger",
      labelKey: "nav.groups.generalLedger",
      items: [
        { labelKey: "accounting.chartOfAccounts", href: "/accounting/chart-of-accounts", icon: BookOpen },
        { labelKey: "accounting.journalEntries", href: "/accounting/journal-entries", icon: FileText },
      ],
    },
    {
      key: "accReceivable",
      labelKey: "nav.groups.receivable",
      items: [
        { labelKey: "accounting.customerInvoices", href: "/accounting/accounts-receivable", icon: FileText },
        { labelKey: "accounting.paymentReceipts", href: "/accounting/accounts-receivable/receipts", icon: Banknote },
        { labelKey: "accounting.creditNotes", href: "/accounting/accounts-receivable/credit-notes", icon: Receipt },
      ],
    },
    {
      key: "accPayable",
      labelKey: "nav.groups.payable",
      items: [
        { labelKey: "accounting.vendorInvoices", href: "/accounting/accounts-payable", icon: ClipboardList },
        { labelKey: "accounting.paymentVouchers", href: "/accounting/accounts-payable/vouchers", icon: CreditCard },
        { labelKey: "accounting.debitNotes", href: "/accounting/accounts-payable/debit-notes", icon: Receipt },
      ],
    },
    {
      key: "accBanking",
      labelKey: "nav.groups.banking",
      items: [
        { labelKey: "accounting.bankAccounts", href: "/accounting/banking", icon: Landmark },
        { labelKey: "accounting.transactions", href: "/accounting/banking/transactions", icon: ArrowUpDown },
        { labelKey: "accounting.reconciliation", href: "/accounting/banking/reconciliation", icon: ClipboardCheck },
      ],
    },
    {
      key: "accAssets",
      labelKey: "nav.groups.fixedAssets",
      items: [
        { labelKey: "accounting.fixedAssets", href: "/accounting/fixed-assets", icon: Package },
        { labelKey: "accounting.depreciation", href: "/accounting/fixed-assets/depreciation", icon: TrendingUp },
      ],
    },
    {
      key: "accTax",
      labelKey: "nav.groups.taxManagement",
      items: [
        { labelKey: "accounting.taxManagement", href: "/accounting/tax", icon: Percent },
        { labelKey: "accounting.vatTransactions", href: "/accounting/tax/vat", icon: Receipt },
        { labelKey: "accounting.taxDeclarations", href: "/accounting/tax/vat-declarations", icon: FileSpreadsheet },
      ],
    },
    {
      key: "accReports",
      labelKey: "nav.groups.reports",
      items: [
        { labelKey: "accounting.trialBalance", href: "/accounting/reports/trial-balance", icon: Scale },
        { labelKey: "accounting.profitLoss", href: "/accounting/reports/pnl", icon: BarChart3 },
        { labelKey: "accounting.balanceSheet", href: "/accounting/reports/balance-sheet", icon: Scale },
        { labelKey: "accounting.cashFlow", href: "/accounting/reports/cash-flow", icon: TrendingUp },
      ],
    },
  ],
};

const WMS_CONFIG: ModuleConfig = {
  key: "wms",
  labelKey: "nav.modules.wms",
  icon: Package,
  dashboard: [{ labelKey: "nav.wmsDashboard", href: "/wms", icon: Package }],
  groups: [
    {
      key: "wmsInventory",
      labelKey: "nav.groups.inventory",
      items: [
        { labelKey: "wms.stockOverview", href: "/wms/stock", icon: Boxes },
        { labelKey: "wms.products", href: "/wms/products", icon: Package },
        { labelKey: "wms.categories", href: "/wms/categories", icon: ClipboardList },
        { labelKey: "wms.stockAdjustment", href: "/wms/adjustments", icon: ArrowUpDown },
      ],
    },
    {
      key: "wmsInbound",
      labelKey: "nav.groups.inbound",
      items: [
        { labelKey: "wms.purchaseOrders", href: "/wms/purchase-orders", icon: ClipboardList },
        { labelKey: "wms.goodsReceipt", href: "/wms/goods-receipt", icon: PackagePlus },
        { labelKey: "wms.qualityCheck", href: "/wms/quality-check", icon: PackageCheck },
        { labelKey: "wms.putAway", href: "/wms/put-away", icon: Warehouse },
      ],
    },
    {
      key: "wmsOutbound",
      labelKey: "nav.groups.outbound",
      items: [
        { labelKey: "wms.salesOrders", href: "/wms/sales-orders", icon: ClipboardCopy },
        { labelKey: "wms.picking", href: "/wms/picking", icon: ScanLine },
        { labelKey: "wms.packing", href: "/wms/packing", icon: Package },
        { labelKey: "wms.shipping", href: "/wms/shipping", icon: Truck },
      ],
    },
    {
      key: "wmsTransfers",
      labelKey: "nav.groups.transfers",
      items: [
        { labelKey: "wms.stockTransfers", href: "/wms/transfers", icon: ArrowLeftRight },
        { labelKey: "wms.warehouseLocations", href: "/wms/locations", icon: MapPin },
        { labelKey: "wms.binManagement", href: "/wms/bins", icon: Boxes },
      ],
    },
    {
      key: "wmsReports",
      labelKey: "nav.groups.reports",
      items: [
        { labelKey: "wms.inventoryReport", href: "/wms/reports/inventory", icon: BarChart3 },
        { labelKey: "wms.stockMovement", href: "/wms/reports/movement", icon: TrendingUp },
        { labelKey: "wms.agingReport", href: "/wms/reports/aging", icon: Clock },
        { labelKey: "wms.valuationReport", href: "/wms/reports/valuation", icon: DollarSign },
      ],
    },
  ],
};

const FMS_CONFIG: ModuleConfig = {
  key: "fms",
  labelKey: "nav.modules.fms",
  icon: Route,
  dashboard: [{ labelKey: "nav.fmsDashboard", href: "/fms", icon: Route }],
  groups: [
    {
      key: "fmsOperations",
      labelKey: "nav.groups.operations",
      items: [
        { labelKey: "fms.shipments", href: "/fms/shipments", icon: Package },
        { labelKey: "fms.quotations", href: "/fms/quotations", icon: FileText },
        { labelKey: "fms.consolidations", href: "/fms/consolidations", icon: Boxes },
        { labelKey: "fms.tracking", href: "/fms/tracking", icon: MapPin },
      ],
    },
    {
      key: "fmsSeaFreight",
      labelKey: "nav.groups.seaFreight",
      items: [
        { labelKey: "fms.containers", href: "/fms/containers", icon: Package },
        { labelKey: "fms.billOfLading", href: "/fms/bills-of-lading", icon: FileText },
      ],
    },
    {
      key: "fmsAirFreight",
      labelKey: "nav.groups.airFreight",
      items: [{ labelKey: "fms.airwayBills", href: "/fms/airway-bills", icon: FileText }],
    },
    {
      key: "fmsCustoms",
      labelKey: "nav.groups.customs",
      items: [
        { labelKey: "fms.customsDeclarations", href: "/fms/customs", icon: FileText },
        { labelKey: "fms.customsPartners", href: "/fms/customs-partners", icon: Users2 },
        { labelKey: "fms.hsCodes", href: "/fms/hs-codes", icon: ClipboardList },
        { labelKey: "fms.parsingInstructions", href: "/fms/parsing-instructions", icon: BookOpen },
      ],
    },
    {
      key: "fmsMasterData",
      labelKey: "nav.groups.masterData",
      items: [
        { labelKey: "fms.agentsPartners", href: "/fms/agents", icon: Users },
        { labelKey: "fms.freightRates", href: "/fms/rates", icon: DollarSign },
      ],
    },
    {
      key: "fmsReports",
      labelKey: "nav.groups.reports",
      items: [
        { labelKey: "fms.shipmentReport", href: "/fms/reports/shipments", icon: BarChart3 },
        { labelKey: "fms.profitAnalysis", href: "/fms/reports/profit", icon: TrendingUp },
        { labelKey: "fms.agentPerformance", href: "/fms/reports/agents", icon: Award },
      ],
    },
  ],
};

const PMS_CONFIG: ModuleConfig = {
  key: "pms",
  labelKey: "nav.modules.pms",
  icon: Anchor,
  dashboard: [{ labelKey: "nav.pmsDashboard", href: "/pms", icon: Anchor }],
  groups: [
    {
      key: "pmsVessel",
      labelKey: "nav.groups.vessel",
      items: [
        { labelKey: "pms.vesselSchedule", href: "/pms/vessels", icon: Ship },
        { labelKey: "pms.berthPlanning", href: "/pms/berth", icon: Anchor },
        { labelKey: "pms.voyageManagement", href: "/pms/voyages", icon: Route },
      ],
    },
    {
      key: "pmsYard",
      labelKey: "nav.groups.yard",
      items: [
        { labelKey: "pms.yardOverview", href: "/pms/yard", icon: MapPin },
        { labelKey: "pms.blockManagement", href: "/pms/blocks", icon: Boxes },
        { labelKey: "pms.reeferMonitoring", href: "/pms/reefer", icon: Clock },
        { labelKey: "pms.equipmentTracking", href: "/pms/equipment", icon: Truck },
      ],
    },
    {
      key: "pmsGate",
      labelKey: "nav.groups.gate",
      items: [
        { labelKey: "pms.gateOperations", href: "/pms/gate", icon: Building },
        { labelKey: "pms.truckAppointments", href: "/pms/appointments", icon: Calendar },
        { labelKey: "pms.eir", href: "/pms/eir", icon: FileCheck },
        { labelKey: "pms.queueManagement", href: "/pms/queue", icon: Users },
      ],
    },
    {
      key: "pmsContainer",
      labelKey: "nav.groups.container",
      items: [
        { labelKey: "pms.containerTracking", href: "/pms/containers", icon: Package },
        { labelKey: "pms.containerInventory", href: "/pms/container-inventory", icon: Boxes },
        { labelKey: "pms.mrDamage", href: "/pms/damage", icon: Wrench },
        { labelKey: "pms.detentionDemurrage", href: "/pms/detention", icon: Clock },
      ],
    },
    {
      key: "pmsBilling",
      labelKey: "nav.groups.billing",
      items: [
        { labelKey: "pms.thcCharges", href: "/pms/thc", icon: DollarSign },
        { labelKey: "pms.storageFees", href: "/pms/storage-fees", icon: Banknote },
        { labelKey: "pms.equipmentRental", href: "/pms/rental", icon: Receipt },
        { labelKey: "pms.tariffManagement", href: "/pms/tariffs", icon: FileText },
      ],
    },
    {
      key: "pmsReports",
      labelKey: "nav.groups.reports",
      items: [
        { labelKey: "pms.throughputReport", href: "/pms/reports/throughput", icon: BarChart3 },
        { labelKey: "pms.dwellTime", href: "/pms/reports/dwell-time", icon: Clock },
        { labelKey: "pms.productivityKpis", href: "/pms/reports/productivity", icon: TrendingUp },
        { labelKey: "pms.capacityForecast", href: "/pms/reports/capacity", icon: PieChart },
      ],
    },
  ],
};

const EMS_CONFIG: ModuleConfig = {
  key: "ems",
  labelKey: "nav.modules.ems",
  icon: Zap,
  dashboard: [{ labelKey: "nav.emsDashboard", href: "/ems", icon: Zap }],
  groups: [
    {
      key: "emsOrders",
      labelKey: "nav.groups.orders",
      items: [
        { labelKey: "ems.parcelOrders", href: "/ems/orders", icon: Package },
        { labelKey: "ems.codOrders", href: "/ems/cod", icon: Banknote },
        { labelKey: "ems.returns", href: "/ems/returns", icon: RotateCcw },
        { labelKey: "ems.bulkUpload", href: "/ems/bulk-upload", icon: FileSpreadsheet },
      ],
    },
    {
      key: "emsSorting",
      labelKey: "nav.groups.sorting",
      items: [
        { labelKey: "ems.sortingCenter", href: "/ems/sorting", icon: Boxes },
        { labelKey: "ems.hubManagement", href: "/ems/hubs", icon: Building },
        { labelKey: "ems.crossDocking", href: "/ems/crossdock", icon: ArrowLeftRight },
        { labelKey: "ems.outboundDispatch", href: "/ems/dispatch", icon: Truck },
      ],
    },
    {
      key: "emsDelivery",
      labelKey: "nav.groups.delivery",
      items: [
        { labelKey: "ems.routePlanning", href: "/ems/routes", icon: Route },
        { labelKey: "ems.driverAssignment", href: "/ems/assignments", icon: Users },
        { labelKey: "ems.liveTracking", href: "/ems/tracking", icon: MapPin },
        { labelKey: "ems.proofOfDelivery", href: "/ems/pod", icon: FileCheck },
        { labelKey: "ems.failedDeliveries", href: "/ems/failed", icon: RotateCcw },
      ],
    },
    {
      key: "emsShipper",
      labelKey: "nav.groups.shipperPortal",
      items: [
        { labelKey: "ems.shipperPortal", href: "/ems/shipper-portal", icon: Building2 },
        { labelKey: "ems.apiManagement", href: "/ems/api", icon: Settings },
        { labelKey: "ems.trackingWidget", href: "/ems/widget", icon: PackageSearch },
      ],
    },
    {
      key: "emsPricing",
      labelKey: "nav.groups.pricing",
      items: [
        { labelKey: "ems.zonePricing", href: "/ems/zones", icon: MapPinned },
        { labelKey: "ems.serviceLevels", href: "/ems/service-levels", icon: Zap },
        { labelKey: "ems.weightCalculator", href: "/ems/calculator", icon: Calculator },
        { labelKey: "ems.surcharges", href: "/ems/surcharges", icon: Percent },
      ],
    },
    {
      key: "emsSettlement",
      labelKey: "nav.groups.settlement",
      items: [
        { labelKey: "ems.codReconciliation", href: "/ems/cod-recon", icon: ClipboardCheck },
        { labelKey: "ems.driverSettlement", href: "/ems/driver-settlement", icon: CreditCard },
        { labelKey: "ems.partnerCommission", href: "/ems/commission", icon: Handshake },
      ],
    },
    {
      key: "emsReports",
      labelKey: "nav.groups.reports",
      items: [
        { labelKey: "ems.deliveryReport", href: "/ems/reports/delivery", icon: BarChart3 },
        { labelKey: "ems.slaPerformance", href: "/ems/reports/sla", icon: TrendingUp },
        { labelKey: "ems.codReport", href: "/ems/reports/cod", icon: DollarSign },
        { labelKey: "ems.zoneAnalysis", href: "/ems/reports/zones", icon: PieChart },
      ],
    },
  ],
};

const MES_CONFIG: ModuleConfig = {
  key: "mes",
  labelKey: "nav.modules.mes",
  icon: Factory,
  dashboard: [{ labelKey: "nav.mesDashboard", href: "/mes", icon: Factory }],
  groups: [
    {
      key: "mesPlanning",
      labelKey: "nav.groups.planning",
      items: [
        { labelKey: "mes.productionOrders", href: "/mes/production-orders", icon: ClipboardList },
        { labelKey: "mes.workOrders", href: "/mes/work-orders", icon: Hammer },
      ],
    },
    {
      key: "mesEngineering",
      labelKey: "nav.groups.engineering",
      items: [
        { labelKey: "mes.billOfMaterials", href: "/mes/bom", icon: GitMerge },
        { labelKey: "mes.routings", href: "/mes/routings", icon: Route },
        { labelKey: "mes.workstations", href: "/mes/workstations", icon: Cog },
      ],
    },
    {
      key: "mesQuality",
      labelKey: "nav.groups.quality",
      items: [{ labelKey: "mes.qualityControl", href: "/mes/quality", icon: ClipboardCheck }],
    },
    {
      key: "mesMaintenance",
      labelKey: "nav.groups.maintenance",
      items: [{ labelKey: "mes.equipmentMaintenance", href: "/mes/maintenance", icon: Wrench }],
    },
  ],
};

const CONTROLLING_CONFIG: ModuleConfig = {
  key: "controlling",
  labelKey: "nav.modules.controlling",
  icon: PiggyBank,
  dashboard: [{ labelKey: "nav.controllingDashboard", href: "/controlling", icon: PiggyBank }],
  groups: [
    {
      key: "ctrlCostCenters",
      labelKey: "nav.groups.costCenters",
      items: [
        { labelKey: "controlling.costCenters", href: "/controlling/cost-centers", icon: Layers },
        { labelKey: "controlling.costAllocation", href: "/controlling/cost-allocation", icon: GitBranch },
      ],
    },
    {
      key: "ctrlBudgets",
      labelKey: "nav.groups.budgets",
      items: [
        { labelKey: "controlling.budgets", href: "/controlling/budgets", icon: Calculator },
        { labelKey: "controlling.budgetVersions", href: "/controlling/budget-versions", icon: FileText },
        { labelKey: "controlling.budgetTransfer", href: "/controlling/budget-transfer", icon: ArrowLeftRight },
      ],
    },
    {
      key: "ctrlProfit",
      labelKey: "nav.groups.profitCenters",
      items: [
        { labelKey: "controlling.profitCenters", href: "/controlling/profit-centers", icon: TrendingUp },
        { labelKey: "controlling.profitAnalysis", href: "/controlling/profit-analysis", icon: BarChart3 },
        { labelKey: "controlling.segmentReports", href: "/controlling/segment-reports", icon: PieChart },
      ],
    },
    {
      key: "ctrlOrders",
      labelKey: "nav.groups.internalOrders",
      items: [{ labelKey: "controlling.internalOrders", href: "/controlling/internal-orders", icon: ClipboardList }],
    },
    {
      key: "ctrlAbc",
      labelKey: "nav.groups.activityBasedCosting",
      items: [
        { labelKey: "controlling.activityTypes", href: "/controlling/activity-types", icon: Briefcase },
        { labelKey: "controlling.activities", href: "/controlling/activities", icon: Target },
        { labelKey: "controlling.activityRates", href: "/controlling/activity-rates", icon: DollarSign },
      ],
    },
  ],
};

const PROJECT_CONFIG: ModuleConfig = {
  key: "project",
  labelKey: "nav.modules.project",
  icon: FolderKanban,
  dashboard: [{ labelKey: "nav.projectDashboard", href: "/project", icon: FolderKanban }],
  groups: [
    {
      key: "prjProjects",
      labelKey: "nav.groups.projects",
      items: [
        { labelKey: "project.projects", href: "/project/projects", icon: FolderKanban },
        { labelKey: "project.phases", href: "/project/phases", icon: Layers },
        { labelKey: "project.members", href: "/project/members", icon: Users },
      ],
    },
    {
      key: "prjTasks",
      labelKey: "nav.groups.tasks",
      items: [
        { labelKey: "project.tasks", href: "/project/tasks", icon: ListChecks },
        { labelKey: "project.kanbanBoard", href: "/project/kanban", icon: ClipboardList },
        { labelKey: "project.ganttChart", href: "/project/gantt", icon: BarChart3 },
      ],
    },
    {
      key: "prjMilestones",
      labelKey: "nav.groups.milestones",
      items: [{ labelKey: "project.milestones", href: "/project/milestones", icon: Milestone }],
    },
    {
      key: "prjResources",
      labelKey: "nav.groups.resources",
      items: [
        { labelKey: "project.resources", href: "/project/resources", icon: Users },
        { labelKey: "project.allocations", href: "/project/allocations", icon: Calendar },
        { labelKey: "project.timesheets", href: "/project/timesheets", icon: Clock },
      ],
    },
    {
      key: "prjRisks",
      labelKey: "nav.groups.risksIssues",
      items: [
        { labelKey: "project.risks", href: "/project/risks", icon: ShieldIcon },
        { labelKey: "project.issues", href: "/project/issues", icon: MessageSquare },
      ],
    },
  ],
};

const WORKFLOW_CONFIG: ModuleConfig = {
  key: "workflow",
  labelKey: "nav.modules.workflow",
  icon: Workflow,
  dashboard: [{ labelKey: "nav.workflowDashboard", href: "/workflow", icon: Workflow }],
  groups: [
    {
      key: "wfDefinitions",
      labelKey: "nav.groups.definitions",
      items: [
        { labelKey: "workflow.definitions", href: "/workflow/definitions", icon: GitBranch },
        { labelKey: "workflow.stepsTransitions", href: "/workflow/steps", icon: Layers },
      ],
    },
    {
      key: "wfInstances",
      labelKey: "nav.groups.instances",
      items: [
        { labelKey: "workflow.runningWorkflows", href: "/workflow/instances", icon: Workflow },
        { labelKey: "workflow.workflowHistory", href: "/workflow/history", icon: History },
      ],
    },
    {
      key: "wfApprovals",
      labelKey: "nav.groups.approvals",
      items: [
        { labelKey: "workflow.pendingApprovals", href: "/workflow/approvals", icon: CheckSquare },
        { labelKey: "workflow.myRequests", href: "/workflow/my-requests", icon: FileText },
        { labelKey: "workflow.delegation", href: "/workflow/delegation", icon: Users },
      ],
    },
    {
      key: "wfTasks",
      labelKey: "nav.groups.tasks",
      items: [
        { labelKey: "workflow.myTasks", href: "/workflow/tasks", icon: ListChecks },
        { labelKey: "workflow.notifications", href: "/workflow/notifications", icon: Bell },
      ],
    },
  ],
};

const DMS_CONFIG: ModuleConfig = {
  key: "dms",
  labelKey: "nav.modules.dms",
  icon: FolderOpen,
  dashboard: [{ labelKey: "nav.dmsDashboard", href: "/dms", icon: FolderOpen }],
  groups: [
    {
      key: "dmsFolders",
      labelKey: "nav.groups.foldersDocuments",
      items: [
        { labelKey: "dms.folders", href: "/dms/folders", icon: FolderOpen },
        { labelKey: "dms.documents", href: "/dms/documents", icon: File },
        { labelKey: "dms.myDocuments", href: "/dms/my-documents", icon: FileText },
      ],
    },
    {
      key: "dmsSharing",
      labelKey: "nav.groups.sharing",
      items: [
        { labelKey: "dms.sharedWithMe", href: "/dms/shared", icon: Share2 },
        { labelKey: "dms.shareLinks", href: "/dms/share-links", icon: Share2 },
      ],
    },
    {
      key: "dmsArchive",
      labelKey: "nav.groups.archiveRetention",
      items: [
        { labelKey: "dms.archivePolicies", href: "/dms/archive-policies", icon: Archive },
        { labelKey: "dms.archivedDocuments", href: "/dms/archived", icon: Archive },
        { labelKey: "dms.retention", href: "/dms/retention", icon: Clock },
      ],
    },
    {
      key: "dmsTemplates",
      labelKey: "nav.groups.templates",
      items: [
        { labelKey: "dms.templates", href: "/dms/templates", icon: FileCode },
        { labelKey: "dms.generatedDocuments", href: "/dms/generated", icon: FileText },
      ],
    },
  ],
};

const OMS_CONFIG: ModuleConfig = {
  key: "oms",
  labelKey: "nav.modules.oms",
  icon: ShoppingCart,
  dashboard: [{ labelKey: "nav.omsDashboard", href: "/oms", icon: ShoppingCart }],
  groups: [
    {
      key: "omsOrders",
      labelKey: "nav.groups.orders",
      items: [
        { labelKey: "oms.orders", href: "/oms/orders", icon: ShoppingCart },
        { labelKey: "oms.allocations", href: "/oms/allocations", icon: Boxes },
        { labelKey: "oms.shipments", href: "/oms/shipments", icon: Truck },
      ],
    },
    {
      key: "omsApprovals",
      labelKey: "nav.groups.approvals",
      items: [
        { labelKey: "oms.priceApprovals", href: "/oms/price-approvals", icon: CheckSquare },
      ],
    },
    {
      key: "omsReports",
      labelKey: "nav.groups.reports",
      items: [
        { labelKey: "oms.salesReport", href: "/oms/reports/sales", icon: BarChart3 },
        { labelKey: "oms.orderAnalytics", href: "/oms/reports/analytics", icon: PieChart },
      ],
    },
  ],
};

const SETTINGS_CONFIG: ModuleConfig = {
  key: "settings",
  labelKey: "nav.modules.settings",
  icon: Settings,
  dashboard: [
    { labelKey: "settings.systemSettings", href: "/settings", icon: Settings },
    { labelKey: "settings.billing", href: "/settings/billing", icon: CreditCard },
  ],
  groups: [
    {
      key: "platformSettings",
      labelKey: "nav.groups.platform",
      items: [
        { labelKey: "settings.usersManagement", href: "/users", icon: UserCog },
        { labelKey: "settings.rolePermissions", href: "/role-permissions", icon: Shield },
      ],
    },
  ],
};

// All modules in default order
const ALL_MODULES: ModuleConfig[] = [
  TMS_CONFIG,
  OMS_CONFIG,
  WMS_CONFIG,
  FMS_CONFIG,
  PMS_CONFIG,
  EMS_CONFIG,
  MES_CONFIG,
  CRM_CONFIG,
  HRM_CONFIG,
  ACCOUNTING_CONFIG,
  CONTROLLING_CONFIG,
  PROJECT_CONFIG,
  WORKFLOW_CONFIG,
  DMS_CONFIG,
];

const SUPER_ADMIN_MENU: MenuItem[] = [
  { labelKey: "settings.adminConsole", href: "/admin/tenants", icon: Building2 },
  { labelKey: "settings.adminBilling", href: "/admin/billing", icon: BadgeDollarSign },
  { labelKey: "settings.activityLogs", href: "/admin/activity-logs", icon: History },
  { labelKey: "settings.aiSettings", href: "/admin/ai-settings", icon: Brain },
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
  const t = useTranslations();
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
        <div className="flex items-center gap-2" {...attributes} {...listeners}>
          <Icon className="w-5 h-5 cursor-grab" />
          <span>{t(module.labelKey)}</span>
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
  const t = useTranslations();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.href,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = item.icon;
  const label = t(item.labelKey);

  return (
    <div ref={setNodeRef} style={style} className="flex items-center group" {...attributes} {...listeners}>
      <Link
        href={item.href}
        className={`flex-1 flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-lg px-3 py-2 text-sm
          ${isActive ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`}
        title={collapsed ? label : undefined}
      >
        <Icon className={`${isSubItem ? "w-4 h-4" : "w-5 h-5"} flex-shrink-0`} />
        {!collapsed && <span>{label}</span>}
      </Link>
      {!collapsed && (
        <button
          onClick={onToggleStar}
          className={`p-1 rounded hover:bg-gray-200 transition-colors ${
            isStarred ? "text-yellow-500" : "text-gray-300 opacity-0 group-hover:opacity-100"
          }`}
          title={isStarred ? t("common.removeDefault") : t("common.setDefault")}
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
  const t = useTranslations();
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
        // Merge with ALL_MODULES to include any new modules
        const allModuleKeys = ALL_MODULES.map(m => m.key);
        const merged = [...parsed];

        // Add new modules that don't exist in saved order
        for (const key of allModuleKeys) {
          if (!merged.includes(key)) {
            // Find the position in ALL_MODULES and insert at same relative position
            const defaultIndex = allModuleKeys.indexOf(key);
            merged.splice(defaultIndex, 0, key);
          }
        }

        setModuleOrder(merged);
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
    const label = t(item.labelKey);

    return (
      <div key={item.href} className="flex items-center group">
        <Link
          href={item.href}
          className={`flex-1 flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-lg px-3 py-2 text-sm
            ${active ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`}
          title={collapsed ? label : undefined}
        >
          <Icon className={`${isSubItem ? "w-4 h-4" : "w-5 h-5"} flex-shrink-0`} />
          {!collapsed && <span>{label}</span>}
        </Link>
        {!collapsed && (
          <button
            onClick={(e) => toggleStar(itemKey, e)}
            className={`p-1 rounded hover:bg-gray-200 transition-colors ${
              isStarred ? "text-yellow-500" : "text-gray-300 opacity-0 group-hover:opacity-100"
            }`}
            title={isStarred ? t("common.removeDefault") : t("common.setDefault")}
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
          const label = t(item.labelKey);
          return (
            <div key={item.href} className="flex items-center group">
              <Link
                href={item.href}
                className={`flex-1 flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-lg px-3 py-2 text-sm
                  ${pathname === item.href ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`}
                title={collapsed ? label : undefined}
              >
                <item.icon className={`${!collapsed ? "w-4 h-4" : "w-5 h-5"} flex-shrink-0`} />
                {!collapsed && <span>{label}</span>}
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
            <span className="font-medium">{t(group.labelKey)}</span>
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
      <div className="px-3 py-3 border-b flex items-center justify-between flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">9</span>
            </div>
            <span className="font-semibold text-gray-800">log.tech</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-lg">9</span>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-gray-100 rounded"
            title={t("common.collapse")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      <nav className="p-2 space-y-1 overflow-y-auto flex-1 pb-20">
        {/* Platform Level */}
        {MAIN_MENU.map((item) => renderMenuItem(item))}

        {/* Starred/Favorites Section */}
        {!collapsed && Object.keys(starredMenus).filter((k) => starredMenus[k]).length > 0 && (
          <div className="pt-2 pb-1">
            <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              {t("common.favorites")}
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
                        <span className="truncate">{t(menuItem.labelKey)}</span>
                      </Link>
                      <button
                        onClick={(e) => toggleStar(itemKey, e)}
                        className="p-1 rounded hover:bg-gray-200 text-yellow-500"
                        title={t("common.removeFavorite")}
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
                    <span>{t(module.labelKey)}</span>
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
                <span>{t(SETTINGS_CONFIG.labelKey)}</span>
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
