"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Loader2, Check, X } from "lucide-react";

// Custom debounce function to avoid lodash dependency
function useDebounce<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

interface HSCodeData {
  hs_code: string;
  product_name?: string;
  hs_description?: string;
  import_duty_rate?: number;
  vat_rate?: number;
  unit_code?: string;
}

interface HSCodeLookupProps {
  productCode: string;
  onLookupResult: (data: HSCodeData | null) => void;
  tenantId?: string;
}

/**
 * Component để tra cứu mã HS từ mã hàng (product_code)
 * Sử dụng trong form nhập dòng hàng
 */
export default function HSCodeLookup({
  productCode,
  onLookupResult,
  tenantId,
}: HSCodeLookupProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HSCodeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lookup từ ERP database (HSCodeCatalog)
  const lookupFromERP = async (code: string): Promise<HSCodeData | null> => {
    const token = localStorage.getItem("token");
    const response = await fetch(
      `/api/v1/fms/master-data/hs-code-catalog/lookup?product_code=${encodeURIComponent(code)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data) {
        return {
          hs_code: data.hs_code,
          product_name: data.product_name,
          hs_description: data.hs_description,
          import_duty_rate: data.import_duty_rate,
          vat_rate: data.vat_rate,
          unit_code: data.unit_code,
        };
      }
    }
    return null;
  };

  // Lookup từ ECUS database (nếu có cấu hình)
  const lookupFromECUS = async (code: string): Promise<HSCodeData | null> => {
    const savedConfig = localStorage.getItem("ecus_config");
    if (!savedConfig) return null;

    try {
      const config = JSON.parse(savedConfig);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/v1/fms/ecus/lookup-hs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          config,
          product_code: code,
        }),
      });

      const data = await response.json();
      if (data.success && data.hs_code) {
        return {
          hs_code: data.hs_code,
          product_name: data.product_name,
          import_duty_rate: data.import_duty_rate,
          vat_rate: data.vat_rate,
          unit_code: data.unit_code,
        };
      }
    } catch (e) {
      console.error("ECUS lookup failed:", e);
    }
    return null;
  };

  // Lookup function
  const performLookup = useCallback(async (code: string) => {
    if (!code || code.length < 2) {
      setResult(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Thử lookup từ ERP trước
      let data = await lookupFromERP(code);

      // 2. Nếu không có, thử từ ECUS
      if (!data) {
        data = await lookupFromECUS(code);
      }

      if (data) {
        setResult(data);
        onLookupResult(data);
      } else {
        setResult(null);
        setError("Không tìm thấy mã HS");
        onLookupResult(null);
      }
    } catch (e) {
      setError("Lỗi tra cứu");
      setResult(null);
      onLookupResult(null);
    } finally {
      setLoading(false);
    }
  }, [onLookupResult]);

  // Debounced lookup
  const debouncedLookup = useDebounce(performLookup, 500);

  const handleLookup = () => {
    debouncedLookup(productCode);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleLookup}
        disabled={loading || !productCode}
        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
        title="Tra cứu mã HS từ mã hàng"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </button>

      {result && (
        <span className="inline-flex items-center gap-1 text-xs text-green-600">
          <Check className="w-3 h-3" />
          {result.hs_code}
        </span>
      )}

      {error && (
        <span className="inline-flex items-center gap-1 text-xs text-red-500">
          <X className="w-3 h-3" />
          {error}
        </span>
      )}
    </div>
  );
}

/**
 * Hook để sử dụng lookup trong form
 */
export function useHSCodeLookup() {
  const [lookupData, setLookupData] = useState<HSCodeData | null>(null);

  const handleLookupResult = (data: HSCodeData | null) => {
    setLookupData(data);
  };

  const applyToForm = (
    setFieldValue: (field: string, value: unknown) => void
  ) => {
    if (lookupData) {
      setFieldValue("hs_code", lookupData.hs_code);
      if (lookupData.product_name) {
        setFieldValue("product_name", lookupData.product_name);
      }
      if (lookupData.hs_description) {
        setFieldValue("hs_description", lookupData.hs_description);
      }
      if (lookupData.import_duty_rate !== undefined) {
        setFieldValue("import_duty_rate", lookupData.import_duty_rate);
      }
      if (lookupData.vat_rate !== undefined) {
        setFieldValue("vat_rate", lookupData.vat_rate);
      }
      if (lookupData.unit_code) {
        setFieldValue("unit_code", lookupData.unit_code);
      }
    }
  };

  return {
    lookupData,
    handleLookupResult,
    applyToForm,
  };
}
