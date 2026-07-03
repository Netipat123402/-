/**
 * Receipt template (Document Lifecycle §Receipt/Template) — pure render
 * สร้าง HTML ใบเสร็จรับเงิน พิมพ์/บันทึกเป็นเอกสารได้ (ไม่พึ่ง PDF lib)
 * ค่าทุกตัวถูก HTML-escape กัน injection (ชื่อลูกค้า/ทรัพย์มาจาก user input)
 */
export interface ReceiptData {
  receiptNo: string;
  date: Date;
  companyName: string;
  contractCode: string;
  customerName: string;
  propertyTitle: string;
  propertyCode: string;
  agentName: string;
  amount: number;
  periodLabel: string;
  note?: string;
}

/** escape ค่าที่จะใส่ใน HTML (กัน XSS ในเอกสารที่เปิดบน browser) */
export function esc(s: string | number | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatBaht(n: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatThaiDate(d: Date): string {
  return new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}

export function renderReceiptHtml(data: ReceiptData): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>ใบเสร็จรับเงิน ${esc(data.receiptNo)}</title>
<style>
  @media print { .no-print { display: none } }
  body { font-family: 'IBM Plex Sans Thai','Sarabun',sans-serif; color:#1A1A1A; max-width:720px; margin:32px auto; padding:0 24px }
  .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #B89968; padding-bottom:16px }
  .company { font-size:22px; font-weight:700 }
  .title { font-size:18px; font-weight:600; color:#B89968 }
  .no { font-size:13px; color:#78716C }
  table { width:100%; border-collapse:collapse; margin-top:24px }
  td { padding:8px 0; vertical-align:top }
  .label { color:#78716C; width:160px }
  .amount-box { margin-top:24px; padding:16px 20px; background:#FAFAF9; border:1px solid #E7E5E2; border-radius:12px; display:flex; justify-content:space-between; align-items:center }
  .amount { font-size:26px; font-weight:700; color:#B89968 }
  .sign { margin-top:64px; display:flex; justify-content:space-between }
  .sign div { text-align:center; width:200px; border-top:1px solid #1A1A1A; padding-top:8px; font-size:13px }
  .btn { background:#B89968; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-size:14px; cursor:pointer }
  .foot { margin-top:40px; font-size:12px; color:#A8A29E; text-align:center }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="company">${esc(data.companyName)}</div>
      <div class="no">เลขที่ ${esc(data.receiptNo)} · วันที่ ${esc(formatThaiDate(data.date))}</div>
    </div>
    <div class="title">ใบเสร็จรับเงิน / RECEIPT</div>
  </div>

  <table>
    <tr><td class="label">สัญญาเลขที่</td><td>${esc(data.contractCode)}</td></tr>
    <tr><td class="label">ได้รับเงินจาก</td><td>${esc(data.customerName)}</td></tr>
    <tr><td class="label">ทรัพย์</td><td>${esc(data.propertyTitle)} (${esc(data.propertyCode)})</td></tr>
    <tr><td class="label">รายการ</td><td>${esc(data.periodLabel)}</td></tr>
    ${data.note ? `<tr><td class="label">หมายเหตุ</td><td>${esc(data.note)}</td></tr>` : ''}
    <tr><td class="label">ผู้รับเงิน</td><td>${esc(data.agentName)}</td></tr>
  </table>

  <div class="amount-box">
    <span>จำนวนเงิน</span>
    <span class="amount">฿${esc(formatBaht(data.amount))}</span>
  </div>

  <div class="sign">
    <div>ผู้รับเงิน (${esc(data.agentName)})</div>
    <div>ผู้จ่ายเงิน (${esc(data.customerName)})</div>
  </div>

  <div class="no-print" style="margin-top:32px;text-align:center">
    <button class="btn" onclick="window.print()">พิมพ์ใบเสร็จ</button>
  </div>
  <div class="foot">${esc(data.companyName)} · เอกสารนี้ออกจากระบบ ROS</div>
</body>
</html>`;
}
