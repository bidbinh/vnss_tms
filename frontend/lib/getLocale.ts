import { cookies } from "next/headers";
import { defaultLocale, locales, type Locale } from "@/i18n";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale");
  const locale = localeCookie?.value as Locale | undefined;

  if (locale && locales.includes(locale)) {
    return locale;
  }

  return defaultLocale;
}

export async function getMessages(locale: Locale) {
  try {
    return (await import(`@/messages/${locale}.json`)).default;
  } catch {
    return (await import(`@/messages/${defaultLocale}.json`)).default;
  }
}
