// HTTP security headers (MR-15) — baseline กัน clickjacking/XSS surface
// img/connect เปิด http/https (รูปทรัพย์จาก API/MinIO + เรียก public API ข้าม origin)
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "img-src 'self' data: blob: https: http:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data: https:",
  "connect-src 'self' https: http:",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // ฝั่ง client (ฟอร์มนัด) เรียก public API
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1',
    // ฝั่ง server (SSR fetch) — ปกติชี้ภายใน
    API_BASE_INTERNAL: process.env.API_BASE_INTERNAL || 'http://localhost:4000/api/v1',
    // หมายเหตุ: NEXT_PUBLIC_LINE_URL ไม่ต้องประกาศที่นี่ — Next inline ให้อัตโนมัติจาก .env.local
    // (ถ้าใส่ใน block นี้ด้วย || fallback จะถูก eval ตอนโหลด config ก่อน env พร้อม → ได้ค่า fallback)
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
module.exports = nextConfig;
