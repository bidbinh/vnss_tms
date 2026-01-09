import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TenantProvider } from "@/contexts/TenantContext";
import { Toaster } from "sonner";
import IntlProvider from "@/components/providers/IntlProvider";
import { getLocale, getMessages } from "@/lib/getLocale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "9log.tech - Logistics ERP Platform",
  description: "Multi-tenant Logistics ERP Platform for Transportation, Warehousing, and Forwarding",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages(locale);

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <IntlProvider locale={locale} messages={messages}>
          <TenantProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TenantProvider>
        </IntlProvider>
      </body>
    </html>
  );
}
