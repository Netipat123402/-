import AboutBenefits from '@/components/AboutBenefits';
import FreshSection from '@/components/FreshSection';
import { ITarget } from '@/components/icons';
import { DEMO_AGENTS } from '@/lib/demo';

// /agent — pixel-clone Findit "Our Agents" · header + agent grid + reuse About + Fresh
// การ์ด agent = monogram block (ไม่มี asset รูปหน้า) + ชื่อ + email + ปุ่มลูกศร
const IArrow = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
);

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function AgentsPage() {
  return (
    <>
      <section className="wrap py-16 md:py-20">
        {/* header */}
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
              <span className="text-ink">{ITarget}</span>Our Agents
            </p>
            <h1 className="mt-4 max-w-[520px] text-[30px] font-medium leading-tight sm:text-[42px]">Meet the experts behind your real estate journey</h1>
          </div>
          <p className="max-w-[420px] text-base leading-relaxed text-body lg:justify-self-end">
            Our agents combine local knowledge, market expertise, and a genuine passion for helping clients find the right property.
          </p>
        </div>

        {/* agent grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_AGENTS.map((a) => (
            <div key={a.email} className="group">
              {/* monogram block (แทนรูปหน้า) */}
              <div className="flex aspect-[7/10] items-center justify-center overflow-hidden rounded-card bg-gradient-to-br from-soft to-line">
                <span className="text-[64px] font-medium text-ink/25">{initials(a.name)}</span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-xl font-medium text-ink">{a.name}</h3>
                  <p className="mt-0.5 truncate text-sm text-body">{a.email}</p>
                </div>
                <a href={`mailto:${a.email}`} aria-label={`Email ${a.name}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition hover:opacity-90">
                  {IArrow}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* reuse sections (Findit ใส่ในหน้า Agents) */}
      <AboutBenefits />
      <FreshSection viewAll />
    </>
  );
}
