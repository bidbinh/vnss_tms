"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  Truck,
  Building2,
  Filter,
  AlertCircle,
} from "lucide-react";
import { useAggregatedApi } from "../layout";

interface Driver {
  id: string;
  name: string;
  short_name?: string;
  phone?: string;
  status: string;
  source?: string;
  tenant_id: string;
  tenant_name: string;
  tenant_code: string;
  vehicle_id?: string;
  tractor_id?: string;
}

// Status colors
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: "bg-green-100 text-green-700", label: "Hoạt động" },
  INACTIVE: { color: "bg-gray-100 text-gray-700", label: "Không hoạt động" },
  ON_LEAVE: { color: "bg-yellow-100 text-yellow-700", label: "Nghỉ phép" },
};

// Tenant colors
const TENANT_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-indigo-500",
];

function getTenantColor(tenantId: string, tenants: Array<{id: string}>): string {
  const index = tenants.findIndex(t => t.id === tenantId);
  return TENANT_COLORS[index % TENANT_COLORS.length];
}

function getDriverColor(name: string): string {
  const colors = [
    "bg-red-100 text-red-600",
    "bg-blue-100 text-blue-600",
    "bg-green-100 text-green-600",
    "bg-purple-100 text-purple-600",
    "bg-orange-100 text-orange-600",
    "bg-pink-100 text-pink-600",
    "bg-cyan-100 text-cyan-600",
    "bg-amber-100 text-amber-600",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export default function WorkspaceTmsDriversPage() {
  const { tenants, selectedTenantIds, fetchDrivers, loading: apiLoading } = useAggregatedApi();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTenantId, setFilterTenantId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    if (!apiLoading) {
      loadDrivers();
    }
  }, [apiLoading, selectedTenantIds]);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const data = await fetchDrivers();
      setDrivers(data.drivers || []);
      setError("");
    } catch (err: any) {
      setError(err.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // Filtered drivers
  const filteredDrivers = useMemo(() => {
    let result = drivers;

    if (filterTenantId) {
      result = result.filter(d => d.tenant_id === filterTenantId);
    }

    if (filterStatus) {
      result = result.filter(d => d.status === filterStatus);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(d =>
        d.name?.toLowerCase().includes(search) ||
        d.phone?.toLowerCase().includes(search) ||
        d.tenant_name?.toLowerCase().includes(search)
      );
    }

    return result;
  }, [drivers, filterTenantId, filterStatus, searchTerm]);

  // Tenants in view
  const tenantsInView = useMemo(() => {
    const tenantIds = new Set(drivers.map(d => d.tenant_id));
    return tenants.filter(t => tenantIds.has(t.id));
  }, [drivers, tenants]);

  if (apiLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tài xế</h1>
          <p className="text-sm text-gray-500">
            Tổng hợp từ {tenantsInView.length} công ty • {filteredDrivers.length} tài xế
          </p>
        </div>
        <button
          onClick={loadDrivers}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Làm mới"
        >
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Tenant Filter Pills */}
      {tenantsInView.length > 1 && (
        <div className="px-6 py-2 border-b bg-gray-50 flex items-center gap-2 overflow-x-auto">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setFilterTenantId("")}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !filterTenantId
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border"
            }`}
          >
            Tất cả
          </button>
          {tenantsInView.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => setFilterTenantId(tenant.id === filterTenantId ? "" : tenant.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterTenantId === tenant.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${getTenantColor(tenant.id, tenants)}`}></span>
              {tenant.name}
            </button>
          ))}
        </div>
      )}

      {/* Search and Filters */}
      <div className="px-6 py-3 border-b flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, SĐT..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="INACTIVE">Không hoạt động</option>
          <option value="ON_LEAVE">Nghỉ phép</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Đang tải...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
            <p>{error}</p>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Không có tài xế nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDrivers.map((driver) => {
              const statusConfig = STATUS_CONFIG[driver.status] || STATUS_CONFIG.INACTIVE;
              const driverColor = getDriverColor(driver.name);
              const tenantColor = getTenantColor(driver.tenant_id, tenants);

              return (
                <div
                  key={driver.id}
                  className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${driverColor}`}>
                      <span className="font-bold text-lg">
                        {driver.short_name || driver.name.charAt(0)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name */}
                      <div className="font-semibold text-gray-900 truncate">
                        {driver.name}
                      </div>

                      {/* Phone */}
                      {driver.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <Phone className="w-3 h-3" />
                          {driver.phone}
                        </div>
                      )}

                      {/* Tenant */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`w-2 h-2 rounded-full ${tenantColor}`}></span>
                        <span className="text-xs text-gray-500">{driver.tenant_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status and Source */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                    {driver.source === "EXTERNAL" && (
                      <span className="text-xs text-gray-400">Bên ngoài</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-2 text-sm text-gray-500 bg-white flex items-center justify-between">
        <span>Hiển thị {filteredDrivers.length} tài xế</span>
        {tenantsInView.length > 1 && (
          <div className="flex items-center gap-3">
            {tenantsInView.map(tenant => {
              const count = filteredDrivers.filter(d => d.tenant_id === tenant.id).length;
              return (
                <span key={tenant.id} className="flex items-center gap-1.5 text-xs">
                  <span className={`w-2 h-2 rounded-full ${getTenantColor(tenant.id, tenants)}`}></span>
                  {tenant.name}: {count}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
