import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { LEAD_ALERT_ROLES } from '../../common/auth/operating-roles';
import { toPublicCard, toPublicProperty } from './public.serializer';
import { PublicLeadDto, PublicSearchDto } from './dto/public.dto';
import { propertySmartWhere, trainWhere } from '../../common/search/property-search';

// public เห็นเฉพาะทรัพย์ว่าง (ไม่หลุด draft/ข้อมูลภายใน)
const PUBLIC_WHERE: Prisma.PropertyWhereInput = {
  deletedAt: null,
  status: 'available',
};

/** รหัสสิ่งอำนวยความสะดวกที่เปิดใช้ (amenities เก็บเป็น JSON { code: true }) */
function amenityCodes(amenities: Prisma.JsonValue): string[] {
  if (!amenities || typeof amenities !== 'object' || Array.isArray(amenities)) return [];
  return Object.entries(amenities as Record<string, unknown>).filter(([, v]) => v === true).map(([k]) => k);
}

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async search(dto: PublicSearchDto) {
    const and: Prisma.PropertyWhereInput[] = [PUBLIC_WHERE];
    if (dto.type) and.push({ propertyType: dto.type });
    if (dto.province) and.push({ province: dto.province });
    if (dto.bedrooms != null) and.push({ bedrooms: { gte: dto.bedrooms } });
    if (dto.train) and.push(trainWhere(dto.train));
    if (dto.amenity) and.push(trainWhere(dto.amenity)); // กรองตาม amenity code (เช่น pet_friendly)
    if (dto.featured === 'true') and.push({ isFeatured: true }); // ทรัพย์แนะนำ (แอดมินกดดาว)
    if (dto.minRent != null || dto.maxRent != null) {
      and.push({ monthlyRent: { gte: dto.minRent ?? undefined, lte: dto.maxRent ?? undefined } });
    }
    if (dto.q) and.push(propertySmartWhere(dto.q)); // smart search ทุกฟิลด์

    const orderBy: Prisma.PropertyOrderByWithRelationInput =
      dto.sort === 'price_asc' ? { monthlyRent: 'asc' }
      : dto.sort === 'price_desc' ? { monthlyRent: 'desc' }
      : dto.sort === 'popular' ? { viewCount: 'desc' } // ทรัพย์ดูเยอะ
      : { publishedAt: 'desc' };

    const where: Prisma.PropertyWhereInput = { AND: and };
    const page = dto.page ?? 1, limit = dto.limit ?? 20;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: { media: true } }),
      this.prisma.property.count({ where }),
    ]);
    return { items: rows.map(toPublicCard), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getByCode(code: string) {
    const p = await this.prisma.property.findFirst({
      where: { AND: [PUBLIC_WHERE, { code }] },
      include: { media: true },
    });
    if (!p) throw new NotFoundException('ไม่พบทรัพย์');
    // MR-13: ไม่นับ view ที่นี่ — endpoint นี้ถูก ISR cache (เรียกจริงแค่ตอน revalidate)
    // ย้ายการนับไป recordView() ผ่าน POST /properties/:code/view (client เรียกทุกครั้งที่เปิด)
    return toPublicProperty(p);
  }

  /**
   * MR-13: นับยอดเข้าชม แยกจาก read path ที่ถูก cache
   * - atomic increment แถวเดียว (ไม่มี lock contention) · best-effort ไม่ throw
   */
  async recordView(code: string): Promise<void> {
    await this.prisma.property
      .updateMany({ where: { AND: [PUBLIC_WHERE, { code }] }, data: { viewCount: { increment: 1 } } })
      .catch(() => { /* */ });
  }

  /**
   * ทรัพย์ใกล้เคียง — Ranking by Priority Score (ความคล้ายกับทรัพย์ที่ลูกค้ากำลังดู)
   * น้ำหนัก: โครงการเดียวกัน 50 · เขตเดียวกัน 20 · ประเภท 15 · ราคาใกล้เคียง ≤20 · จังหวัด 10 · ห้องนอนเท่ากัน 8 · สิ่งอำนวยที่ตรงกัน ≤10
   */
  async similar(code: string, take = 6) {
    const ref = await this.prisma.property.findFirst({ where: { AND: [PUBLIC_WHERE, { code }] } });
    if (!ref) return [];
    const pool = await this.prisma.property.findMany({
      where: { AND: [PUBLIC_WHERE, { id: { not: ref.id } }] },
      include: { media: true },
      take: 60, // วงพิจารณาแบบจำกัด แล้วให้คะแนนใน JS
    });
    const refRent = Number(ref.monthlyRent);
    const refAmen = amenityCodes(ref.amenities);
    const scored = pool
      .map((p) => ({ p, score: this.similarScore(ref, p, refRent, refAmen) }))
      .filter((x) => x.score > 0) // ต้องคล้ายอย่างน้อย 1 มิติ
      .sort((a, b) => b.score - a.score
        || (b.p.publishedAt?.getTime() ?? 0) - (a.p.publishedAt?.getTime() ?? 0));
    return scored.slice(0, take).map((x) => toPublicCard(x.p));
  }

  private similarScore(
    ref: { propertyType: string; province: string | null; district: string | null; projectName: string | null; bedrooms: number | null; amenities: Prisma.JsonValue },
    p: { propertyType: string; province: string | null; district: string | null; projectName: string | null; bedrooms: number | null; monthlyRent: Prisma.Decimal; amenities: Prisma.JsonValue },
    refRent: number, refAmen: string[],
  ): number {
    let s = 0;
    if (ref.projectName && p.projectName === ref.projectName) s += 50; // โครงการเดียวกัน = ใกล้สุด
    if (ref.district && p.district === ref.district) s += 20;
    if (p.propertyType === ref.propertyType) s += 15;
    if (ref.province && p.province === ref.province) s += 10;
    if (ref.bedrooms != null && p.bedrooms === ref.bedrooms) s += 8;
    const pr = Number(p.monthlyRent);
    if (refRent > 0 && pr > 0) {
      const diff = Math.abs(pr - refRent) / refRent;
      if (diff <= 0.1) s += 20; else if (diff <= 0.25) s += 12; else if (diff <= 0.5) s += 5;
    }
    const shared = amenityCodes(p.amenities).filter((c) => refAmen.includes(c)).length;
    s += Math.min(shared * 2, 10);
    return s;
  }

  /** master data สำหรับ filter (province, type, amenity, furnished) */
  async masterData() {
    const rows = await this.prisma.masterData.findMany({
      where: { isActive: true, category: { in: ['province', 'property_type', 'amenity', 'furnished'] } },
      orderBy: { sortOrder: 'asc' },
      select: { category: true, code: true, labelTh: true, labelEn: true },
    });
    const grouped: Record<string, { code: string; labelTh: string; labelEn: string }[]> = {};
    for (const r of rows) {
      (grouped[r.category] ??= []).push({ code: r.code, labelTh: r.labelTh, labelEn: r.labelEn });
    }
    return grouped;
  }

  private async consentVersion(): Promise<string> {
    const s = await this.prisma.setting.findUnique({ where: { key: 'privacy.consent_version' } });
    const v = s?.value as { current?: string } | null;
    return v?.current ?? '1.0';
  }

  // ใช้ค่า sequence สูงสุดที่มีจริง (ไม่ใช่ count) — กันรหัสซ้ำหลังลบ record
  private async genLeadCode(): Promise<string> {
    const head = `LD-${new Date().getFullYear()}-`;
    // #10: ดึงเฉพาะรหัสล่าสุดผ่าน unique index (ไม่ scan ทั้งปี)
    const last = await this.prisma.lead.findFirst({ where: { code: { startsWith: head } }, orderBy: { code: 'desc' }, select: { code: true } });
    const n = last ? parseInt(last.code.slice(head.length), 10) : 0;
    return head + String((Number.isFinite(n) ? n : 0) + 1).padStart(4, '0');
  }

  /** รับ Lead จากฟอร์มนัด (Public — ไม่มี auth) */
  async createLead(dto: PublicLeadDto, meta: { ip?: string; userAgent?: string }) {
    let propertyId: string | null = null;
    if (dto.propertyCode) {
      const prop = await this.prisma.property.findFirst({
        where: { AND: [PUBLIC_WHERE, { code: dto.propertyCode }] },
        select: { id: true },
      });
      propertyId = prop?.id ?? null;
    }

    const consentVersion = await this.consentVersion();
    // G1: retry เมื่อรหัสชน (ฟอร์ม public โดนยิงพร้อมกันได้)
    let lead;
    for (let attempt = 0; ; attempt++) {
      try {
        lead = await this.prisma.lead.create({
          data: {
            code: await this.genLeadCode(),
            fullName: dto.fullName, phone: dto.phone,
            source: 'public_web', status: 'new', message: dto.message,
            preferredViewAt: dto.preferredViewAt,
            consentAt: new Date(), consentVersion,
            interests: propertyId ? { create: [{ propertyId }] } : undefined,
          },
        });
        break;
      } catch (e) {
        if (attempt < 4 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }

    // activity timeline + แจ้งเตือนทีม (Phase 1 Lead Flow) — กัน lead ตกหล่น
    await this.prisma.activityLog.create({
      data: { entityType: 'lead', entityId: lead.id, action: 'create', summary: `Lead ใหม่จากเว็บ: ${lead.fullName}` },
    });
    // แจ้งทีมขาย + ผู้จัดการ + เจ้าของ (operating จริง · ดู operating-roles.ts) — ให้ agent รับ lead ใหม่เองได้
    await this.notifications.notifyRoles(
      LEAD_ALERT_ROLES,
      {
        category: 'lead', entityType: 'lead', entityId: lead.id,
        title: 'Lead ใหม่จากเว็บไซต์',
        body: `${lead.fullName} (${lead.phone}) สนใจทรัพย์ — โปรดติดต่อกลับ`,
        titleKey: 'notif.leadWeb.title', bodyKey: 'notif.leadWeb.body', params: { name: lead.fullName, phone: lead.phone },
      },
    );
    this.logger.log(`New public lead ${lead.code} (${meta.ip ?? '-'})`);

    // ไม่คืนข้อมูลภายใน — แค่ยืนยัน
    return { success: true, leadCode: lead.code, message: 'ได้รับข้อมูลแล้ว ทีมงานจะติดต่อกลับโดยเร็ว' };
  }
}
