'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLang } from '@/lib/lang';
import { Icon } from '@/components/Icon';
import { clientApiBase as apiBase } from '@/lib/api';

interface Post { id: string; category: string; body: string; displayName: string; publishedAt: string | null; }

const CATS = [
  { v: 'looking_room', th: 'หาห้อง', en: 'Looking for room' },
  { v: 'looking_condo', th: 'หาคอนโด', en: 'Looking for condo' },
  { v: 'for_rent', th: 'ปล่อยเช่า', en: 'For rent' },
  { v: 'looking_tenant', th: 'หาผู้เช่า', en: 'Looking for tenant' },
  { v: 'buy_sell', th: 'ซื้อขาย', en: 'Buy / Sell' },
];

function timeAgo(iso: string | null, lang: string) {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return lang === 'en' ? 'just now' : 'เมื่อสักครู่';
  if (m < 60) return lang === 'en' ? `${m}m ago` : `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'en' ? `${h}h ago` : `${h} ชม.ที่แล้ว`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CommunityBoard() {
  const { lang } = useLang();
  const tt = (th: string, en: string) => (lang === 'en' ? en : th);
  const catLabel = (v: string) => { const c = CATS.find((x) => x.v === v); return c ? tt(c.th, c.en) : v; };

  const [filter, setFilter] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState('looking_room');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const qs = filter ? `?category=${filter}` : '';
      const r = await fetch(`${apiBase()}/public/community${qs}`);
      const j = await r.json();
      setPosts(j.data ?? []);
    } catch { /* */ }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  // ประกาศเรียลไทม์ — รีเฟรชเงียบทุก 30 วิ
  useEffect(() => { const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 5) { setErr(tt('พิมพ์ข้อความอย่างน้อย 5 ตัวอักษร', 'Please type at least 5 characters')); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch(`${apiBase()}/public/community`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat, body: body.trim() }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        throw new Error(j?.error?.message || '');
      }
      setBody(''); setOpen(false); setDone(true);
      setTimeout(() => setDone(false), 6000);
    } catch (e) { setErr((e as Error).message || tt('ส่งไม่สำเร็จ ลองใหม่อีกครั้ง', 'Failed to send, please try again')); }
    finally { setBusy(false); }
  }

  return (
    <section className="mx-auto max-w-content px-4 py-14 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{tt('ชุมชน ROS', 'ROS Community')}</h2>
          <p className="mt-1 text-sm text-muted">{tt('ประกาศหาห้อง · ปล่อยเช่า · ซื้อขาย — โพสต์ได้เลยไม่ต้องสมัคร (ทุกโพสต์ผ่านการอนุมัติก่อนแสดง)', 'Post to find a room, rent out, or trade — no sign-up needed (all posts are reviewed before showing)')}</p>
        </div>
        <button onClick={() => { setOpen((v) => !v); setErr(''); }} className="btn-gold btn-sm">
          <Icon name={open ? 'x' : 'plus'} size={16} /> {open ? tt('ปิด', 'Close') : tt('ตั้งกระทู้', 'New post')}
        </button>
      </div>

      {/* ฟอร์มตั้งกระทู้ — แบบ dropdown (กดเปิด/ปิด) */}
      {open && (
        <form onSubmit={submit} className="card mb-5 space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <button type="button" key={c.v} onClick={() => setCat(c.v)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${cat === c.v ? 'border-ink bg-ink text-white' : 'border-border text-ink-soft hover:border-ink/40'}`}>
                {tt(c.th, c.en)}
              </button>
            ))}
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={500}
            className="field h-auto py-2.5" placeholder={tt('พิมพ์ข้อความ เช่น หาห้อง 1 นอน ใกล้ BTS งบ 15,000…', 'Type your message, e.g. looking for a 1-bed near BTS, budget 15,000…')} />
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{tt('โพสต์แบบไม่ระบุตัวตน', 'Posted anonymously')} · {body.length}/500</span>
            <button className="btn-gold btn-sm" disabled={busy}>{busy ? tt('กำลังส่ง…', 'Sending…') : tt('ส่งโพสต์', 'Submit')}</button>
          </div>
        </form>
      )}

      {done && (
        <div className="mb-5 flex items-center gap-2 rounded-card border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          <Icon name="check" size={16} /> {tt('ส่งโพสต์แล้ว — รอแอดมินอนุมัติก่อนแสดงบนเว็บ', 'Submitted — awaiting admin approval before it appears')}
        </div>
      )}

      {/* ตัวกรองหมวด */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setFilter('')} className={`rounded-full border px-3.5 py-1.5 text-sm transition ${filter === '' ? 'border-ink bg-ink text-white' : 'border-border text-ink-soft hover:border-ink/40'}`}>{tt('ทั้งหมด', 'All')}</button>
        {CATS.map((c) => (
          <button key={c.v} onClick={() => setFilter(c.v)} className={`rounded-full border px-3.5 py-1.5 text-sm transition ${filter === c.v ? 'border-ink bg-ink text-white' : 'border-border text-ink-soft hover:border-ink/40'}`}>{tt(c.th, c.en)}</button>
        ))}
      </div>

      {/* ฟีดประกาศ */}
      {posts.length === 0 ? (
        <p className="card px-6 py-12 text-center text-sm text-muted">{tt('ยังไม่มีประกาศในหมวดนี้ — เป็นคนแรกที่ตั้งกระทู้', 'No posts in this category yet — be the first to post')}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {posts.map((p) => (
            <li key={p.id} className="card p-4">
              <div className="flex items-center gap-2">
                <span className="badge bg-gold/10 text-gold-dark">{catLabel(p.category)}</span>
                <span className="text-xs text-muted">{timeAgo(p.publishedAt, lang)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{p.body}</p>
              <p className="mt-2 text-xs text-muted">— {p.displayName}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
