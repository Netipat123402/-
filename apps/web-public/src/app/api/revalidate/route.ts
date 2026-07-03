import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/** เทียบความลับแบบ constant-time (sha256 → ความยาวคงที่ กัน length leak/throw) — MR-16 */
function secretMatches(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * On-demand revalidation webhook — API (admin) ยิงมาเมื่อทรัพย์ขึ้น/ลงเว็บ
 * (approve / change-status / sync จากสัญญา) → public cache อัปเดตทันที ไม่ต้องรอ revalidate
 *
 * POST /api/revalidate  header: x-revalidate-secret
 * body: { tag?: string, path?: string }
 */
export async function POST(req: Request) {
  const secret = req.headers.get('x-revalidate-secret');
  // dev fallback เฉพาะนอก production; prod ต้องตั้ง REVALIDATE_SECRET จริง ไม่งั้น reject — MR-16
  const expected = process.env.REVALIDATE_SECRET
    || (process.env.NODE_ENV !== 'production' ? 'dev_revalidate_secret' : '');
  if (!expected || !secret || !secretMatches(secret, expected)) {
    return NextResponse.json({ revalidated: false, error: 'unauthorized' }, { status: 401 });
  }
  let body: { tag?: string; path?: string } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const done: string[] = [];
  if (body.tag) { revalidateTag(body.tag); done.push(`tag:${body.tag}`); }
  if (body.path) { revalidatePath(body.path); done.push(`path:${body.path}`); }
  // ไม่ระบุอะไร → refresh ทรัพย์ทั้งหมด
  if (!body.tag && !body.path) { revalidateTag('public-properties'); done.push('tag:public-properties'); }

  // ทรัพย์เปลี่ยน (ราคา/รายละเอียด/ขึ้น-ลงเว็บ) ต้องล้าง "Full Route Cache" ของหน้า detail ด้วย
  // revalidatePath แบบ path ตรง ๆ ของ dynamic route ล้างไม่ครบ → ใช้ route-pattern ('page') ให้ชัวร์
  // กันคนนอกเปิดหน้าทรัพย์ที่ถอนไปแล้วได้ (stale 200 แทน 404)
  if (body.tag === 'public-properties' || (body.path && body.path.startsWith('/properties/'))) {
    revalidatePath('/properties/[code]', 'page');
    revalidatePath('/properties');
    revalidatePath('/');
    done.push('route:/properties/[code]', 'path:/properties', 'path:/');
  }

  return NextResponse.json({ revalidated: true, now: Date.now(), done });
}
