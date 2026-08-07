import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

// i18n แบบ cookie-based (ไม่ใช้ URL routing = ไม่แตะ route เดิม → flow ไม่ชน)
// อ่าน locale จาก cookie NEXT_LOCALE · default = อังกฤษ (ภาษาหลัก) · ไทย = ภาษารอง
export const LOCALES = ['en', 'th'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get('NEXT_LOCALE')?.value;
  const locale: Locale = (LOCALES as readonly string[]).includes(raw ?? '') ? (raw as Locale) : DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
