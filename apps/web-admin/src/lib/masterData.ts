'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth';

/**
 * master-data i18n (C-shared) — จังหวัด/สิ่งอำนวยความสะดวก แปลตาม locale
 *
 * ทำไมแยกจาก catalog (messages/*.json):
 *  - propertyType/leadSource/furnished = enum คงที่ อ้างด้วย code ทั่วแอป → อยู่ใน catalog (t())
 *  - province/amenity = ข้อมูลอ้างอิง data-driven (ขยายได้ · admin เพิ่มแถวใน DB) → คำแปลอยู่ในตัวข้อมูล
 *    API (/public/master-data) คืน labelEn+labelTh มาให้แล้ว → FE แค่เลือกตาม locale (ไม่ต้องแตะ backend)
 *
 * ⚠️ ค่าที่เก็บใน record คงเดิม (flow ไม่ชน):
 *  - จังหวัด: เก็บเป็น "ชื่อไทย" (labelTh) → localize ด้วย provinceLabel (reverse lookup labelTh→labelEn)
 *  - สิ่งอำนวยฯ: เก็บเป็น code → localize ด้วย amenityLabel
 */

export interface MasterItem {
  code: string;
  labelTh: string;
  labelEn: string;
}
type Grouped = Record<string, MasterItem[]>;

export function useMasterData() {
  const { api } = useAuth();
  const locale = useLocale();
  const [data, setData] = useState<Grouped>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const m = await api<Grouped>('/public/master-data');
      setData(m.data ?? {});
    } catch {
      // เดิม consumer catch เงียบ → dropdown ว่างโดยไม่บอก = ดูเหมือน "พัง"
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** ป้ายของ item ตาม locale ปัจจุบัน (fallback อีกภาษาถ้าขาด) */
  const label = useCallback(
    (item: MasterItem) => (locale === 'en' ? item.labelEn || item.labelTh : item.labelTh || item.labelEn),
    [locale],
  );

  /**
   * ตัวเลือกสำหรับ select/combobox
   * @param valueField 'code' (ค่าเริ่มต้น) หรือ 'labelTh' — จังหวัดเก็บเป็น labelTh จึงต้องส่ง value=labelTh (กรอง/บันทึกให้ตรง DB)
   */
  const options = useCallback(
    (category: string, valueField: 'code' | 'labelTh' = 'code') =>
      (data[category] ?? []).map((i) => ({ value: valueField === 'code' ? i.code : i.labelTh, label: label(i) })),
    [data, label],
  );

  /** localize จังหวัดจากค่าที่เก็บใน record (ชื่อไทย) — โหมด TH คืนค่าเดิม · โหมด EN หา labelEn */
  const provinceLabel = useCallback(
    (stored?: string | null): string | undefined => {
      if (!stored) return undefined;
      if (locale !== 'en') return stored;
      const found = (data.province ?? []).find((p) => p.labelTh === stored || p.code === stored);
      return found?.labelEn || stored;
    },
    [data, locale],
  );

  /** localize สิ่งอำนวยความสะดวกจาก code (ไม่พบ → คืน code ดิบ ไม่โชว์ว่าง) */
  const amenityLabel = useCallback(
    (code: string): string => {
      const found = (data.amenity ?? []).find((a) => a.code === code);
      return found ? label(found) : code;
    },
    [data, label],
  );

  return { data, loading, error, reload, label, options, provinceLabel, amenityLabel };
}
