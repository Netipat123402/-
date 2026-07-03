# ROS — Security Audit (ฉบับสมบูรณ์)

> ผู้ตรวจ (จำลองบทบาท): **Principal Security Engineer · Senior AppSec Engineer · DevSecOps · Penetration Tester**
> วิธีตรวจ: อ่าน source code **ทั้งหมดทุกไฟล์/โฟลเดอร์** (apps/api, apps/web-admin, apps/web-public, db, infra, ควบคุมระบบ) + grep เชิงความปลอดภัย
> หลักการ: **ใช้ข้อมูลจริงจาก source เท่านั้น** — ทุก finding อ้างไฟล์/ฟังก์ชัน/module + มีตัวอย่างโค้ดแก้ + วิธีทดสอบ
> เอกสารนี้แทนที่ฉบับย่อเดิม

---

## Security Score

```
  ████████████████████████████████████░░░░░░░░░  72 / 100
```

| | |
|---|---|
| **Security Score** | **72 / 100** |
| **Critical** | 0 |
| **High** | 1 |
| **Medium** | 5 |
| **Low** | 7 |
| **สรุป** | รากฐาน auth/crypto/RBAC/injection แข็งแรงมาก — คะแนนถูกดึงลงโดย **file-upload (stored XSS)**, **ไม่มี HTTP security headers**, และ **config-secret gaps** (REVALIDATE_SECRET, PII dev-key) |

**เหตุผลที่ไม่มี Critical:** ไม่พบ auth bypass / RCE / SQLi / secret committed / IDOR ที่เปิดข้อมูลข้าม tenant — ความเสี่ยง secret อ่อนถูก gate ด้วย `env.validation` (fail-fast ตอนบูต prod) ครบ ยกเว้น `REVALIDATE_SECRET` (→ SEC-003)

---

## Risk Matrix

```
ผลกระทบ →     Low          Medium            High
Likelihood ↓
  High      SEC-008      SEC-002 SEC-006     SEC-001
  Medium    SEC-007      SEC-003 SEC-004
            SEC-009      SEC-005
  Low       SEC-010
            SEC-011
            SEC-012
            SEC-013
```

| ID | ชื่อ | Severity | Likelihood | Impact |
|---|---|---|---|---|
| SEC-001 | File upload → Stored XSS | **High** | High | High |
| SEC-002 | ไม่มี HTTP security headers | Medium | High | Medium |
| SEC-003 | REVALIDATE_SECRET ไม่ enforce prod | Medium | Medium | Medium |
| SEC-004 | Document download `inline` | Medium | Medium | Medium |
| SEC-005 | JWT เพิกถอนก่อนหมดอายุไม่ได้ | Medium | Medium | Medium |
| SEC-006 | PII dev-key fallback + hardcoded secrets | Medium | High | Medium |
| SEC-007 | CORS dev reflect-any + credentials | Low | Medium | Low |
| SEC-008 | Public form ไม่มี CAPTCHA | Low | High | Low |
| SEC-009 | CSRF token ไม่มี (cookie endpoints) | Low | Medium | Low |
| SEC-010 | Cookie ไม่ sign | Low (info) | Low | Low |
| SEC-011 | `author_ip` ไม่มี retention | Low | Low | Low |
| SEC-012 | Login DTO MinLength(6) ≠ policy 8 | Low | Low | Low |
| SEC-013 | Seed admin default credential | Low | Low | Medium |

---

## ✅ Strengths (ยืนยันจาก source — ทำถูกต้องแล้ว ไม่ต้องแก้)

| ด้าน | หลักฐาน |
|---|---|
| **SQL/NoSQL Injection** | Prisma parameterized 100%; มีแค่ `$queryRaw\`SELECT 1\`` (`health.controller.ts`); **ไม่มี** `$queryRawUnsafe/$executeRawUnsafe`, ไม่มี MongoDB |
| **Command Injection / RCE** | **ไม่มี** `child_process/exec/spawn/eval/new Function` ทั้ง codebase |
| **XSS (reflected/DOM)** | **ไม่มี** `dangerouslySetInnerHTML/innerHTML`; React escape อัตโนมัติ; receipt HTML escape ครบ (`receipt.template.ts esc()`) |
| **SSRF** | outbound fetch จุดเดียว = `RevalidationService` ยิงไป URL จาก **config** (`WEB_PUBLIC_REVALIDATE_URL`) ไม่ใช่ user input |
| **Open Redirect** | ไม่มี redirect ที่รับ URL จากผู้ใช้ (`window.location.href` ใน contract = path คงที่ + id จาก server) |
| **Path Traversal** | `document.controller.ts download()` ใช้ `normalize()` + เช็ค `startsWith(uploadsDir)` ก่อน stream |
| **IDOR** | ทุก mutation ตรวจ scope+ownership (`requireInScope`, `updateMany where {id, propertyId}` ที่ media/customer/owner); `:id` ทุกตัวใช้ `ParseUUIDPipe` |
| **AuthZ** | RBAC 2 ชั้น + `NEVER_MATCH` กัน null-leak + `ROLE_RANK` กัน privilege escalation + audit visibility (non-super ไม่เห็น action ของ super) |
| **Auth** | JWT 15 นาที + refresh rotation + **reuse detection** (revoke family) + lockout 5/15min + no-enumeration |
| **Password** | scrypt + `timingSafeEqual`; policy regex `≥8 + ตัวอักษร + ตัวเลข`, cap 128 (กัน DoS); revoke tokens เมื่อ reset/suspend |
| **PII** | AES-256-GCM (authenticated) + mask; key prod-enforced (hex 64) |
| **Secrets in git** | `.gitignore` ครอบ `.env*` (เก็บ `.env.example`) + `uploads/`; `.env.example` มีแต่ dev default ไม่มี secret จริง |
| **Sensitive logging** | **ไม่มี** log password/token/idCard/secret |
| **Mass assignment** | `ValidationPipe({whitelist, forbidNonWhitelisted, transform})` global |
| **Audit integrity** | `audit_logs` immutable ด้วย DB trigger (`0006`) |

---

# Findings

## 🟠 HIGH

### SEC-001 — Unrestricted File Upload (เชื่อ MIME จาก client + ไม่ตรวจ magic-byte) + เสิร์ฟ static → Stored XSS

**1. ระดับความรุนแรง:** 🟠 **High** (OWASP A05 / A03 — Stored XSS / content-type confusion)

**2. หลักฐาน**
- ไฟล์/ฟังก์ชัน: `apps/api/src/modules/property/property.controller.ts` → `uploadMedia` (multer `fileFilter`, บรรทัด 102) · `apps/api/src/modules/document/document.controller.ts` → `uploadFile` (บรรทัด 40) · `apps/api/src/main.ts` → `useStaticAssets(uploads/properties, '/uploads/properties/')` (บรรทัด 33)
- Module: Property, Document, Bootstrap
- โค้ดจริง: `fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype))` — กรองด้วย `file.mimetype` ที่ **client ประกาศมาเอง** (multer อ่านจาก Content-Type/extension ไม่ใช่ magic-byte); ชื่อไฟล์ = `randomUUID()+extname(originalname)` (นามสกุลจาก client)

**3. ผลกระทบ:** ผู้มีสิทธิ์ `property:update`/`document:upload` อัปโหลด `.svg`/`.html` ที่มีสคริปต์ พร้อม `Content-Type: image/svg+xml` → ผ่าน filter → ถูกเสิร์ฟ static ที่ `/uploads/properties/<uuid>.svg` → เปิด URL = สคริปต์รันบน origin `:4000`. *ลดทอน:* origin `:4000` แยกจาก web-admin `:3001`/web-public `:3000` และ refresh cookie httpOnly+path-scoped → ขโมย token ตรง ๆ ยาก; แต่ยังใช้ phishing/แชร์ลิงก์อันตราย/defacement ได้

**4. วิธีแก้ไข:** ตรวจ **magic-byte** จริง (ไม่เชื่อ mimetype จาก client) + บล็อก SVG/HTML + เพิ่ม header `X-Content-Type-Options: nosniff` (ดู SEC-002) + (ระยะยาว) เสิร์ฟ upload จาก object storage คนละ domain

**5. ตัวอย่างโค้ดแก้** (เพิ่ม validation หลัง multer เขียนไฟล์ — ตรวจ magic-byte ด้วย `file-type`):
```ts
// modules/property/property.controller.ts (uploadMedia) — ตรวจ magic-byte หลังรับไฟล์
import { fileTypeFromFile } from 'file-type';
import { unlink } from 'node:fs/promises';

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp']); // ตัด svg ออก

// ...ใน handler หลังได้ file:
const abs = join(__dirname, '..','..','..','uploads','properties', file.filename);
const ft = await fileTypeFromFile(abs);            // อ่าน magic-byte จริง
if (!ft || !ALLOWED_IMAGE.has(ft.mime)) {
  await unlink(abs).catch(() => undefined);        // ลบไฟล์ที่ไม่ผ่าน
  throw new BadRequestException('ไฟล์ต้องเป็นรูป jpg/png/webp เท่านั้น');
}
```
และที่ `main.ts` เพิ่ม header กัน sniff + บังคับ download type:
```ts
app.useStaticAssets(join(uploadsDir, 'properties'), {
  prefix: '/uploads/properties/',
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
});
```

**6. วิธีทดสอบหลังแก้**
```bash
# 1) อัปโหลด SVG ปลอมเป็น image → ต้องถูกปฏิเสธ 400
printf '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' > x.svg
curl -i -H "Authorization: Bearer $TOKEN" -F "file=@x.svg;type=image/png" \
  http://localhost:4000/api/v1/properties/$PID/media
# คาดหวัง: HTTP 400 "ไฟล์ต้องเป็นรูป..."

# 2) อัปโหลด jpg จริง → 201 และ response header มี X-Content-Type-Options: nosniff ตอนเปิดรูป
curl -i http://localhost:4000/uploads/properties/<uuid>.jpg | grep -i nosniff
```

---

## 🟡 MEDIUM

### SEC-002 — ไม่มี HTTP Security Headers (helmet/CSP/nosniff/X-Frame-Options/HSTS)

**1. ระดับ:** 🟡 **Medium** (OWASP A05) — ขยายความเสี่ยง SEC-001

**2. หลักฐาน**
- ไฟล์: `apps/api/src/main.ts` (bootstrap) — ไม่มี `helmet`/header กลาง; grep `helmet|Content-Security-Policy|Strict-Transport|X-Frame-Options|X-Content-Type` = **ว่างทั้ง 3 แอป**
- Module: Bootstrap (api) + Next config (ทั้งสองเว็บไม่มี `headers()`)

**3. ผลกระทบ:** ไม่มี `X-Content-Type-Options: nosniff` → เบราว์เซอร์ sniff content-type (ขยาย SEC-001); ไม่มี `X-Frame-Options/CSP frame-ancestors` → **clickjacking** หน้า web-admin (ทำธุรกรรมได้); ไม่มี CSP → ลด defense-in-depth ต่อ XSS; ไม่มี HSTS → เสี่ยง downgrade

**4. วิธีแก้ไข:** เพิ่ม `helmet` ที่ api + `headers()` ใน Next ทั้งสองเว็บ

**5. ตัวอย่างโค้ดแก้**
```ts
// apps/api/src/main.ts
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"] } },
  crossOriginResourcePolicy: { policy: 'same-site' },
}));
```
```js
// apps/web-admin/next.config.js (และ web-public)
async headers() {
  return [{ source: '/:path*', headers: [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  ]}];
}
```

**6. วิธีทดสอบ**
```bash
curl -sI http://localhost:4000/api/v1/health | grep -iE 'x-frame-options|x-content-type|content-security'
curl -sI http://localhost:3001/ | grep -i x-frame-options    # คาดหวัง DENY
```

---

### SEC-003 — `REVALIDATE_SECRET` ไม่ถูกบังคับใน production + default fallback + เทียบแบบ non-constant-time

**1. ระดับ:** 🟡 **Medium** (OWASP A05/A08)

**2. หลักฐาน**
- ไฟล์/ฟังก์ชัน: `apps/api/src/config/env.validation.ts` → `superRefine` (บรรทัด 33-52) **ไม่ตรวจ** `REVALIDATE_SECRET` (มีแค่ default `'dev_revalidate_secret'` บรรทัด 31) · `apps/web-public/src/app/api/revalidate/route.ts` → `POST` (บรรทัด 13-14) `const expected = process.env.REVALIDATE_SECRET || 'dev_revalidate_secret'; if (secret !== expected)` · `apps/api/src/common/revalidation/revalidation.service.ts` (บรรทัด 18) fallback เดียวกัน
- Module: Config, Revalidation, web-public route

**3. ผลกระทบ:** ถ้า prod ลืมตั้ง `REVALIDATE_SECRET` → ใช้ค่า default ที่อยู่ใน source สาธารณะ → ผู้โจมตียิง `POST /api/revalidate` ได้ → บังคับ cache churn (DoS เบาต่อ Next.js). เทียบ `!==` ไม่ constant-time (timing leak ต่ำ)

**4. วิธีแก้ไข:** เพิ่ม `REVALIDATE_SECRET` เข้า prod `superRefine` (บังคับ ≠ default) + เทียบด้วย `timingSafeEqual`

**5. ตัวอย่างโค้ดแก้**
```ts
// config/env.validation.ts (ใน superRefine, prod เท่านั้น)
if (weak(cfg.REVALIDATE_SECRET)) {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['REVALIDATE_SECRET'],
    message: 'production ต้องตั้ง REVALIDATE_SECRET เป็นค่าลับจริง' });
}
```
```ts
// web-public/src/app/api/revalidate/route.ts — constant-time compare
import { timingSafeEqual } from 'node:crypto';
const a = Buffer.from(secret ?? ''); const b = Buffer.from(expected);
if (a.length !== b.length || !timingSafeEqual(a, b)) {
  return NextResponse.json({ revalidated: false }, { status: 401 });
}
```

**6. วิธีทดสอบ**
```bash
# prod boot โดยไม่ตั้ง REVALIDATE_SECRET → แอปต้องไม่บูต (fail-fast)
NODE_ENV=production REVALIDATE_SECRET= npm run start:prod   # คาดหวัง: Invalid environment variables
# ยิง webhook ด้วย secret ผิด → 401
curl -i -X POST -H "x-revalidate-secret: wrong" http://localhost:3000/api/revalidate
```

---

### SEC-004 — Document download ใช้ `Content-Disposition: inline` (HTML/SVG render ในเบราว์เซอร์)

**1. ระดับ:** 🟡 **Medium** (OWASP A03/A05)

**2. หลักฐาน**
- ไฟล์/ฟังก์ชัน: `apps/api/src/modules/document/document.controller.ts` → `download()` (บรรทัด 77-81) `res.set({ 'Content-Type': f.mimeType, 'Content-Disposition': 'inline; filename*=...' })` แล้ว `StreamableFile` · document `fileFilter` อนุญาต `image/*` (รวม `image/svg+xml`)
- Module: Document

**3. ผลกระทบ:** เอกสาร HTML/SVG ที่อัปโหลด → ดาวน์โหลด `inline` → render/รันสคริปต์ในเบราว์เซอร์ origin `:4000` (จำกัดด้วย auth+scope `document:download`). receipt ของระบบ escape แล้ว — เสี่ยงที่ไฟล์ผู้ใช้อัปเอง

**4. วิธีแก้ไข:** บังคับ `attachment` สำหรับชนิดที่ render ได้ (หรือทั้งหมด) + nosniff

**5. ตัวอย่างโค้ดแก้**
```ts
// document.controller.ts download()
const renderable = /^(text\/html|image\/svg)/.test(f.mimeType);
res.set({
  'Content-Type': renderable ? 'application/octet-stream' : f.mimeType,
  'X-Content-Type-Options': 'nosniff',
  'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(f.fileName)}`,
});
```

**6. วิธีทดสอบ**
```bash
curl -sI -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/documents/$DOC/download | grep -i 'content-disposition'
# คาดหวัง: attachment; ... (ไม่ใช่ inline)
```

---

### SEC-005 — Access Token (JWT) เพิกถอนก่อนหมดอายุไม่ได้ (stateless)

**1. ระดับ:** 🟡 **Medium** (OWASP A07)

**2. หลักฐาน**
- ไฟล์/ฟังก์ชัน: `common/auth/jwt-auth.guard.ts` → `canActivate` (verify JWT stateless) · `modules/auth/token.service.ts` → `verifyAccessToken` · revoke ทำได้เฉพาะ refresh (`revokeRefreshToken`, `rotateRefreshToken`)
- Module: Auth

**3. ผลกระทบ:** access token รั่ว → ใช้ได้จน exp (15 นาที) แม้ admin suspend/แก้สิทธิ์แล้ว. *ลดทอน:* permission โหลดสดทุก request (`getAuthContext`, cache 30s) → สิทธิ์ที่ถูกตัดมีผลภายใน ~30 วินาที แต่ตัว identity ยังผ่านถ้า user ยัง active

**4. วิธีแก้ไข:** เพิ่ม `tokenVersion` ใน user + ใส่ใน JWT payload → guard เทียบ; bump version เมื่อ suspend/logout-all (revoke ทันที) — คงความ stateless ส่วนใหญ่ (เช็คเฉพาะตอน cache miss ใน getAuthContext)

**5. ตัวอย่างโค้ดแก้**
```prisma
// schema.prisma — User
tokenVersion Int @default(0) @map("token_version")
```
```ts
// token.service.signAccessToken: payload += { tv: user.tokenVersion }
// users.service.getAuthContext: ตรวจ payload.tv === user.tokenVersion (ถ้าไม่ตรง → คืน null = 401)
// user.service.update (suspend/logout-all): tokenVersion: { increment: 1 } + invalidateAuth(id)
```

**6. วิธีทดสอบ**
```bash
# login → ได้ access token; admin suspend user; เรียก /auth/me ด้วย token เดิม → 401 ภายใน ~30s
curl -i -H "Authorization: Bearer $OLD" http://localhost:4000/api/v1/auth/me
```

---

### SEC-006 — PII encryption ใช้ dev-key fallback (idCard ถอดได้ใน non-prod) + hardcoded dev secrets ใน source

**1. ระดับ:** 🟡 **Medium** (OWASP A02)

**2. หลักฐาน**
- ไฟล์/ฟังก์ชัน: `common/crypto/crypto.service.ts` → `resolveKey()` (บรรทัด 44) `createHash('sha256').update('ros_dev_pii_key_change_me').digest()` เมื่อ `PII_ENCRYPTION_KEY` ไม่ถูกตั้ง · dev secrets ใน source: `env.validation.ts:16-17,31` (JWT/REVALIDATE defaults), `seed/seed.ts:33` (`ChangeMe!2026`)
- Module: Crypto, Config, Seed

**3. ผลกระทบ:** ใน dev/staging ที่ `NODE_ENV≠production` แล้วมีข้อมูลจริง → `id_card_no` ถูกเข้ารหัสด้วยคีย์ที่ derive จาก string คงที่ใน source สาธารณะ → ใครมี DB dump ถอด idCard ได้ทั้งหมด. *prod ปลอดภัย* (env.validation บังคับ hex 64)

**4. วิธีแก้ไข:** บังคับ `PII_ENCRYPTION_KEY` ใน **staging ด้วย** (ไม่ใช่เฉพาะ production) + ไม่ derive จาก constant (ให้ fail ถ้าไม่มี key ในทุก env ที่มีข้อมูลจริง)

**5. ตัวอย่างโค้ดแก้**
```ts
// env.validation.ts — ขยายเงื่อนไขจาก production → ['production','staging']
if (['production','staging'].includes(cfg.NODE_ENV)) {
  if (!cfg.PII_ENCRYPTION_KEY || !/^[0-9a-fA-F]{64}$/.test(cfg.PII_ENCRYPTION_KEY)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['PII_ENCRYPTION_KEY'], message: '...' });
  }
}
```
```ts
// crypto.service.resolveKey — โยน error แทน fallback ถ้าไม่ใช่ dev จริง
if (this.config.get('NODE_ENV') !== 'development')
  throw new Error('PII_ENCRYPTION_KEY ต้องตั้งในทุก env ที่ไม่ใช่ development');
```

**6. วิธีทดสอบ**
```bash
NODE_ENV=staging PII_ENCRYPTION_KEY= npm run start:prod   # คาดหวัง: ไม่บูต
```

---

## 🟢 LOW

### SEC-007 — CORS ใน dev สะท้อนทุก origin พร้อม credentials
- **Severity:** Low (A05) · **หลักฐาน:** `main.ts:59` `enableCors({ origin: isProd ? origins : true, credentials: true })`; module Bootstrap · **ผลกระทบ:** เว็บอันตรายเรียก `:4000` credentialed จากเบราว์เซอร์ dev (prod ใช้ allowlist + env บังคับไม่มี localhost)
- **แก้:** จำกัด dev เป็น allowlist LAN เฉพาะ:
```ts
const devAllow = [/^http:\/\/localhost:300[01]$/, /^http:\/\/192\.168\.\d+\.\d+:300[01]$/];
app.enableCors({ origin: isProd ? origins : (o, cb) => cb(null, !o || devAllow.some(r=>r.test(o))), credentials: true });
```
- **ทดสอบ:** `curl -i -H "Origin: http://evil.com" http://localhost:4000/api/v1/health` → ไม่มี `Access-Control-Allow-Origin: http://evil.com`

### SEC-008 — Public form ไม่มี CAPTCHA (lead/community spam)
- **Severity:** Low (A04) · **หลักฐาน:** `public.controller.ts:44,51` (lead/contact 5/min), `community.module.ts:57` (5/min) — มีแค่ throttle/IP + banned-words; module Public/Community · **ผลกระทบ:** bot หมุน IP สแปม lead/โพสต์ (โพสต์ผ่าน moderation ก่อนแสดง)
- **แก้:** เพิ่ม CAPTCHA (เช่น Turnstile) ตรวจ token ที่ controller:
```ts
const ok = await verifyTurnstile(dto.captchaToken, req.ip); // เรียก siteverify
if (!ok) throw new BadRequestException('ยืนยันว่าไม่ใช่บอทไม่สำเร็จ');
```
- **ทดสอบ:** ยิง `POST /public/leads` โดยไม่มี/captcha ปลอม → 400

### SEC-009 — CSRF token ไม่มีบน cookie endpoints
- **Severity:** Low (A01) · **หลักฐาน:** `/auth/refresh`,`/auth/logout` ใช้ cookie `ros_rt`; mutation อื่นใช้ Bearer; module Auth · **ผลกระทบ:** ต่ำมาก — `sameSite=strict` บล็อก cross-site แล้ว + ผลแค่ refresh/logout
- **แก้:** คง `sameSite=strict` (เพียงพอ); ถ้าต้องรองรับ cross-site ในอนาคต ใช้ double-submit CSRF token
- **ทดสอบ:** จำลอง cross-site form POST → เบราว์เซอร์ไม่แนบ cookie (sameSite=strict)

### SEC-010 — Cookie ไม่ถูก sign (cookieParser ไม่มี secret)
- **Severity:** Low (info) · **หลักฐาน:** `main.ts:23` `app.use(cookieParser())` ไม่มี secret → `ros_rt` ไม่ signed; module Bootstrap · **ผลกระทบ:** ต่ำ — token เป็น opaque + ตรวจกับ hash ใน DB (แก้ token = ไม่เจอใน DB = ปฏิเสธ) จึง integrity ไม่พึ่ง cookie signing
- **แก้:** (ทางเลือก) `app.use(cookieParser(process.env.COOKIE_SECRET))` ถ้าจะใช้ signed cookie ในอนาคต
- **ทดสอบ:** แก้ค่า cookie `ros_rt` มั่ว → `POST /auth/refresh` → 401 (ปัจจุบันก็ปฏิเสธอยู่แล้ว)

### SEC-011 — `community_posts.author_ip` ไม่มี retention policy
- **Severity:** Low (A02/PDPA) · **หลักฐาน:** `community.module.ts:65` `authorIp: req.ip`; ตาราง `community_posts`; module Community · **ผลกระทบ:** IP = personal data ตาม PDPA เก็บไม่จำกัดเวลา
- **แก้:** เพิ่ม job ลบ `author_ip` ของโพสต์ที่ published/rejected เกิน N วัน (สอดคล้อง `retention.policy` ใน settings):
```ts
await prisma.communityPost.updateMany({ where: { createdAt: { lt: cutoff } }, data: { authorIp: null } });
```
- **ทดสอบ:** รัน retention job → query โพสต์เก่า `author_ip IS NULL`

### SEC-012 — Login DTO `MinLength(6)` ต่างจาก policy จริง (8+)
- **Severity:** Low · **หลักฐาน:** `auth/dto/login.dto.ts` `@MinLength(6)`; `user/dto/user.dto.ts` `PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/` · **ผลกระทบ:** ไม่เป็นช่องโหว่ (รหัสจริง 8+) แต่ inconsistent
- **แก้:** `@MinLength(8)` ใน LoginDto (หรือคงไว้ — login ไม่ควรเปิดเผย policy) — แนะนำคงหลวมเพื่อไม่รั่ว policy; เอกสารให้ตรงกันแทน
- **ทดสอบ:** N/A (cosmetic)

### SEC-013 — Seed admin default credential
- **Severity:** Low (impact Medium ถ้าลืมเปลี่ยน) · **หลักฐาน:** `seed/seed.ts:32-33` `admin@ros.local` / `ChangeMe!2026` (override ผ่าน env) · **ผลกระทบ:** ถ้า deploy แล้วไม่เปลี่ยน = บัญชี super_admin รหัสที่รู้กันใน source
- **แก้:** บังคับ rotate ตอน login แรก หรือ require `SEED_ADMIN_PASSWORD` ใน prod (ไม่ใช้ default):
```ts
if (process.env.NODE_ENV !== 'development' && !process.env.SEED_ADMIN_PASSWORD)
  throw new Error('ต้องตั้ง SEED_ADMIN_PASSWORD สำหรับ non-dev');
```
- **ทดสอบ:** seed prod โดยไม่ตั้ง `SEED_ADMIN_PASSWORD` → ต้อง error

---

## Top 10 ความเสี่ยงสูงสุด (เรียงตามความสำคัญ)

| # | ID | ความเสี่ยง | Severity |
|---|---|---|---|
| 1 | SEC-001 | File upload → Stored XSS (mimetype-trust + static serve) | High |
| 2 | SEC-002 | ไม่มี HTTP security headers (nosniff/X-Frame/CSP/HSTS) | Medium |
| 3 | SEC-006 | PII dev-key fallback (idCard ถอดได้ใน non-prod) | Medium |
| 4 | SEC-003 | REVALIDATE_SECRET ไม่ enforce prod + default | Medium |
| 5 | SEC-004 | Document download `inline` (XSS authed) | Medium |
| 6 | SEC-005 | JWT เพิกถอนก่อนหมดอายุไม่ได้ | Medium |
| 7 | SEC-013 | Seed admin default credential | Low→Med |
| 8 | SEC-008 | Public form ไม่มี CAPTCHA | Low |
| 9 | SEC-007 | CORS dev reflect-any + credentials | Low |
| 10 | SEC-011 | `author_ip` ไม่มี retention (PDPA) | Low |

---

## Prioritized Remediation Backlog

### Sprint 1 — ก่อน production launch (บล็อก)
1. **SEC-001** — magic-byte validation (`file-type`) + บล็อก SVG/HTML ทั้ง property & document upload
2. **SEC-002** — helmet (api) + Next `headers()` (nosniff/X-Frame-Options/HSTS/CSP)
3. **SEC-003** — เพิ่ม `REVALIDATE_SECRET` เข้า env.validation prod + constant-time compare
4. **SEC-013** — บังคับ `SEED_ADMIN_PASSWORD` ใน non-dev + เปลี่ยนรหัส admin

### Sprint 2 — hardening
5. **SEC-006** — บังคับ `PII_ENCRYPTION_KEY` ใน staging ด้วย (ไม่ derive จาก constant)
6. **SEC-004** — `Content-Disposition: attachment` + nosniff สำหรับเอกสาร renderable
7. **SEC-005** — `tokenVersion` สำหรับ revoke ทันที (suspend/logout-all)

### Sprint 3 — defense-in-depth / compliance
8. **SEC-008** — CAPTCHA ฟอร์ม public
9. **SEC-007** — CORS dev allowlist (เลิก reflect-any)
10. **SEC-011** — retention job ลบ `author_ip`
11. **SEC-009 / SEC-010 / SEC-012** — ทบทวน (CSRF/cookie-sign/login-policy) — ความเสี่ยงต่ำ

---

## หัวข้อที่ตรวจครบตามที่กำหนด

| หมวด | หัวข้อ | ผล |
|---|---|---|
| **Authentication** | Login / Logout / Session / JWT / Refresh / Password reset | แข็งแรง (lockout, no-enum, rotation+reuse) · ไม่มี self-service password reset (admin reset เท่านั้น — by design) · JWT revoke = SEC-005 |
| **Authorization** | RBAC / Permission / Privilege escalation / Access control | แข็งแรง (2 ชั้น + ROLE_RANK + NEVER_MATCH + IDOR guard) — ไม่พบช่อง |
| **Injection** | SQL / NoSQL / Command | **ไม่พบ** (Prisma param, ไม่มี exec/eval, ไม่มี Mongo) |
| **XSS / CSRF / SSRF** | — | XSS: ผ่าน upload (SEC-001/004); CSRF: sameSite strict (SEC-009); SSRF: **ไม่พบ** |
| **IDOR / Open Redirect / Path Traversal** | — | IDOR guard ดี; Open redirect **ไม่พบ**; Path traversal **กันแล้ว** (normalize+prefix) |
| **API Security** | Rate limit / Abuse / Missing validation / Missing authz | throttle ดี; validation ดี (ยกเว้น addTerm untyped — Arch M4); authz ครบ |
| **File Upload** | File/MIME/Magic-byte/Malware/Storage | **อ่อนสุด** = SEC-001 (no magic-byte, static serve) |
| **Secrets** | API key / Env / Leakage / Hardcoded | ไม่มี secret committed; dev defaults ใน source = SEC-006 (gated prod) |
| **Logging** | Sensitive / Token / Password leakage | **ไม่พบ** การ log ข้อมูลอ่อนไหว |

---

*จบเอกสาร — Security Audit (source-based, มีตัวอย่างโค้ดแก้ + วิธีทดสอบทุก finding · ไม่แก้โค้ดจริงในโปรเจกต์)*
