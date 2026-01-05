"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Users,
  Search,
  Phone,
  Truck,
  RefreshCw,
  User,
} from "lucide-react";
import { useWorkspaceApi } from "../layout";

interface Driver {
  id: string;
  name: string;
  short_name?: string;
  phone?: string;
  status: string;
  source?: string;
  vehicle_id?: string;
  tractor_id?: string;
}

export default function WorkspaceTmsDriversPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { api } = useWorkspaceApi();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchDrivers();
  }, [statusFilter]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const data = await api.getDrivers({ status: statusFilter || undefined });
      setDrivers(data.drivers || []);
    } catch (e) {
      console.error("Error fetching drivers:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE": return "bg-green-100 text-green-700";
      case "INACTIVE": return "bg-red-100 text-red-700";
      case "BUSY": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE": return "Hoạt động";
      case "INACTIVE": return "Không hoạt động";
      case "BUSY": return "Đang bận";
      default: return status;
    }
  };

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone?.includes(searchTerm)
  );

  const activeCount = drivers.filter(d => d.status === "ACTIVE").length;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tài xế</h1>
          <p className="text-gray-500">
            {activeCount} hoạt động / {drivers.length} tổng
          </p>
        </div>
        <button
          onClick={fetchDrivers}
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
            placeholder="Tìm theo tên, số điện thoại..."
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
          <option value="INACTIVE">Không hoạt động</option>
        </select>
      </div>

      {/* Drivers Grid */}
      <div className="bg-white rounded-xl border shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Đang tải...</p>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Không có tài xế nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredDrivers.map((driver) => (
              <div
                key={driver.id}
                className="border rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    driver.status === "ACTIVE" ? "bg-green-100" : "bg-gray-100"
                  }`}>
                    <User className={`w-6 h-6 ${
                      driver.status === "ACTIVE" ? "text-green-600" : "text-gray-500"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(driver.status)}`}>
                        {getStatusLabel(driver.status)}
                      </span>
                    </div>
                    {driver.short_name && (
                      <p className="text-sm text-gray-500">{driver.short_name}</p>
                    )}
                    {driver.phone && (
                      <a
                        href={`tel:${driver.phone}`}
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        <Phone className="w-3 h-3" />
                        {driver.phone}
                      </a>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {driver.source && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          driver.source === "INTERNAL"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-purple-50 text-purple-600"
                        }`}>
                          {driver.source === "INTERNAL" ? "Nội bộ" : "Bên ngoài"}
                        </span>
                      )}
                      {driver.vehicle_id && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          Có xe
                        </span>
                      )}
                    </div>
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
