import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Header, Footer } from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { LanguageProvider } from '@/lib/lang';
import PullToRefresh from '@/components/PullToRefresh';

export const metadata: Metadata = {
  title: { default: 'ROS — เช่าคอนโด บ้าน ทาวน์โฮม อพาร์ทเมนท์', template: '%s · ROS' },
  description: 'ค้นหาทรัพย์เช่าคุณภาพ คอนโด บ้าน ทาวน์โฮม อพาร์ทเมนท์ คัดสรรโดยทีมนายหน้ามืออาชีพ นัดดูง่าย ติดต่อสะดวก',
  applicationName: 'ROS',
  manifest: '/manifest.webmanifest',
  // เปิดเต็มจอเหมือนแอปเมื่อ Add to Home Screen บน iOS (ซ่อนแถบ URL/ปุ่ม Safari)
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ROS' },
  other: { 'mobile-web-app-capable': 'yes' }, // standalone บน Android/Chrome ด้วย
  icons: {
    icon: [{ url: '/icon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: { title: 'ROS Real Estate', type: 'website', locale: 'th_TH' },
};

// viewport มาตรฐาน: กว้างเท่าจอจริง, ไม่ล็อกซูม — กัน auto-zoom ใช้ฟอนต์ ≥16px แทน
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600&family=Inter:wght@400;500;600&family=Noto+Serif+Thai:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LanguageProvider>
          {/* a11y: ข้ามไปเนื้อหาหลักด้วยคีย์บอร์ด (ซ่อนจนกว่าจะ focus) */}
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white">
            ข้ามไปเนื้อหาหลัก
          </a>
          <Header />
          {/* A2: เนื้อหา fade เข้าตอนโหลด — เคารพ prefers-reduced-motion */}
          <PullToRefresh><div id="main-content" tabIndex={-1} className="animate-fade-rise outline-none">{children}</div></PullToRefresh>
          <Footer />
          <BottomNav />
        </LanguageProvider>
      </body>
    </html>
  );
}
