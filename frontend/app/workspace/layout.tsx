"use client";

import { WorkerProvider } from "@/lib/worker-context";

// Re-export useWorker for backward compatibility
export { useWorker } from "@/lib/worker-context";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkerProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </WorkerProvider>
  );
}
