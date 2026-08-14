export const metadata = { title: 'นโยบายความเป็นส่วนตัว' };

// จัดเป็นหัวข้อย่อย (world-class privacy: สแกนหัวข้อได้ อ่านง่าย) — เลขนำ + หัวข้อทอง + เนื้อกระชับ
const SECTIONS: { n: string; title: string; body: string }[] = [
  { n: '01', title: 'ข้อมูลที่เราเก็บ', body: 'ชื่อ เบอร์โทร และอีเมล เฉพาะเมื่อท่านกรอกแบบฟอร์มนัดดูทรัพย์หรือติดต่อเราเท่านั้น' },
  { n: '02', title: 'วัตถุประสงค์', body: 'ใช้เพื่อติดต่อกลับและให้บริการนายหน้าอสังหาริมทรัพย์เท่านั้น ไม่ใช้เพื่อวัตถุประสงค์อื่น' },
  { n: '03', title: 'สิทธิของคุณ', body: 'เราดำเนินการตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA) และมาตรฐานสากล (GDPR) ท่านมีสิทธิ์เข้าถึง แก้ไข หรือขอลบข้อมูลของท่านได้ตลอดเวลา' },
  { n: '04', title: 'การเก็บรักษาและความปลอดภัย', body: 'ข้อมูลจะถูกเก็บรักษาตามระยะเวลาที่จำเป็นและเข้ารหัสเพื่อความปลอดภัย เราจะไม่เปิดเผยข้อมูลแก่บุคคลภายนอกโดยไม่ได้รับความยินยอม' },
  { n: '05', title: 'ติดต่อ', body: 'สอบถามเรื่องข้อมูลส่วนบุคคลได้ที่ privacy@notify.example' },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">นโยบายความเป็นส่วนตัว</h1>
      <p className="mt-2 text-sm text-muted">เวอร์ชัน 1.0 · ปรับปรุงล่าสุด 2026</p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.n}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gold-dark">{s.n} · {s.title}</h2>
            <p className="mt-2 leading-relaxed text-ink-soft">{s.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
