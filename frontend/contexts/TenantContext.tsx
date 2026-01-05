"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getSubdomain,
  getTenantCode,
  fetchTenantPublicInfo,
  TenantPublicInfo,
} from "@/lib/tenant";

interface TenantContextType {
  // Current tenant info (from subdomain or login)
  tenant: TenantPublicInfo | null;
  tenantCode: string | null;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Refresh tenant info
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantCode: null,
  isLoading: true,
  error: null,
  refreshTenant: async () => {},
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tenant, setTenant] = useState<TenantPublicInfo | null>(null);
  const [tenantCode, setTenantCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Skip tenant fetch for workspace pages (they have their own tenant context)
  const isWorkspacePage = pathname?.startsWith("/workspace");

  const loadTenant = async () => {
    // Skip for workspace pages
    if (isWorkspacePage) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get tenant code from subdomain or localStorage
      const code = getTenantCode();
      setTenantCode(code);

      if (code) {
        // Fetch tenant info from API
        const info = await fetchTenantPublicInfo(code);
        if (info) {
          setTenant(info);

          // Apply tenant branding (primary color)
          if (info.primary_color) {
            document.documentElement.style.setProperty(
              "--tenant-primary-color",
              info.primary_color
            );
          }
        } else {
          setError(`Không tìm thấy công ty với mã "${code}"`);
        }
      }
    } catch (err) {
      console.error("Error loading tenant:", err);
      setError("Lỗi khi tải thông tin công ty");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenant();
  }, [isWorkspacePage]);

  const refreshTenant = async () => {
    await loadTenant();
  };

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantCode,
        isLoading,
        error,
        refreshTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
