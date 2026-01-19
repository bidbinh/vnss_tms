"use client";

import { ShieldX, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  resource?: string;
  action?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
}

export default function AccessDenied({
  title = "Không có quyền truy cập",
  message = "Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên để được cấp quyền.",
  resource,
  action,
  showBackButton = true,
  showHomeButton = true,
}: AccessDeniedProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
          <ShieldX className="w-10 h-10 text-amber-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>

        {/* Message */}
        <p className="text-gray-600 mb-6">{message}</p>

        {/* Details if provided */}
        {(resource || action) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-500">
            {resource && (
              <div className="flex justify-between">
                <span>Chức năng:</span>
                <span className="font-medium text-gray-700">{resource}</span>
              </div>
            )}
            {action && (
              <div className="flex justify-between mt-1">
                <span>Hành động:</span>
                <span className="font-medium text-gray-700">{action}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          {showBackButton && (
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
          )}
          {showHomeButton && (
            <Link
              href="/tms"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Home className="w-4 h-4" />
              Về trang chủ
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline banner version for embedding in pages
export function AccessDeniedBanner({
  message = "Bạn không có quyền truy cập nội dung này",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
      <ShieldX className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">{message}</p>
        <p className="text-xs text-amber-600 mt-1">
          Liên hệ quản trị viên để được cấp quyền truy cập.
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-amber-700 hover:text-amber-900 font-medium"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
