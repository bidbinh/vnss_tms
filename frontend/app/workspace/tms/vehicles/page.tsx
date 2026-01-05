"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Truck,
  Search,
  RefreshCw,
  Building2,
  Filter,
  AlertCircle,
} from "lucide-react";
import { useAggregatedApi } from "../layout";

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type?: string;
  status: string;
  brand?: string;
  model?: string;
  tenant_id: string;
  tenant_name: string;
  tenant_code: string;
}

// Status colors
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: "bg-green-100 text-green-700", label: "Hoạt động" },
  INACTIVE: { color: "bg-gray-100 text-gray-700", label: "Không hoạt động" },
  MAINTENANCE: { color: "bg-yellow-100 text-yellow-700", label: "Bảo dưỡng" },
};

// Vehicle type labels
const VEHICLE_TYPE_LABELS: Record<string, string> = {
  TRUCK: "Xe tải",
  TRACTOR: "Đầu kéo",
  TRAILER: "Rơ moóc",
  VAN: "Xe van",
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

export default function WorkspaceTmsVehiclesPage() {
  const { tenants, selectedTenantIds, fetchVehicles, loading: apiLoading } = useAggregatedApi();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTenantId, setFilterTenantId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    if (!apiLoading) {
      loadVehicles();
    }
  }, [apiLoading, selectedTenantIds]);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const data = await fetchVehicles();
      setVehicles(data.vehicles || []);
      setError("");
    } catch (err: any) {
      setError(err.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    let result = vehicles;

    if (filterTenantId) {
      result = result.filter(v => v.tenant_id === filterTenantId);
    }

    if (filterStatus) {
      result = result.filter(v => v.status === filterStatus);
    }

    if (filterType) {
      result = result.filter(v => v.vehicle_type === filterType);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(v =>
        v.plate_number?.toLowerCase().includes(search) ||
        v.brand?.toLowerCase().includes(search) ||
        v.model?.toLowerCase().includes(search) ||
        v.tenant_name?.toLowerCase().includes(search)
      );
    }

    return result;
  }, [vehicles, filterTenantId, filterStatus, filterType, searchTerm]);

  // Tenants in view
  const tenantsInView = useMemo(() => {
    const tenantIds = new Set(vehicles.map(v => v.tenant_id));
    return tenants.filter(t => tenantIds.has(t.id));
  }, [vehicles, tenants]);

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
          <h1 className="text-2xl font-bold text-gray-900">Xe</h1>
          <p className="text-sm text-gray-500">
            Tổng hợp từ {tenantsInView.length} công ty • {filteredVehicles.length} xe
          </p>
        </div>
        <button
          onClick={loadVehicles}
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
            placeholder="Tìm theo biển số, hãng xe..."
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
          <option value="MAINTENANCE">Bảo dưỡng</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Tất cả loại xe</option>
          <option value="TRUCK">Xe tải</option>
          <option value="TRACTOR">Đầu kéo</option>
          <option value="TRAILER">Rơ moóc</option>
          <option value="VAN">Xe van</option>
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
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Không có xe nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVehicles.map((vehicle) => {
              const statusConfig = STATUS_CONFIG[vehicle.status] || STATUS_CONFIG.INACTIVE;
              const tenantColor = getTenantColor(vehicle.tenant_id, tenants);
              const typeLabel = VEHICLE_TYPE_LABELS[vehicle.vehicle_type || ""] || vehicle.vehicle_type;

              return (
                <div
                  key={vehicle.id}
                  className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Truck className="w-6 h-6 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Plate Number */}
                      <div className="font-bold text-gray-900 text-lg">
                        {vehicle.plate_number}
                      </div>

                      {/* Type and Brand */}
                      <div className="text-sm text-gray-500 mt-1">
                        {typeLabel}
                        {vehicle.brand && ` • ${vehicle.brand}`}
                        {vehicle.model && ` ${vehicle.model}`}
                      </div>

                      {/* Tenant */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`w-2 h-2 rounded-full ${tenantColor}`}></span>
                        <span className="text-xs text-gray-500">{vehicle.tenant_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-2 text-sm text-gray-500 bg-white flex items-center justify-between">
        <span>Hiển thị {filteredVehicles.length} xe</span>
        {tenantsInView.length > 1 && (
          <div className="flex items-center gap-3">
            {tenantsInView.map(tenant => {
              const count = filteredVehicles.filter(v => v.tenant_id === tenant.id).length;
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
