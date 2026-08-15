// Phase 0 placeholder — ยืนยัน scaffold (Manrope + Tailwind + ปุ่ม pill) ทำงาน
// Phase 1 จะแทนด้วย Home จริง (โคลน Findit + เนื้อหา Notify)
export default function Home() {
  return (
    <main className="wrap flex min-h-screen flex-col items-center justify-center text-center">
      <span className="mb-6 inline-flex items-center gap-2 rounded-pill border border-line px-4 py-2 text-sm font-medium text-body">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-xs font-bold text-white">N</span>
        Notify · web-v2
      </span>
      <h1 className="text-[56px] font-semibold leading-[1.1] sm:text-[72px]">
        Scaffold พร้อมแล้ว
      </h1>
      <p className="mt-4 max-w-md text-muted">
        Manrope + Tailwind + ปุ่ม pill ทำงาน — พร้อมโคลน Findit ทีละหน้า (เนื้อหา Notify · 5 เสา)
      </p>
      <div className="mt-8 flex gap-3">
        <a className="btn-dark" href="#">Explore properties</a>
        <a className="btn-outline" href="#">ฝากทรัพย์</a>
      </div>
    </main>
  );
}
