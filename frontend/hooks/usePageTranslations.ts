import { useTranslations } from "next-intl";
import { useMemo } from "react";

/**
 * Custom hook để dễ dàng sử dụng translations trong pages
 *
 * @example
 * // Trong page component:
 * const { t, tCommon, formatStatus, formatCurrency } = usePageTranslations("tms.ordersPage");
 *
 * // Sử dụng:
 * <h1>{t("title")}</h1>
 * <button>{tCommon("save")}</button>
 * <span>{formatStatus("COMPLETED")}</span>
 */
export function usePageTranslations(namespace: string) {
  const t = useTranslations(namespace);
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");

  // Helper để format status - tự động lowercase key
  const formatStatus = useMemo(
    () => (status: string) => {
      try {
        return t(`status.${status.toLowerCase()}`);
      } catch {
        return status;
      }
    },
    [t]
  );

  // Helper để format currency theo locale
  const formatCurrency = useMemo(
    () =>
      (amount: number, currency: string = "VND") => {
        return new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }).format(amount);
      },
    []
  );

  // Helper để format date theo locale
  const formatDate = useMemo(
    () =>
      (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
        const d = typeof date === "string" ? new Date(date) : date;
        return d.toLocaleDateString("vi-VN", options || { day: "2-digit", month: "2-digit", year: "numeric" });
      },
    []
  );

  // Helper để tạo column headers cho DataTable
  const getColumnHeader = useMemo(
    () => (key: string) => {
      try {
        return t(`columns.${key}`);
      } catch {
        return key;
      }
    },
    [t]
  );

  // Helper để tạo tab labels
  const getTabLabel = useMemo(
    () => (key: string) => {
      try {
        return t(`tabs.${key}`);
      } catch {
        return key;
      }
    },
    [t]
  );

  // Helper để tạo action labels
  const getActionLabel = useMemo(
    () => (action: string) => {
      try {
        return t(`actions.${action}`);
      } catch {
        return tCommon(action);
      }
    },
    [t, tCommon]
  );

  return {
    t,
    tCommon,
    tNav,
    formatStatus,
    formatCurrency,
    formatDate,
    getColumnHeader,
    getTabLabel,
    getActionLabel,
  };
}

/**
 * Hook để lấy các common labels thường dùng
 */
export function useCommonLabels() {
  const t = useTranslations("common");

  return useMemo(
    () => ({
      save: t("save"),
      cancel: t("cancel"),
      delete: t("delete"),
      edit: t("edit"),
      create: t("create"),
      search: t("search"),
      loading: t("loading"),
      noData: t("noData"),
      confirm: t("confirm"),
      yes: t("yes"),
      no: t("no"),
      actions: t("actions"),
      status: t("status"),
      date: t("date"),
      name: t("name"),
      description: t("description"),
      notes: t("notes"),
      total: t("total"),
      amount: t("amount"),
      from: t("from"),
      to: t("to"),
      all: t("all"),
      active: t("active"),
      inactive: t("inactive"),
      pending: t("pending"),
      completed: t("completed"),
      failed: t("failed"),
    }),
    [t]
  );
}
