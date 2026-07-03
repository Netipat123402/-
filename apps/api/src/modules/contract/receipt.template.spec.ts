import { esc, formatBaht, renderReceiptHtml, type ReceiptData } from './receipt.template';

describe('receipt.template', () => {
  it('esc กัน HTML/XSS injection', () => {
    expect(esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(esc('A & "B" \'C\'')).toBe('A &amp; &quot;B&quot; &#39;C&#39;');
    expect(esc(null)).toBe('');
    expect(esc(1500)).toBe('1500');
  });

  it('formatBaht ใส่ comma + 2 ตำแหน่ง', () => {
    expect(formatBaht(18000)).toBe('18,000.00');
    expect(formatBaht(1500.5)).toBe('1,500.50');
  });

  const data: ReceiptData = {
    receiptNo: 'RC-2026-0001', date: new Date('2026-06-10T00:00:00Z'),
    companyName: 'ROS Estate', contractCode: 'CT-2026-0001',
    customerName: '<b>สมชาย</b>', propertyTitle: 'คอนโด A', propertyCode: 'CD-2026-0001',
    agentName: 'แอดมิน', amount: 18000, periodLabel: 'ค่าเช่าเดือนมิถุนายน',
  };

  it('render มีเลขที่/จำนวนเงิน/รายการครบ', () => {
    const html = renderReceiptHtml(data);
    expect(html).toContain('RC-2026-0001');
    expect(html).toContain('CT-2026-0001');
    expect(html).toContain('฿18,000.00');
    expect(html).toContain('ค่าเช่าเดือนมิถุนายน');
    expect(html).toContain('window.print()');
  });

  it('ค่า user input ถูก escape ในเอกสาร (กัน XSS)', () => {
    const html = renderReceiptHtml(data);
    expect(html).not.toContain('<b>สมชาย</b>');
    expect(html).toContain('&lt;b&gt;สมชาย&lt;/b&gt;');
  });
});
