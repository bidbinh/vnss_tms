"use client";

import { useState, useEffect } from "react";
import {
  History,
  FileText,
  Edit2,
  Users,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronRight,
  X,
} from "lucide-react";

interface AuditEvent {
  type: string;
  timestamp: string;
  details: {
    field_category?: string;
    field_name?: string;
    item_index?: number;
    original_value?: string;
    corrected_value?: string;
    correction_type?: string;
    provider?: string;
    confidence?: number;
    approved_by?: string;
    declaration_id?: string;
  };
}

interface AuditTrailData {
  session_id: string;
  session_code: string;
  total_events: number;
  summary: {
    total_fields_parsed: number;
    total_fields_corrected: number;
    accuracy_rate: number;
  };
  timeline: AuditEvent[];
}

interface AuditTrailPanelProps {
  sessionId: string;
  trigger?: React.ReactNode;
}

export function AuditTrailPanel({ sessionId, trigger }: AuditTrailPanelProps) {
  const [auditData, setAuditData] = useState<AuditTrailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "corrections" | "partner_links">("all");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && sessionId) {
      loadAuditTrail();
    }
  }, [open, sessionId]);

  const loadAuditTrail = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `/api/v1/fms/ai-training/sessions/${sessionId}/audit-trail`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAuditData(data);
      }
    } catch (error) {
      console.error("Failed to load audit trail:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTimeline = auditData?.timeline.filter((event) => {
    if (filter === "all") return true;
    if (filter === "corrections") return event.type === "FIELD_CORRECTED";
    if (filter === "partner_links")
      return event.details.correction_type === "PARTNER_LINK";
    return true;
  });

  const getEventIcon = (type: string, correctionType?: string) => {
    if (type === "SESSION_CREATED") return <Sparkles className="h-4 w-4 text-blue-500" />;
    if (type === "SESSION_APPROVED") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (correctionType === "PARTNER_LINK") return <Users className="h-4 w-4 text-purple-500" />;
    if (type === "FIELD_CORRECTED") return <Edit2 className="h-4 w-4 text-amber-500" />;
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <>
      {/* Trigger button */}
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger || (
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
            <History className="h-4 w-4" />
            Audit Trail
          </button>
        )}
      </div>

      {/* Slide-out panel */}
      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-[600px] max-w-full bg-white shadow-xl z-50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <h2 className="font-semibold text-lg">Parsing Session History</h2>
                {auditData && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                    {auditData.session_code}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Summary Stats */}
              {auditData && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl font-bold">
                      {auditData.summary.total_fields_parsed}
                    </div>
                    <div className="text-xs text-gray-500">Fields Parsed</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {auditData.summary.total_fields_corrected}
                    </div>
                    <div className="text-xs text-gray-500">Corrections</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(auditData.summary.accuracy_rate * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">Accuracy</div>
                  </div>
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {[
                  { key: "all", label: "All Events" },
                  { key: "corrections", label: "Corrections" },
                  { key: "partner_links", label: "Partner Links" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as typeof filter)}
                    className={`
                      flex-1 px-3 py-1.5 text-sm rounded-md transition-colors
                      ${filter === tab.key
                        ? "bg-white shadow text-gray-900"
                        : "text-gray-600 hover:text-gray-900"
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Timeline */}
              <div className="h-[500px] overflow-auto pr-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : filteredTimeline && filteredTimeline.length > 0 ? (
                  <div className="space-y-1">
                    {filteredTimeline.map((event, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {/* Icon */}
                        <div className="mt-0.5">
                          {getEventIcon(event.type, event.details.correction_type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {event.type === "SESSION_CREATED" && "AI Parsing Started"}
                              {event.type === "SESSION_APPROVED" && "Session Approved"}
                              {event.type === "FIELD_CORRECTED" && (
                                <>
                                  Field Corrected:{" "}
                                  <code className="text-xs bg-gray-100 px-1 rounded">
                                    {event.details.field_name}
                                  </code>
                                </>
                              )}
                            </span>
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                              {formatTime(event.timestamp)}
                            </span>
                          </div>

                          {/* Details */}
                          {event.type === "SESSION_CREATED" && event.details.provider && (
                            <div className="text-xs text-gray-500 mt-1">
                              Provider: {event.details.provider}
                              {event.details.confidence && (
                                <> • Confidence: {Math.round(event.details.confidence * 100)}%</>
                              )}
                            </div>
                          )}

                          {event.type === "FIELD_CORRECTED" && (
                            <div className="text-xs space-y-1 mt-1">
                              {event.details.original_value && (
                                <div className="text-gray-500">
                                  <span className="line-through">
                                    {event.details.original_value}
                                  </span>
                                  <ChevronRight className="inline h-3 w-3 mx-1" />
                                  <span className="font-medium text-gray-900">
                                    {event.details.corrected_value}
                                  </span>
                                </div>
                              )}
                              {event.details.correction_type && (
                                <span className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                                  {event.details.correction_type}
                                </span>
                              )}
                            </div>
                          )}

                          {event.type === "SESSION_APPROVED" && (
                            <div className="text-xs text-gray-500 mt-1">
                              {event.details.declaration_id && (
                                <>Declaration: {event.details.declaration_id}</>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mb-2 opacity-50" />
                    <p>No events to display</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
