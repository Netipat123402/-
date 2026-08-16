import { ITarget } from '@/components/icons';

// /investment — Notify เสา 5 (Investment & Development) · PR/coming-soon + ฟอร์มสนใจ (ยังไม่ทำระบบจริง)
const AREAS = [
  { title: 'Investment Property', desc: 'Curated opportunities with clear numbers — yield, location, and growth potential laid out up front.' },
  { title: 'Project Marketing', desc: 'End-to-end marketing for new developments, from positioning to launch and sell-through.' },
  { title: 'Developer Partnership', desc: 'Work with Notify to bring projects to market and reach the right investors and buyers.' },
];

function Field({ label, placeholder, textarea }: { label: string; placeholder: string; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      {textarea ? (
        <textarea rows={4} placeholder={placeholder} className="w-full rounded-lg border border-line bg-soft px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
      ) : (
        <input type="text" placeholder={placeholder} className="h-11 w-full rounded-lg border border-line bg-soft px-3 text-sm text-ink outline-none focus:border-ink" />
      )}
    </label>
  );
}

export default function InvestmentPage() {
  return (
    <section className="wrap py-16 md:py-20">
      {/* header */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            <span className="text-ink">{ITarget}</span>Investment &amp; Development
          </p>
          <div className="mt-4 flex items-center gap-3">
            <h1 className="text-[30px] font-medium leading-tight sm:text-[42px]">Investment, done right</h1>
            <span className="rounded-pill bg-[#f2f4f7] px-3 py-1 text-xs font-medium text-ink">Coming soon</span>
          </div>
        </div>
        <p className="max-w-[420px] text-base leading-relaxed text-body lg:justify-self-end">
          We&rsquo;re building a smarter way to invest in property &mdash; from vetted opportunities to project marketing and developer partnerships. Register your interest to be first in line.
        </p>
      </div>

      {/* areas */}
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {AREAS.map((a) => (
          <div key={a.title} className="rounded-card bg-soft p-6">
            <h3 className="text-xl font-medium text-ink">{a.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-body">{a.desc}</p>
          </div>
        ))}
      </div>

      {/* register interest */}
      <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-24">
          <h2 className="text-[26px] font-medium leading-tight sm:text-[34px]">Register your interest</h2>
          <p className="mt-4 max-w-[420px] text-base leading-relaxed text-body">
            Tell us whether you&rsquo;re an investor or a developer and what you&rsquo;re looking for. We&rsquo;ll reach out as opportunities open up.
          </p>
        </div>
        <form className="space-y-4">
          <Field label="Name" placeholder="Your name*" />
          <Field label="Email" placeholder="Your email*" />
          <Field label="I am a" placeholder="Investor / Developer / Partner" />
          <Field label="Message" placeholder="What are you looking for?" textarea />
          <button type="button" className="rounded-pill bg-ink px-8 py-3 text-[15px] font-semibold text-white transition hover:opacity-90">Register interest</button>
        </form>
      </div>
    </section>
  );
}
