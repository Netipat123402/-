import FaqAccordion from '@/components/FaqAccordion';
import { ITarget } from '@/components/icons';

// FAQ section (header + รูป + accordion) — reuse About + Contact
export default function FaqSection() {
  return (
    <section className="wrap grid items-start gap-12 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
      <div className="lg:sticky lg:top-24">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
          <span className="text-ink">{ITarget}</span>FAQ
        </p>
        <h2 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">Frequently Asked Questions</h2>
        <p className="mt-4 max-w-[440px] text-base leading-relaxed text-body">Got questions? We&rsquo;ve answered some of the most common ones to guide you through your real estate journey.</p>
        <div className="mt-8 overflow-hidden rounded-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/asset-001.jpg" alt="" className="aspect-[4/3] w-full object-cover" />
        </div>
      </div>
      <FaqAccordion />
    </section>
  );
}
