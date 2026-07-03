# SPEC (Backend) — A1 ขั้นสมบูรณ์: `GET /public/settings`
> เอกสารสเปกให้ทีม API หยิบไปทำ · **ยังไม่แก้โค้ด backend** (อยู่นอกขอบเขต UI-only ของรอบนี้)
> เป้าหมาย: ให้ปุ่ม "ติดต่อ/LINE" + เบอร์/อีเมล บนเว็บลูกค้า ดึงจากค่าที่ตั้งในหน้า `/settings` ได้ — แก้แล้วมีผลทันทีโดย **ไม่ต้อง redeploy** (เลิกพึ่ง env `NEXT_PUBLIC_LINE_URL`)

---

## 1. บริบท / ทำไม
ตอนนี้ (Sprint 0 · A1) ปุ่ม LINE/ติดต่อผูกกับ env `NEXT_PUBLIC_LINE_URL` → เปลี่ยนทีต้อง redeploy.
ข้อมูลจริงอยู่ใน DB แล้ว: ตาราง `setting` คีย์ `company.contact` = `{ phone, email, lineOaId }` (ตั้งได้จากหน้า `/settings` ฝั่ง admin)
แต่ยัง **ไม่มี public endpoint** ให้เว็บลูกค้าอ่าน (มีแต่ `GET /settings` ที่ auth-gated `@RequirePermission('setting','read')`)

> หลักฐานโค้ด: `apps/api/src/modules/settings/settings.module.ts` (`@Controller('settings')`, auth-gated) · `settings.service.ts` (`prisma.setting.findMany`) · `apps/api/src/modules/public/public.controller.ts` (`@Public()` + `@Throttle`)

---

## 2. ขอบเขต (ทำ / ไม่ทำ)
**ทำ:** เพิ่ม endpoint อ่านอย่างเดียว เปิดสาธารณะ คืนเฉพาะ setting ที่ "ปลอดภัยต่อสาธารณะ"
**ไม่ทำ / ห้าม:** ไม่แตะ auth, ไม่เพิ่มสิทธิ์เขียน, **ไม่เปิดเผยคีย์ภายใน** (`retention.policy`, `privacy.consent_version`, อื่น ๆ) — whitelist เท่านั้น

---

## 3. API Contract

### Request
```
GET /api/v1/public/settings
```
- ไม่มี auth (`@Public()`), rate-limit ตามแนว public อื่น: `@Throttle({ default: { limit: 60, ttl: 60_000 } })`

### Response 200 (envelope เดิมของระบบ: `{ data, meta? }`)
```json
{
  "data": {
    "company": {
      "name": { "th": "ROS Real Estate", "en": "ROS Real Estate" },
      "contact": { "phone": "02-xxx-xxxx", "email": "hello@ros.co.th", "lineUrl": "https://line.me/R/ti/p/@ros" }
    }
  }
}
```
- ฟิลด์ที่ไม่มีค่า → คืน `null`/ละเว้น (อย่าคืน object ดิบทั้งก้อนจาก DB)
- `lineUrl`: ประกอบจาก `lineOaId` ฝั่ง server (เช่น `https://line.me/R/ti/p/${lineOaId}`) หรือคืน `lineOaId` ดิบให้ frontend ประกอบ — เลือกอย่างใดอย่างหนึ่งแล้ว doc ให้ชัด

### Errors
- ไม่มี setting เลย → คืน `{ data: { company: { name: null, contact: null } } }` (200, ไม่ใช่ 404) เพื่อ frontend fallback ง่าย

---

## 4. Whitelist (สำคัญด้านความปลอดภัย)
Server ต้อง **hardcode คีย์ที่อนุญาต** — ห้ามคืน setting ตาม query ของ client
```ts
const PUBLIC_SETTING_KEYS = ['company.name', 'company.contact'] as const;
// ห้ามมี: retention.policy, privacy.consent_version, หรือคีย์อื่นใด
```
+ ภายใน `company.contact` คืนเฉพาะ field ที่ตั้งใจเปิด (`phone`, `email`, `lineOaId`) — อย่า spread ทั้ง object เผื่อมี field ภายในปนมาในอนาคต

---

## 5. Implementation sketch (อ้างอิงโครงที่มีอยู่)

### 5.1 `public.service.ts` — เพิ่มเมธอด
```ts
async publicSettings() {
  const rows = await this.prisma.setting.findMany({
    where: { key: { in: ['company.name', 'company.contact'] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value as Record<string, unknown>]));
  const name = (map['company.name'] ?? {}) as { th?: string; en?: string };
  const c = (map['company.contact'] ?? {}) as { phone?: string; email?: string; lineOaId?: string };
  return {
    company: {
      name: { th: name.th ?? null, en: name.en ?? null },
      contact: {
        phone: c.phone ?? null,
        email: c.email ?? null,
        lineUrl: c.lineOaId ? `https://line.me/R/ti/p/${c.lineOaId}` : null,
      },
    },
  };
}
```

### 5.2 `public.controller.ts` — เพิ่ม route
```ts
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Get('settings')
settings() {
  return this.service.publicSettings();
}
```

### 5.3 ISR invalidation (ให้แก้แล้วเห็นทันที)
- ระบบมี `RevalidationModule` ที่ยิง `revalidateTag` ตอน publish/ถอนทรัพย์ (เว็บ public ใช้ `PUBLIC_PROPERTIES_TAG`) — ทำแบบเดียวกัน
- เพิ่ม tag `public-settings`; ใน `SettingsService.update()` (หลัง `prisma.setting.update`) ถ้า key เป็นคีย์ public → trigger revalidate `public-settings`
- ปลายทาง revalidate = endpoint บน `web-public` `app/api/revalidate/route.ts` (มีอยู่แล้ว) — ส่ง tag เพิ่ม

---

## 6. Frontend wiring (web-public) — หลัง endpoint พร้อม
1. `lib/api.ts`: เพิ่ม `PUBLIC_SETTINGS_TAG = 'public-settings'` + type `PublicSettings`
2. ดึงใน **server layout** (`app/layout.tsx` เป็น server component อยู่แล้ว):
   ```ts
   const s = await publicGet<PublicSettings>('/public/settings', 300, [PUBLIC_SETTINGS_TAG]);
   const lineUrl = s.data?.company?.contact?.lineUrl || 'https://line.me';
   ```
3. ส่ง `lineUrl`/contact ลงไปยัง `Header` / `StickyCTA` / `Footer` ผ่าน prop หรือ context เล็ก ๆ (เพราะเป็น client components)
4. **ลบการพึ่ง env `NEXT_PUBLIC_LINE_URL`** ใน `lib/api.ts` (`LINE_URL`) — แทนด้วยค่าจาก settings (คง env เป็น fallback สุดท้ายได้)
> หมายเหตุ: ขั้นนี้แตะเฉพาะ web-public (UI layer) — ทำได้หลัง endpoint มีจริง

---

## 7. Test plan
- **Unit (service):** whitelist เฉพาะ 2 คีย์ · field ภายในไม่หลุด · setting ว่าง → null
- **e2e/manual:** `curl /api/v1/public/settings` คืน company.name/contact เท่านั้น (ไม่มี retention/consent) · rate-limit 60/min ทำงาน
- **Integration:** แก้ `company.contact.lineOaId` ในหน้า `/settings` → ปุ่ม LINE บนเว็บลูกค้าเปลี่ยนภายใน ≤ revalidate window (หรือทันทีถ้า tag invalidation ทำงาน)
- **Security check:** ยืนยัน endpoint ไม่คืนคีย์อื่น แม้จะมี setting เพิ่มในอนาคต (เพราะ whitelist hardcode)

## 8. Acceptance criteria
- [ ] `GET /public/settings` สาธารณะ + throttled + คืนเฉพาะ whitelist
- [ ] ไม่มีข้อมูลภายในรั่ว (retention/consent/อื่น ๆ)
- [ ] แก้ LINE/เบอร์จากหน้า settings → เว็บลูกค้าเห็นโดยไม่ต้อง redeploy
- [ ] web-public เลิก hardcode/พึ่ง env สำหรับ LINE (มี fallback ปลอดภัย)

## 9. ความเสี่ยง / ขนาดงาน
- **ขนาด:** เล็ก (1 service method + 1 route + 1 frontend wiring) · **ความเสี่ยง:** ต่ำ (read-only, whitelist, ไม่แตะ auth/write)
- **ระวัง:** อย่า spread `setting.value` ทั้งก้อน · อย่าใช้ key จาก query · คง fallback ฝั่ง frontend กัน endpoint ล่ม
