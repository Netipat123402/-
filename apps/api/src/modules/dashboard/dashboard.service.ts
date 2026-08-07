import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

// ============================================================================
// Dashboard แยกตามบทบาท (Phase 2) — server aggregation ต่อ role (ระดับโลก · เผื่อโต)
//   - เซล   = ไปป์ไลน์ "ของฉัน" (scope=own · assignedToId/agentId=me) — ไม่เห็นข้อมูลคนอื่น
//   - ผจก   = ปฏิบัติการทั้งทีม (คิวคำขอ/คลังทรัพย์/ทีม)
//   - เจ้าของ = คิวที่ต้องตัดสิน (รออนุมัติเผยแพร่/รอเซ็น) + สุขภาพธุรกิจ
// FE = generic renderer (kpis + agenda) → เพิ่มเมตริก/บทบาทใหม่ = แก้ที่ service นี้ที่เดียว
// ============================================================================

type OperatingRole = 'super_admin' | 'property_manager' | 'sales_agent';

export type DashKpi = { key: string; label: string; value: number; href: string; icon: string; hot?: boolean };
export type DashAgendaItem = {
  id: string;
  code?: string;
  primary: string;
  secondary?: string | null;
  scheduledAt?: Date | null;
  endDate?: Date | null;
  href?: string; // ลิงก์รายตัว (ถ้าไม่มี → ใช้ href ของ section)
};
export type DashAgenda = { key: string; title: string; icon: string; href: string; items: DashAgendaItem[]; tone?: 'alert' };
export type DashboardPayload = { role: OperatingRole; kpis: DashKpi[]; agenda: DashAgenda[] };

function pickRole(roles: string[]): OperatingRole {
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('property_manager')) return 'property_manager';
  return 'sales_agent';
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: AuthenticatedUser): Promise<DashboardPayload> {
    const role = pickRole(user.roles);
    if (role === 'sales_agent') return this.sales(user);
    if (role === 'property_manager') return this.manager();
    return this.owner(user);
  }

  private todayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private soonRange() {
    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    return { now, in30 };
  }

  // ---- เซล: "ของฉัน" (own scope) ------------------------------------------
  private async sales(user: AuthenticatedUser): Promise<DashboardPayload> {
    const me = user.id;
    const { start, end } = this.todayRange();
    const [myLeads, myApptToday, myDeals, available, apptItems, leadItems] = await Promise.all([
      this.prisma.lead.count({ where: { deletedAt: null, assignedToId: me, status: 'working' } }),
      this.prisma.appointment.count({ where: { deletedAt: null, agentId: me, status: 'upcoming', scheduledAt: { gte: start, lt: end } } }),
      this.prisma.contract.count({ where: { deletedAt: null, agentId: me, status: 'draft' } }),
      this.prisma.property.count({ where: { deletedAt: null, status: 'available' } }),
      this.prisma.appointment.findMany({
        where: { deletedAt: null, agentId: me, status: 'upcoming', scheduledAt: { gte: start } },
        orderBy: { scheduledAt: 'asc' }, take: 5,
        select: { id: true, code: true, scheduledAt: true, title: true, lead: { select: { fullName: true } }, property: { select: { titleTh: true } } },
      }),
      this.prisma.lead.findMany({
        where: { deletedAt: null, assignedToId: me, status: 'new' },
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, code: true, fullName: true, phone: true },
      }),
    ]);
    return {
      role: 'sales_agent',
      kpis: [
        { key: 'myLeads', label: 'Lead ของฉัน', value: myLeads, href: '/leads?status=working', icon: 'user-plus', hot: true },
        { key: 'myApptToday', label: 'นัดวันนี้', value: myApptToday, href: '/appointments', icon: 'clock', hot: true },
        { key: 'myDeals', label: 'ดีลกำลังปิด', value: myDeals, href: '/contracts', icon: 'file-text' },
        { key: 'available', label: 'ทรัพย์ว่าง (จับคู่)', value: available, href: '/properties?status=available', icon: 'building' },
      ],
      agenda: [
        {
          key: 'appointments', title: 'นัดของฉัน', icon: 'clock', href: '/calendar',
          items: apptItems.map((a) => ({ id: a.id, code: a.code, scheduledAt: a.scheduledAt, primary: a.lead?.fullName || a.title || 'นัดหมาย', secondary: a.property?.titleTh ?? null })),
        },
        {
          key: 'leads', title: 'Lead ใหม่ของฉัน', icon: 'user-plus', href: '/leads?status=new',
          items: leadItems.map((l) => ({ id: l.id, code: l.code, primary: l.fullName, secondary: l.phone })),
        },
      ],
    };
  }

  // ---- ผู้จัดการ: ปฏิบัติการทั้งทีม ---------------------------------------
  private async manager(): Promise<DashboardPayload> {
    const { start, end } = this.todayRange();
    const [pendingRequests, draftProps, teamLeads, teamApptToday, requestItems, draftItems] = await Promise.all([
      this.prisma.propertyRequest.count({ where: { deletedAt: null, status: 'pending' } }),
      this.prisma.property.count({ where: { deletedAt: null, status: 'draft' } }),
      this.prisma.lead.count({ where: { deletedAt: null, status: 'working' } }),
      this.prisma.appointment.count({ where: { deletedAt: null, status: 'upcoming', scheduledAt: { gte: start, lt: end } } }),
      this.prisma.propertyRequest.findMany({
        where: { deletedAt: null, status: 'pending' },
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, code: true, titleTh: true, province: true, district: true },
      }),
      this.prisma.property.findMany({
        where: { deletedAt: null, status: 'draft' },
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, code: true, titleTh: true },
      }),
    ]);
    return {
      role: 'property_manager',
      kpis: [
        { key: 'pendingRequests', label: 'คำขอรอตรวจ', value: pendingRequests, href: '/property-requests?status=pending', icon: 'inbox', hot: true },
        { key: 'draftProps', label: 'ร่างค้าง', value: draftProps, href: '/properties?status=draft', icon: 'building' },
        { key: 'teamLeads', label: 'Lead ทั้งทีม', value: teamLeads, href: '/leads?status=working', icon: 'user-plus' },
        { key: 'teamApptToday', label: 'นัดทีมวันนี้', value: teamApptToday, href: '/appointments', icon: 'clock' },
      ],
      agenda: [
        {
          key: 'requests', title: 'คำขอรอ convert', icon: 'inbox', href: '/property-requests?status=pending',
          items: requestItems.map((r) => ({ id: r.id, code: r.code, primary: r.titleTh, secondary: [r.province, r.district].filter(Boolean).join(' · ') || null })),
        },
        {
          key: 'properties', title: 'ทรัพย์ร่าง', icon: 'building', href: '/properties?status=draft',
          items: draftItems.map((p) => ({ id: p.id, code: p.code, primary: p.titleTh })),
        },
      ],
    };
  }

  // ---- เจ้าของ: คิวที่ต้องตัดสิน + สุขภาพธุรกิจ ----------------------------
  private async owner(user: AuthenticatedUser): Promise<DashboardPayload> {
    const [pendingReview, awaitingSign, pendingRequests, activeContracts, reviewItems, signItems, alertItems] = await Promise.all([
      this.prisma.property.count({ where: { deletedAt: null, status: 'pending_review' } }),
      this.prisma.contract.count({ where: { deletedAt: null, status: 'draft' } }),
      this.prisma.propertyRequest.count({ where: { deletedAt: null, status: 'pending' } }),
      this.prisma.contract.count({ where: { deletedAt: null, status: 'active' } }),
      this.prisma.property.findMany({
        where: { deletedAt: null, status: 'pending_review' },
        orderBy: { updatedAt: 'desc' }, take: 5,
        select: { id: true, code: true, titleTh: true },
      }),
      this.prisma.contract.findMany({
        where: { deletedAt: null, status: 'draft' },
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, code: true, endDate: true, customer: { select: { fullName: true } }, property: { select: { titleTh: true } } },
      }),
      // กันโกง (Phase 4): alert แก้ข้อมูลอ่อนไหว (Phase 5 · category owner · ส่งถึง super_admin คนนี้)
      this.prisma.notification.findMany({
        where: { recipientUserId: user.id, category: 'owner' },
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, title: true, body: true, entityType: true, entityId: true, createdAt: true },
      }),
    ]);
    const alertSection: DashAgenda[] = alertItems.length > 0 ? [{
      key: 'alerts', title: 'แจ้งเตือนอ่อนไหว (กันโกง)', icon: 'alert-triangle', href: '/audit', tone: 'alert',
      items: alertItems.map((n) => ({
        id: n.id,
        primary: n.title,
        secondary: n.body,
        scheduledAt: n.createdAt, // ช่องเวลา = "เมื่อไร"
        href: n.entityType === 'owner' && n.entityId ? `/owners/${n.entityId}` : undefined,
      })),
    }] : [];
    return {
      role: 'super_admin',
      kpis: [
        { key: 'pendingReview', label: 'รออนุมัติเผยแพร่', value: pendingReview, href: '/properties?status=pending_review', icon: 'inbox', hot: true },
        { key: 'awaitingSign', label: 'สัญญารอเซ็น', value: awaitingSign, href: '/contracts?status=draft', icon: 'file-text', hot: true },
        { key: 'pendingRequests', label: 'คำขอรอตรวจ', value: pendingRequests, href: '/property-requests?status=pending', icon: 'inbox' },
        { key: 'activeContracts', label: 'สัญญามีผล', value: activeContracts, href: '/contracts?status=active', icon: 'file-text' },
      ],
      agenda: [
        ...alertSection, // กันโกงขึ้นก่อน (เด่นสุด)
        {
          key: 'properties', title: 'ทรัพย์รอตรวจสอบ', icon: 'inbox', href: '/properties?status=pending_review',
          items: reviewItems.map((p) => ({ id: p.id, code: p.code, primary: p.titleTh })),
        },
        {
          key: 'contracts', title: 'สัญญารอเซ็น', icon: 'file-text', href: '/contracts?status=draft',
          items: signItems.map((c) => ({ id: c.id, code: c.code, endDate: c.endDate, primary: c.property?.titleTh || c.code, secondary: c.customer?.fullName ?? null })),
        },
      ],
    };
  }
}
