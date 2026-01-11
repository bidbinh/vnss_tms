"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import DataTable, { Column, TablePagination } from "@/components/DataTable";
import { DollarSign, Plus, Search, MapPin, TrendingUp, CheckCircle, Clock, Copy, ChevronDown, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

// ============ Types ============
type Location = {
  id: string;
  code: string;
  name: string;
  type: string;
};

type Customer = {
  id: string;
  code: string;
  name: string;
};

type Rate = {
  id: string;
  pickup_location_id: string;
  pickup_location_name?: string;
  pickup_location_code?: string;
  delivery_location_id: string;
  delivery_location_name?: string;
  delivery_location_code?: string;
  distance_km?: number;
  toll_stations?: number;
  pricing_type: string;
  price_cont_20?: number;
  price_cont_40?: number;
  price_per_trip?: number;
  customer_ids: string[];
  customer_names?: string;
  customer_codes?: string;
  effective_date: string;
  end_date?: string;
  status: string;
  created_at?: string;
};

type RateForm = {
  pickup_location_id: string;
  delivery_location_id: string;
  distance_km: string;
  toll_stations: string;
  pricing_type: string;
  price_cont_20: string;
  price_cont_40: string;
  price_per_trip: string;
  customer_ids: string[];
  effective_date: string;
  end_date: string;
  status: string;
};

// ============ Stats Card Component ============
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/60">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs opacity-80">{label}</div>
        </div>
      </div>
    </div>
  );
}

// ============ Currency Formatter ============
function formatCurrency(amount?: number): string {
  if (amount == null) return "-";
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

// ============ Searchable Select Component ============
type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; code: string; name: string }[];
  placeholder?: string;
};

function SearchableSelect({ value, onChange, options, placeholder, searchPlaceholder, noResultsText }: SearchableSelectProps & { searchPlaceholder?: string; noResultsText?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find selected option
  const selectedOption = options.find((opt) => opt.id === value);

  // Filter options by search
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const s = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.code.toLowerCase().includes(s) ||
        opt.name.toLowerCase().includes(s)
    );
  }, [options, search]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  function handleSelect(id: string) {
    onChange(id);
    setIsOpen(false);
    setSearch("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus-within:ring-2 focus-within:ring-blue-200 cursor-pointer flex items-center justify-between bg-white"
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-400"}>
          {selectedOption ? `${selectedOption.code} - ${selectedOption.name}` : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <button
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder || "Search..."}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-44 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">{noResultsText || "No results found"}</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                    opt.id === value ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                  }`}
                >
                  <span className="font-medium">{opt.code}</span>
                  <span className="text-gray-500"> - {opt.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Main Component ============
export default function RatesPage() {
  const t = useTranslations("tms.ratesPage");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Rate[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Rate | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm: RateForm = {
    pickup_location_id: "",
    delivery_location_id: "",
    distance_km: "",
    toll_stations: "",
    pricing_type: "CONTAINER",
    price_cont_20: "",
    price_cont_40: "",
    price_per_trip: "",
    customer_ids: [],
    effective_date: new Date().toISOString().split("T")[0],
    end_date: "",
    status: "ACTIVE",
  };

  const [form, setForm] = useState<RateForm>(emptyForm);

  // Sorting
  const [sortField, setSortField] = useState<string>("pickup_location_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // ============ Data Fetching ============
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ratesData, locationsData, customersData] = await Promise.all([
        apiFetch<Rate[]>("/api/v1/rates"),
        apiFetch<Location[]>("/api/v1/locations"),
        apiFetch<Customer[]>("/api/v1/customers"),
      ]);
      setRows(ratesData);
      setLocations(locationsData);
      setCustomers(customersData);
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ============ Filtering & Pagination ============
  const filteredRows = useMemo(() => {
    let result = rows;

    // Filter by pricing type
    if (filterType !== "ALL") {
      result = result.filter((r) => r.pricing_type === filterType);
    }

    // Filter by search term
    const s = searchTerm.toLowerCase();
    if (s) {
      result = result.filter(
        (r) =>
          (r.pickup_location_name || "").toLowerCase().includes(s) ||
          (r.pickup_location_code || "").toLowerCase().includes(s) ||
          (r.delivery_location_name || "").toLowerCase().includes(s) ||
          (r.delivery_location_code || "").toLowerCase().includes(s) ||
          (r.customer_names || "").toLowerCase().includes(s)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let aVal: any = "";
      let bVal: any = "";

      switch (sortField) {
        case "pickup":
          aVal = a.pickup_location_name || "";
          bVal = b.pickup_location_name || "";
          break;
        case "delivery":
          aVal = a.delivery_location_name || "";
          bVal = b.delivery_location_name || "";
          break;
        case "km":
          aVal = a.distance_km ?? 0;
          bVal = b.distance_km ?? 0;
          break;
        case "pricing_type":
          aVal = a.pricing_type || "";
          bVal = b.pricing_type || "";
          break;
        case "prices":
          // Sort by price_cont_20 or price_per_trip
          aVal = a.price_cont_20 || a.price_per_trip || 0;
          bVal = b.price_cont_20 || b.price_per_trip || 0;
          break;
        case "customer":
          aVal = a.customer_names || "Tất cả";
          bVal = b.customer_names || "Tất cả";
          break;
        case "dates":
          aVal = a.effective_date || "";
          bVal = b.effective_date || "";
          break;
        case "status":
          aVal = a.status || "";
          bVal = b.status || "";
          break;
        default:
          aVal = (a as any)[sortField] || "";
          bVal = (b as any)[sortField] || "";
      }

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [rows, searchTerm, filterType, sortField, sortOrder]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, pageSize]);

  // ============ Stats ============
  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const container = rows.filter((r) => r.pricing_type === "CONTAINER").length;
    const trip = rows.filter((r) => r.pricing_type === "TRIP").length;
    const expiringSoon = rows.filter((r) => {
      if (!r.end_date) return false;
      const endDate = new Date(r.end_date);
      const today = new Date();
      const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      return endDate <= thirtyDaysLater && endDate >= today;
    }).length;
    return { total: rows.length, active, container, trip, expiringSoon };
  }, [rows]);

  // ============ Modal Functions ============
  function openCreate() {
    setMode("create");
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: Rate) {
    setMode("edit");
    setEditing(row);
    setForm({
      pickup_location_id: row.pickup_location_id || "",
      delivery_location_id: row.delivery_location_id || "",
      distance_km: row.distance_km?.toString() || "",
      toll_stations: row.toll_stations?.toString() || "",
      pricing_type: row.pricing_type || "CONTAINER",
      price_cont_20: row.price_cont_20?.toString() || "",
      price_cont_40: row.price_cont_40?.toString() || "",
      price_per_trip: row.price_per_trip?.toString() || "",
      customer_ids: row.customer_ids || [],
      effective_date: row.effective_date ? new Date(row.effective_date).toISOString().split("T")[0] : "",
      end_date: row.end_date ? new Date(row.end_date).toISOString().split("T")[0] : "",
      status: row.status || "ACTIVE",
    });
    setOpen(true);
  }

  function openDuplicate(row: Rate) {
    setMode("create"); // Tạo mới, không phải edit
    setEditing(null);
    setForm({
      pickup_location_id: row.pickup_location_id || "",
      delivery_location_id: row.delivery_location_id || "",
      distance_km: row.distance_km?.toString() || "",
      toll_stations: row.toll_stations?.toString() || "",
      pricing_type: row.pricing_type || "CONTAINER",
      price_cont_20: row.price_cont_20?.toString() || "",
      price_cont_40: row.price_cont_40?.toString() || "",
      price_per_trip: row.price_per_trip?.toString() || "",
      customer_ids: row.customer_ids || [],
      effective_date: new Date().toISOString().split("T")[0], // Ngày hiệu lực = hôm nay
      end_date: "", // Không copy ngày hết hạn
      status: "ACTIVE",
    });
    setOpen(true);
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      if (!form.pickup_location_id || !form.delivery_location_id) {
        throw new Error(t("errors.pickupDeliveryRequired"));
      }

      const payload: any = {
        pickup_location_id: form.pickup_location_id,
        delivery_location_id: form.delivery_location_id,
        distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
        toll_stations: form.toll_stations ? parseInt(form.toll_stations) : null,
        pricing_type: form.pricing_type,
        price_cont_20: form.price_cont_20 ? parseFloat(form.price_cont_20) : null,
        price_cont_40: form.price_cont_40 ? parseFloat(form.price_cont_40) : null,
        price_per_trip: form.price_per_trip ? parseFloat(form.price_per_trip) : null,
        customer_ids: form.customer_ids,
        effective_date: form.effective_date,
        end_date: form.end_date || null,
        status: form.status,
      };

      if (mode === "create") {
        await apiFetch<Rate>("/api/v1/rates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!editing) throw new Error("Missing editing row");
        await apiFetch<Rate>(`/api/v1/rates/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      setOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmations.deleteRate"))) return;

    try {
      await apiFetch(`/api/v1/rates/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  }

  // Customer selection handler
  function toggleCustomer(customerId: string) {
    setForm((prev) => ({
      ...prev,
      customer_ids: prev.customer_ids.includes(customerId)
        ? prev.customer_ids.filter((id) => id !== customerId)
        : [...prev.customer_ids, customerId],
    }));
  }

  // ============ Sorting Functions ============
  function handleSort(field: string) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  function getSortIcon(field: string) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  }

  // ============ Table Column Definitions ============
  const columnDefs = [
    { key: "pickup", header: t("columns.pickup"), width: 160, sortable: true },
    { key: "delivery", header: t("columns.delivery"), width: 160, sortable: true },
    { key: "km", header: t("columns.km"), width: 60, sortable: true, align: "right" as const },
    { key: "pricing_type", header: t("columns.type"), width: 90, sortable: true },
    { key: "prices", header: t("columns.prices"), width: 180, sortable: true },
    { key: "customer", header: t("columns.customer"), width: 120, sortable: true },
    { key: "dates", header: t("columns.dates"), width: 130, sortable: true },
    { key: "status", header: t("columns.status"), width: 80, sortable: true },
    { key: "actions", header: t("columns.actions"), width: 100, sortable: false, align: "center" as const },
  ];

  function renderCell(row: Rate, key: string) {
    switch (key) {
      case "pickup":
        return (
          <div>
            <div className="font-medium text-sm">{row.pickup_location_name || "-"}</div>
            {row.pickup_location_code && <div className="text-xs text-gray-500">{row.pickup_location_code}</div>}
          </div>
        );
      case "delivery":
        return (
          <div>
            <div className="font-medium text-sm">{row.delivery_location_name || "-"}</div>
            {row.delivery_location_code && <div className="text-xs text-gray-500">{row.delivery_location_code}</div>}
          </div>
        );
      case "km":
        return <span className="text-sm">{row.distance_km ?? "-"}</span>;
      case "pricing_type":
        return (
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium ${
              row.pricing_type === "CONTAINER" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
            }`}
          >
            {row.pricing_type === "CONTAINER" ? t("pricingTypes.container") : t("pricingTypes.trip")}
          </span>
        );
      case "prices":
        return (
          <div className="text-sm">
            {row.pricing_type === "CONTAINER" ? (
              <div className="space-y-0.5">
                <div>
                  20&apos;:{" "}
                  <span className="font-medium text-green-700">{formatCurrency(row.price_cont_20)}</span>
                </div>
                <div>
                  40&apos;:{" "}
                  <span className="font-medium text-green-700">{formatCurrency(row.price_cont_40)}</span>
                </div>
              </div>
            ) : (
              <div>
                Trip: <span className="font-medium text-green-700">{formatCurrency(row.price_per_trip)}</span>
              </div>
            )}
          </div>
        );
      case "customer":
        return row.customer_names ? (
          <span className="text-sm" title={row.customer_names}>
            {row.customer_codes || row.customer_names}
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{t("customer.all")}</span>
        );
      case "dates": {
        const startDate = row.effective_date ? new Date(row.effective_date).toLocaleDateString("vi-VN") : "-";
        const endDate = row.end_date ? new Date(row.end_date).toLocaleDateString("vi-VN") : t("dates.unlimited");
        return (
          <div className="text-xs">
            <div>{startDate}</div>
            <div className="text-gray-500">{endDate}</div>
          </div>
        );
      }
      case "status":
        return (
          <span
            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
              row.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }`}
          >
            {row.status === "ACTIVE" ? t("status.on") : t("status.off")}
          </span>
        );
      case "actions":
        return (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDuplicate(row);
              }}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
              title={t("actions.duplicate")}
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {t("actions.edit")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.id);
              }}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              {t("actions.delete")}
            </button>
          </div>
        );
      default:
        return (row as any)[key] ?? "-";
    }
  }

  // ============ Table Columns ============
  const columns: Column<Rate>[] = [
    {
      key: "pickup",
      header: t("columns.pickup"),
      width: 160,
      render: (r) => (
        <div>
          <div className="font-medium text-sm">{r.pickup_location_name || "-"}</div>
          {r.pickup_location_code && <div className="text-xs text-gray-500">{r.pickup_location_code}</div>}
        </div>
      ),
    },
    {
      key: "delivery",
      header: t("columns.delivery"),
      width: 160,
      render: (r) => (
        <div>
          <div className="font-medium text-sm">{r.delivery_location_name || "-"}</div>
          {r.delivery_location_code && <div className="text-xs text-gray-500">{r.delivery_location_code}</div>}
        </div>
      ),
    },
    {
      key: "km",
      header: t("columns.km"),
      width: 60,
      align: "right",
      render: (r) => <span className="text-sm">{r.distance_km ?? "-"}</span>,
    },
    {
      key: "pricing_type",
      header: t("columns.type"),
      width: 90,
      render: (r) => (
        <span
          className={`px-2 py-1 rounded-lg text-xs font-medium ${
            r.pricing_type === "CONTAINER" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
          }`}
        >
          {r.pricing_type === "CONTAINER" ? t("pricingTypes.container") : t("pricingTypes.trip")}
        </span>
      ),
    },
    {
      key: "prices",
      header: t("columns.prices"),
      width: 180,
      render: (r) => (
        <div className="text-sm">
          {r.pricing_type === "CONTAINER" ? (
            <div className="space-y-0.5">
              <div>
                20&apos;:{" "}
                <span className="font-medium text-green-700">{formatCurrency(r.price_cont_20)}</span>
              </div>
              <div>
                40&apos;:{" "}
                <span className="font-medium text-green-700">{formatCurrency(r.price_cont_40)}</span>
              </div>
            </div>
          ) : (
            <div>
              Trip: <span className="font-medium text-green-700">{formatCurrency(r.price_per_trip)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "customer",
      header: t("columns.customer"),
      width: 120,
      render: (r) =>
        r.customer_names ? (
          <span className="text-sm" title={r.customer_names}>
            {r.customer_codes || r.customer_names}
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{t("customer.all")}</span>
        ),
    },
    {
      key: "dates",
      header: t("columns.dates"),
      width: 130,
      render: (r) => {
        const startDate = r.effective_date ? new Date(r.effective_date).toLocaleDateString("vi-VN") : "-";
        const endDate = r.end_date ? new Date(r.end_date).toLocaleDateString("vi-VN") : t("dates.unlimited");
        return (
          <div className="text-xs">
            <div>{startDate}</div>
            <div className="text-gray-500">{endDate}</div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: t("columns.status"),
      width: 80,
      render: (r) => (
        <span
          className={`px-2 py-1 rounded-lg text-xs font-semibold ${
            r.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }`}
        >
          {r.status === "ACTIVE" ? t("status.on") : t("status.off")}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("columns.actions"),
      width: 100,
      sortable: false,
      align: "center",
      render: (r) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDuplicate(r);
            }}
            className="text-green-600 hover:text-green-800 text-sm font-medium"
            title={t("actions.duplicate")}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(r);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {t("actions.edit")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(r.id);
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            {t("actions.delete")}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="h-[calc(100vh-64px)] overflow-auto">
      {/* Phần 1: Header & Stats - Cuộn đi */}
      <div className="p-6 pb-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
            <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("addRate")}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={DollarSign} label={t("stats.totalRates")} value={stats.total} color="blue" />
          <StatCard icon={CheckCircle} label={t("stats.active")} value={stats.active} color="green" />
          <StatCard icon={TrendingUp} label={t("stats.containerPricing")} value={stats.container} color="blue" />
          <StatCard icon={MapPin} label={t("stats.tripPricing")} value={stats.trip} color="gray" />
          <StatCard icon={Clock} label={t("stats.expiringSoon")} value={stats.expiringSoon} color="yellow" />
        </div>
      </div>

      {/* Phần 2: Filter & Search + Table Header - Sticky */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        {/* Filter Bar */}
        <div className="border-y border-gray-200 px-6 py-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              {/* Type Filter Tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                {[
                  { key: "ALL", labelKey: "filters.all" },
                  { key: "CONTAINER", labelKey: "filters.container" },
                  { key: "TRIP", labelKey: "filters.trip" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterType(tab.key)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      filterType === tab.key ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {t(tab.labelKey)}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("search.placeholder")}
                  className="pl-10 pr-4 py-2 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm w-72"
                />
              </div>
            </div>

            <div className="text-sm text-gray-500">{loading ? t("search.loading") : `${filteredRows.length} ${t("search.rates")}`}</div>
          </div>

          {/* Error */}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mt-3">{error}</div>}
        </div>

        {/* Table Header - Sticky cùng filter */}
        <div className="px-6 pt-3 bg-white">
          <div className="border border-b-0 border-gray-200 rounded-t-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  {columnDefs.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 font-bold text-${col.align || "left"} ${col.sortable ? "cursor-pointer select-none hover:bg-gray-100" : ""}`}
                      style={{ width: col.width }}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : ""}`}>
                        {col.header}
                        {col.sortable && getSortIcon(col.key)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
        </div>
      </div>

      {/* Phần 3: Data Table Body */}
      <div className="px-6 pb-4">
        <div className="border border-t-0 border-gray-200 rounded-b-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columnDefs.length} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      {t("table.loading")}
                    </div>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={columnDefs.length} className="px-4 py-8 text-center text-gray-500">
                    {t("table.noData")}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-gray-50">
                    {columnDefs.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-${col.align || "left"}`}
                        style={{ width: col.width }}
                      >
                        {renderCell(row, col.key)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phần 4: Pagination - Sticky bottom */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredRows.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName={t("pagination.rates")}
        />
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="font-semibold text-lg">{mode === "create" ? t("modal.createTitle") : t("modal.editTitle")}</div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black text-xl">
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Route Info */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-600 rounded"></div>
                  {t("modal.routeInfo")}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      {t("modal.pickup")} <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      value={form.pickup_location_id}
                      onChange={(val) => setForm((s) => ({ ...s, pickup_location_id: val }))}
                      options={locations}
                      placeholder={t("modal.selectPickup")}
                      searchPlaceholder={t("searchableSelect.search")}
                      noResultsText={t("searchableSelect.noResults")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      {t("modal.delivery")} <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      value={form.delivery_location_id}
                      onChange={(val) => setForm((s) => ({ ...s, delivery_location_id: val }))}
                      options={locations}
                      placeholder={t("modal.selectDelivery")}
                      searchPlaceholder={t("searchableSelect.search")}
                      noResultsText={t("searchableSelect.noResults")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t("modal.distanceKm")}</label>
                    <input
                      type="number"
                      value={form.distance_km}
                      onChange={(e) => setForm((s) => ({ ...s, distance_km: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder={t("modal.distanceKmPlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t("modal.tollStations")}</label>
                    <input
                      type="number"
                      value={form.toll_stations}
                      onChange={(e) => setForm((s) => ({ ...s, toll_stations: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder={t("modal.tollStationsPlaceholder")}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Info */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-green-600 rounded"></div>
                  {t("modal.pricingInfo")}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      {t("modal.pricingType")} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.pricing_type}
                      onChange={(e) => setForm((s) => ({ ...s, pricing_type: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="CONTAINER">{t("modal.pricingTypeContainer")}</option>
                      <option value="TRIP">{t("modal.pricingTypeTrip")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t("modal.status")}</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                  {form.pricing_type === "CONTAINER" ? (
                    <>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t("modal.priceCont20")}</label>
                        <input
                          type="number"
                          value={form.price_cont_20}
                          onChange={(e) => setForm((s) => ({ ...s, price_cont_20: e.target.value }))}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder={t("modal.priceCont20Placeholder")}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t("modal.priceCont40")}</label>
                        <input
                          type="number"
                          value={form.price_cont_40}
                          onChange={(e) => setForm((s) => ({ ...s, price_cont_40: e.target.value }))}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder={t("modal.priceCont40Placeholder")}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">{t("modal.pricePerTrip")}</label>
                      <input
                        type="number"
                        value={form.price_per_trip}
                        onChange={(e) => setForm((s) => ({ ...s, price_per_trip: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder={t("modal.pricePerTripPlaceholder")}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Date & Customer */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-orange-600 rounded"></div>
                  {t("modal.validityCustomer")}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      {t("modal.startDate")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.effective_date}
                      onChange={(e) => setForm((s) => ({ ...s, effective_date: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t("modal.endDate")}</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">{t("modal.applyToCustomers")}</label>
                    <div className="border border-gray-300 rounded-xl p-3 max-h-36 overflow-y-auto">
                      <label className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={form.customer_ids.length === 0}
                          onChange={() => setForm((s) => ({ ...s, customer_ids: [] }))}
                          className="rounded"
                        />
                        {t("modal.allCustomers")}
                      </label>
                      <div className="border-t pt-2 space-y-1">
                        {customers.map((cust) => (
                          <label key={cust.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={form.customer_ids.includes(cust.id)}
                              onChange={() => toggleCustomer(cust.id)}
                              className="rounded"
                            />
                            {cust.code} - {cust.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setOpen(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                {t("modal.cancel")}
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-60 hover:bg-blue-700"
              >
                {saving ? t("modal.saving") : t("modal.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
