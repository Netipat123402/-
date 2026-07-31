import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, Prisma, Property, PropertyStatus } from '@prisma/client';
import { PropertyRepository } from './property.repository';
import { canTransition } from './property.lifecycle';
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
    this.revalidation.revalidatePublicProperties(existing.code); // ข้อมูลที่โชว์บนเว็บเปลี่ยน
    return updated;
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
    return { success: true };
  }

  async setCover(user: AuthenticatedUser, id: string, mediaId: string) {
    const prop = await this.requireInScope(user, id, 'update');
    // กัน IDOR: ตั้งปกได้เฉพาะรูปของทรัพย์ id นี้จริง
    const media = await this.prisma.propertyMedia.findFirst({ where: { id: mediaId, propertyId: id, deletedAt: null } });
    if (!media) throw new NotFoundException('ไม่พบรูปภาพของทรัพย์นี้');
    await this.prisma.$transaction([
      this.prisma.propertyMedia.updateMany({ where: { propertyId: id }, data: { isCover: false } }),
      this.prisma.propertyMedia.update({ where: { id: mediaId }, data: { isCover: true } }),
    ]);
    this.revalidation.revalidatePublicProperties(prop.code);
    return { success: true };
  }

  // --- LIFECYCLE TRANSITIONS (3 สถานะ) --------------------------------------
  /** ขอเผยแพร่ — สำหรับผู้ที่ไม่มีสิทธิ์เผยแพร่เอง: ไม่เปลี่ยนสถานะ แค่แจ้งหัวหน้า */
  async submitReview(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const p = await this.requireInScope(user, id, 'change_status');
    if (p.status !== PropertyStatus.draft) {
      throw new ConflictException('ขอเผยแพร่ได้เฉพาะทรัพย์ที่เป็นฉบับร่าง');
    }
    await this.notifications.notifyRoles(['team_lead', 'branch_manager', 'company_admin', 'super_admin'], {
      category: 'property', entityType: 'property', entityId: id,
      title: 'มีทรัพย์รอการเผยแพร่', body: `${p.code} ${p.titleTh} — โปรดตรวจและเผยแพร่`,
    });
    await this.activity.log({
      entityType: 'property', entityId: id, action: 'submit_review', actorId: user.id,
      summary: `ขอเผยแพร่ทรัพย์ ${p.code}`,
    });
    await this.audit.record(user, { action: 'submit_review', entityType: 'property', entityId: id, ...meta });
    return p;
  }

  /** เผยแพร่ทรัพย์ขึ้นเว็บ (draft → available) */
  async approve(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const p = await this.requireInScope(user, id, 'approve');
    if (p.status !== PropertyStatus.draft) {
      throw new ConflictException('เผยแพร่ได้เฉพาะทรัพย์ที่เป็นฉบับร่าง');
    }
    const res = await this.applyTransition(user, p, PropertyStatus.available, 'approve', undefined, meta);
    await this.notifications.notifyUser(p.assignedToId, {
      category: 'property', entityType: 'property', entityId: id,
      title: 'ทรัพย์ของคุณเผยแพร่แล้ว', body: `${p.code} ${p.titleTh} ขึ้นเว็บแล้ว`,
    });
    return res;
  }

  /** ถอนประกาศกลับเป็นร่าง (available → draft) */
  async reject(user: AuthenticatedUser, id: string, reason: string | undefined, meta: RequestMeta) {
    const p = await this.requireInScope(user, id, 'reject');
    if (p.status !== PropertyStatus.available) {
      throw new ConflictException('ถอนประกาศได้เฉพาะทรัพย์ที่เผยแพร่อยู่');
    }
    return this.applyTransition(user, p, PropertyStatus.draft, 'reject', reason, meta);
  }

  async changeStatus(
    user: AuthenticatedUser,
    id: string,
    toStatus: PropertyStatus,
    reason: string | undefined,
    meta: RequestMeta,
  ) {
    const p = await this.requireInScope(user, id, 'change_status');
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
