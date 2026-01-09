"use client";

import { useState } from "react";
import { Upload, Check, AlertCircle, Loader2 } from "lucide-react";
import ECUSConfigModal from "./ECUSConfigModal";
import { toast } from "sonner";

interface ECUSConfig {
  server: string;
  database: string;
  username: string;
  password: string;
  port: number;
}

interface UploadToECUSButtonProps {
  declarationId: string;
  declarationNo?: string;
  ecus_synced?: boolean;
  ecus_sync_date?: string;
  onSyncSuccess?: () => void;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline";
}

export default function UploadToECUSButton({
  declarationId,
  declarationNo,
  ecus_synced = false,
  ecus_sync_date,
  onSyncSuccess,
  size = "md",
  variant = "primary",
}: UploadToECUSButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">(
    ecus_synced ? "success" : "idle"
  );

  const handleSync = async (config: ECUSConfig) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/v1/fms/ecus/sync-declaration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          config,
          declaration_id: declarationId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSyncStatus("success");
        toast.success(data.message || "Đã đồng bộ thành công với ECUS!");
        onSyncSuccess?.();
      } else {
        setSyncStatus("error");
        toast.error(data.error || "Không thể đồng bộ với ECUS");
        throw new Error(data.error);
      }
    } catch (error) {
      setSyncStatus("error");
      throw error;
    }
  };

  // Size classes
  const sizeClasses = {
    sm: "px-2 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-sm gap-2",
  };

  // Variant classes
  const variantClasses = {
    primary: syncStatus === "success"
      ? "bg-green-600 hover:bg-green-700 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: syncStatus === "success"
      ? "bg-green-100 hover:bg-green-200 text-green-800"
      : "bg-blue-100 hover:bg-blue-200 text-blue-800",
    outline: syncStatus === "success"
      ? "border-green-500 text-green-700 hover:bg-green-50"
      : "border-blue-500 text-blue-700 hover:bg-blue-50",
  };

  const iconSize = size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5";

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`
          inline-flex items-center font-medium rounded-lg
          transition-colors duration-200
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${variant === "outline" ? "border bg-white" : ""}
        `}
        title={
          syncStatus === "success" && ecus_sync_date
            ? `Đã đồng bộ: ${new Date(ecus_sync_date).toLocaleString("vi-VN")}`
            : "Đồng bộ với ECUS"
        }
      >
        {syncStatus === "success" ? (
          <Check className={iconSize} />
        ) : syncStatus === "error" ? (
          <AlertCircle className={iconSize} />
        ) : (
          <Upload className={iconSize} />
        )}
        <span>
          {syncStatus === "success" ? "Đã đồng bộ ECUS" : "Upload ECUS"}
        </span>
      </button>

      <ECUSConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSync={handleSync}
        declarationId={declarationId}
        declarationNo={declarationNo}
      />
    </>
  );
}
