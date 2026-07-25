import {
  ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { Lead, LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../common/trail/audit.service';
import { ActivityService } from '../../common/trail/activity.service';
import { NotificationService } from '../notification/notification.service';
import { resolveScope } from '../../common/auth/permissions.guard';
import { canTransitionLead } from './lead.lifecycle';
import type { AuthenticatedUser, Scope } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';
import {
  AssignLeadDto, CreateLeadDto, QueryLeadDto, UpdateLeadDto,
} from './dto/lead.dto';

@Injectable()
export class LeadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationService,
  ) {}

  private scopeWhere(user: AuthenticatedUser, scope: Scope): Prisma.LeadWhereInput {
    const base: Prisma.LeadWhereInput = { deletedAt: null };
    if (scope === 'all') return base;
    // L1: branch เห็น lead ของสาขาตัวเอง + lead ที่ยังไม่ระบุสาขา (เช่นจากเว็บ public) — กัน lead ตกหล่น
    if (scope === 'branch') return { ...base, OR: [{ branchId: user.branchId }, { branchId: null }] };
    if (scope === 'team') return { ...base, assignedTo: { teamId: user.teamId } };
    return { ...base, assignedToId: user.id };
  }

  private require(user: AuthenticatedUser, action: string): Scope {
    const scope = resolveScope(user, 'lead', action);
    if (!scope) throw new ForbiddenException(`ไม่มีสิทธิ์ lead:${action}`);
    return scope;
  }

  // ใช้ค่า sequence สูงสุดที่มีจริง (ไม่ใช่ count) — กันรหัสซ้ำหลังลบ record
  private async genCode(): Promise<string> {
    const head = `LD-${new Date().getFullYear()}-`;
    // #10: ดึงเฉพาะรหัสล่าสุดผ่าน unique index (ไม่ scan ทั้งปี)
    const last = await this.prisma.lead.findFirst({ where: { code: { startsWith: head } }, orderBy: { code: 'desc' }, select: { code: true } });
    const n = last ? parseInt(last.code.slice(head.length), 10) : 0;
    return head + String((Number.isFinite(n) ? n : 0) + 1).padStart(4, '0');
  }

  async create(user: AuthenticatedUser, dto: CreateLeadDto, meta: RequestMeta) {
    this.require(user, 'create');
    // G1: retry เมื่อรหัสชน (concurrent create)
    let lead: Lead | undefined;
    for (let attempt = 0; ; attempt++) {
      const code = await this.genCode();
      try {
        lead = await this.prisma.lead.create({
          data: {
            code, fullName: dto.fullName, phone: dto.phone, email: dto.email,
            source: dto.source ?? 'walk_in', status: 'new', message: dto.message,
            preferredViewAt: dto.preferredViewAt, branchId: user.branchId,
            createdBy: user.id, updatedBy: user.id,
            interests: dto.propertyIds?.length
              ? { create: dto.propertyIds.map((pid) => ({ propertyId: pid })) }
              : undefined,
          },
        });
        break;
      } catch (e) {
        if (attempt < 4 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
    await this.activity.log({ entityType: 'lead', entityId: lead.id, action: 'create', actorId: user.id, summary: `สร้าง Lead ${lead.code}` });
    await this.audit.record(user, { action: 'create', entityType: 'lead', entityId: lead.id, newValue: { code: lead.code }, ...meta });
    return lead;
  }

  async findMany(user: AuthenticatedUser, query: QueryLeadDto) {
    const scope = this.require(user, 'read');
    const and: Prisma.LeadWhereInput[] = [this.scopeWhere(user, scope)];
    if (query.status) and.push({ status: query.status });
    if (query.source) and.push({ source: query.source });
    if (query.assignedToId) and.push({ assignedToId: query.assignedToId });
    if (query.q) and.push({ OR: [{ fullName: { contains: query.q, mode: 'insensitive' } }, { phone: { contains: query.q } }] });
    if (query.dateFrom || query.dateTo) {
      const range: Prisma.DateTimeFilter = {};
      if (query.dateFrom) { const s = new Date(query.dateFrom); s.setHours(0, 0, 0, 0); range.gte = s; }
      if (query.dateTo) { const e = new Date(query.dateTo); e.setHours(0, 0, 0, 0); e.setDate(e.getDate() + 1); range.lt = e; }
      and.push({ createdAt: range });
    }
    const where: Prisma.LeadWhereInput = { AND: and };
    const page = query.page ?? 1, limit = query.limit ?? 20;
    const orderBy: Prisma.LeadOrderByWithRelationInput =
      query.sort === 'name' ? { fullName: 'asc' }
        : query.sort === 'code' ? { code: 'asc' }
          : { createdAt: 'desc' }; // MR-12
    const [items, total] = await this.prisma.$transaction([
      // R2 unlocked (owner): ส่ง "ทรัพย์ที่สนใจล่าสุด 1 อัน" มากับ list เพื่อโชว์ในคอลัมน์ (อันก่อน ๆ ดูใน detail)
      this.prisma.lead.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit,
        include: { interests: { orderBy: { createdAt: 'desc' }, take: 1, select: { property: { select: { id: true, code: true, titleTh: true } } } } },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const scope = this.require(user, 'read');
    // ดึงผู้ดูแล (ชื่อ) + ทรัพย์ที่สนใจ เพื่อโชว์ในหน้า detail/modal ของ Lead
    const lead = await this.prisma.lead.findFirst({
      where: { AND: [this.scopeWhere(user, scope), { id }] },
      include: {
        assignedTo: { select: { fullName: true } },
        interests: { select: { property: { select: { id: true, code: true, titleTh: true, status: true, monthlyRent: true } } } },
      },
    });
    if (!lead) throw new NotFoundException('ไม่พบ Lead');
    return lead;
  }

  /**
   * ลบ Lead (soft-delete) — สำหรับ lead ที่สร้างผิด/สแปม
   * บล็อก: lead ที่แปลงเป็นลูกค้าแล้ว (customerId) หรือมีนัดหมายผูกอยู่ (เก็บประวัติ/เคารพ FK)
   * lead ที่ติดต่อไม่สำเร็จให้ใช้ "ปิด Lead" (status=closed) ไม่ใช่ลบ
   */
  async remove(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const lead = await this.requireInScope(user, id, 'delete');
    if (lead.customerId) throw new ConflictException('Lead นี้แปลงเป็นลูกค้าแล้ว ลบไม่ได้ (เก็บเป็นหลักฐาน)');
    const apptCount = await this.prisma.appointment.count({ where: { leadId: id, deletedAt: null } });
    if (apptCount > 0) throw new ConflictException('Lead นี้มีนัดหมายผูกอยู่ ลบไม่ได้');
    await this.prisma.lead.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: user.id } });
    await this.audit.record(user, {
      action: 'delete', entityType: 'lead', entityId: id,
      oldValue: { code: lead.code, fullName: lead.fullName }, ...meta,
    });
    return { success: true };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateLeadDto, meta: RequestMeta) {
    await this.requireInScope(user, id, 'update');
    const lead = await this.prisma.lead.update({ where: { id }, data: { ...dto, updatedBy: user.id } });
    await this.audit.record(user, { action: 'update', entityType: 'lead', entityId: id, ...meta });
    return lead;
  }

  async assign(user: AuthenticatedUser, id: string, dto: AssignLeadDto, meta: RequestMeta) {
    const existing = await this.requireInScope(user, id, 'assign');
    // Phase 16: "รับดูแลคลิกเดียว" — assign + (ถ้ายัง new) เริ่มดูแล ใน UPDATE เดียว (atomic, ไม่มี half-state)
    const alsoStart = !!dto.startWorking && canTransitionLead(existing.status, LeadStatus.working);
    const lead = await this.prisma.lead.update({
      where: { id },
      data: { assignedToId: dto.assignedToId, ...(alsoStart ? { status: LeadStatus.working } : {}), updatedBy: user.id },
    });
    await this.activity.log({ entityType: 'lead', entityId: id, action: 'assign', actorId: user.id, summary: `มอบหมาย Lead ให้ ${dto.assignedToId}` });
    if (alsoStart) {
      await this.activity.log({ entityType: 'lead', entityId: id, action: 'status_change', actorId: user.id, summary: `Lead: ${existing.status} → working`, metadata: { from: existing.status, to: 'working' } });
    }
    // แจ้งเตือนเฉพาะเมื่อมอบให้ "คนอื่น" (รับดูแลเอง = ไม่ต้องเด้งหาตัวเอง)
    if (dto.assignedToId !== user.id) {
      await this.notifications.notifyUser(dto.assignedToId, {
        category: 'lead', entityType: 'lead', entityId: id,
        title: 'คุณได้รับมอบหมาย Lead ใหม่',
        body: `${lead.fullName} (${lead.phone}) — โปรดติดตาม`,
      });
    }
    await this.audit.record(user, { action: 'assign', entityType: 'lead', entityId: id, newValue: { assignedToId: dto.assignedToId, ...(alsoStart ? { status: 'working' } : {}) }, ...meta });
    return lead;
  }

  async changeStatus(user: AuthenticatedUser, id: string, to: LeadStatus, lostReason: string | undefined, meta: RequestMeta) {
    const lead = await this.requireInScope(user, id, 'change_status');
    if (!canTransitionLead(lead.status, to)) {
      throw new ConflictException(`เปลี่ยนสถานะ Lead จาก ${lead.status} ไป ${to} ไม่ได้`);
    }
    // ปิดจบแบบไม่สำเร็จ = ใส่เหตุผลได้ (ไม่บังคับ)
    const updated = await this.prisma.lead.update({
      where: { id }, data: { status: to, lostReason: to === 'closed' ? (lostReason ?? lead.lostReason) : lead.lostReason, updatedBy: user.id },
    });
    await this.activity.log({ entityType: 'lead', entityId: id, action: 'status_change', actorId: user.id, summary: `Lead: ${lead.status} → ${to}`, metadata: { from: lead.status, to, lostReason } });
    await this.audit.record(user, { action: 'change_status', entityType: 'lead', entityId: id, oldValue: { status: lead.status }, newValue: { status: to }, ...meta });
    return updated;
  }

  /** แปลง lead → customer (Phase 1 — qualified lead กลายเป็นลูกค้า) */
  async convert(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const lead = await this.requireInScope(user, id, 'convert');
    if (lead.customerId) throw new ConflictException('Lead นี้ถูกแปลงเป็นลูกค้าแล้ว');
    const result = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: { fullName: lead.fullName, phone: lead.phone, email: lead.email, branchId: lead.branchId, createdBy: user.id, updatedBy: user.id },
      });
      // MR-36: claim แบบ atomic — อัปเดตเฉพาะตอน customerId ยังว่าง (กัน convert ซ้อน → ลูกค้าซ้ำ)
      // 2 request พร้อมกัน: ตัวที่ชนะได้ count=1, ตัวที่แพ้ได้ count=0 → throw → rollback customer ที่เพิ่งสร้าง
      const claim = await tx.lead.updateMany({
        where: { id, customerId: null },
        data: { customerId: customer.id, status: 'closed', updatedBy: user.id },
      });
      if (claim.count === 0) throw new ConflictException('Lead นี้ถูกแปลงเป็นลูกค้าแล้ว');
      return customer;
    });
    await this.activity.log({ entityType: 'customer', entityId: result.id, action: 'create', actorId: user.id, summary: `แปลงจาก Lead ${lead.code}` });
    await this.audit.record(user, { action: 'convert', entityType: 'lead', entityId: id, newValue: { customerId: result.id }, ...meta });
    return result;
  }

  private async requireInScope(user: AuthenticatedUser, id: string, action: string): Promise<Lead> {
    const scope = this.require(user, action);
    const lead = await this.prisma.lead.findFirst({ where: { AND: [this.scopeWhere(user, scope), { id }] } });
    if (!lead) throw new NotFoundException('ไม่พบ Lead');
    return lead;
  }
}
