import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, login, ADMIN } from './utils';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

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

    // 2) property (draft) — เติมข้อมูลจำเป็นเกือบครบ (ยังขาดรูปปก)
    const prop = expectOk(
      await http.post('/api/v1/properties').set(auth()).send({
        ownerId: owner.id, propertyType: 'condo', titleTh: 'E2E คอนโดทดสอบ', monthlyRent: 15000,
        province: 'กรุงเทพมหานคร', district: 'วัฒนา', bedrooms: 1, bathrooms: 1,
        descriptionTh: 'คอนโดทดสอบ e2e ใกล้รถไฟฟ้า เฟอร์นิเจอร์ครบ พร้อมเข้าอยู่ทันที',
      }),
      'create property',
    );
    expect(prop.status).toBe('draft');

    // 3) ด่านความครบถ้วน (Phase 3): เผยแพร่ไม่ได้ถ้ายังไม่มีรูปปก (จำเป็น 7/7 ไม่ครบ → 409)
    await http.post(`/api/v1/properties/${prop.id}/approve`).set(auth()).send({}).expect(409);

    // 3b) เติมรูปปก → ครบ 7/7 แล้วจึงเผยแพร่ได้
    await app.get(PrismaService).propertyMedia.create({
      data: { propertyId: prop.id, storageKey: 'e2e/cover.jpg', mediaType: 'image', isCover: true },
    });

    // 3c) publish: draft → available
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

  it('Phase 4 · governance: publish/review เปลี่ยนตรงไม่ได้ (4a) + แก้ live เด้งกลับรอตรวจ (4b)', async () => {
    const prisma = app.get(PrismaService);
    const owner = expectOk(
      await http.post('/api/v1/owners').set(auth()).send({ fullName: 'P4 เจ้าของ', phone: '0810000009' }),
      'create owner',
    );
    const prop = expectOk(
      await http.post('/api/v1/properties').set(auth()).send({
        ownerId: owner.id, propertyType: 'condo', titleTh: 'P4 คอนโด governance', monthlyRent: 20000,
        province: 'กรุงเทพมหานคร', district: 'สาทร', bedrooms: 2, bathrooms: 1,
        descriptionTh: 'คอนโดทดสอบ governance phase 4 ใกล้รถไฟฟ้า เฟอร์นิเจอร์ครบ พร้อมเข้าอยู่',
      }),
      'create property',
    );
    await prisma.propertyMedia.create({
      data: { propertyId: prop.id, storageKey: 'p4/cover.jpg', mediaType: 'image', isCover: true },
    });

    // 4a) publish ตรงผ่าน change_status ไม่ได้ (draft→available ต้องผ่าน approve ที่มี gate)
    await http.patch(`/api/v1/properties/${prop.id}/status`).set(auth()).send({ toStatus: 'available' }).expect(409);

    // เผยแพร่ผ่านด่านที่ถูกต้อง → available → เห็นบน public
    const published = expectOk(await http.post(`/api/v1/properties/${prop.id}/approve`).set(auth()).send({}), 'approve');
    expect(published.status).toBe('available');
    await http.get(`/api/v1/public/properties/${prop.code}`).expect(200);

    // 4a) operational (available↔rented) ผ่าน change_status ได้
    const rented = expectOk(await http.patch(`/api/v1/properties/${prop.id}/status`).set(auth()).send({ toStatus: 'rented' }), 'mark rented');
    expect(rented.status).toBe('rented');
    const backAvail = expectOk(await http.patch(`/api/v1/properties/${prop.id}/status`).set(auth()).send({ toStatus: 'available' }), 'mark available');
    expect(backAvail.status).toBe('available');

    // 4a) governed (available→draft = ถอนประกาศ) ผ่าน change_status ไม่ได้ (ต้องผ่าน reject)
    await http.patch(`/api/v1/properties/${prop.id}/status`).set(auth()).send({ toStatus: 'draft' }).expect(409);

    // 4b) แก้ราคา (material) บนทรัพย์ที่เผยแพร่อยู่ → เด้งกลับ pending_review + ซ่อนจากเว็บ
    const edited = expectOk(await http.patch(`/api/v1/properties/${prop.id}`).set(auth()).send({ monthlyRent: 25000 }), 'edit live price');
    expect(edited.status).toBe('pending_review');
    await http.get(`/api/v1/public/properties/${prop.code}`).expect(404);
  });

  it('Phase 6 (เก็บตก B): แก้เนื้อหาตอน rented → กลับมาว่างต้องตรวจใหม่ (contentDirty)', async () => {
    const prisma = app.get(PrismaService);
    const owner = expectOk(await http.post('/api/v1/owners').set(auth()).send({ fullName: 'P6B เจ้าของ', phone: '0810000007' }), 'owner');
    const prop = expectOk(
      await http.post('/api/v1/properties').set(auth()).send({
        ownerId: owner.id, propertyType: 'condo', titleTh: 'P6B คอนโด', monthlyRent: 18000,
        province: 'กรุงเทพมหานคร', district: 'บางรัก', bedrooms: 1, bathrooms: 1,
        descriptionTh: 'คอนโดทดสอบ contentDirty phase 6 ใกล้รถไฟฟ้า เฟอร์นิเจอร์ครบ พร้อมเข้าอยู่',
      }),
      'create property',
    );
    await prisma.propertyMedia.create({ data: { propertyId: prop.id, storageKey: 'p6b/cover.jpg', mediaType: 'image', isCover: true } });

    // publish → available → rented (ปล่อยเช่า)
    expectOk(await http.post(`/api/v1/properties/${prop.id}/approve`).set(auth()).send({}), 'approve');
    const rented = expectOk(await http.patch(`/api/v1/properties/${prop.id}/status`).set(auth()).send({ toStatus: 'rented' }), 'rent');
    expect(rented.status).toBe('rented');

    // แก้ราคาตอน rented (off-market ไม่เด้ง แต่ mark dirty)
    const edited = expectOk(await http.patch(`/api/v1/properties/${prop.id}`).set(auth()).send({ monthlyRent: 21000 }), 'edit while rented');
    expect(edited.status).toBe('rented');

    // กลับมาว่าง → เด้งไป pending_review (ไม่ขึ้นเว็บพร้อมของยังไม่ตรวจ) + public 404
    const relisted = expectOk(await http.patch(`/api/v1/properties/${prop.id}/status`).set(auth()).send({ toStatus: 'available' }), 're-list');
    expect(relisted.status).toBe('pending_review');
    await http.get(`/api/v1/public/properties/${prop.code}`).expect(404);
  });
});
