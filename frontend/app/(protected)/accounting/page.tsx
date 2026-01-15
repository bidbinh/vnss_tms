"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Calculator,
  FileText,
  Building2,
  CreditCard,
  Receipt,
  DollarSign,
  TrendingUp,
  Package,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  Loader2,
  Truck,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface DashboardData {
  ar_total: number;
  ap_total: number;
  bank_balance: number;
  asset_count: number;
  pending_invoices: number;
  overdue_ar: number;
  overdue_ap: number;
}

const QUICK_LINKS_CONFIG = [
  {
    titleKey: "quickLinks.payrollPayments",
    descKey: "quickLinks.payrollPaymentsDesc",
    href: "/accounting/payroll-payments",
    icon: Truck,
    color: "bg-green-600",
  },
  {
    titleKey: "quickLinks.chartOfAccounts",
    descKey: "quickLinks.chartOfAccountsDesc",
    href: "/accounting/chart-of-accounts",
    icon: Calculator,
    color: "bg-blue-500",
  },
  {
    titleKey: "quickLinks.journalEntries",
    descKey: "quickLinks.journalEntriesDesc",
    href: "/accounting/journal-entries",
    icon: FileText,
    color: "bg-purple-500",
  },
  {
    titleKey: "quickLinks.accountsReceivable",
    descKey: "quickLinks.accountsReceivableDesc",
    href: "/accounting/accounts-receivable",
    icon: ArrowUpRight,
    color: "bg-green-500",
  },
  {
    titleKey: "quickLinks.accountsPayable",
    descKey: "quickLinks.accountsPayableDesc",
    href: "/accounting/accounts-payable",
    icon: ArrowDownRight,
    color: "bg-orange-500",
  },
  {
    titleKey: "quickLinks.banking",
    descKey: "quickLinks.bankingDesc",
    href: "/accounting/banking",
    icon: Building2,
    color: "bg-cyan-500",
  },
  {
    titleKey: "quickLinks.fixedAssets",
    descKey: "quickLinks.fixedAssetsDesc",
    href: "/accounting/fixed-assets",
    icon: Package,
    color: "bg-amber-500",
  },
  {
    titleKey: "quickLinks.tax",
    descKey: "quickLinks.taxDesc",
    href: "/accounting/tax",
    icon: Receipt,
    color: "bg-red-500",
  },
  {
    titleKey: "quickLinks.reports",
    descKey: "quickLinks.reportsDesc",
    href: "/accounting/reports",
    icon: TrendingUp,
    color: "bg-indigo-500",
  },
];

export default function AccountingDashboard() {
  const router = useRouter();
  const t = useTranslations("accounting.dashboard");
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    // TODO: Fetch dashboard summary when API is ready
    setLoading(false);
  }, [router]);

  const handleSeedData = async () => {
    if (!confirm(t("seedConfirm"))) return;

    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await apiFetch("/accounting/seed-data", {
        method: "POST",
      });
      setSeedResult(result);
      alert(t("seedSuccess"));
    } catch (error: any) {
      console.error("Seed error:", error);
      alert(t("seedError") + ": " + (error.message || ""));
    } finally {
      setSeeding(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <button
          onClick={handleSeedData}
          disabled={seeding}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {seeding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          {seeding ? t("seeding") : t("seedData")}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("accountsReceivable")}</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ArrowDownRight className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("accountsPayable")}</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("bankBalance")}</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("fixedAssetsCount")}</p>
              <p className="text-lg font-semibold text-gray-900">0 {t("assets")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_LINKS_CONFIG.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div
                className={`p-2 rounded-lg ${link.color} text-white`}
              >
                <link.icon className="w-5 h-5" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            <h3 className="mt-3 font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {t(link.titleKey)}
            </h3>
            <p className="mt-1 text-sm text-gray-500">{t(link.descKey)}</p>
          </Link>
        ))}
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Tasks */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{t("pendingTasks")}</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="p-1.5 bg-yellow-100 rounded">
                  <Receipt className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {t("pendingInvoices")}
                  </p>
                  <p className="text-xs text-gray-500">0 {t("invoices")}</p>
                </div>
                <Link
                  href="/accounting/accounts-receivable"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t("view")}
                </Link>
              </div>

              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="p-1.5 bg-red-100 rounded">
                  <ArrowUpRight className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {t("overdueReceivable")}
                  </p>
                  <p className="text-xs text-gray-500">{formatCurrency(0)}</p>
                </div>
                <Link
                  href="/accounting/accounts-receivable?overdue=true"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t("view")}
                </Link>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="p-1.5 bg-orange-100 rounded">
                  <ArrowDownRight className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {t("paymentsDue")}
                  </p>
                  <p className="text-xs text-gray-500">{formatCurrency(0)}</p>
                </div>
                <Link
                  href="/accounting/accounts-payable"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t("view")}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{t("quickActions")}</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/accounting/journal-entries/new"
                className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">
                  {t("createEntry")}
                </span>
              </Link>

              <Link
                href="/accounting/accounts-receivable/invoices/new"
                className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Receipt className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-gray-700">
                  {t("createInvoice")}
                </span>
              </Link>

              <Link
                href="/accounting/banking/transactions/new"
                className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CreditCard className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">
                  {t("recordTransaction")}
                </span>
              </Link>

              <Link
                href="/accounting/accounts-payable/vouchers/new"
                className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <DollarSign className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-gray-700">
                  {t("createVoucher")}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
