import Link from 'next/link';

/** 404 boundary (#11) — Minimal Luxury */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl font-semibold tracking-tight text-gold">404</div>
      <h1 className="mt-2 text-xl font-semibold text-ink">ไม่พบหน้าที่ต้องการ</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        หน้าที่คุณเปิดอาจถูกย้าย ลบ หรือไม่มีอยู่จริง
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-lg bg-gold px-5 text-sm font-medium text-[#1c1b18] transition hover:bg-gold-light"
      >
        กลับหน้าหลัก
      </Link>
    </div>
  );
}
