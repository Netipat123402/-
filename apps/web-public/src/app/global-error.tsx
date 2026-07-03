'use client';

/** Global error boundary (#11) — จับ error ที่หลุดจาก root layout เอง */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="th">
      <body style={{ fontFamily: 'IBM Plex Sans Thai, Inter, sans-serif', background: '#FAFAF9', color: '#1A1A1A' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
          <div style={{ marginBottom: 12, color: '#B4413C' }}>
            <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3.5 21.5 20H2.5L12 3.5Z" /><path d="M12 10v4" /><path d="M12 17.5h.01" />
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>ระบบขัดข้อง</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: '#78716C', maxWidth: 420 }}>
            เกิดข้อผิดพลาดร้ายแรง โปรดลองโหลดหน้าใหม่
          </p>
          <button
            onClick={reset}
            style={{ marginTop: 24, height: 44, padding: '0 20px', borderRadius: 8, background: '#B89968', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer' }}
          >
            โหลดใหม่
          </button>
        </div>
      </body>
    </html>
  );
}
