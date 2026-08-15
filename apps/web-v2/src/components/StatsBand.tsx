// Stats band — 3 สถิติคั่นเส้นตั้ง · variant dark (Home) / light (About)
const STATS = [
  { num: '$150M+', label: 'Properties sold', desc: 'Over $150M in sales, helping clients find homes and investments with ease and confidence.' },
  { num: '500+', label: 'Happy clients', desc: 'More than 500 satisfied clients trust us to make their real estate journey smooth and successful.' },
  { num: '20+', label: 'Years of expertise', desc: 'Over 20 years of experience guiding clients with market insight and professional advice.' },
];

export default function StatsBand({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const dark = variant === 'dark';
  const wrapCls = dark ? 'bg-black text-white' : 'bg-surface text-ink';
  const numCls = dark ? 'text-white' : 'text-ink';
  const labelCls = dark ? 'text-white' : 'text-ink';
  const descCls = dark ? 'text-white/80' : 'text-body';
  const divCls = dark ? 'sm:border-white/15' : 'sm:border-line';
  return (
    <section className={wrapCls}>
      <div className="wrap py-14 md:py-[50px]">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-0">
          {STATS.map((s, i) => (
            <div key={s.label} className={i > 0 ? `sm:border-l sm:pl-10 ${divCls}` : 'sm:pr-10'}>
              <p className={`text-[44px] font-medium leading-none sm:text-[54px] ${numCls}`}>{s.num}</p>
              <p className={`mt-4 text-base ${labelCls}`}>{s.label}</p>
              <p className={`mt-2 max-w-[340px] text-sm leading-relaxed ${descCls}`}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
