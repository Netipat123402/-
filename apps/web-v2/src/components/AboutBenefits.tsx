import Link from 'next/link';
import { ITarget, ICheckSm } from '@/components/icons';

// About "Our Benefits" — collage + 3 การ์ดเลข · reuse Home + Agents (Findit ใส่หลายหน้า)
const ABOUT_BENEFITS = [
  { no: '01', title: 'Buy a new home', desc: 'Discover your dream home effortlessly. Explore diverse properties and expert guidance for a seamless buying experience.' },
  { no: '02', title: 'Rent a home', desc: 'Discover your perfect rental effortlessly. Explore a diverse variety of listings tailored precisely to suit your unique lifestyle needs.' },
  { no: '03', title: 'Sell a home', desc: "Sell confidently with expert guidance and effective strategies, showcasing your property's best features for a successful sale." },
];

function Benefit({ label, className }: { label: string; className: string }) {
  return (
    <span className={`absolute inline-flex items-center gap-2 whitespace-nowrap rounded-pill bg-white py-2 pl-2 pr-4 text-[13px] font-normal text-ink shadow-[3px_3px_12px_rgba(0,0,0,0.08)] sm:py-2.5 sm:text-[15px] ${className}`}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-white">{ICheckSm}</span>
      {label}
    </span>
  );
}

export default function AboutBenefits() {
  return (
    <section className="bg-soft">
      <div className="wrap grid items-center gap-14 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
        {/* LEFT — image collage + floating benefit pills */}
        <div className="relative mx-auto w-full max-w-[550px]">
          <div className="relative w-full pb-[150%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/asset-007.jpg" alt="" className="absolute left-[7.5%] top-[10%] h-[80%] w-[85%] rounded-[10px] object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/asset-001.jpg" alt="" className="absolute right-0 top-0 h-[28.5%] w-[45%] rounded-[10px] object-cover shadow-lg" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/asset-004.jpg" alt="" className="absolute bottom-0 left-0 h-[28.5%] w-[45%] rounded-[10px] object-cover shadow-lg" />
            <Benefit label="Trusted Expertise" className="left-[33%] top-[7%]" />
            <Benefit label="Tailored to You" className="left-0 top-[29%]" />
            <Benefit label="Seamless Process" className="left-[54%] top-[40%]" />
            <Benefit label="Strong Market Insights" className="left-0 top-[60%]" />
            <Benefit label="After-Sales Support" className="left-[28%] top-[87%]" />
          </div>
        </div>

        {/* RIGHT — content */}
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            <span className="text-ink">{ITarget}</span>Our Benefits
          </p>
          <h2 className="mt-4 text-[30px] font-medium leading-[1.15] sm:text-[42px]">Building dreams, one home at a time</h2>
          <p className="mt-5 max-w-[520px] text-base leading-relaxed text-body">
            Our mission goes beyond real estate &mdash; it&rsquo;s about guiding you through one of life&rsquo;s biggest milestones with heart, expertise, and unwavering commitment.
          </p>
          <div className="mt-8 space-y-4">
            {ABOUT_BENEFITS.map((b) => (
              <div key={b.no} className="flex gap-4 rounded-[10px] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                <span className="shrink-0 text-[28px] font-medium leading-none text-ink">{b.no}.</span>
                <div>
                  <h3 className="text-[22px] font-medium leading-snug text-ink">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-body">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/about" className="mt-8 inline-flex items-center justify-center rounded-pill bg-ink px-4 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90">More about us</Link>
        </div>
      </div>
    </section>
  );
}
