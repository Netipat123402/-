import { ITarget, IStar } from '@/components/icons';
import { DEMO_TESTIMONIALS } from '@/lib/demo';

// Testimonials "What our clients say" — marquee 2 แถวสวนทาง · reuse Home + About
function TCard({ t }: { t: { title: string; quote: string; name: string } }) {
  const initials = t.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <figure className="flex w-[300px] shrink-0 flex-col rounded-card bg-white p-7 sm:w-[340px]">
      <div className="flex gap-1 text-[#f5a623]">{Array.from({ length: 5 }).map((_, i) => <span key={i}>{IStar}</span>)}</div>
      <p className="mt-4 text-[17px] font-medium text-ink">{t.title}</p>
      <blockquote className="mt-2 text-sm leading-relaxed text-body">&ldquo;{t.quote}&rdquo;</blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/10 text-xs font-semibold text-ink">{initials}</span>
        <span className="text-[15px] text-ink">{t.name}</span>
      </figcaption>
    </figure>
  );
}

export default function Testimonials() {
  return (
    <section className="overflow-hidden bg-soft py-20 md:py-28">
      <div className="wrap text-center">
        <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
          <span className="text-ink">{ITarget}</span>Testimonials
        </p>
        <h2 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">What our clients say</h2>
        <p className="mx-auto mt-4 max-w-[520px] text-base leading-relaxed text-body">
          Real stories from homeowners and investors who trusted us to guide their real estate journey.
        </p>
      </div>
      <div className="mt-14 space-y-6">
        {[DEMO_TESTIMONIALS.slice(0, 4), DEMO_TESTIMONIALS.slice(4, 8)].map((row, ri) => (
          <div key={ri} className="marquee-row group overflow-hidden">
            <div className={`marquee-track flex gap-6 ${ri === 1 ? 'reverse' : ''}`}>
              {[...row, ...row].map((t, i) => <TCard key={i} t={t} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
