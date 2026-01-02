"use client";

// TMS module layout - inherits from protected layout
// This layout can be extended later for TMS-specific features

export default function TMSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
