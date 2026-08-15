// web-v2 — Findit-clone (Notify content). โคลนลุค/สเปซ/พฤติกรรมจาก Findit 1:1
// ⚠️ ตั้งใจ override DESIGN-SYSTEM lock เฉพาะ v2 (Manrope + ขาว-ดำ) — web-admin/web-public เดิมคง lock (ink/gold)
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
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
module.exports = nextConfig;
