"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Truck,
  Search,
  RefreshCw,
} from "lucide-react";
import { useWorkspaceApi } from "../layout";

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type?: string;
  status: string;
  brand?: string;
  model?: string;
}

export default function WorkspaceTmsVehiclesPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { api } = useWorkspaceApi();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    fetchVehicles();
  }, [statusFilter, typeFilter]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await api.getVehicles({
        status: statusFilter || undefined,
        vehicle_type: typeFilter || undefined,
      });
      setVehicles(data.vehicles || []);
    } catch (e) {
      console.error("Error fetching vehicles:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
      case "AVAILABLE": return "bg-green-100 text-green-700";
      case "IN_USE":
      case "BUSY": return "bg-yellow-100 text-yellow-700";
      case "MAINTENANCE": return "bg-orange-100 text-orange-700";
      case "INACTIVE": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE": return "Hoạt động";
      case "AVAILABLE": return "Sẵn sàng";
      case "IN_USE": return "Đang sử dụng";
      case "BUSY": return "Đang bận";
      case "MAINTENANCE": return "Bảo trì";
      case "INACTIVE": return "Không hoạt động";
      default: return status;
    }
  };

  const getVehicleTypeLabel = (type?: string) => {
    switch (type?.toUpperCase()) {
      case "TRACTOR": return "Đầu kéo";
      case "TRAILER": return "Rơ-moóc";
      case "TRUCK": return "Xe tải";
      default: return type || "Xe";
    }
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vehicle_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get unique vehicle types for filter
  const vehicleTypes = [...new Set(vehicles.map(v => v.vehicle_type).filter(Boolean))];

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Xe</h1>
          <p className="text-gray-500">{vehicles.length} xe</p>
        </div>
        <button
          onClick={fetchVehicles}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Làm mới"
        >
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo biển số, loại xe..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="AVAILABLE">Sẵn sàng</option>
          <option value="IN_USE">Đang sử dụng</option>
          <option value="MAINTENANCE">Bảo trì</option>
          <option value="INACTIVE">Không hoạt động</option>
        </select>
        {vehicleTypes.length > 0 && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả loại xe</option>
            {vehicleTypes.map((type) => (
              <option key={type} value={type}>
                {getVehicleTypeLabel(type)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Vehicles Grid */}
      <div className="bg-white rounded-xl border shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Đang tải...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Không có xe nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="border rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{vehicle.plate_number}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                        {getStatusLabel(vehicle.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {getVehicleTypeLabel(vehicle.vehicle_type)}
                      {vehicle.brand && ` - ${vehicle.brand}`}
                      {vehicle.model && ` ${vehicle.model}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
