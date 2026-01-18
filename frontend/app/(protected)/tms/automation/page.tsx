"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { 
  Bot, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  PlayCircle,
  TrendingUp,
  AlertCircle,
  Activity
} from "lucide-react";

// ============ Types ============

interface AIDecision {
  id: string;
  decision_type: string;
  title: string;
  description: string;
  confidence: number;
  reasoning?: string;
  vehicle_id?: string;
  plate_number?: string;
  driver_name?: string;
  order_id?: string;
  order_code?: string;
  status: string;
  created_at: string;
}

interface AutomationStats {
  pending_decisions: number;
  auto_accepted_today: number;
  auto_assigned_today: number;
  automation_rate: number;
  success_rate: number;
}

interface JobStatus {
  status: "idle" | "running" | "completed" | "error";
  message?: string;
  started_at?: string;
  completed_at?: string;
}

// ============ Main Component ============

export default function AutomationDashboardPage() {
  const t = useTranslations("tms");
  const router = useRouter();
  
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [pendingDecisions, setPendingDecisions] = useState<AIDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Job status
  const [autoAcceptJob, setAutoAcceptJob] = useState<JobStatus>({ status: "idle" });
  const [autoAssignJob, setAutoAssignJob] = useState<JobStatus>({ status: "idle" });
  const [gpsDetectionJob, setGpsDetectionJob] = useState<JobStatus>({ status: "idle" });
  const [etaRecalcJob, setEtaRecalcJob] = useState<JobStatus>({ status: "idle" });

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      
      // Fetch pending AI decisions
      const decisions = await apiFetch<AIDecision[]>("/dispatch/ai-decisions?limit=10");
      setPendingDecisions(decisions || []);
      
      // Calculate stats (simple for now)
      const pendingCount = decisions?.length || 0;
      setStats({
        pending_decisions: pendingCount,
        auto_accepted_today: 0, // TODO: Get from API
        auto_assigned_today: 0, // TODO: Get from API
        automation_rate: 0, // TODO: Calculate
        success_rate: 95, // TODO: Calculate from history
      });
      
    } catch (e: any) {
      setError(e?.message || "Failed to load automation data");
    } finally {
      setLoading(false);
    }
  };

  const triggerJob = async (
    endpoint: string,
    setJobStatus: (status: JobStatus) => void,
    jobName: string
  ) => {
    setJobStatus({ 
      status: "running", 
      message: `Running ${jobName}...`,
      started_at: new Date().toISOString()
    });
    
    try {
      const result = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ limit: 50 }),
      });
      
      setJobStatus({ 
        status: "completed", 
        message: result?.message || `${jobName} completed`,
        completed_at: new Date().toISOString()
      });
      
      // Refresh data after job completes
      setTimeout(() => {
        fetchData();
        setJobStatus({ status: "idle" });
      }, 2000);
      
    } catch (e: any) {
      setJobStatus({ 
        status: "error", 
        message: e?.message || `${jobName} failed`
      });
      
      setTimeout(() => {
        setJobStatus({ status: "idle" });
      }, 5000);
    }
  };

  const handleApproveDecision = async (decisionId: string) => {
    try {
      await apiFetch(`/dispatch/ai-decisions/${decisionId}/approve`, {
        method: "POST",
      });
      fetchData();
    } catch (e: any) {
      alert(e?.message || "Failed to approve decision");
    }
  };

  const handleRejectDecision = async (decisionId: string) => {
    try {
      await apiFetch(`/dispatch/ai-decisions/${decisionId}/reject`, {
        method: "POST",
      });
      fetchData();
    } catch (e: any) {
      alert(e?.message || "Failed to reject decision");
    }
  };

  const handleRunAll = async () => {
    try {
      setAutoAcceptJob({ status: "running", message: "Running all jobs..." });
      setAutoAssignJob({ status: "running" });
      setGpsDetectionJob({ status: "running" });
      setEtaRecalcJob({ status: "running" });
      
      await apiFetch("/api/v1/automation/run-all", {
        method: "POST",
      });
      
      setAutoAcceptJob({ status: "completed", message: "All jobs started" });
      setAutoAssignJob({ status: "completed" });
      setGpsDetectionJob({ status: "completed" });
      setEtaRecalcJob({ status: "completed" });
      
      setTimeout(() => {
        fetchData();
        setAutoAcceptJob({ status: "idle" });
        setAutoAssignJob({ status: "idle" });
        setGpsDetectionJob({ status: "idle" });
        setEtaRecalcJob({ status: "idle" });
      }, 3000);
      
    } catch (e: any) {
      alert(e?.message || "Failed to run all jobs");
      setAutoAcceptJob({ status: "idle" });
      setAutoAssignJob({ status: "idle" });
      setGpsDetectionJob({ status: "idle" });
      setEtaRecalcJob({ status: "idle" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getJobStatusIcon = (jobStatus: JobStatus) => {
    switch (jobStatus.status) {
      case "running": return <RefreshCw className="w-4 h-4 animate-spin" />;
      case "completed": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "error": return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <PlayCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">TMS Automation Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý và theo dõi các tác vụ tự động hóa
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div className="text-sm text-gray-600">Pending Decisions</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.pending_decisions}</div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="text-sm text-gray-600">Auto-Accepted Today</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.auto_accepted_today}</div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Bot className="w-5 h-5 text-blue-600" />
              <div className="text-sm text-gray-600">Auto-Assigned Today</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.auto_assigned_today}</div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.success_rate}%</div>
          </div>
        </div>
      )}

      {/* Automation Jobs */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Automation Jobs
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Auto-Accept Orders */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Auto-Accept Orders</div>
              {getJobStatusIcon(autoAcceptJob)}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Tự động chấp nhận/từ chối đơn hàng mới dựa trên validation
            </p>
            {autoAcceptJob.message && (
              <p className="text-xs text-gray-500 mb-2">{autoAcceptJob.message}</p>
            )}
            <button
              onClick={() => triggerJob("/api/v1/automation/auto-accept-orders", setAutoAcceptJob, "Auto-Accept")}
              disabled={autoAcceptJob.status === "running"}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {autoAcceptJob.status === "running" ? "Running..." : "Run Now"}
            </button>
          </div>

          {/* Auto-Assign Drivers */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Auto-Assign Drivers</div>
              {getJobStatusIcon(autoAssignJob)}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Tự động gán tài xế cho đơn hàng đã chấp nhận
            </p>
            {autoAssignJob.message && (
              <p className="text-xs text-gray-500 mb-2">{autoAssignJob.message}</p>
            )}
            <button
              onClick={() => triggerJob("/api/v1/automation/auto-assign-drivers", setAutoAssignJob, "Auto-Assign")}
              disabled={autoAssignJob.status === "running"}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {autoAssignJob.status === "running" ? "Running..." : "Run Now"}
            </button>
          </div>

          {/* GPS Status Detection */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">GPS Status Detection</div>
              {getJobStatusIcon(gpsDetectionJob)}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Tự động phát hiện trạng thái dựa trên GPS (arrival, pickup, delivery)
            </p>
            {gpsDetectionJob.message && (
              <p className="text-xs text-gray-500 mb-2">{gpsDetectionJob.message}</p>
            )}
            <button
              onClick={() => triggerJob("/api/v1/automation/detect-gps-status", setGpsDetectionJob, "GPS Detection")}
              disabled={gpsDetectionJob.status === "running"}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {gpsDetectionJob.status === "running" ? "Running..." : "Run Now"}
            </button>
          </div>

          {/* ETA Recalculation */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">ETA Recalculation</div>
              {getJobStatusIcon(etaRecalcJob)}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Tính toán lại thời gian dự kiến và cảnh báo trễ
            </p>
            {etaRecalcJob.message && (
              <p className="text-xs text-gray-500 mb-2">{etaRecalcJob.message}</p>
            )}
            <button
              onClick={() => triggerJob("/api/v1/automation/recalculate-etas", setEtaRecalcJob, "ETA Recalc")}
              disabled={etaRecalcJob.status === "running"}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {etaRecalcJob.status === "running" ? "Running..." : "Run Now"}
            </button>
          </div>
        </div>

        {/* Run All Button */}
        <button
          onClick={handleRunAll}
          disabled={autoAcceptJob.status === "running" || autoAssignJob.status === "running"}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          <PlayCircle className="w-5 h-5" />
          Run All Automation Jobs
        </button>
      </div>

      {/* Pending AI Decisions */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Pending AI Decisions ({pendingDecisions.length})
          </h2>
          {pendingDecisions.length > 0 && (
            <button
              onClick={fetchData}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Refresh
            </button>
          )}
        </div>

        {pendingDecisions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No pending decisions. All clear! 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDecisions.map((decision) => (
              <div
                key={decision.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{decision.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(decision.status)}`}>
                        {decision.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        Confidence: {decision.confidence}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{decision.description}</p>
                    {decision.reasoning && (
                      <p className="text-xs text-gray-500 italic mb-2">
                        Reasoning: {decision.reasoning}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {decision.order_code && (
                        <span>Order: {decision.order_code}</span>
                      )}
                      {decision.plate_number && (
                        <span>Vehicle: {decision.plate_number}</span>
                      )}
                      {decision.driver_name && (
                        <span>Driver: {decision.driver_name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleApproveDecision(decision.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectDecision(decision.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
