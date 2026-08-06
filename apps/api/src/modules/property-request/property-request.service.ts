import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma, PropertyRequest } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../common/trail/audit.service';
import { ActivityService } from '../../common/trail/activity.service';
import { NotificationService } from '../notification/notification.service';
import { resolveScope } from '../../common/auth/permissions.guard';
import type { AuthenticatedUser, Scope } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';
import { REQUEST_REVIEW_ROLES } from '../../common/auth/operating-roles';
import {
  CreatePropertyRequestDto, QueryPropertyRequestDto, UpdatePropertyRequestDto,
} from './dto/property-request.dto';

const PAGE_SIZE = 20;
// ผู้ตรวจคำขอเพิ่มทรัพย์ = ผู้จัดการ + เจ้าของ (operating จริง · ดู operating-roles.ts)
const REVIEWER_ROLES = REQUEST_REVIEW_ROLES;
const SUBMITTER_INCLUDE = { submittedBy: { select: { id: true, fullName: true } }, reviewedBy: { select: { id: true, fullName: true } } };

@Injectable()
export class PropertyRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationService,
  ) {}

  private scopeWhere(user: AuthenticatedUser, scope: Scope): Prisma.PropertyRequestWhereInput {
    const base: Prisma.PropertyRequestWhereInput = { deletedAt: null };
    if (scope === 'all') return base;
    if (scope === 'branch') return { ...base, OR: [{ branchId: user.branchId }, { branchId: null }] };
    if (scope === 'team') return { ...base, submittedBy: { teamId: user.teamId } };
    return { ...base, submittedById: user.id };
  }

  private require(user: AuthenticatedUser, action: string): Scope {
    const scope = resolveScope(user, 'property_request', action);
    if (!scope) throw new ForbiddenException(`ไม่มีสิทธิ์ property_request:${action}`);
    return scope;
  }

  // "ผู้ตรวจ" = มีสิทธิ์ convert (ผู้จัดการ/เจ้าของ) → แก้/จัดการคำขอได้ทุกอัน
  // เซลไม่มี convert → แก้/ถอน ได้เฉพาะคำขอของตัวเอง (อ่านได้ทั้งออฟฟิศ)
  private isReviewer(user: AuthenticatedUser): boolean {
    return !!resolveScope(user, 'property_request', 'convert');
  }

  private async genCode(): Promise<string> {
    const head = `PR-${new Date().getFullYear()}-`;
    const last = await this.prisma.propertyRequest.findFirst({ where: { code: { startsWith: head } }, orderBy: { code: 'desc' }, select: { code: true } });
    const n = last ? parseInt(last.code.slice(head.length), 10) : 0;
    return head + String((Number.isFinite(n) ? n : 0) + 1).padStart(4, '0');
  }

  // กันลงซ้ำ (v2) — เตือนถ้าเบอร์เจ้าของ หรือ โครงการ+เขต ตรงของเดิม (property หรือ คำขอที่ยังไม่ปิด)
  private async findDuplicateHints(ownerPhone?: string | null, projectName?: string | null, district?: string | null): Promise<string[]> {
    const hints: string[] = [];
    if (ownerPhone) {
      const owner = await this.prisma.owner.findFirst({ where: { phone: ownerPhone, deletedAt: null }, select: { fullName: true } });
      if (owner) hints.push(`มีเจ้าของทรัพย์เบอร์นี้อยู่แล้ว: ${owner.fullName}`);
    }
    if (projectName) {
      const prop = await this.prisma.property.findFirst({ where: { projectName, district: district ?? undefined, deletedAt: null }, select: { code: true } });
      if (prop) hints.push(`มีประกาศในโครงการนี้อยู่แล้ว: ${prop.code}`);
    }
    return hints;
  }

  async create(user: AuthenticatedUser, dto: CreatePropertyRequestDto, meta: RequestMeta) {
    this.require(user, 'create');
    let req: PropertyRequest | undefined;
    for (let attempt = 0; ; attempt++) {
      const code = await this.genCode();
      try {
        req = await this.prisma.propertyRequest.create({
          data: {
            code, status: 'pending',
            titleTh: dto.titleTh, propertyType: dto.propertyType,
            province: dto.province, district: dto.district, projectName: dto.projectName,
            expectedRent: dto.expectedRent, bedrooms: dto.bedrooms, bathrooms: dto.bathrooms,
            areaSqm: dto.areaSqm, note: dto.note,
            ownerName: dto.ownerName, ownerPhone: dto.ownerPhone,
            ownerConsent: dto.ownerConsent ?? false,
            ownerConsentAt: dto.ownerConsent ? new Date() : null,
            branchId: user.branchId, submittedById: user.id,
          },
        });
        break;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 5) continue;
        throw e;
      }
    }

    await this.activity.log({ entityType: 'property_request', entityId: req.id, action: 'create', actorId: user.id, summary: `ขอเพิ่มทรัพย์ ${req.code}: ${req.titleTh}` });
    await this.audit.record(user, { action: 'create', entityType: 'property_request', entityId: req.id, newValue: { code: req.code, title: req.titleTh }, ...meta });
    await this.notifications.notifyRoles(REVIEWER_ROLES, {
      category: 'property', entityType: 'property_request', entityId: req.id,
      title: 'คำขอเพิ่มทรัพย์ใหม่', body: `${req.titleTh} — ส่งโดยพนักงานขาย`,
    });

    const duplicateHints = await this.findDuplicateHints(dto.ownerPhone, dto.projectName, dto.district);
    return { ...req, duplicateHints };
  }

  async findAll(user: AuthenticatedUser, query: QueryPropertyRequestDto) {
    const scope = this.require(user, 'read');
    const where: Prisma.PropertyRequestWhereInput = { ...this.scopeWhere(user, scope) };
    if (query.status) where.status = query.status;
    if (query.q) where.OR = [{ titleTh: { contains: query.q, mode: 'insensitive' } }, { projectName: { contains: query.q, mode: 'insensitive' } }, { code: { contains: query.q, mode: 'insensitive' } }];
    const page = query.page && query.page > 0 ? query.page : 1;

    const [items, total, pendingCount] = await this.prisma.$transaction([
      this.prisma.propertyRequest.findMany({ where, include: SUBMITTER_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      this.prisma.propertyRequest.count({ where }),
      this.prisma.propertyRequest.count({ where: { ...this.scopeWhere(user, scope), status: 'pending' } }),
    ]);
    // transform.interceptor spread { items, ...meta } → คืน pagination ที่ top-level (ไม่ห่อ meta ซ้อน)
    return { items, total, page, limit: PAGE_SIZE, pendingCount };
  }

  private async getInScope(user: AuthenticatedUser, id: string, action: string): Promise<PropertyRequest> {
    const scope = this.require(user, action);
    const req = await this.prisma.propertyRequest.findFirst({ where: { id, ...this.scopeWhere(user, scope) } });
    if (!req) throw new NotFoundException('ไม่พบคำขอเพิ่มทรัพย์');
    return req;
  }

  async findOne(user: AuthenticatedUser, id: string) {
    await this.getInScope(user, id, 'read');
    return this.prisma.propertyRequest.findFirst({ where: { id }, include: { ...SUBMITTER_INCLUDE, convertedProperty: { select: { id: true, code: true, status: true } } } });
  }

  // เซลแก้คำขอ (ตอน needs_info) → กลับเป็น pending + แจ้งผู้ตรวจ
  async update(user: AuthenticatedUser, id: string, dto: UpdatePropertyRequestDto, meta: RequestMeta) {
    const req = await this.getInScope(user, id, 'update');
    if (!this.isReviewer(user) && req.submittedById !== user.id) {
      throw new ForbiddenException('แก้ได้เฉพาะคำขอของตัวเอง');
    }
    if (req.status === 'converted' || req.status === 'rejected') {
      throw new ConflictException('คำขอนี้ปิดแล้ว แก้ไขไม่ได้');
    }
    const backToPending = req.status === 'needs_info';
    const updated = await this.prisma.propertyRequest.update({
      where: { id },
      data: {
        ...dto,
        ownerConsentAt: dto.ownerConsent === true ? new Date() : dto.ownerConsent === false ? null : undefined,
        status: backToPending ? 'pending' : undefined,
      },
    });
    await this.audit.record(user, { action: 'update', entityType: 'property_request', entityId: id, ...meta });
    if (backToPending) {
      await this.notifications.notifyRoles(REVIEWER_ROLES, { category: 'property', entityType: 'property_request', entityId: id, title: 'คำขอถูกแก้ไขและส่งใหม่', body: `${updated.titleTh} — พร้อมตรวจอีกครั้ง` });
    }
    return updated;
  }

  // เซลถอนคำขอของตัวเอง (ตอนยัง pending/needs_info) — soft-delete · gate ด้วย update perm + own-check
  async withdraw(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const req = await this.getInScope(user, id, 'update');
    if (req.submittedById !== user.id) throw new ForbiddenException('ถอนได้เฉพาะคำขอของตัวเอง');
    if (req.status === 'converted' || req.status === 'rejected') throw new ConflictException('คำขอนี้ปิดแล้ว');
    await this.prisma.propertyRequest.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: user.id } });
    await this.audit.record(user, { action: 'withdraw', entityType: 'property_request', entityId: id, ...meta });
    return { ok: true };
  }

  // ผู้ดูแลทรัพย์: convert → สร้าง Property (ร่าง) prefill + เครดิต sourcing
  async convert(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const req = await this.getInScope(user, id, 'convert');
    if (req.status === 'converted') throw new ConflictException('คำขอนี้ถูกสร้างเป็นประกาศแล้ว');
    if (req.status === 'rejected') throw new ConflictException('คำขอนี้ถูกปฏิเสธแล้ว');
    if (!req.propertyType) throw new BadRequestException('คำขอยังไม่ระบุประเภททรัพย์ — ตีกลับให้เซลระบุก่อน (ขอข้อมูลเพิ่ม)');
    if (!req.ownerName && !req.ownerPhone) throw new BadRequestException('คำขอยังไม่มีข้อมูลเจ้าของทรัพย์ — ตีกลับให้เซลระบุก่อน (ขอข้อมูลเพิ่ม)');

    const property = await this.prisma.$transaction(async (tx) => {
      // resolve เจ้าของทรัพย์ — ผูกของเดิมถ้าเบอร์ตรง มิฉะนั้นสร้างใหม่ (กันข้อมูลซ้ำ)
      let ownerId: string | null = null;
      if (req.ownerPhone) {
        const existing = await tx.owner.findFirst({ where: { phone: req.ownerPhone, deletedAt: null }, select: { id: true } });
        ownerId = existing?.id ?? null;
      }
      if (!ownerId) {
        const owner = await tx.owner.create({ data: { fullName: req.ownerName ?? 'เจ้าของทรัพย์ (จากคำขอ)', phone: req.ownerPhone, branchId: req.branchId, createdBy: user.id, updatedBy: user.id } });
        ownerId = owner.id;
      }

      // gen property code (CD/HS/TH/AP ตามประเภท — ลอกแพตเทิร์นเดิม)
      const prefix = { condo: 'CD', house: 'HS', townhome: 'TH', apartment: 'AP' }[req.propertyType as string] ?? 'CD';
      const head = `${prefix}-${new Date().getFullYear()}-`;
      const last = await tx.property.findFirst({ where: { code: { startsWith: head } }, orderBy: { code: 'desc' }, select: { code: true } });
      const seq = last ? parseInt(last.code.slice(head.length), 10) : 0;
      const code = head + String((Number.isFinite(seq) ? seq : 0) + 1).padStart(4, '0');

      const prop = await tx.property.create({
        data: {
          code, status: 'draft', ownerId,
          propertyType: req.propertyType!,
          titleTh: req.titleTh, descriptionTh: req.note,
          province: req.province, district: req.district, projectName: req.projectName,
          monthlyRent: req.expectedRent ?? 0, // ผู้ดูแลตั้งราคาจริงในร่าง
          bedrooms: req.bedrooms, bathrooms: req.bathrooms, areaSqm: req.areaSqm,
          assignedToId: user.id, sourcedById: req.submittedById, // เครดิตเซลผู้หา
          branchId: req.branchId, createdBy: user.id, updatedBy: user.id,
        },
      });

      await tx.propertyRequest.update({ where: { id }, data: { status: 'converted', convertedPropertyId: prop.id, reviewedById: user.id } });
      return prop;
    });

    await this.activity.log({ entityType: 'property_request', entityId: id, action: 'convert', actorId: user.id, summary: `สร้างประกาศ ${property.code} จากคำขอ ${req.code}` });
    await this.audit.record(user, { action: 'convert', entityType: 'property_request', entityId: id, newValue: { propertyId: property.id, code: property.code }, ...meta });
    await this.notifications.notifyUser(req.submittedById, { category: 'property', entityType: 'property', entityId: property.id, title: 'คำขอของคุณถูกสร้างเป็นประกาศแล้ว', body: `${property.code} — อยู่ระหว่างจัดข้อมูล/รออนุมัติ` });
    return property;
  }

  // ตีกลับให้แก้ (needs_info) — soft, ยังแก้ต่อได้
  async requestInfo(user: AuthenticatedUser, id: string, reason: string, meta: RequestMeta) {
    const req = await this.getInScope(user, id, 'reject');
    if (req.status === 'converted' || req.status === 'rejected') throw new ConflictException('คำขอนี้ปิดแล้ว');
    const updated = await this.prisma.propertyRequest.update({ where: { id }, data: { status: 'needs_info', reviewNote: reason, reviewedById: user.id } });
    await this.audit.record(user, { action: 'needs_info', entityType: 'property_request', entityId: id, newValue: { reason }, ...meta });
    await this.notifications.notifyUser(req.submittedById, { category: 'property', entityType: 'property_request', entityId: id, title: 'คำขอเพิ่มทรัพย์ต้องการข้อมูลเพิ่ม', body: reason });
    return updated;
  }

  // ปฏิเสธถาวร
  async reject(user: AuthenticatedUser, id: string, reason: string, meta: RequestMeta) {
    const req = await this.getInScope(user, id, 'reject');
    if (req.status === 'converted') throw new ConflictException('คำขอนี้ถูกสร้างเป็นประกาศแล้ว');
    const updated = await this.prisma.propertyRequest.update({ where: { id }, data: { status: 'rejected', reviewNote: reason, reviewedById: user.id } });
    await this.audit.record(user, { action: 'reject', entityType: 'property_request', entityId: id, newValue: { reason }, ...meta });
    await this.notifications.notifyUser(req.submittedById, { category: 'property', entityType: 'property_request', entityId: id, title: 'คำขอเพิ่มทรัพย์ถูกปฏิเสธ', body: reason });
    return updated;
  }

  async remove(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    await this.getInScope(user, id, 'delete');
    await this.prisma.propertyRequest.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: user.id } });
    await this.audit.record(user, { action: 'delete', entityType: 'property_request', entityId: id, ...meta });
    return { ok: true };
  }
}
