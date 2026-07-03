'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';

// 77 จังหวัด (ค่า = ชื่อไทย ตรงกับที่ DB เก็บ)
export const THAI_PROVINCES = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา',
  'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก',
  'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน',
  'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา',
  'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'พะเยา', 'ภูเก็ต',
  'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี',
  'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
  'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี',
  'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี',
];

/** Dropdown จังหวัดแบบพิมพ์ค้นหาได้ — premium, minimal (แทน <select> เดิม) */
export default function ProvinceCombobox({
  value, onChange, placeholder, allLabel,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  // ปิดเมื่อคลิกนอกกล่อง
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  const matches = query.trim()
    ? THAI_PROVINCES.filter((p) => p.includes(query.trim()))
    : THAI_PROVINCES;

  function select(v: string) {
    onChange(v);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${placeholder}: ${value || allLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="field flex items-center justify-between text-left"
      >
        <span className={value ? 'text-ink' : 'text-muted'}>{value || allLabel}</span>
        <Icon name="chevron-down" size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lift">
          <div className="border-b border-border p-2">
            {/* autoFocus เฉพาะเมาส์ (เดสก์ท็อป) — มือถือไม่เด้งคีย์บอร์ดบังเมนูตอนเปิด */}
            <input
              autoFocus={typeof window !== 'undefined' && !window.matchMedia?.('(any-pointer: coarse)').matches}
              className="field h-10"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            <li>
              <button type="button" onClick={() => select('')}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-canvas ${!value ? 'text-gold-dark' : 'text-muted'}`}>
                {allLabel}{!value && <Icon name="check" size={15} />}
              </button>
            </li>
            {matches.map((p) => (
              <li key={p}>
                <button type="button" onClick={() => select(p)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-canvas ${value === p ? 'font-medium text-gold-dark' : 'text-ink'}`}>
                  {p}{value === p && <Icon name="check" size={15} />}
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="px-3 py-3 text-center text-sm text-muted">ไม่พบจังหวัด</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
