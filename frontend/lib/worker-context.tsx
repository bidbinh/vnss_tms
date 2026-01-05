"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

// Worker user interface
export interface WorkerUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  job_title?: string;
  workspace_url: string;
}

interface WorkerContextType {
  worker: WorkerUser | null;
  loading: boolean;
  logout: () => void;
  refetch: () => void;
}

const WorkerContext = createContext<WorkerContextType>({
  worker: null,
  loading: true,
  logout: () => {},
  refetch: () => {},
});

export const useWorker = () => useContext(WorkerContext);

// API helper for worker endpoints
async function workerApiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${baseUrl}/api/v1${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  return res.json();
}

interface WorkerProviderProps {
  children: ReactNode;
}

export function WorkerProvider({ children }: WorkerProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [worker, setWorker] = useState<WorkerUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Public pages that don't require auth
  const publicPages = ["/workspace/login", "/workspace/register", "/workspace/invite"];
  const isPublicPage = publicPages.some(p => pathname?.startsWith(p));

  const fetchWorker = async () => {
    try {
      const data = await workerApiFetch<WorkerUser>("/worker/me");
      setWorker(data);
    } catch {
      setWorker(null);
      if (!isPublicPage) {
        router.push("/workspace/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorker();
  }, [pathname]);

  const logout = async () => {
    try {
      await workerApiFetch("/worker/logout", { method: "POST" });
    } catch {}
    setWorker(null);
    router.push("/workspace/login");
  };

  // Show loading while checking auth
  if (loading && !isPublicPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <WorkerContext.Provider value={{ worker, loading, logout, refetch: fetchWorker }}>
      {children}
    </WorkerContext.Provider>
  );
}
