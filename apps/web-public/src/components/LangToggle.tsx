'use client';

import { useLang } from '@/lib/lang';

export default function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5 text-xs">
      {(['th', 'en'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)}
          className={`rounded-md px-2.5 py-1 font-medium uppercase transition ${
            lang === l ? 'bg-ink text-white' : 'text-muted hover:text-ink'
          }`}>
          {l}
        </button>
      ))}
    </div>
  );
}
