"use client";

import { NextIntlClientProvider } from "next-intl";
import { ReactNode, useEffect, useState } from "react";
import { defaultLocale, type Locale } from "@/i18n";

interface IntlProviderProps {
  children: ReactNode;
  locale?: Locale;
  messages?: Record<string, any>;
}

export default function IntlProvider({ children, locale, messages }: IntlProviderProps) {
  const [clientMessages, setClientMessages] = useState(messages);
  const [clientLocale, setClientLocale] = useState(locale || defaultLocale);

  useEffect(() => {
    // Get locale from cookie on client side
    const cookieLocale = document.cookie
      .split("; ")
      .find((row) => row.startsWith("locale="))
      ?.split("=")[1] as Locale | undefined;

    if (cookieLocale && cookieLocale !== clientLocale) {
      setClientLocale(cookieLocale);
      // Load messages for the locale
      import(`@/messages/${cookieLocale}.json`)
        .then((mod) => setClientMessages(mod.default))
        .catch(() => {
          // Fallback to default locale
          import(`@/messages/${defaultLocale}.json`).then((mod) =>
            setClientMessages(mod.default)
          );
        });
    }
  }, []);

  if (!clientMessages) {
    return null;
  }

  return (
    <NextIntlClientProvider
      locale={clientLocale}
      messages={clientMessages}
      timeZone="Asia/Ho_Chi_Minh"
    >
      {children}
    </NextIntlClientProvider>
  );
}
