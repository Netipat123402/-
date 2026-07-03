'use client';

import { useLang } from '@/lib/lang';

export default function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center rounded-lg border border-border text-xs">
      {(['th', 'en'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)}
          className={`px-2.5 py-1.5 font-medium uppercase transition ${
            lang === l ? 'rounded-md bg-ink text-white' : 'text-muted hover:text-ink'
          }`}>
          {l}
        </button>
      ))}
    </div>
  );
}
