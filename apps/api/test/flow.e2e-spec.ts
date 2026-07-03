import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, login, ADMIN } from './utils';

/**
 * E2E happy path (MR-14): owner → property → publish → public เห็น → lead → convert customer
 *   → contract(draft) → sign ถูกบล็อกถ้าไม่มี lease verified (guard) → แนบ+verify lease → sign(active)
 *   → ออกใบเสร็จ (receipt document)
 */
describe('Full rental flow (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let token: string;
  let adminId: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const expectOk = (r: request.Response, msg: string) => {
    if (![200, 201].includes(r.status)) throw new Error(`${msg} → ${r.status}: ${JSON.stringify(r.body)}`);
    return r.body.data;
  };

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
    token = await login(http, ADMIN.email, ADMIN.password);
    const me = await http.get('/api/v1/auth/me').set(auth());
    adminId = me.body.data.id;
  });
  afterAll(async () => { await app?.close(); });

  it('owner → property → publish → public visible → lead → customer → contract → sign(guard) → receipt', async () => {
    // 1) owner
    const owner = expectOk(
      await http.post('/api/v1/owners').set(auth()).send({ fullName: 'E2E เจ้าของ', phone: '0810000001' }),
      'create owner',
    );

    // 2) property (draft)
    const prop = expectOk(
      await http.post('/api/v1/properties').set(auth()).send({
        ownerId: owner.id, propertyType: 'condo', titleTh: 'E2E คอนโดทดสอบ', monthlyRent: 15000,
      }),
      'create property',
    );
    expect(prop.status).toBe('draft');

    // 3) publish: draft → available
    const published = expectOk(
      await http.post(`/api/v1/properties/${prop.id}/approve`).set(auth()).send({}),
      'approve property',
    );
    expect(published.status).toBe('available');

    // 4) public เห็นทรัพย์ (no auth)
    const pub = await http.get(`/api/v1/public/properties/${prop.code}`).expect(200);
    expect(pub.body.data.code).toBe(prop.code);

    // 5) lead → convert เป็น customer
    const lead = expectOk(
      await http.post('/api/v1/leads').set(auth()).send({ fullName: 'E2E ลูกค้า', phone: '0810000002' }),
      'create lead',
    );
    const converted = expectOk(
      await http.post(`/api/v1/leads/${lead.id}/convert`).set(auth()).send({}),
      'convert lead',
    );
    const customerId = converted.customer?.id ?? converted.customerId ?? converted.id;
    expect(customerId).toBeTruthy();

    // 6) contract (draft) — property → reserved
    const today = new Date();
    const end = new Date(today.getTime() + 365 * 24 * 3600 * 1000);
    const contract = expectOk(
      await http.post('/api/v1/contracts').set(auth()).send({
        propertyId: prop.id, ownerId: owner.id, customerId, agentId: adminId,
        monthlyRent: 15000, startDate: today.toISOString(), endDate: end.toISOString(),
      }),
      'create contract',
    );
    expect(contract.status).toBe('draft');

    // 7) sign ก่อนมี lease verified → ถูกบล็อก (contract-sign guard)
    const signBlocked = await http.post(`/api/v1/contracts/${contract.id}/sign`).set(auth()).send({});
    expect(signBlocked.status).toBe(409);

    // 8) แนบเอกสาร lease + verify
    const doc = expectOk(
      await http.post('/api/v1/documents').set(auth()).send({
        documentType: 'lease', name: 'สัญญาเช่า E2E', entityType: 'contract', entityId: contract.id,
        mimeType: 'application/pdf',
      }),
      'register lease doc',
    );
    const docId = doc.document?.id ?? doc.id;
    expectOk(await http.post(`/api/v1/documents/${docId}/verify`).set(auth()).send({}), 'verify lease');

    // 9) sign → active
    const signed = expectOk(await http.post(`/api/v1/contracts/${contract.id}/sign`).set(auth()).send({}), 'sign contract');
    expect(signed.status).toBe('active');

    // 10) ออกใบเสร็จ
    const receipt = expectOk(
      await http.post(`/api/v1/contracts/${contract.id}/receipt`).set(auth()).send({ amount: 15000, periodLabel: 'ค่าเช่าเดือนแรก' }),
      'issue receipt',
    );
    expect(receipt.receiptNo).toBeTruthy();
  });
});
