"use client";

import { useState, useEffect } from "react";
import { X, Database, Check, AlertCircle, Loader2, Settings } from "lucide-react";

interface ECUSConfig {
  server: string;
  database: string;
  username: string;
  password: string;
  port: number;
}

interface ECUSConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (config: ECUSConfig) => Promise<void>;
  declarationId: string;
  declarationNo?: string;
}

const defaultConfig: ECUSConfig = {
  server: "localhost",
  database: "ECUS5VNACCS",
  username: "sa",
  password: "123456",
  port: 1433,
};

export default function ECUSConfigModal({
  isOpen,
  onClose,
  onSync,
  declarationId,
  declarationNo,
}: ECUSConfigModalProps) {
  const [config, setConfig] = useState<ECUSConfig>(defaultConfig);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Load saved config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ecus_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({ ...defaultConfig, ...parsed });
      } catch (e) {
        console.error("Failed to parse saved ECUS config");
      }
    }
  }, []);

  // Save config to localStorage
  const saveConfig = () => {
    localStorage.setItem("ecus_config", JSON.stringify(config));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/v1/fms/ecus/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.success
          ? `Kết nối thành công! Database: ${data.database}, Số tờ khai: ${data.declaration_count}`
          : data.error || "Không thể kết nối",
      });

      if (data.success) {
        saveConfig();
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Lỗi kết nối: " + (error as Error).message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      saveConfig();
      await onSync(config);
      onClose();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">
              Đồng bộ với ECUS
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Declaration Info */}
          {declarationNo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tờ khai:</span> {declarationNo}
              </p>
            </div>
          )}

          {/* Connection Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Settings className="w-4 h-4" />
              Cấu hình kết nối SQL Server
            </div>

            {/* Server */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Server
              </label>
              <input
                type="text"
                value={config.server}
                onChange={(e) =>
                  setConfig({ ...config, server: e.target.value })
                }
                placeholder="localhost hoặc ECUSSQL2008"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Database & Port */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Database
                </label>
                <input
                  type="text"
                  value={config.database}
                  onChange={(e) =>
                    setConfig({ ...config, database: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={config.port}
                  onChange={(e) =>
                    setConfig({ ...config, port: parseInt(e.target.value) || 1433 })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Username
              </label>
              <input
                type="text"
                value={config.username}
                onChange={(e) =>
                  setConfig({ ...config, username: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={config.password}
                  onChange={(e) =>
                    setConfig({ ...config, password: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                testResult.success
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Help text */}
          <p className="text-xs text-gray-500">
            Cấu hình sẽ được lưu trên máy tính này. Mỗi máy cài ECUS cần cấu
            hình riêng.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={handleTestConnection}
            disabled={testing || syncing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            Test kết nối
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={syncing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || !testResult?.success}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Đồng bộ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
