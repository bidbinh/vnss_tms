import { getRequestConfig } from 'next-intl/server';

export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
};

export const localeCodes: Record<Locale, string> = {
  vi: 'VN',
  en: 'EN',
};

export const localeFlags: Record<Locale, string> = {
  vi: '🇻🇳',
  en: '🇬🇧',
};

export const defaultLocale: Locale = 'vi';

export default getRequestConfig(async ({ requestLocale }) => {
  // Get locale from request or use default
  let locale = await requestLocale;

  // Validate locale
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    timeZone: 'Asia/Ho_Chi_Minh',
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
