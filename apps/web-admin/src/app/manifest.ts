import type { MetadataRoute } from 'next';

// PWA manifest — เปิดเต็มจอเหมือนแอป (ไม่มีแถบ URL/ปุ่ม Safari) เมื่อ Add to Home Screen
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ROS — ระบบบริหารงาน',
    short_name: 'ROS Admin',
    description: 'ระบบบริหารงานนายหน้าอสังหาริมทรัพย์ ROS',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    lang: 'th',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
