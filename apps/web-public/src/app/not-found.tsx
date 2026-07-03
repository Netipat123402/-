import Link from 'next/link';
import type { Metadata } from 'next';

// กัน search engine index หน้า "ไม่พบ" (รวมหน้าทรัพย์ที่ถอนแล้ว) — แก้ soft-404 ด้าน SEO
// (Next 14 คืน HTTP 200 สำหรับ notFound() ในบาง dynamic route → ใช้ noindex แทนการฝืน status)
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** 404 boundary (#11) — Minimal Luxury */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl font-semibold tracking-tight text-gold">404</div>
      <h1 className="mt-2 text-xl font-semibold text-ink">ไม่พบหน้าที่ต้องการ</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        ทรัพย์หรือหน้าที่คุณค้นหาอาจถูกย้ายหรือไม่มีอยู่แล้ว
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-lg bg-gold px-5 text-sm font-medium text-white transition hover:bg-gold-dark"
      >
        กลับหน้าแรก
      </Link>
    </div>
  );
}
