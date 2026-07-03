import GlobalSearch from '@/components/GlobalSearch';

/**
 * หน้าค้นหา (มือถือ) — แยกเป็นหน้าจริงเหมือนไอคอนอื่นบน bottom nav
 * (เดิมเป็น overlay ที่ทับกับไอคอนทรัพย์ ทำให้ดู active ซ้อนกัน)
 * ช่องค้นหาวางในเนื้อหา (กลางค่อนบน) ใช้งานง่ายกว่าชิดขอบบนสุด
 */
export default function SearchPage() {
  return (
    <div className="mx-auto max-w-2xl pt-8 sm:pt-14">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">ค้นหา</h1>
      <p className="mb-5 text-sm text-muted">ทรัพย์ · Lead · ลูกค้า · เจ้าของ — หรือพิมพ์คำสั่งเพื่อไปยังหน้าต่าง ๆ</p>
      <GlobalSearch variant="page" />
    </div>
  );
}
