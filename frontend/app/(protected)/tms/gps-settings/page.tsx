"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Settings,
  Trash2,
  Edit,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Truck,
  MapPin,
  Clock,
  Key,
  Link as LinkIcon,
  ChevronDown,
  ChevronRight,
  Play,
  Loader2,
  X,
  Save,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ============================================================================
// TYPES
// ============================================================================

interface GPSProvider {
  id: string;
  name: string;
  provider_type: string;
  description: string | null;
  api_base_url: string;
  api_version: string | null;
  auth_type: string;
  status: string;
  sync_interval_seconds: number;
  is_realtime: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  error_count: number;
  is_active: boolean;
  created_at: string;
  vehicle_count: number;
}

interface GPSVehicleMapping {
  id: string;
  provider_id: string;
  vehicle_id: string;
  gps_device_id: string;
  gps_vehicle_name: string | null;
  is_active: boolean;
  last_location_at: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_speed: number | null;
  plate_number: string | null;
  vehicle_type: string | null;
}

interface ProviderTypeInfo {
  value: string;
  label: string;
}

interface ProviderDefaults {
  [key: string]: {
    api_base_url: string;
    api_version: string;
    auth_type: string;
    endpoint_vehicles: string;
    endpoint_location: string;
    endpoint_history: string;
    endpoint_alerts: string;
    sync_interval_seconds: number;
  };
}

interface UnmappedVehicle {
  id: string;
  plate_no: string;
  type: string;
  code: string | null;
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "inactive":
      return "bg-gray-100 text-gray-800";
    case "error":
      return "bg-red-100 text-red-800";
    case "testing":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active":
      return <Wifi className="w-4 h-4 text-green-600" />;
    case "inactive":
      return <WifiOff className="w-4 h-4 text-gray-400" />;
    case "error":
      return <XCircle className="w-4 h-4 text-red-600" />;
    case "testing":
      return <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />;
    default:
      return <WifiOff className="w-4 h-4 text-gray-400" />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "active":
      return "Đang hoạt động";
    case "inactive":
      return "Chưa kích hoạt";
    case "error":
      return "Lỗi kết nối";
    case "testing":
      return "Đang test";
    default:
      return status;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GPSSettingsPage() {
  // Data states
  const [providers, setProviders] = useState<GPSProvider[]>([]);
  const [providerTypes, setProviderTypes] = useState<ProviderTypeInfo[]>([]);
  const [authTypes, setAuthTypes] = useState<ProviderTypeInfo[]>([]);
  const [defaults, setDefaults] = useState<ProviderDefaults>({});
  const [isLoading, setIsLoading] = useState(true);

  // UI states
  const [selectedProvider, setSelectedProvider] = useState<GPSProvider | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  // Vehicle mapping states
  const [vehicleMappings, setVehicleMappings] = useState<GPSVehicleMapping[]>([]);
  const [unmappedVehicles, setUnmappedVehicles] = useState<UnmappedVehicle[]>([]);
  const [showMappingModal, setShowMappingModal] = useState(false);

  // Test connection state
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchProviders = useCallback(async () => {
    try {
      const data = await apiFetch<GPSProvider[]>("/gps-settings/providers");
      setProviders(data);
    } catch (err) {
      console.error("Fetch providers error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProviderTypes = useCallback(async () => {
    try {
      const data = await apiFetch<{
        types: ProviderTypeInfo[];
        auth_types: ProviderTypeInfo[];
        defaults: ProviderDefaults;
      }>("/gps-settings/provider-types");
      setProviderTypes(data.types);
      setAuthTypes(data.auth_types);
      setDefaults(data.defaults);
    } catch (err) {
      console.error("Fetch provider types error:", err);
    }
  }, []);

  const fetchVehicleMappings = useCallback(async (providerId: string) => {
    try {
      const data = await apiFetch<GPSVehicleMapping[]>(`/gps-settings/providers/${providerId}/vehicles`);
      setVehicleMappings(data);
    } catch (err) {
      console.error("Fetch vehicle mappings error:", err);
    }
  }, []);

  const fetchUnmappedVehicles = useCallback(async (providerId: string) => {
    try {
      const data = await apiFetch<UnmappedVehicle[]>(`/gps-settings/unmapped-vehicles?provider_id=${providerId}`);
      setUnmappedVehicles(data);
    } catch (err) {
      console.error("Fetch unmapped vehicles error:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProviders();
    fetchProviderTypes();
  }, [fetchProviders, fetchProviderTypes]);

  // Load mappings when provider expanded
  useEffect(() => {
    if (expandedProvider) {
      fetchVehicleMappings(expandedProvider);
      fetchUnmappedVehicles(expandedProvider);
    }
  }, [expandedProvider, fetchVehicleMappings, fetchUnmappedVehicles]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleTestConnection = async (providerId: string) => {
    setTestingProvider(providerId);
    setTestResult(null);
    try {
      const result = await apiFetch<{ success: boolean; message: string }>(
        `/gps-settings/providers/${providerId}/test`,
        { method: "POST" }
      );
      setTestResult(result);
      // Refresh to update status
      fetchProviders();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Lỗi kết nối" });
    } finally {
      setTestingProvider(null);
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm("Bạn có chắc muốn xóa GPS provider này?")) return;

    try {
      await apiFetch(`/gps-settings/providers/${providerId}`, { method: "DELETE" });
      fetchProviders();
    } catch (err: any) {
      alert(err.message || "Không thể xóa provider");
    }
  };

  const handleAddMapping = async (providerId: string, vehicleId: string, deviceId: string) => {
    try {
      await apiFetch(`/gps-settings/providers/${providerId}/vehicles`, {
        method: "POST",
        body: JSON.stringify({
          vehicle_id: vehicleId,
          gps_device_id: deviceId,
        }),
      });
      fetchVehicleMappings(providerId);
      fetchUnmappedVehicles(providerId);
      fetchProviders();
      setShowMappingModal(false);
    } catch (err: any) {
      alert(err.message || "Không thể mapping xe");
    }
  };

  const handleDeleteMapping = async (providerId: string, mappingId: string) => {
    if (!confirm("Bạn có chắc muốn xóa mapping này?")) return;

    try {
      await apiFetch(`/gps-settings/providers/${providerId}/vehicles/${mappingId}`, { method: "DELETE" });
      fetchVehicleMappings(providerId);
      fetchUnmappedVehicles(providerId);
      fetchProviders();
    } catch (err: any) {
      alert(err.message || "Không thể xóa mapping");
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cài đặt GPS</h1>
          <p className="text-gray-600 mt-1">Quản lý kết nối với các nhà cung cấp GPS (Bình Anh, Vietmap, v.v.)</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm GPS Provider
        </button>
      </div>

      {/* Test Result Banner */}
      {testResult && (
        <div
          className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
            testResult.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {testResult.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span>{testResult.message}</span>
          <button onClick={() => setTestResult(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Provider List */}
      {providers.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có GPS Provider nào</h3>
          <p className="text-gray-500 mb-4">Thêm GPS provider để theo dõi vị trí xe trong thời gian thực</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Thêm GPS Provider đầu tiên
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {providers.map((provider) => (
            <div key={provider.id} className="bg-white rounded-xl border overflow-hidden">
              {/* Provider Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-50 rounded-lg">{getStatusIcon(provider.status)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(provider.status)}`}>
                        {getStatusLabel(provider.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        {provider.api_base_url}
                      </span>
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {provider.vehicle_count} xe
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {provider.sync_interval_seconds}s
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestConnection(provider.id);
                    }}
                    disabled={testingProvider === provider.id}
                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                  >
                    {testingProvider === provider.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Test
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProvider(provider);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProvider(provider.id);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedProvider === provider.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Content - Vehicle Mappings */}
              {expandedProvider === provider.id && (
                <div className="border-t bg-gray-50 p-4">
                  {/* Error Display */}
                  {provider.last_error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">Lỗi lần sync gần nhất:</span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">{provider.last_error}</p>
                    </div>
                  )}

                  {/* Vehicle Mappings Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Xe đã mapping ({vehicleMappings.length})</h4>
                    <button
                      onClick={() => setShowMappingModal(true)}
                      className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm xe
                    </button>
                  </div>

                  {/* Vehicle Mappings Table */}
                  {vehicleMappings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Chưa có xe nào được mapping. Thêm xe để theo dõi GPS.
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Biển số</th>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Device ID</th>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Vị trí mới nhất</th>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Tốc độ</th>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Cập nhật</th>
                            <th className="text-right px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {vehicleMappings.map((mapping) => (
                            <tr key={mapping.id} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <span className="font-medium">{mapping.plate_number || "N/A"}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs">{mapping.gps_device_id}</td>
                              <td className="px-4 py-3">
                                {mapping.last_latitude && mapping.last_longitude ? (
                                  <span className="text-gray-600">
                                    {mapping.last_latitude.toFixed(4)}, {mapping.last_longitude.toFixed(4)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Chưa có</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {mapping.last_speed != null ? (
                                  <span>{mapping.last_speed.toFixed(0)} km/h</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {mapping.last_location_at
                                  ? new Date(mapping.last_location_at).toLocaleString("vi-VN")
                                  : "Chưa sync"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleDeleteMapping(provider.id, mapping.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add Mapping Modal */}
                  {showMappingModal && (
                    <AddMappingModal
                      providerId={provider.id}
                      unmappedVehicles={unmappedVehicles}
                      onAdd={handleAddMapping}
                      onClose={() => setShowMappingModal(false)}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Provider Modal */}
      {showAddModal && (
        <AddProviderModal
          providerTypes={providerTypes}
          authTypes={authTypes}
          defaults={defaults}
          onAdd={async (data) => {
            try {
              await apiFetch("/gps-settings/providers", {
                method: "POST",
                body: JSON.stringify(data),
              });
              fetchProviders();
              setShowAddModal(false);
            } catch (err: any) {
              alert(err.message || "Không thể tạo provider");
            }
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Provider Modal */}
      {showEditModal && selectedProvider && (
        <EditProviderModal
          provider={selectedProvider}
          authTypes={authTypes}
          onSave={async (data) => {
            try {
              await apiFetch(`/gps-settings/providers/${selectedProvider.id}`, {
                method: "PUT",
                body: JSON.stringify(data),
              });
              fetchProviders();
              setShowEditModal(false);
            } catch (err: any) {
              alert(err.message || "Không thể cập nhật provider");
            }
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

function AddProviderModal({
  providerTypes,
  authTypes,
  defaults,
  onAdd,
  onClose,
}: {
  providerTypes: ProviderTypeInfo[];
  authTypes: ProviderTypeInfo[];
  defaults: ProviderDefaults;
  onAdd: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    provider_type: "binh_anh",
    description: "",
    api_base_url: "",
    api_version: "v1",
    auth_type: "api_key",
    api_key: "",
    username: "",
    password: "",
    access_token: "",
    sync_interval_seconds: 30,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply defaults when provider type changes
  useEffect(() => {
    const def = defaults[formData.provider_type];
    if (def) {
      setFormData((prev) => ({
        ...prev,
        api_base_url: def.api_base_url,
        api_version: def.api_version,
        auth_type: def.auth_type,
        sync_interval_seconds: def.sync_interval_seconds,
      }));
    }
  }, [formData.provider_type, defaults]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onAdd(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Thêm GPS Provider</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="VD: GPS Bình Anh - Tài khoản chính"
              required
            />
          </div>

          {/* Provider Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại GPS Provider *</label>
            <select
              value={formData.provider_type}
              onChange={(e) => setFormData({ ...formData, provider_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {providerTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* API Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Base URL *</label>
            <input
              type="url"
              value={formData.api_base_url}
              onChange={(e) => setFormData({ ...formData, api_base_url: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="https://api.bagps.vn"
              required
            />
          </div>

          {/* API Version */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Version</label>
            <input
              type="text"
              value={formData.api_version}
              onChange={(e) => setFormData({ ...formData, api_version: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="v1"
            />
          </div>

          {/* Auth Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phương thức xác thực *</label>
            <select
              value={formData.auth_type}
              onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {authTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Auth Fields - conditional */}
          {formData.auth_type === "api_key" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key *</label>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Nhập API Key"
              />
            </div>
          )}

          {formData.auth_type === "basic_auth" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </>
          )}

          {(formData.auth_type === "token" || formData.auth_type === "oauth2") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access Token *</label>
              <textarea
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows={3}
                placeholder="Nhập access token"
              />
            </div>
          )}

          {/* Sync Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Khoảng thời gian sync (giây)</label>
            <input
              type="number"
              value={formData.sync_interval_seconds}
              onChange={(e) => setFormData({ ...formData, sync_interval_seconds: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              min={10}
              max={300}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              rows={2}
              placeholder="Ghi chú về provider này..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Tạo Provider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProviderModal({
  provider,
  authTypes,
  onSave,
  onClose,
}: {
  provider: GPSProvider;
  authTypes: ProviderTypeInfo[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: provider.name,
    description: provider.description || "",
    api_base_url: provider.api_base_url,
    api_version: provider.api_version || "",
    auth_type: provider.auth_type,
    sync_interval_seconds: provider.sync_interval_seconds,
    status: provider.status,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chỉnh sửa GPS Provider</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
            <input
              type="url"
              value={formData.api_base_url}
              onChange={(e) => setFormData({ ...formData, api_base_url: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Khoảng thời gian sync (giây)</label>
            <input
              type="number"
              value={formData.sync_interval_seconds}
              onChange={(e) => setFormData({ ...formData, sync_interval_seconds: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              min={10}
              max={300}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="inactive">Chưa kích hoạt</option>
              <option value="active">Đang hoạt động</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMappingModal({
  providerId,
  unmappedVehicles,
  onAdd,
  onClose,
}: {
  providerId: string;
  unmappedVehicles: UnmappedVehicle[];
  onAdd: (providerId: string, vehicleId: string, deviceId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !deviceId) return;

    setIsSubmitting(true);
    try {
      await onAdd(providerId, selectedVehicle, deviceId);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mapping xe với GPS Device</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn xe *</label>
            {unmappedVehicles.length === 0 ? (
              <p className="text-sm text-gray-500">Tất cả xe đã được mapping</p>
            ) : (
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">-- Chọn xe --</option>
                {unmappedVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate_no} ({v.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GPS Device ID (IMEI) *</label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              placeholder="VD: 869170030123456"
              required
            />
            <p className="text-xs text-gray-500 mt-1">IMEI hoặc Serial Number của thiết bị GPS trên xe</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || unmappedVehicles.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Thêm mapping
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
