import Link from 'next/link';
import Testimonials from '@/components/Testimonials';
import { ITarget } from '@/components/icons';
import { DEMO_AGENTS } from '@/lib/demo';

// /network — Notify เสา 4 (Agent & Partner Network) · header + pillars + agents + CTA
const NETWORK_TYPES = [
  { title: 'Agent Network', desc: 'A vetted network of professional agents covering every major area, ready to move fast on your behalf.' },
  { title: 'Co-Agent', desc: 'Collaborate on listings and share commission transparently — more reach, more closed deals, less friction.' },
  { title: 'Partners', desc: 'Trusted service partners — legal, finance, valuation, and renovation — to support the full transaction.' },
  { title: 'Developer Partnership', desc: 'Direct relationships with developers for early access to new projects and exclusive inventory.' },
];

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function NetworkPage() {
  return (
    <>
      <section className="wrap py-16 md:py-20">
        {/* header */}
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
              <span className="text-ink">{ITarget}</span>Our Network
            </p>
            <h1 className="mt-4 max-w-[520px] text-[30px] font-medium leading-tight sm:text-[42px]">One network, every connection you need</h1>
          </div>
          <p className="max-w-[420px] text-base leading-relaxed text-body lg:justify-self-end">
            Notify brings agents, co-agents, partners, and developers together — so buying, selling, and investing move faster and with more trust.
          </p>
        </div>

        {/* network types */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {NETWORK_TYPES.map((n) => (
            <div key={n.title} className="rounded-card bg-soft p-6">
              <h3 className="text-xl font-medium text-ink">{n.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{n.desc}</p>
            </div>
          ))}
        </div>

        {/* featured agents */}
        <div className="mt-16">
          <h2 className="text-[26px] font-medium leading-tight sm:text-[34px]">Meet the people behind Notify</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_AGENTS.map((a) => (
              <div key={a.email} className="group">
                <div className="flex aspect-[7/10] items-center justify-center overflow-hidden rounded-card bg-gradient-to-br from-soft to-line">
                  <span className="text-[64px] font-medium text-ink/25">{initials(a.name)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xl font-medium text-ink">{a.name}</h3>
                    <p className="mt-0.5 truncate text-sm text-body">{a.email}</p>
                  </div>
                  <a href={`mailto:${a.email}`} aria-label={`Email ${a.name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition hover:opacity-90">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* join CTA */}
        <div className="mt-16 flex flex-col items-center gap-5 rounded-card bg-black px-6 py-16 text-center text-white md:py-20">
          <h2 className="max-w-[560px] text-[26px] font-medium leading-tight sm:text-[36px]">Grow with the Notify network</h2>
          <p className="max-w-[520px] text-white/80">Are you an agent, partner, or developer? Join a network built on transparency, shared success, and real deals.</p>
          <Link href="/contact" className="mt-1 inline-flex items-center justify-center rounded-pill bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:opacity-90">Join our network</Link>
        </div>
      </section>

      <Testimonials />
    </>
  );
}
