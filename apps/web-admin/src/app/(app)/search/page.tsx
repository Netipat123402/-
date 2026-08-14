import { getTranslations } from 'next-intl/server';
import GlobalSearch from '@/components/GlobalSearch';

/**
 * หน้าค้นหา (มือถือ) — แยกเป็นหน้าจริงเหมือนไอคอนอื่นบน bottom nav
 * (เดิมเป็น overlay ที่ทับกับไอคอนทรัพย์ ทำให้ดู active ซ้อนกัน)
 * ช่องค้นหาวางในเนื้อหา (กลางค่อนบน) ใช้งานง่ายกว่าชิดขอบบนสุด
 */
export default async function SearchPage() {
  const t = await getTranslations('search');
  return (
    <div className="mx-auto max-w-2xl pt-8 sm:pt-14">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">{t('pageTitle')}</h1>
      <p className="mb-5 text-sm text-muted">{t('pageSubtitle')}</p>
      <GlobalSearch variant="page" />
    </div>
  );
}
