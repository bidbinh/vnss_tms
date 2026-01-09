"use client";

import { useState } from "react";
import { Edit2, FileText, Info } from "lucide-react";

interface CorrectionIndicatorProps {
  fieldName: string;
  originalValue?: string;
  currentValue?: string;
  sourceDocument?: string;
  corrections?: Array<{
    field: string;
    original: string;
    corrected: string;
    timestamp: string;
  }>;
}

export function CorrectionIndicator({
  fieldName,
  originalValue,
  currentValue,
  sourceDocument,
  corrections,
}: CorrectionIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const wasModified = originalValue !== undefined && originalValue !== currentValue;
  const hasCorrections = corrections && corrections.length > 0;

  if (!wasModified && !sourceDocument && !hasCorrections) {
    return null;
  }

  return (
    <div
      className="relative inline-flex items-center gap-1"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Source document badge */}
      {sourceDocument && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
          <FileText className="h-3 w-3" />
          {sourceDocument}
        </span>
      )}

      {/* Modified indicator */}
      {wasModified && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
          <Edit2 className="h-3 w-3" />
          Edited
        </span>
      )}

      {/* Tooltip */}
      {showTooltip && (wasModified || hasCorrections) && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
          <div className="font-medium mb-2">Field: {fieldName}</div>

          {wasModified && (
            <div className="space-y-1">
              <div className="text-gray-400">Original value:</div>
              <div className="text-red-300 line-through">{originalValue || "(empty)"}</div>
              <div className="text-gray-400">Corrected to:</div>
              <div className="text-green-300">{currentValue || "(empty)"}</div>
            </div>
          )}

          {hasCorrections && (
            <div className="mt-2 space-y-2">
              <div className="text-gray-400">Correction history:</div>
              {corrections.map((c, idx) => (
                <div key={idx} className="text-xs border-l-2 border-gray-600 pl-2">
                  <div className="text-gray-400">{c.timestamp}</div>
                  <div>
                    <span className="text-red-300 line-through">{c.original}</span>
                    {" → "}
                    <span className="text-green-300">{c.corrected}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Arrow */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

// Compact dot version for use in tables
export function CorrectionDot({
  wasModified,
  sourceDocument,
}: {
  wasModified?: boolean;
  sourceDocument?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!wasModified && !sourceDocument) {
    return null;
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`
          inline-block w-2 h-2 rounded-full
          ${wasModified ? "bg-amber-500" : "bg-blue-500"}
        `}
      />

      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
          {wasModified ? "Field was edited" : `Source: ${sourceDocument}`}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
