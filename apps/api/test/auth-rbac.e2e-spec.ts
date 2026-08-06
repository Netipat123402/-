import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, login, ADMIN } from './utils';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

/**
 * Integration (MR-14): auth · RBAC · no-orphan · validation guards
 */
describe('Auth + RBAC + guards (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
    adminToken = await login(http, ADMIN.email, ADMIN.password);
  });
  afterAll(async () => { await app?.close(); });

  // ---- auth ----
  it('GET /auth/me ไม่มี token → 401', async () => {
    await http.get('/api/v1/auth/me').expect(401);
  });

  it('login admin → token + /auth/me 200', async () => {
    expect(adminToken).toBeTruthy();
    const me = await http.get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(me.body.data.email).toBe(ADMIN.email);
  });

  it('login รหัสผิด → 401 (ข้อความไม่ระบุว่าอีเมลหรือรหัสผิด)', async () => {
    const r = await http.post('/api/v1/auth/login').send({ email: ADMIN.email, password: 'wrongpassword123' });
    expect(r.status).toBe(401);
  });

  // ---- RBAC ----
  it('RBAC: sales_agent เรียก endpoint admin-only → 403', async () => {
    const email = `e2e-agent-${Date.now()}@ros.local`;
    const password = 'AgentPass!2026';
    const created = await http.post('/api/v1/users').set('Authorization', `Bearer ${adminToken}`)
      .send({ email, fullName: 'E2E Agent', password, roleNames: ['sales_agent'] });
    expect([200, 201]).toContain(created.status);
    const agentToken = await login(http, email, password);

    // sales_agent ไม่มีสิทธิ์อ่าน audit-logs (auditor/admin เท่านั้น)
    const forbidden = await http.get('/api/v1/audit-logs').set('Authorization', `Bearer ${agentToken}`);
    expect(forbidden.status).toBe(403);

    // cleanup (soft-delete)
    await http.delete(`/api/v1/users/${created.body.data.id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  // ---- Phase 5: 3 บทบาท operating + sensitive-edit alerts ----
  it('roles: listRoles คืนเฉพาะ 3 บทบาท operating (dormant 5 ตัวถูกปิด)', async () => {
    const r = await http.get('/api/v1/users/roles').set('Authorization', `Bearer ${adminToken}`).expect(200);
    // envelope: controller คืน { items } → TransformInterceptor แปลงเป็น data:[...] (list)
    const names = (r.body.data as { name: string }[]).map((x) => x.name).sort();
    expect(names).toEqual(['property_manager', 'sales_agent', 'super_admin']);
  });

  it('roles: มอบหมายบทบาท dormant (team_lead) → 400', async () => {
    const r = await http.post('/api/v1/users').set('Authorization', `Bearer ${adminToken}`)
      .send({ email: `e2e-dormant-${Date.now()}@ros.local`, fullName: 'X', password: 'DormantPass!2026', roleNames: ['team_lead'] });
    expect(r.status).toBe(400);
  });

  it('Phase 5: ผู้จัดการแก้เบอร์เจ้าของทรัพย์ → แจ้งเจ้าของ (category owner) · เจ้าของแก้เอง = ไม่แจ้ง', async () => {
    const prisma = app.get(PrismaService);
    const pmEmail = `e2e-pm-${Date.now()}@ros.local`; const pmPass = 'MgrPass!2026';
    const pm = await http.post('/api/v1/users').set('Authorization', `Bearer ${adminToken}`)
      .send({ email: pmEmail, fullName: 'E2E ผู้จัดการ', password: pmPass, roleNames: ['property_manager'] });
    expect([200, 201]).toContain(pm.status);
    const pmToken = await login(http, pmEmail, pmPass);
    // pm สร้าง owner เอง (branch ตรงกับ pm แน่นอน)
    const owner = await http.post('/api/v1/owners').set('Authorization', `Bearer ${pmToken}`)
      .send({ fullName: 'P5 เจ้าของบ้าน', phone: '0810000001' });
    const ownerId = owner.body.data.id;

    // (ก) ผู้จัดการแก้เบอร์ → แจ้งเจ้าของระบบ (super_admin) พร้อม old→new
    await http.patch(`/api/v1/owners/${ownerId}`).set('Authorization', `Bearer ${pmToken}`).send({ phone: '0999999999' }).expect(200);
    const alerts = await prisma.notification.findMany({ where: { category: 'owner', entityId: ownerId } });
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].body).toContain('เบอร์โทร');
    const countAfterPm = alerts.length;

    // (ข) เจ้าของแก้เอง (super_admin) → ไม่เพิ่มการแจ้งเตือน (skip self)
    await http.patch(`/api/v1/owners/${ownerId}`).set('Authorization', `Bearer ${adminToken}`).send({ phone: '0888888888' }).expect(200);
    const countAfterAdmin = await prisma.notification.count({ where: { category: 'owner', entityId: ownerId } });
    expect(countAfterAdmin).toBe(countAfterPm);

    await http.delete(`/api/v1/users/${pm.body.data.id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  // ---- no-orphan / validation ----
  it('no-orphan: register document ขาด entityId/entityType → 400', async () => {
    const r = await http.post('/api/v1/documents').set('Authorization', `Bearer ${adminToken}`)
      .send({ documentType: 'other', name: 'orphan' }); // ไม่มี entityType/entityId
    expect(r.status).toBe(400);
  });

  it('validation: สร้าง owner โดยไม่มีชื่อ → 400', async () => {
    const r = await http.post('/api/v1/owners').set('Authorization', `Bearer ${adminToken}`).send({});
    expect(r.status).toBe(400);
  });

  it('throttle: public lead เกิน limit → 429 (rate limit ทำงาน)', async () => {
    // public leads limit = 5/min — ยิงเกินเพื่อยืนยัน 429 (ฟอร์มไม่ครบก็ถูกนับ)
    let got429 = false;
    for (let i = 0; i < 8; i++) {
      const r = await http.post('/api/v1/public/leads').send({});
      if (r.status === 429) { got429 = true; break; }
    }
    expect(got429).toBe(true);
  });
});
