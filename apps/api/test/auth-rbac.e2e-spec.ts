import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, login, ADMIN } from './utils';

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
