import './globals.css';
import type { Metadata, Viewport } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: { default: 'Notify — Real Estate', template: '%s · Notify' },
  description: 'ซื้อ · ขาย · เช่า · ดูแลทรัพย์ — พาร์ตเนอร์อสังหาฯ ที่ไว้ใจได้',
  applicationName: 'Notify',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Findit = Manrope (หลัก Latin) + Inter (รอง) · IBM Plex Sans Thai = glyph ไทย (Manrope ไม่มีไทย) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
