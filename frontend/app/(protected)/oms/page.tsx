"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OMSPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to orders page
    router.push("/oms/orders");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
