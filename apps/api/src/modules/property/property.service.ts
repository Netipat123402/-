import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, Prisma, Property, PropertyStatus } from '@prisma/client';
import { PropertyRepository } from './property.repository';
import { canTransition, isOperationalTransition } from './property.lifecycle';
import { computePropertyCompleteness, type CompletenessResult } from './property-completeness';
import { OWNER_ALERT_ROLES } from '../../common/auth/operating-roles';
import { propertySmartWhere } from '../../common/search/property-search';
import { extname } from 'node:path';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { assertAllowedFileType } from '../../common/files/file-type';
import { AuditService } from '../../common/trail/audit.service';
import { ActivityService } from '../../common/trail/activity.service';
import { NotificationService } from '../notification/notification.service';
import { RevalidationService } from '../../common/revalidation/revalidation.service';
import { resolveScope } from '../../common/auth/permissions.guard';
import { assertDeletable } from '../../common/guards/deletion-guard';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';

// RequestMeta ย้ายไป common/types/request-meta (MR-28) — re-export กัน import เดิมที่อาจหลงเหลือ
export type { RequestMeta };

@Injectable()
export class PropertyService {
  constructor(
    private readonly repo: PropertyRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationService,
    private readonly revalidation: RevalidationService,
    private readonly storage: StorageService,
  ) {}

  // --- CREATE ---------------------------------------------------------------
  async create(user: AuthenticatedUser, dto: CreatePropertyDto, meta: RequestMeta) {
    const assignedToId = dto.assignedToId ?? user.id;

    const rest: Omit<Prisma.PropertyCreateInput, 'code'> = {
      propertyType: dto.propertyType,
      status: PropertyStatus.draft,
      titleTh: dto.titleTh,
      titleEn: dto.titleEn,
      descriptionTh: dto.descriptionTh,
      descriptionEn: dto.descriptionEn,
      address: dto.address,
      province: dto.province,
      district: dto.district,
      subdistrict: dto.subdistrict,
      projectName: dto.projectName,
      latitude: dto.latitude,
      longitude: dto.longitude,
      monthlyRent: dto.monthlyRent,
      depositMonths: dto.depositMonths,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      areaSqm: dto.areaSqm,
      floor: dto.floor,
      furnished: dto.furnished,
      amenities: dto.amenities as Prisma.InputJsonValue,
      createdBy: user.id,
      updatedBy: user.id,
      owner: { connect: { id: dto.ownerId } },
      assignedTo: { connect: { id: assignedToId } },
      ...(user.branchId ? { branch: { connect: { id: user.branchId } } } : {}),
    };

    // G1: retry เมื่อรหัสชน (concurrent create / หลังลบ record)
    let property: Property | undefined;
    for (let attempt = 0; ; attempt++) {
      try {
        property = await this.repo.create({ code: await this.repo.generateCode(dto.propertyType), ...rest });
        break;
      } catch (e) {
        if (attempt < 4 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }

    await this.activity.log({
      entityType: 'property',
      entityId: property.id,
      action: 'create',
      actorId: user.id,
      summary: `สร้างทรัพย์ ${property.code}`,
    });
    await this.audit.record(user, {
      action: 'create',
      entityType: 'property',
      entityId: property.id,
      newValue: { code: property.code, status: property.status },
      ...meta,
    });
    return property;
  }

  // --- READ -----------------------------------------------------------------
  async findMany(user: AuthenticatedUser, query: QueryPropertyDto) {
    const scope = resolveScope(user, 'property', 'read');
    if (!scope) throw new ForbiddenException('ไม่มีสิทธิ์ดูทรัพย์');

    const filters: Prisma.PropertyWhereInput = {};
    if (query.status) filters.status = query.status;
    if (query.propertyType) filters.propertyType = query.propertyType;
    if (query.province) filters.province = query.province;
    if (query.assignedToId) filters.assignedToId = query.assignedToId;
    if (query.ownerId) filters.ownerId = query.ownerId; // กรองทรัพย์ตามเจ้าของ (จากหน้า owner detail "ดูทั้งหมด")
    // ช่วงค่าเช่า: gte/lte (รับมาเป็นบาท · monthlyRent เป็น Decimal — Prisma รับ number ได้)
    if (query.rentMin != null || query.rentMax != null) {
      filters.monthlyRent = {
        ...(query.rentMin != null ? { gte: query.rentMin } : {}),
        ...(query.rentMax != null ? { lte: query.rentMax } : {}),
      };
    }
    if (query.q) {
      const sw = propertySmartWhere(query.q); // smart search มาตรฐานเดียวกับ public
      if (sw.OR) filters.OR = sw.OR;
    }

    const orderBy: Prisma.PropertyOrderByWithRelationInput =
      query.sort === 'code' ? { code: 'asc' }
        : query.sort === 'price_asc' ? { monthlyRent: 'asc' }
          : query.sort === 'price_desc' ? { monthlyRent: 'desc' }
            : { createdAt: 'desc' };
    return this.repo.findManyScoped(
      this.repo.scopeWhere(user, scope),
      filters,
      query.page ?? 1,
      query.limit ?? 20,
      orderBy,
    );
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<Property> {
    const scope = resolveScope(user, 'property', 'read');
    if (!scope) throw new ForbiddenException('ไม่มีสิทธิ์ดูทรัพย์');
    const property = await this.repo.findOneScoped(id, this.repo.scopeWhere(user, scope));
    if (!property) throw new NotFoundException('ไม่พบทรัพย์'); // 404 (นอก scope = ไม่บอกว่ามี)
    return property;
  }

  // --- UPDATE ---------------------------------------------------------------
  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdatePropertyDto,
    meta: RequestMeta,
  ) {
    const existing = await this.requireInScope(user, id, 'update');
    // Phase 4b: ตรวจ "แก้เนื้อหาที่ลูกค้าเห็น" ก่อนเขียน (เทียบค่าเก่า/ใหม่)
    const materialChanged = this.hasMaterialChange(existing, dto);

    const updated = await this.repo.update(id, {
      ...dto,
      amenities: dto.amenities as Prisma.InputJsonValue,
      updatedBy: user.id,
    });

    await this.activity.log({
      entityType: 'property',
      entityId: id,
      action: 'update',
      actorId: user.id,
      summary: `แก้ไขทรัพย์ ${existing.code}`,
    });
    await this.audit.record(user, {
      action: 'update',
      entityType: 'property',
      entityId: id,
      oldValue: this.snapshot(existing),
      newValue: this.snapshot(updated),
      ...meta,
    });
    // Phase 4b: แก้เนื้อหาทรัพย์ที่เผยแพร่อยู่ → เด้งกลับรอตรวจสอบ + ซ่อนจากเว็บจนอนุมัติใหม่
    const bounced = materialChanged
      ? await this.bounceLiveToReview(user, updated, 'แก้ไขข้อมูลทรัพย์', meta)
      : null;
    this.revalidation.revalidatePublicProperties(existing.code); // ข้อมูลที่โชว์บนเว็บเปลี่ยน
    return bounced ?? updated;
  }

  // --- DELETE (soft) --------------------------------------------------------
  async remove(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const existing = await this.requireInScope(user, id, 'delete');
    // #5: กันลบทรัพย์ที่ยังมี dependent ทำงานอยู่ (soft delete ไม่ทริกเกอร์ FK Restrict)
    const [activeContracts, futureAppointments] = await this.prisma.$transaction([
      this.prisma.contract.count({
        where: { propertyId: id, deletedAt: null, status: { not: 'ended' } },
      }),
      this.prisma.appointment.count({
        where: {
          propertyId: id, deletedAt: null,
          scheduledAt: { gt: new Date() },
          status: 'upcoming',
        },
      }),
    ]);
    assertDeletable('ทรัพย์', [
      { label: `สัญญาที่ยังไม่ปิด ${activeContracts} ฉบับ`, count: activeContracts },
      { label: `นัดในอนาคต ${futureAppointments} รายการ`, count: futureAppointments },
    ]);
    await this.repo.softDelete(id, user.id);
    await this.audit.record(user, {
      action: 'delete',
      entityType: 'property',
      entityId: id,
      oldValue: { code: existing.code, status: existing.status },
      ...meta,
    });
    this.revalidation.revalidatePublicProperties(existing.code); // ถอนทรัพย์ออกจากเว็บ
    return { success: true };
  }

  // --- MEDIA (รูปทรัพย์) ----------------------------------------------------
  async addMedia(
    user: AuthenticatedUser,
    id: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
    meta: RequestMeta,
  ) {
    const prop = await this.requireInScope(user, id, 'update');
    // ตรวจ magic-byte จริง (MR-09) — รับเฉพาะรูปจริง กัน SVG/HTML ปลอม (Stored XSS)
    const safeMime = assertAllowedFileType(file.buffer, ['image']);
    // เก็บไฟล์ผ่าน StorageService (local disk หรือ MinIO) — MR-04
    const storageKey = this.storage.keyFor('properties', extname(file.originalname));
    await this.storage.putObject(storageKey, file.buffer, safeMime);
    const count = await this.prisma.propertyMedia.count({ where: { propertyId: id, deletedAt: null } });
    const media = await this.prisma.propertyMedia.create({
      data: {
        propertyId: id,
        storageKey,
        mediaType: 'image',
        sortOrder: count,
        isCover: count === 0, // รูปแรก = หน้าปก
        createdBy: user.id,
      },
    });
    await this.audit.record(user, { action: 'upload', entityType: 'property', entityId: id, ...meta });
    this.revalidation.revalidatePublicProperties(prop.code); // รูปใหม่ขึ้นเว็บ
    await this.bounceLiveToReview(user, prop, 'เพิ่มรูปทรัพย์', meta); // Phase 4b
    return media;
  }

  async deleteMedia(user: AuthenticatedUser, id: string, mediaId: string, meta: RequestMeta) {
    const prop = await this.requireInScope(user, id, 'update');
    // กัน IDOR: ลบได้เฉพาะรูปที่เป็นของทรัพย์ id นี้จริง (ไม่ใช่ mediaId ของทรัพย์อื่น)
    const res = await this.prisma.propertyMedia.updateMany({
      where: { id: mediaId, propertyId: id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (res.count === 0) throw new NotFoundException('ไม่พบรูปภาพของทรัพย์นี้');
    await this.audit.record(user, { action: 'delete', entityType: 'property', entityId: id, ...meta });
    this.revalidation.revalidatePublicProperties(prop.code);
    await this.bounceLiveToReview(user, prop, 'ลบรูปทรัพย์', meta); // Phase 4b
    return { success: true };
  }

  async setCover(user: AuthenticatedUser, id: string, mediaId: string, meta: RequestMeta) {
    const prop = await this.requireInScope(user, id, 'update');
    // กัน IDOR: ตั้งปกได้เฉพาะรูปของทรัพย์ id นี้จริง
    const media = await this.prisma.propertyMedia.findFirst({ where: { id: mediaId, propertyId: id, deletedAt: null } });
    if (!media) throw new NotFoundException('ไม่พบรูปภาพของทรัพย์นี้');
    await this.prisma.$transaction([
      this.prisma.propertyMedia.updateMany({ where: { propertyId: id }, data: { isCover: false } }),
      this.prisma.propertyMedia.update({ where: { id: mediaId }, data: { isCover: true } }),
    ]);
    this.revalidation.revalidatePublicProperties(prop.code);
    await this.bounceLiveToReview(user, prop, 'เปลี่ยนรูปปกทรัพย์', meta); // Phase 4b
    return { success: true };
  }

  // --- COMPLETENESS (Phase 3) -----------------------------------------------
  /**
   * อ่าน "ความครบถ้วน" ของประกาศ (เลี้ยง panel + ด่านก่อนขอเผยแพร่)
   * NOTE: map `items` → `checklist` เพื่อเลี่ยง TransformInterceptor ที่เห็น key 'items'
   *       แล้วเข้าใจผิดว่าเป็น paginated list (จะ hoist items เป็น data + ยัด field อื่นลง meta)
   */
  async completeness(user: AuthenticatedUser, id: string) {
    const p = await this.requireInScope(user, id, 'read');
    const { items, ...rest } = await this.computeCompleteness(p);
    return { checklist: items, ...rest };
  }

  /** รวม snapshot ของทรัพย์ + จำนวนรูป → คำนวณผ่าน pure engine */
  private async computeCompleteness(p: Property): Promise<CompletenessResult> {
    const mediaCount = await this.prisma.propertyMedia.count({
      where: { propertyId: p.id, deletedAt: null },
    });
    return computePropertyCompleteness({
      titleTh: p.titleTh,
      propertyType: p.propertyType,
      province: p.province,
      district: p.district,
      monthlyRent: p.monthlyRent,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      descriptionTh: p.descriptionTh,
      ownerId: p.ownerId,
      areaSqm: p.areaSqm,
      floor: p.floor,
      furnished: p.furnished,
      amenities: p.amenities as Record<string, unknown> | null,
      depositMonths: p.depositMonths,
      mediaCount,
    });
  }

  /** ด่านความครบถ้วน — ต้องครบจำเป็น 7/7 ก่อนเข้าสู่คิวเผยแพร่/อนุมัติ */
  private async assertPublishReady(p: Property): Promise<void> {
    const c = await this.computeCompleteness(p);
    if (!c.canPublish) {
      throw new ConflictException(
        `ข้อมูลจำเป็นยังไม่ครบ (${c.requiredDone}/${c.requiredTotal}) — ขาด: ${c.missingRequired.join(', ')}`,
      );
    }
  }

  // --- LIFECYCLE TRANSITIONS (4 สถานะ · Phase 3) ----------------------------
  /** ขอเผยแพร่ (draft → pending_review) — ผู้จัดการส่งเข้าคิวรอเจ้าของอนุมัติ · ด่านครบ 7/7 */
  async submitReview(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const p = await this.requireInScope(user, id, 'change_status');
    if (p.status !== PropertyStatus.draft) {
      throw new ConflictException('ขอเผยแพร่ได้เฉพาะทรัพย์ที่เป็นฉบับร่าง');
    }
    await this.assertPublishReady(p);
    const res = await this.applyTransition(user, p, PropertyStatus.pending_review, 'submit_review', undefined, meta);
    await this.notifications.notifyRoles(OWNER_ALERT_ROLES, {
      category: 'property', entityType: 'property', entityId: id,
      title: 'มีทรัพย์รออนุมัติเผยแพร่', body: `${p.code} ${p.titleTh} — โปรดตรวจและอนุมัติ`,
    });
    return res;
  }

  /** อนุมัติเผยแพร่ (draft/pending_review → available) — เจ้าของเท่านั้น · re-check ครบ 7/7 กัน data เปลี่ยนหลังส่ง */
  async approve(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const p = await this.requireInScope(user, id, 'approve');
    if (p.status !== PropertyStatus.draft && p.status !== PropertyStatus.pending_review) {
      throw new ConflictException('อนุมัติเผยแพร่ได้เฉพาะทรัพย์ที่เป็นร่างหรือรอตรวจสอบ');
    }
    await this.assertPublishReady(p);
    const res = await this.applyTransition(user, p, PropertyStatus.available, 'approve', undefined, meta);
    await this.notifications.notifyUser(p.assignedToId, {
      category: 'property', entityType: 'property', entityId: id,
      title: 'ทรัพย์ของคุณเผยแพร่แล้ว', body: `${p.code} ${p.titleTh} ขึ้นเว็บแล้ว`,
    });
    return res;
  }

  /**
   * ตีกลับ / ถอนประกาศ — เจ้าของเท่านั้น (property:reject)
   * - pending_review → draft : ตีกลับให้แก้ (เหตุผล "บังคับ") + แจ้งผู้ส่ง
   * - available → draft       : ถอนประกาศกลับมาแก้ไข (เหตุผลไม่บังคับ)
   */
  async reject(user: AuthenticatedUser, id: string, reason: string | undefined, meta: RequestMeta) {
    const p = await this.requireInScope(user, id, 'reject');
    if (p.status === PropertyStatus.pending_review) {
      if (!reason || !reason.trim()) {
        throw new BadRequestException('การตีกลับให้แก้ต้องระบุเหตุผล');
      }
      const res = await this.applyTransition(user, p, PropertyStatus.draft, 'reject', reason, meta);
      await this.notifications.notifyUser(p.assignedToId, {
        category: 'property', entityType: 'property', entityId: id,
        title: 'ทรัพย์ถูกตีกลับให้แก้', body: `${p.code} ${p.titleTh} — เหตุผล: ${reason}`,
      });
      return res;
    }
    if (p.status === PropertyStatus.available) {
      return this.applyTransition(user, p, PropertyStatus.draft, 'reject', reason, meta);
    }
    throw new ConflictException('ตีกลับ/ถอนได้เฉพาะทรัพย์ที่รอตรวจสอบหรือเผยแพร่อยู่');
  }

  async changeStatus(
    user: AuthenticatedUser,
    id: string,
    toStatus: PropertyStatus,
    reason: string | undefined,
    meta: RequestMeta,
  ) {
    const p = await this.requireInScope(user, id, 'change_status');
    // ⭐ Phase 4a — generic endpoint นี้ทำได้เฉพาะ transition ปฏิบัติการ (ว่าง↔ไม่ว่าง)
    // publish/approval (draft→available, pending→available, available→draft ฯลฯ) ต้องผ่านด่านที่มี gate
    // (ขอเผยแพร่/อนุมัติ/ตีกลับ/ถอน) เท่านั้น — กัน change_status ข้าม maker-checker
    if (!isOperationalTransition(p.status, toStatus)) {
      throw new ConflictException(
        'เปลี่ยนสถานะนี้ต้องผ่านด่านอนุมัติ (ขอเผยแพร่ / อนุมัติ / ตีกลับ / ถอนประกาศ) — เปลี่ยนตรงไม่ได้',
      );
    }
    return this.applyTransition(user, p, toStatus, 'change_status', reason, meta);
  }

  // --- helpers --------------------------------------------------------------
  private async applyTransition(
    user: AuthenticatedUser,
    property: Property,
    toStatus: PropertyStatus,
    action: string,
    reason: string | undefined,
    meta: RequestMeta,
  ) {
    const from = property.status;
    if (!canTransition(from, toStatus)) {
      throw new ConflictException(`เปลี่ยนสถานะจาก ${from} ไป ${toStatus} ไม่ได้`);
    }

    // Phase 13 (ข้อ 14): กันปลด rented→available ด้วยมือ ถ้ายังมีสัญญา active ผูกอยู่
    // (มิฉะนั้นสถานะทรัพย์จะขัดกับสัญญา) — เส้นทางคืนทรัพย์ที่ถูกต้อง = ปิด/สิ้นสุดสัญญา (ผ่าน PropertySync)
    // หมายเหตุ: PropertySync.sync() อัปเดตตรง ไม่ผ่าน applyTransition → contract-end sync ไม่ถูกบล็อก
    if (from === PropertyStatus.rented && toStatus === PropertyStatus.available) {
      const liveContracts = await this.prisma.contract.count({
        where: { propertyId: property.id, deletedAt: null, status: ContractStatus.active },
      });
      if (liveContracts > 0) {
        throw new ConflictException('ทรัพย์นี้ผูกกับสัญญาที่มีผลอยู่ — ปิดหรือสิ้นสุดสัญญาก่อน จึงจะทำเครื่องหมายว่างได้');
      }
    }

    const updateData: Prisma.PropertyUpdateInput = {
      status: toStatus,
      updatedBy: user.id,
    };
    if (toStatus === PropertyStatus.available && !property.publishedAt) {
      updateData.publishedAt = new Date();
    }

    // #9: เปลี่ยนสถานะ + บันทึก history เป็น atomic (ทรานแซกชันเดียว)
    const updated = await this.repo.updateStatusWithHistory(property.id, updateData, {
      fromStatus: from,
      toStatus,
      reason,
      changedBy: user.id,
    });
    await this.activity.log({
      entityType: 'property',
      entityId: property.id,
      action: 'status_change',
      actorId: user.id,
      summary: `เปลี่ยนสถานะ ${from} → ${toStatus}`,
      metadata: { from, to: toStatus, reason },
    });
    await this.audit.record(user, {
      action,
      entityType: 'property',
      entityId: property.id,
      oldValue: { status: from },
      newValue: { status: toStatus, reason },
      ...meta,
    });
    // ทรัพย์ขึ้น/ลงเว็บ (published/reserved ↔ อื่น ๆ) → ล้าง cache เว็บ public ทันที
    this.revalidation.revalidatePublicProperties(property.code);
    return updated;
  }

  // --- Phase 4b: re-review เมื่อแก้ทรัพย์ที่เผยแพร่แล้ว --------------------------
  /**
   * field "เนื้อหาที่ลูกค้าเห็น" — แก้ field พวกนี้บนทรัพย์ live → เด้งกลับรอตรวจสอบ (Option A strict)
   * ที่ "ไม่อยู่" = ภายใน ไม่เด้ง: isFeatured (ดาวแนะนำ) · assignedToId (มอบหมายผู้ดูแล)
   */
  private static readonly MATERIAL_FIELDS = [
    'titleTh', 'titleEn', 'propertyType', 'descriptionTh', 'descriptionEn', 'address',
    'province', 'district', 'subdistrict', 'projectName', 'latitude', 'longitude',
    'monthlyRent', 'depositMonths', 'bedrooms', 'bathrooms', 'areaSqm', 'floor', 'furnished', 'amenities',
  ] as const;

  /** normalize เทียบค่าเก่า/ใหม่ (Decimal→string · object→JSON คีย์เรียง) → กันเด้งตอนเซฟค่าเดิม (no-op) */
  private normalizeValue(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    if (v instanceof Prisma.Decimal) return v.toString();
    if (typeof v === 'object') return JSON.stringify(v, Object.keys(v as object).sort());
    return String(v);
  }

  private hasMaterialChange(existing: Property, dto: UpdatePropertyDto): boolean {
    return PropertyService.MATERIAL_FIELDS.some((key) => {
      if (!(key in dto)) return false;
      const nv = (dto as Record<string, unknown>)[key];
      if (nv === undefined) return false;
      const ov = (existing as unknown as Record<string, unknown>)[key];
      return this.normalizeValue(ov) !== this.normalizeValue(nv);
    });
  }

  /** เด้งทรัพย์ที่ "เผยแพร่อยู่" กลับไปรอตรวจสอบ (ซ่อนจากเว็บ) + แจ้งผู้อนุมัติ — ใช้ตอนแก้เนื้อหา/รูป */
  private async bounceLiveToReview(
    user: AuthenticatedUser,
    property: Property,
    what: string,
    meta: RequestMeta,
  ): Promise<Property | null> {
    if (property.status !== PropertyStatus.available) return null;
    const res = await this.applyTransition(user, property, PropertyStatus.pending_review, 'resubmit_review', what, meta);
    await this.notifications.notifyRoles(OWNER_ALERT_ROLES, {
      category: 'property', entityType: 'property', entityId: property.id,
      title: 'ทรัพย์ที่แก้ไขรอตรวจสอบอีกครั้ง',
      body: `${property.code} ${property.titleTh} — ${what} · ถูกซ่อนจากเว็บจนอนุมัติใหม่`,
    });
    return res;
  }

  private async requireInScope(
    user: AuthenticatedUser,
    id: string,
    action: string,
  ): Promise<Property> {
    const scope = resolveScope(user, 'property', action);
    if (!scope) throw new ForbiddenException(`ไม่มีสิทธิ์ property:${action}`);
    const property = await this.repo.findOneScoped(id, this.repo.scopeWhere(user, scope));
    if (!property) throw new NotFoundException('ไม่พบทรัพย์');
    return property;
  }

  private snapshot(p: Property) {
    // เก็บฟิลด์ที่ผู้ใช้แก้บ่อย/อยากเห็นในบันทึกกิจกรรม (ราคา/ทำเล/สเปก/สถานะ)
    return {
      status: p.status,
      titleTh: p.titleTh,
      propertyType: p.propertyType,
      province: p.province,
      district: p.district,
      projectName: p.projectName,
      monthlyRent: p.monthlyRent.toString(),
      depositMonths: p.depositMonths,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      areaSqm: p.areaSqm?.toString() ?? null,
      floor: p.floor,
      isFeatured: p.isFeatured,
      assignedToId: p.assignedToId,
    };
  }
}
