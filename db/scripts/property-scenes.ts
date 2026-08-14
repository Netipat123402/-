// ============================================================================
// ROS — Property scene library (premium branded "architectural line study")
// ----------------------------------------------------------------------------
// SVG งานเส้นพรีเมียม โทนครีม/ทราย · เส้นหมึก · แต้มทอง · ROS+ป้ายห้อง (safe zone กัน object-cover ตัด)
// ใช้โดย scripts/regen-demo-images.ts (แนบเข้าทรัพย์) และ preview
// ============================================================================

const INK = '#2E2820';
const GOLD = '#C79A5A';

// กรอบภาพ: พื้นไล่สี + งานเส้น + ป้ายห้อง (ล่างซ้าย) + ROS (ล่างขวา)
function frame(bg1: string, bg2: string, art: string, label: string, ink = '#463B29'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  ${art}
  <text x="72" y="826" font-family="Georgia,'Times New Roman',serif" font-size="46" fill="${ink}" opacity="0.9">${label}</text>
  <text x="1128" y="826" text-anchor="end" font-family="Helvetica,Arial,sans-serif" font-size="32" letter-spacing="4" fill="${ink}" opacity="0.55">Notify</text>
</svg>`;
}

const stroke = (w = 6, o = 0.8): string =>
  `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity="${o}"`;
const sun = (cx: number, cy: number, r: number): string => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${GOLD}" opacity="0.5"/>`;

// ── งานเส้นแต่ละฉาก (1200×900 · เนื้อหากลาง ~x180–1020 · y150–720) ──
export const scenes = {
  exteriorCondo: (): string => frame('#F4ECDE', '#E7D6BB', `
    ${sun(960, 210, 78)}
    <g ${stroke()}>
      <rect x="430" y="210" width="220" height="500"/>
      <rect x="650" y="300" width="150" height="410"/>
      <line x1="180" y1="710" x2="1020" y2="710"/>
      <g stroke-width="4" opacity="0.9">
        ${Array.from({ length: 5 }, (_, r) => `<line x1="466" y1="${266 + r * 84}" x2="614" y2="${266 + r * 84}"/>`).join('')}
        <line x1="503" y1="240" x2="503" y2="686"/><line x1="577" y1="240" x2="577" y2="686"/>
        ${Array.from({ length: 4 }, (_, r) => `<line x1="674" y1="${356 + r * 84}" x2="778" y2="${356 + r * 84}"/>`).join('')}
        <line x1="726" y1="330" x2="726" y2="694"/>
      </g>
      <rect x="486" y="640" width="70" height="70" fill="${GOLD}" opacity="0.32" stroke-width="4"/>
    </g>
    <g ${stroke(6, 0.72)}><path d="M250 710 q10 -70 20 0"/></g>
    <circle cx="262" cy="600" r="42" fill="#8A7A45" opacity="0.5"/>`, 'หน้าอาคาร'),

  exteriorApartment: (): string => frame('#F2ECE0', '#E2D4BC', `
    ${sun(970, 200, 70)}
    <g ${stroke()}>
      <rect x="360" y="300" width="470" height="410"/>
      <line x1="180" y1="710" x2="1020" y2="710"/>
      <g stroke-width="4" opacity="0.9">
        <line x1="360" y1="402" x2="830" y2="402"/><line x1="360" y1="506" x2="830" y2="506"/><line x1="360" y1="610" x2="830" y2="610"/>
        ${Array.from({ length: 4 }, (_, c) => `<line x1="${478 + c * 118}" y1="300" x2="${478 + c * 118}" y2="710"/>`).join('')}
      </g>
      <rect x="540" y="632" width="110" height="78" fill="${GOLD}" opacity="0.3" stroke-width="4"/>
    </g>
    <circle cx="252" cy="612" r="46" fill="#8A7A45" opacity="0.5"/><path d="M252 660 v50" ${stroke(6, 0.6)}/>`, 'หน้าอาคาร'),

  exteriorHouse: (): string => frame('#F1ECDD', '#E4D6B9', `
    ${sun(966, 206, 72)}
    <g ${stroke()}>
      <path d="M380 470 l220 -150 l220 150"/>
      <rect x="410" y="470" width="380" height="240"/>
      <line x1="170" y1="710" x2="1030" y2="710"/>
      <rect x="536" y="560" width="90" height="150" fill="${GOLD}" opacity="0.28" stroke-width="5"/>
      <rect x="450" y="520" width="70" height="70" stroke-width="4"/><line x1="485" y1="520" x2="485" y2="590" stroke-width="4"/><line x1="450" y1="555" x2="520" y2="555" stroke-width="4"/>
      <rect x="670" y="520" width="70" height="70" stroke-width="4"/><line x1="705" y1="520" x2="705" y2="590" stroke-width="4"/><line x1="670" y1="555" x2="740" y2="555" stroke-width="4"/>
    </g>
    <g ${stroke(6, 0.7)}><path d="M270 710 v-70"/><circle cx="270" cy="600" r="48" fill="#7E8A5A" opacity="0.55"/></g>
    <path d="M300 710 q40 -22 90 0" ${stroke(5, 0.5)}/>`, 'บ้านเดี่ยว'),

  exteriorTownhome: (): string => frame('#F2EBDB', '#E5D5B6', `
    ${sun(980, 196, 62)}
    <g ${stroke()}>
      ${[0, 1, 2].map((i) => {
    const x = 340 + i * 180;
    return `<path d="M${x} 430 l90 -70 l90 70"/><rect x="${x}" y="430" width="180" height="280"/>
      <rect x="${x + 60}" y="560" width="60" height="150" fill="${i === 1 ? GOLD : 'none'}" opacity="${i === 1 ? 0.3 : 1}" stroke-width="4"/>
      <rect x="${x + 40}" y="470" width="100" height="60" stroke-width="4"/>`;
  }).join('')}
      <line x1="170" y1="710" x2="1030" y2="710"/>
    </g>
    <circle cx="258" cy="616" r="42" fill="#7E8A5A" opacity="0.55"/><path d="M258 658 v52" ${stroke(6, 0.6)}/>`, 'ทาวน์โฮม'),

  living: (): string => frame('#EFE9E1', '#DED2C4', `
    <g ${stroke()}>
      <rect x="726" y="200" width="300" height="380"/><line x1="876" y1="200" x2="876" y2="580"/><line x1="726" y1="390" x2="1026" y2="390"/>
      <line x1="180" y1="712" x2="1040" y2="712"/>
      <path d="M210 706 v-108 a30 30 0 0 1 30 -30 h340 a30 30 0 0 1 30 30 v108"/>
      <path d="M210 652 h400"/>
      <path d="M252 596 v-52 a24 24 0 0 1 24 -24 h268 a24 24 0 0 1 24 24 v52"/>
      <line x1="668" y1="404" x2="668" y2="706"/>
    </g>
    <g stroke="${GOLD}" stroke-width="4" opacity="0.6" fill="none"><line x1="906" y1="230" x2="946" y2="380"/><line x1="846" y1="230" x2="806" y2="380"/></g>
    <path d="M636 466 a30 30 0 0 1 62 0 z" fill="${GOLD}" opacity="0.3"/>
    <path d="M360 706 q-12 -84 12 -128 q22 44 12 128" fill="#7E8A5A" opacity="0.5"/>`, 'ห้องนั่งเล่น'),

  bedroom: (): string => frame('#F0E7E1', '#DFCFC6', `
    <g ${stroke()}>
      <rect x="740" y="220" width="270" height="300"/><line x1="740" y1="360" x2="1010" y2="360"/><line x1="875" y1="220" x2="875" y2="520"/>
      <line x1="170" y1="716" x2="1030" y2="716"/>
      <path d="M300 716 v-210 a26 26 0 0 1 26 -26 h360 a26 26 0 0 1 26 26 v210"/>
      <path d="M300 560 h412"/>
      <path d="M330 480 v-70 h300 v70"/>
      <rect x="210" y="600" width="70" height="116"/><rect x="732" y="600" width="70" height="116"/>
    </g>
    <g stroke="${GOLD}" stroke-width="4" opacity="0.6" fill="none"><line x1="245" y1="600" x2="245" y2="548"/><line x1="767" y1="600" x2="767" y2="548"/></g>
    <circle cx="245" cy="536" r="18" fill="${GOLD}" opacity="0.4"/><circle cx="767" cy="536" r="18" fill="${GOLD}" opacity="0.4"/>`, 'ห้องนอน'),

  kitchen: (): string => frame('#F1EAD9', '#E0D0B4', `
    <g ${stroke()}>
      <line x1="180" y1="716" x2="1040" y2="716"/>
      <rect x="220" y="560" width="470" height="156"/><line x1="360" y1="560" x2="360" y2="716"/><line x1="500" y1="560" x2="500" y2="716"/>
      <rect x="240" y="300" width="180" height="120"/><rect x="440" y="300" width="180" height="120"/>
      <path d="M700 300 h150 v50 l-40 40 h-70 l-40 -40 z"/><line x1="775" y1="430" x2="775" y2="560"/>
      <rect x="760" y="560" width="220" height="156"/><line x1="870" y1="560" x2="870" y2="716"/>
      <circle cx="305" cy="612" r="14" fill="${GOLD}" opacity="0.5"/><circle cx="580" cy="612" r="14" fill="${GOLD}" opacity="0.5"/>
    </g>`, 'ห้องครัว'),

  bath: (): string => frame('#E8ECEA', '#CFDAD6', `
    <g ${stroke()}>
      <line x1="180" y1="716" x2="1040" y2="716"/>
      <path d="M300 560 h360 a40 40 0 0 1 40 40 v70 a46 46 0 0 1 -46 46 h-388 a46 46 0 0 1 -46 -46 v-70 a40 40 0 0 1 40 -40 z"/>
      <path d="M300 560 q0 -30 30 -30" stroke-width="5"/>
      <rect x="740" y="250" width="200" height="150" rx="8"/>
      <line x1="840" y1="410" x2="840" y2="500"/><path d="M770 560 h140 v-24 a70 70 0 0 0 -140 0 z"/>
    </g>
    <g stroke="${GOLD}" stroke-width="5" opacity="0.55" fill="none"><path d="M420 560 v-30 h30"/></g>`, 'ห้องน้ำ'),

  pool: (): string => frame('#E8ECEA', '#CFDAD6', `
    ${sun(966, 198, 70)}
    <g fill="none" stroke="#2E4A46" stroke-width="6" stroke-linecap="round" opacity="0.68">
      <path d="M120 528 q90 -36 180 0 t180 0 t180 0 t180 0 t180 0"/>
      <path d="M120 600 q90 -36 180 0 t180 0 t180 0 t180 0 t180 0" opacity="0.75"/>
      <path d="M120 672 q90 -36 180 0 t180 0 t180 0 t180 0 t180 0" opacity="0.5"/>
    </g>
    <g ${stroke()}>
      <path d="M210 450 l120 -24 l12 54 l-120 24 z"/><line x1="222" y1="450" x2="210" y2="504"/><line x1="330" y1="426" x2="318" y2="480"/>
      <line x1="900" y1="450" x2="900" y2="270"/><path d="M810 276 q90 -72 180 0 z" fill="${GOLD}" opacity="0.32"/>
    </g>`, 'สระว่ายน้ำ'),

  garden: (): string => frame('#ECEDDF', '#D6DAC0', `
    ${sun(972, 200, 66)}
    <g ${stroke()}><line x1="150" y1="712" x2="1050" y2="712"/>
      <path d="M470 712 v-70 h260 v70"/><line x1="470" y1="676" x2="730" y2="676"/>
    </g>
    <g ${stroke(6, 0.72)}>
      <path d="M300 712 v-90"/><path d="M840 712 v-90"/>
    </g>
    <circle cx="300" cy="560" r="66" fill="#7E8A5A" opacity="0.55"/>
    <circle cx="840" cy="560" r="60" fill="#8A9A5E" opacity="0.5"/>
    <path d="M520 712 q80 -30 160 0" ${stroke(5, 0.45)}/>
    <g fill="#7E8A5A" opacity="0.45"><circle cx="410" cy="690" r="20"/><circle cx="760" cy="690" r="20"/></g>`, 'สวน'),

  balcony: (): string => frame('#EDEBE2', '#D6D8C8', `
    ${sun(940, 210, 74)}
    <g ${stroke()}>
      <line x1="150" y1="712" x2="1050" y2="712"/>
      <line x1="220" y1="560" x2="980" y2="560"/><line x1="220" y1="620" x2="980" y2="620"/>
      ${Array.from({ length: 9 }, (_, i) => `<line x1="${260 + i * 82}" y1="560" x2="${260 + i * 82}" y2="712"/>`).join('')}
      <path d="M300 560 v-70 a20 20 0 0 1 20 -20 h120 a20 20 0 0 1 20 20 v70"/>
    </g>
    <g stroke="${INK}" stroke-width="4" opacity="0.3" fill="none"><line x1="220" y1="420" x2="980" y2="420"/></g>
    <path d="M760 560 q-10 -70 8 -108 q18 38 8 108" fill="#7E8A5A" opacity="0.5"/>`, 'ระเบียง'),
};

export type SceneKey = keyof typeof scenes;

// ชุดฉากต่อประเภททรัพย์ (6 รูป/ทรัพย์)
export const SETS: Record<string, SceneKey[]> = {
  condo: ['exteriorCondo', 'living', 'bedroom', 'kitchen', 'bath', 'pool'],
  apartment: ['exteriorApartment', 'living', 'bedroom', 'kitchen', 'bath', 'balcony'],
  house: ['exteriorHouse', 'living', 'bedroom', 'kitchen', 'bath', 'garden'],
  townhome: ['exteriorTownhome', 'living', 'bedroom', 'kitchen', 'bath', 'balcony'],
};
