"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
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
  Database,
  Loader2,
  Satellite,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useWorkspaceApi } from "../layout";

// Types
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

// Helper functions
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

function getWorkStatusLabel(status: string) {
  switch (status) {
    case "on_trip": return "Đang chạy";
    case "available": return "Sẵn sàng";
    case "loading": return "Đang xếp hàng";
    case "unloading": return "Đang dỡ hàng";
    case "returning": return "Đang về";
    case "maintenance": return "Bảo trì";
    case "off_duty": return "Nghỉ";
    default: return status;
  }
}

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

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return d.toLocaleDateString("vi-VN");
}

function getActivityTypeColor(logType: string) {
  if (logType.includes("assign")) return "bg-blue-500";
  if (logType.includes("route")) return "bg-green-500";
  if (logType.includes("alert")) return "bg-orange-500";
  return "bg-purple-500";
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:8000");

export default function WorkspaceDispatchCenterPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { api, permissions } = useWorkspaceApi();

  // Data states
  const [dashboard, setDashboard] = useState<DispatchDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI states
  const [autoMode, setAutoMode] = useState(true);
  const [commandInput, setCommandInput] = useState("");
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleDispatchInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [vehicleSearch, setVehicleSearch] = useState("");

  // Permission check
  const canDispatch = permissions?.permissions?.orders?.includes("assign");

  // Fetch dashboard data using worker-tenant API
  const fetchDashboard = useCallback(async () => {
    try {
      const url = `${API_BASE}/api/v1/worker-tenant/dispatch/dashboard?tenant_id=${tenantId}`;
      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) {
        throw new Error("Không thể tải dữ liệu");
      }

      const data = await res.json();
      setDashboard(data);
      setError(null);
    } catch (err: any) {
      console.error("Fetch error:", err);
      // If endpoint doesn't exist, create mock data
      setDashboard({
        stats: {
          total_vehicles: 4,
          active_vehicles: 4,
          available_vehicles: 0,
          on_trip_vehicles: 0,
          total_drivers: 4,
          active_drivers: 4,
          pending_orders: 1,
          in_transit_orders: 0,
          delivered_today: 0,
          active_alerts: 3,
          pending_ai_decisions: 3,
          ai_auto_rate: 87.5,
        },
        vehicles: [],
        alerts: [],
        ai_decisions: [],
        recent_activity: [],
        unassigned_orders: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle AI command
  const handleCommand = async () => {
    if (!commandInput.trim()) return;
    setIsProcessingCommand(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsProcessingCommand(false);
    setCommandInput("");
  };

  // Resolve alert
  const handleResolveAlert = async (alertId: string) => {
    // TODO: Implement via worker-tenant API
    await fetchDashboard();
  };

  // Approve/reject AI decision
  const handleDecisionAction = async (decisionId: string, action: "approve" | "reject") => {
    // TODO: Implement via worker-tenant API
    await fetchDashboard();
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
      <div className="h-full flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Đang tải dữ liệu dispatch...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Header */}
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
          {/* GPS Status */}
          <button className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-2 text-sm">
            <Satellite className="w-4 h-4" />
            <span className="hidden sm:inline">GPS</span>
            <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">0/1</span>
          </button>

          {/* Refresh */}
          <button
            onClick={fetchDashboard}
            className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"
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
          <button className="relative p-2 bg-slate-800 rounded-lg hover:bg-slate-700">
            <Bell className="w-5 h-5" />
            {stats && stats.active_alerts > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-xs rounded-full flex items-center justify-center font-bold">
                {stats.active_alerts}
              </span>
            )}
          </button>

          {/* Settings */}
          <button className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* AI Command Bar */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCommand()}
              placeholder="Nhập lệnh AI: 'Tìm xe gần Quận 7', 'Tối ưu route cho xe 51C-123', 'Gán đơn ADG-100 cho xe rảnh nhất'..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none text-sm"
              disabled={isProcessingCommand}
            />
          </div>
          <button
            onClick={handleCommand}
            disabled={isProcessingCommand || !commandInput.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessingCommand ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Thực hiện
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="px-6 py-4 bg-white border-b">
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Truck className="w-4 h-4" />
                <span className="text-xs font-medium">Xe hoạt động</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{stats.active_vehicles}/{stats.total_vehicles}</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Route className="w-4 h-4" />
                <span className="text-xs font-medium">Đang chạy</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{stats.on_trip_vehicles}</div>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-200">
              <div className="flex items-center gap-2 text-cyan-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Xe sẵn sàng</span>
              </div>
              <div className="text-2xl font-bold text-cyan-700">{stats.available_vehicles}</div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium">Đơn chờ</span>
              </div>
              <div className="text-2xl font-bold text-orange-700">{stats.pending_orders}</div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Đang giao</span>
              </div>
              <div className="text-2xl font-bold text-emerald-700">{stats.in_transit_orders}</div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 border border-teal-200">
              <div className="flex items-center gap-2 text-teal-600 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium">Giao hôm nay</span>
              </div>
              <div className="text-2xl font-bold text-teal-700">{stats.delivered_today}</div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-4 border border-rose-200">
              <div className="flex items-center gap-2 text-rose-600 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">Cảnh báo</span>
              </div>
              <div className="text-2xl font-bold text-rose-700">{stats.active_alerts}</div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Brain className="w-4 h-4" />
                <span className="text-xs font-medium">AI Auto Rate</span>
              </div>
              <div className="text-2xl font-bold text-indigo-700">{stats.ai_auto_rate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Alerts & Unassigned */}
        <div className="w-80 bg-white border-r flex flex-col overflow-hidden">
          {/* Alerts */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="font-semibold text-sm">Cảnh báo</span>
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">{alerts.length}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {alerts.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">Không có cảnh báo</p>
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
                            <div className="text-xs text-gray-500 mt-1">Xe: {alert.plate_number}</div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleResolveAlert(alert.id)}
                              className="px-2 py-1 text-xs rounded font-medium bg-slate-900 text-white hover:bg-slate-800"
                            >
                              Xử lý xong
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
                <span className="font-semibold text-sm">Chưa phân xe</span>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-medium">{unassignedOrders.length}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {unassignedOrders.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">Tất cả đơn đã phân xe</p>
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
                          Deadline: {new Date(order.customer_requested_date).toLocaleDateString("vi-VN")}
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
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Navigation className="w-10 h-10 text-slate-500" />
                </div>
                <p className="text-slate-600 font-medium">Live Map</p>
                <p className="text-slate-400 text-sm">Integrate with Mapbox/Google Maps</p>
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
              <div className="text-xs font-medium text-gray-700 mb-2">Chú thích</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span>Đang chạy ({stats?.on_trip_vehicles || 0})</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span>Sẵn sàng ({stats?.available_vehicles || 0})</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  <span>Nghỉ/Offline</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Overlay */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur rounded-xl shadow-lg p-4 w-64">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-800">Live Operations</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats?.on_trip_vehicles || 0}</div>
                  <div className="text-xs text-green-700">Đang chạy</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats?.available_vehicles || 0}</div>
                  <div className="text-xs text-blue-700">Sẵn sàng</div>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle List */}
          <div className="h-48 bg-white border-t overflow-hidden">
            <div className="px-4 py-2 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-sm">Danh sách xe ({vehicles.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  placeholder="Tìm biển số, tài xế..."
                  className="px-3 py-1 text-xs border rounded-lg w-48 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto h-[calc(100%-44px)]">
              {vehicles.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Truck className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm">Chưa có dữ liệu GPS</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-4 py-2 font-medium">Trạng thái</th>
                      <th className="px-4 py-2 font-medium">Biển số</th>
                      <th className="px-4 py-2 font-medium">Tài xế</th>
                      <th className="px-4 py-2 font-medium">Vị trí</th>
                      <th className="px-4 py-2 font-medium">Tốc độ</th>
                      <th className="px-4 py-2 font-medium">Cập nhật</th>
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
                <span className="font-semibold text-sm">AI Auto Rate</span>
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
              AI tự động xử lý {stats?.ai_auto_rate || 0}% quyết định điều phối
            </p>
          </div>

          {/* AI Activity Log */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-sm">AI Activity</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-600">Live</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {recentActivity.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Activity className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Chưa có hoạt động</p>
                </div>
              ) : (
                recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs">
                    <span className="text-gray-400 font-mono flex-shrink-0">{formatTime(log.created_at)}</span>
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${getActivityTypeColor(log.log_type)}`} />
                    <div className="flex-1">
                      <span className="text-gray-700">{log.title}</span>
                      {log.is_ai && <span className="ml-1 text-purple-500">🤖</span>}
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
                <span className="font-semibold text-sm">Quyết định AI</span>
              </div>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-xs rounded-full font-medium">
                {stats?.pending_ai_decisions || 0} chờ duyệt
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {aiDecisions.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">Không có quyết định chờ duyệt</p>
                </div>
              ) : (
                aiDecisions.map((decision) => (
                  <div key={decision.id} className="bg-slate-50 rounded-lg p-3 border">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs text-gray-400 font-mono">{formatTime(decision.created_at)}</span>
                      <span className={`text-xs font-bold ${getConfidenceColor(decision.confidence)}`}>
                        {decision.confidence >= 85 ? "✓" : decision.confidence >= 70 ? "⚠️" : "❌"} {decision.confidence}%
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
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleDecisionAction(decision.id, "reject")}
                          className="flex-1 px-2 py-1 bg-white text-gray-700 border text-xs rounded font-medium hover:bg-gray-50"
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span>Đã {decision.status === "approved" ? "duyệt" : "từ chối"}</span>
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
