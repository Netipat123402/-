'use client';

import { useState } from 'react';
import { DEMO_FAQ } from '@/lib/demo';

// FAQ accordion (About) — เปิดทีละข้อ · ข้อแรกเปิด default
export default function FaqAccordion() {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-line border-y border-line">
      {DEMO_FAQ.map((f, i) => {
        const on = open === i;
        return (
          <div key={f.q}>
            <button
              type="button"
              onClick={() => setOpen(on ? -1 : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
              aria-expanded={on}
            >
              <span className="text-base font-medium text-ink">{f.q}</span>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center text-ink transition-transform ${on ? 'rotate-45' : ''}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              </span>
            </button>
            {on && <p className="-mt-1 pb-5 pr-10 text-sm leading-relaxed text-body">{f.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
