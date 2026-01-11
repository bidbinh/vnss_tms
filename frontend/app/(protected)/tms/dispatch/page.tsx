"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  RefreshCw,
  Zap,
  Brain,
  Activity,
  TrendingUp,
  Users,
  Package,
  Route,
  Bell,
  ChevronRight,
  ChevronDown,
  Play,
  Pause,
  Settings,
  Maximize2,
  MoreHorizontal,
  Send,
  Sparkles,
  Eye,
  UserCheck,
  XCircle,
  ArrowRight,
  Navigation,
  Fuel,
  Timer,
  Target,
  BarChart3,
  Loader2,
  Satellite,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ============================================================================
// TYPES (matching API response)
// ============================================================================

interface VehicleDispatchInfo {
  id: string;
  plate_number: string;
  vehicle_type: string;
  status: string;
  work_status: string;
  driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  address: string | null;
  gps_timestamp: string | null;
  current_trip_id: string | null;
  current_order_id: string | null;
  destination: string | null;
  eta: string | null;
  remaining_km: number | null;
}

interface AlertInfo {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  vehicle_id: string | null;
  plate_number: string | null;
  driver_name: string | null;
  order_id: string | null;
  created_at: string;
  is_resolved: boolean;
}

interface AIDecisionInfo {
  id: string;
  decision_type: string;
  title: string;
  description: string;
  confidence: number;
  reasoning: string | null;
  vehicle_id: string | null;
  plate_number: string | null;
  driver_name: string | null;
  order_id: string | null;
  order_code: string | null;
  status: string;
  created_at: string;
}

interface DispatchActivityLog {
  id: string;
  log_type: string;
  title: string;
  description: string | null;
  is_ai: boolean;
  created_at: string;
  plate_number: string | null;
  driver_name: string | null;
}

interface DispatchStats {
  total_vehicles: number;
  active_vehicles: number;
  available_vehicles: number;
  on_trip_vehicles: number;
  total_drivers: number;
  active_drivers: number;
  pending_orders: number;
  in_transit_orders: number;
  delivered_today: number;
  active_alerts: number;
  pending_ai_decisions: number;
  ai_auto_rate: number;
}

interface UnassignedOrder {
  id: string;
  order_code: string;
  status: string;
  pickup_text: string | null;
  delivery_text: string | null;
  equipment: string | null;
  customer_requested_date: string | null;
  order_date: string | null;
}

interface DispatchDashboard {
  stats: DispatchStats;
  vehicles: VehicleDispatchInfo[];
  alerts: AlertInfo[];
  ai_decisions: AIDecisionInfo[];
  recent_activity: DispatchActivityLog[];
  unassigned_orders: UnassignedOrder[];
}

interface GPSProviderStatus {
  id: string;
  name: string;
  provider_type: string;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  error_count: number;
  mapped_vehicles: number;
  sync_interval_seconds: number;
  is_realtime: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWorkStatusColor(status: string) {
  switch (status) {
    case "on_trip": return "bg-green-500";
    case "available": return "bg-blue-500";
    case "loading":
    case "unloading": return "bg-yellow-500";
    case "returning": return "bg-cyan-500";
    case "maintenance": return "bg-red-500";
    case "off_duty":
    default: return "bg-gray-400";
  }
}

// getWorkStatusLabel is now inside the component to use translations

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical": return { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500", dot: "bg-red-500" };
    case "warning": return { bg: "bg-yellow-50", border: "border-yellow-200", icon: "text-yellow-500", dot: "bg-yellow-500" };
    case "info":
    default: return { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-500", dot: "bg-blue-500" };
  }
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 85) return "text-green-600";
  if (confidence >= 70) return "text-yellow-600";
  return "text-red-600";
}

function getConfidenceIcon(confidence: number) {
  if (confidence >= 85) return "✓";
  if (confidence >= 70) return "⚠️";
  return "❌";
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

// formatTimeAgo is now inside the component to use translations

function getActivityTypeColor(logType: string) {
  if (logType.includes("assign")) return "bg-blue-500";
  if (logType.includes("route")) return "bg-green-500";
  if (logType.includes("alert")) return "bg-orange-500";
  return "bg-purple-500";
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DispatchCenterPage() {
  const t = useTranslations("tms.dispatchPage");

  // Helper functions that need translations
  const getWorkStatusLabel = (status: string) => {
    switch (status) {
      case "on_trip": return t("workStatus.onTrip");
      case "available": return t("workStatus.available");
      case "loading": return t("workStatus.loading");
      case "unloading": return t("workStatus.unloading");
      case "returning": return t("workStatus.returning");
      case "maintenance": return t("workStatus.maintenance");
      case "off_duty": return t("workStatus.offDuty");
      default: return status;
    }
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t("time.justNow");
    if (diffMins < 60) return t("time.minutesAgo", { count: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t("time.hoursAgo", { count: diffHours });
    return d.toLocaleDateString("vi-VN");
  };

  // Data states
  const [dashboard, setDashboard] = useState<DispatchDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gpsProviders, setGpsProviders] = useState<GPSProviderStatus[]>([]);
  const [isSyncingGPS, setIsSyncingGPS] = useState(false);

  // UI states
  const [autoMode, setAutoMode] = useState(true);
  const [commandInput, setCommandInput] = useState("");
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleDispatchInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [showGPSPanel, setShowGPSPanel] = useState(false);
  const gpsPanelRef = useRef<HTMLDivElement>(null);

  // Close GPS panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gpsPanelRef.current && !gpsPanelRef.current.contains(event.target as Node)) {
        setShowGPSPanel(false);
      }
    };

    if (showGPSPanel) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showGPSPanel]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const data = await apiFetch<DispatchDashboard>("/dispatch/dashboard");
      setDashboard(data);
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(t("errors.cannotLoadData"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Fetch GPS providers status
  const fetchGPSProviders = useCallback(async () => {
    try {
      const data = await apiFetch<GPSProviderStatus[]>("/dispatch/gps-providers-status");
      setGpsProviders(data);
    } catch (err) {
      console.error("Fetch GPS providers error:", err);
    }
  }, []);

  // Sync GPS from providers
  const handleSyncGPS = async (providerId?: string) => {
    setIsSyncingGPS(true);
    try {
      const url = providerId ? `/dispatch/sync-gps?provider_id=${providerId}` : "/dispatch/sync-gps";
      await apiFetch(url, { method: "POST" });
      // Refresh dashboard and providers after sync
      await Promise.all([fetchDashboard(), fetchGPSProviders()]);
    } catch (err: any) {
      alert(err.message || t("errors.cannotSyncGPS"));
    } finally {
      setIsSyncingGPS(false);
    }
  };

  // Initial load and auto-refresh
  useEffect(() => {
    fetchDashboard();
    fetchGPSProviders();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboard();
      fetchGPSProviders();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard, fetchGPSProviders]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Resolve alert
  const handleResolveAlert = async (alertId: string) => {
    try {
      await apiFetch(`/dispatch/alerts/${alertId}/resolve`, { method: "POST" });
      await fetchDashboard();
    } catch (err) {
      console.error("Resolve alert error:", err);
    }
  };

  // Approve/reject AI decision
  const handleDecisionAction = async (decisionId: string, action: "approve" | "reject") => {
    try {
      await apiFetch(`/dispatch/ai-decisions/${decisionId}/${action}`, { method: "POST" });
      await fetchDashboard();
    } catch (err) {
      console.error("Decision action error:", err);
    }
  };

  // AI command (placeholder)
  const handleCommand = async () => {
    if (!commandInput.trim()) return;
    setIsProcessingCommand(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsProcessingCommand(false);
    setCommandInput("");
  };

  // Computed data
  const stats = dashboard?.stats;
  const vehicles = dashboard?.vehicles || [];
  const alerts = dashboard?.alerts || [];
  const aiDecisions = dashboard?.ai_decisions || [];
  const recentActivity = dashboard?.recent_activity || [];
  const unassignedOrders = dashboard?.unassigned_orders || [];

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch) return vehicles;
    const search = vehicleSearch.toLowerCase();
    return vehicles.filter(v =>
      v.plate_number.toLowerCase().includes(search) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(search))
    );
  }, [vehicles, vehicleSearch]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t("loading")}</p>
        </div>
      </div>
    );
  }

  // Error state with helpful message
  if (error || !dashboard) {
    const isConnectionError = error?.includes("Failed to fetch") || error?.includes("fetch");
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-slate-100">
        <div className="text-center max-w-lg">
          <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {isConnectionError ? t("errors.cannotConnect") : t("errors.noData")}
          </h2>
          <p className="text-gray-600 mb-4">
            {isConnectionError ? (
              <>
                {t("errors.checkBackend")}
                <br />
                {t("errors.backendRunning")}
                <br />
                {t("errors.databaseMigrated")}
              </>
            ) : (
              t("errors.noDispatchData")
            )}
          </p>
          {error && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">
              {error}
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={fetchDashboard}
              className="px-6 py-3 bg-white text-gray-700 border rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t("buttons.reload")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-100">
      {/* ================================================================
          HEADER
          ================================================================ */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Dispatch Center</h1>
              <p className="text-xs text-slate-400">
                {currentTime.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })} • {currentTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* GPS Providers Status */}
          <div className="relative" ref={gpsPanelRef}>
            <button
              onClick={() => setShowGPSPanel(!showGPSPanel)}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${
                gpsProviders.length > 0
                  ? gpsProviders.some(p => p.status === "active")
                    ? "bg-green-600 hover:bg-green-500"
                    : "bg-yellow-600 hover:bg-yellow-500"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              <Satellite className="w-4 h-4" />
              <span className="hidden sm:inline">GPS</span>
              {gpsProviders.length > 0 && (
                <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  {gpsProviders.filter(p => p.status === "active").length}/{gpsProviders.length}
                </span>
              )}
            </button>

            {/* GPS Panel Dropdown */}
            {showGPSPanel && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border z-50">
                <div className="p-3 border-b bg-slate-50 rounded-t-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Satellite className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-800 text-sm">{t("gps.title")}</span>
                  </div>
                  <button
                    onClick={() => handleSyncGPS()}
                    disabled={isSyncingGPS}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {isSyncingGPS ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    {t("buttons.syncAll")}
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {gpsProviders.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      <WifiOff className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>{t("gps.notConfigured")}</p>
                      <a href="/tms/gps-settings" className="text-blue-600 hover:underline text-xs">
                        {t("gps.configureNow")} &rarr;
                      </a>
                    </div>
                  ) : (
                    gpsProviders.map((provider) => (
                      <div key={provider.id} className="p-3 border-b last:border-b-0 hover:bg-slate-50">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              provider.status === "active" ? "bg-green-500" :
                              provider.status === "error" ? "bg-red-500" : "bg-gray-400"
                            }`} />
                            <span className="font-medium text-gray-800 text-sm">{provider.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {provider.mapped_vehicles} {t("gps.vehicles")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{provider.provider_type}</span>
                          <span>
                            {provider.last_sync_at
                              ? formatTimeAgo(provider.last_sync_at)
                              : t("gps.notSynced")}
                          </span>
                        </div>
                        {provider.last_error && (
                          <div className="mt-1 text-xs text-red-500 truncate" title={provider.last_error}>
                            ⚠ {provider.last_error}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {gpsProviders.length > 0 && (
                  <div className="p-2 border-t bg-slate-50 rounded-b-xl">
                    <a
                      href="/tms/gps-settings"
                      className="block text-center text-xs text-blue-600 hover:underline"
                    >
                      {t("gps.manageSettings")} &rarr;
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => { fetchDashboard(); fetchGPSProviders(); }}
            className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Auto Mode Toggle */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
            <span className="text-sm text-slate-300">Auto-mode</span>
            <button
              onClick={() => setAutoMode(!autoMode)}
              className={`relative w-12 h-6 rounded-full transition-colors ${autoMode ? "bg-green-500" : "bg-slate-600"}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${autoMode ? "left-7" : "left-1"}`} />
            </button>
            {autoMode && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          </div>

          {/* Alert Badge */}
          <button className="relative p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
            <Bell className="w-5 h-5" />
            {stats && stats.active_alerts > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-xs rounded-full flex items-center justify-center font-bold">
                {stats.active_alerts}
              </span>
            )}
          </button>

          {/* Settings */}
          <button className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ================================================================
          AI COMMAND BAR
          ================================================================ */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCommand()}
              placeholder={t("commandBar.placeholder")}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none text-sm"
              disabled={isProcessingCommand}
            />
          </div>
          <button
            onClick={handleCommand}
            disabled={isProcessingCommand || !commandInput.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            {isProcessingCommand ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t("commandBar.processing")}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {t("commandBar.execute")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================================================================
          KPI STATS
          ================================================================ */}
      {stats && (
        <div className="px-6 py-4 bg-white border-b">
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Truck className="w-4 h-4" />
                <span className="text-xs font-medium">{t("stats.activeVehicles")}</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{stats.active_vehicles}/{stats.total_vehicles}</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Route className="w-4 h-4" />
                <span className="text-xs font-medium">{t("stats.onTrip")}</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{stats.on_trip_vehicles}</div>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-200">
              <div className="flex items-center gap-2 text-cyan-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">{t("stats.available")}</span>
              </div>
              <div className="text-2xl font-bold text-cyan-700">{stats.available_vehicles}</div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium">{t("stats.pendingOrders")}</span>
              </div>
              <div className="text-2xl font-bold text-orange-700">{stats.pending_orders}</div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">{t("stats.inTransit")}</span>
              </div>
              <div className="text-2xl font-bold text-emerald-700">{stats.in_transit_orders}</div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 border border-teal-200">
              <div className="flex items-center gap-2 text-teal-600 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium">{t("stats.deliveredToday")}</span>
              </div>
              <div className="text-2xl font-bold text-teal-700">{stats.delivered_today}</div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-4 border border-rose-200">
              <div className="flex items-center gap-2 text-rose-600 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">{t("stats.alerts")}</span>
              </div>
              <div className="text-2xl font-bold text-rose-700">{stats.active_alerts}</div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Brain className="w-4 h-4" />
                <span className="text-xs font-medium">{t("stats.aiAutoRate")}</span>
              </div>
              <div className="text-2xl font-bold text-indigo-700">{stats.ai_auto_rate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MAIN CONTENT
          ================================================================ */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Alerts & Unassigned */}
        <div className="w-80 bg-white border-r flex flex-col overflow-hidden">
          {/* Alerts */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="font-semibold text-sm">{t("alerts.title")}</span>
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">{alerts.length}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {alerts.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">{t("alerts.noAlerts")}</p>
                </div>
              ) : (
                alerts.map((alert) => {
                  const colors = getSeverityColor(alert.severity);
                  return (
                    <div key={alert.id} className={`${colors.bg} ${colors.border} border rounded-lg p-3`}>
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full ${colors.dot} mt-1.5 flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">{alert.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{alert.message}</div>
                          {alert.plate_number && (
                            <div className="text-xs text-gray-500 mt-1">{t("alerts.vehicle")} {alert.plate_number}</div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleResolveAlert(alert.id)}
                              className="px-2 py-1 text-xs rounded font-medium bg-slate-900 text-white hover:bg-slate-800"
                            >
                              {t("alerts.resolve")}
                            </button>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(alert.created_at)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Unassigned Orders */}
          <div className="border-t flex flex-col" style={{ height: "40%" }}>
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-sm">{t("unassignedOrders.title")}</span>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-medium">{unassignedOrders.length}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {unassignedOrders.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">{t("unassignedOrders.allAssigned")}</p>
                </div>
              ) : (
                unassignedOrders.map((order) => (
                  <div key={order.id} className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-blue-600 text-sm">{order.order_code}</span>
                      <span className="px-2 py-0.5 text-xs rounded font-medium bg-gray-100 text-gray-600">
                        {order.equipment || "N/A"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      {order.pickup_text && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{order.pickup_text}</span>
                        </div>
                      )}
                      {order.delivery_text && (
                        <div className="flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          <span className="truncate">{order.delivery_text}</span>
                        </div>
                      )}
                      {order.customer_requested_date && (
                        <div className="text-orange-600 font-medium">
                          {t("unassignedOrders.deadline")} {new Date(order.customer_requested_date).toLocaleDateString("vi-VN")}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center - Map & Fleet */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Live Map */}
          <div className="flex-1 relative bg-slate-200">
            {/* Map Placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Navigation className="w-10 h-10 text-slate-500" />
                </div>
                <p className="text-slate-600 font-medium">{t("liveMap.title")}</p>
                <p className="text-slate-400 text-sm">{t("liveMap.integrationHint")}</p>
              </div>
            </div>

            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button className="p-2 bg-white rounded-lg shadow hover:bg-slate-50">
                <Maximize2 className="w-4 h-4 text-gray-600" />
              </button>
              <button onClick={fetchDashboard} className="p-2 bg-white rounded-lg shadow hover:bg-slate-50">
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow p-3">
              <div className="text-xs font-medium text-gray-700 mb-2">{t("liveMap.legend")}</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span>{t("liveMap.onTrip")} ({stats?.on_trip_vehicles || 0})</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span>{t("liveMap.available")} ({stats?.available_vehicles || 0})</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  <span>{t("liveMap.offline")}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Overlay */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur rounded-xl shadow-lg p-4 w-64">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-800">{t("liveMap.liveOperations")}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats?.on_trip_vehicles || 0}</div>
                  <div className="text-xs text-green-700">{t("liveMap.onTrip")}</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats?.available_vehicles || 0}</div>
                  <div className="text-xs text-blue-700">{t("liveMap.available")}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle List */}
          <div className="h-48 bg-white border-t overflow-hidden">
            <div className="px-4 py-2 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-sm">{t("vehicleList.title")} ({vehicles.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  placeholder={t("vehicleList.searchPlaceholder")}
                  className="px-3 py-1 text-xs border rounded-lg w-48 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto h-[calc(100%-44px)]">
              {vehicles.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Truck className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm">{t("vehicleList.noGPSData")}</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-4 py-2 font-medium">{t("vehicleList.columns.status")}</th>
                      <th className="px-4 py-2 font-medium">{t("vehicleList.columns.plate")}</th>
                      <th className="px-4 py-2 font-medium">{t("vehicleList.columns.driver")}</th>
                      <th className="px-4 py-2 font-medium">{t("vehicleList.columns.location")}</th>
                      <th className="px-4 py-2 font-medium">{t("vehicleList.columns.speed")}</th>
                      <th className="px-4 py-2 font-medium">{t("vehicleList.columns.updated")}</th>
                      <th className="px-4 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.map((vehicle) => (
                      <tr
                        key={vehicle.id}
                        className="border-b hover:bg-slate-50 cursor-pointer"
                        onClick={() => setSelectedVehicle(vehicle)}
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getWorkStatusColor(vehicle.work_status)}`} />
                            <span className="text-xs">{getWorkStatusLabel(vehicle.work_status)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 font-mono font-medium">{vehicle.plate_number}</td>
                        <td className="px-4 py-2">{vehicle.driver_name || "-"}</td>
                        <td className="px-4 py-2 text-xs text-gray-500 max-w-[150px] truncate">
                          {vehicle.address || "-"}
                        </td>
                        <td className="px-4 py-2">
                          {vehicle.speed !== null ? (
                            <span className="text-gray-600">{Math.round(vehicle.speed)} km/h</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-400">
                          {formatTimeAgo(vehicle.gps_timestamp)}
                        </td>
                        <td className="px-4 py-2">
                          <button className="p-1 hover:bg-slate-100 rounded">
                            <MoreHorizontal className="w-4 h-4 text-gray-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - AI Activity */}
        <div className="w-80 bg-white border-l flex flex-col overflow-hidden">
          {/* AI Confidence */}
          <div className="px-4 py-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-sm">{t("aiActivity.autoRate")}</span>
              </div>
              <span className="text-2xl font-bold text-purple-600">{stats?.ai_auto_rate || 0}%</span>
            </div>
            <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                style={{ width: `${stats?.ai_auto_rate || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t("aiActivity.autoRateDesc", { rate: stats?.ai_auto_rate || 0 })}
            </p>
          </div>

          {/* AI Activity Log */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-sm">{t("aiActivity.title")}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-600">{t("aiActivity.live")}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {recentActivity.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Activity className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">{t("aiActivity.noActivity")}</p>
                </div>
              ) : (
                recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs">
                    <span className="text-gray-400 font-mono flex-shrink-0">{formatTime(log.created_at)}</span>
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${getActivityTypeColor(log.log_type)}`} />
                    <div className="flex-1">
                      <span className="text-gray-700">{log.title}</span>
                      {log.is_ai && (
                        <span className="ml-1 text-purple-500">🤖</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Decisions Queue */}
          <div className="border-t flex flex-col" style={{ height: "45%" }}>
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-sm">{t("aiDecisions.title")}</span>
              </div>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-xs rounded-full font-medium">
                {stats?.pending_ai_decisions || 0} {t("aiDecisions.pendingApproval")}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {aiDecisions.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">{t("aiDecisions.noPending")}</p>
                </div>
              ) : (
                aiDecisions.map((decision) => (
                  <div key={decision.id} className="bg-slate-50 rounded-lg p-3 border">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs text-gray-400 font-mono">{formatTime(decision.created_at)}</span>
                      <span className={`text-xs font-bold ${getConfidenceColor(decision.confidence)}`}>
                        {getConfidenceIcon(decision.confidence)} {decision.confidence}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 mb-1">{decision.title}</p>
                    <p className="text-xs text-gray-500 mb-2">{decision.description}</p>
                    {decision.status === "pending" ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDecisionAction(decision.id, "approve")}
                          className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded font-medium hover:bg-green-700"
                        >
                          {t("aiDecisions.approve")}
                        </button>
                        <button
                          onClick={() => handleDecisionAction(decision.id, "reject")}
                          className="flex-1 px-2 py-1 bg-white text-gray-700 border text-xs rounded font-medium hover:bg-gray-50"
                        >
                          {t("aiDecisions.reject")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span>{decision.status === "approved" ? t("aiDecisions.approved") : t("aiDecisions.rejected")}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
