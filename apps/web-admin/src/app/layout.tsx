import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'ROS — ระบบบริหารงาน',
  description: 'Real Estate Operating System — Admin',
  applicationName: 'ROS Admin',
  manifest: '/manifest.webmanifest',
  // เปิดเต็มจอเหมือนแอปเมื่อ Add to Home Screen บน iOS (ซ่อนแถบ URL/ปุ่ม Safari)
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ROS Admin' },
  other: { 'mobile-web-app-capable': 'yes' }, // standalone บน Android/Chrome ด้วย
  icons: {
    icon: [{ url: '/icon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

// viewport มาตรฐาน: กว้างเท่าจอจริง, ไม่ล็อกซูม (คง accessibility) — กัน auto-zoom ใช้ขนาดฟอนต์ ≥16px แทน
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#141312',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* ใช้ธีมที่บันทึกไว้ก่อนเพนต์ (กันจอกระพริบ flash) — ค่าเริ่มต้น = สว่าง, เลือกมืดได้เอง */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('ros-theme')!=='light')document.documentElement.classList.add('dark')}catch(e){}" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
