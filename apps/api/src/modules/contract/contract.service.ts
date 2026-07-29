import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Contract, ContractStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../common/trail/audit.service';
import { ActivityService } from '../../common/trail/activity.service';
import { resolveScope } from '../../common/auth/permissions.guard';
import {
  canTransitionContract,
  LIVE_CONTRACT_STATUSES,
  OCCUPYING_CONTRACT_STATUSES,
  RENEWABLE_CONTRACT_STATUSES,
} from './contract.lifecycle';
import { ReceiptService } from './receipt.service';
import { PropertySyncService } from './property-sync.service';
import { NEVER_MATCH } from '../../common/auth/scope.util';
import type { AuthenticatedUser, Scope } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';
import {
  ChangeContractStatusDto, CreateContractDto, GenerateReceiptDto, QueryContractDto, RenewContractDto,
} from './dto/contract.dto';

@Injectable()
export class ContractService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly receipts: ReceiptService,        // MR-29
    private readonly propertySync: PropertySyncService, // MR-29
  ) {}

  private scopeWhere(user: AuthenticatedUser, scope: Scope): Prisma.ContractWhereInput {
    const base: Prisma.ContractWhereInput = { deletedAt: null };
    if (scope === 'all') return base;
    if (scope === 'branch') return user.branchId ? { ...base, branchId: user.branchId } : { ...base, ...NEVER_MATCH };
    if (scope === 'team') return user.teamId ? { ...base, agent: { teamId: user.teamId } } : { ...base, ...NEVER_MATCH };
    return { ...base, agentId: user.id };
  }

  private require(user: AuthenticatedUser, action: string): Scope {
    const scope = resolveScope(user, 'contract', action);
    if (!scope) throw new ForbiddenException(`ไม่มีสิทธิ์ contract:${action}`);
    return scope;
  }

  // --- A5: ตรวจ entity ที่อ้างอิงต้องอยู่ในสิทธิ์ของผู้ใช้ (กันผูกข้ามสาขา) ---
  private async assertCustomer(user: AuthenticatedUser, id: string) {
    const scope = resolveScope(user, 'customer', 'read');
    if (!scope) throw new ForbiddenException('ไม่มีสิทธิ์อ้างอิงลูกค้า');
    const w: Prisma.CustomerWhereInput = { id, deletedAt: null };
    if (scope !== 'all') w.branchId = user.branchId;
    if (!(await this.prisma.customer.findFirst({ where: w, select: { id: true } }))) {
      throw new NotFoundException('ไม่พบลูกค้าในสิทธิ์ของคุณ');
    }
  }

  private async assertOwner(user: AuthenticatedUser, id: string) {
    const scope = resolveScope(user, 'owner', 'read');
    if (!scope) throw new ForbiddenException('ไม่มีสิทธิ์อ้างอิงเจ้าของ');
    const w: Prisma.OwnerWhereInput = { id, deletedAt: null };
    if (scope === 'own') w.createdBy = user.id;
    else if (scope !== 'all') w.branchId = user.branchId;
    if (!(await this.prisma.owner.findFirst({ where: w, select: { id: true } }))) {
      throw new NotFoundException('ไม่พบเจ้าของในสิทธิ์ของคุณ');
    }
  }

  private async assertAgent(user: AuthenticatedUser, agentId: string) {
    const w: Prisma.UserWhereInput = { id: agentId, deletedAt: null, status: 'active' };
    if (resolveScope(user, 'contract', 'create') !== 'all') w.branchId = user.branchId;
    if (!(await this.prisma.user.findFirst({ where: w, select: { id: true } }))) {
      throw new BadRequestException('เจ้าหน้าที่ไม่ถูกต้องหรืออยู่นอกสาขาของคุณ');
    }
  }

  // ใช้ค่า sequence สูงสุดที่มีจริง (ไม่ใช่ count) — กันรหัสซ้ำหลังลบ record
  private async genCode(): Promise<string> {
    const head = `CT-${new Date().getFullYear()}-`;
    // #10: ดึงเฉพาะรหัสล่าสุดผ่าน unique index (ไม่ scan ทั้งปี)
    const last = await this.prisma.contract.findFirst({ where: { code: { startsWith: head } }, orderBy: { code: 'desc' }, select: { code: true } });
    const n = last ? parseInt(last.code.slice(head.length), 10) : 0;
    return head + String((Number.isFinite(n) ? n : 0) + 1).padStart(4, '0');
  }

  async create(user: AuthenticatedUser, dto: CreateContractDto, meta: RequestMeta) {
    this.require(user, 'create');
    // C1: validation วันที่ + สถานะทรัพย์
    if (!dto.startDate || !dto.endDate) {
      throw new BadRequestException('ต้องระบุวันเริ่มและวันสิ้นสุดสัญญา');
    }
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('วันสิ้นสุดสัญญาต้องอยู่หลังวันเริ่มสัญญา');
    }
    // A5: ทรัพย์ต้องอยู่ใน read-scope ของผู้ใช้ (กันผูกข้ามสาขา) + ตรวจสถานะ
    const pscope = resolveScope(user, 'property', 'read');
    if (!pscope) throw new ForbiddenException('ไม่มีสิทธิ์อ้างอิงทรัพย์');
    const pw: Prisma.PropertyWhereInput = { id: dto.propertyId, deletedAt: null };
    if (pscope === 'branch') pw.branchId = user.branchId;
    else if (pscope === 'team') pw.assignedTo = { teamId: user.teamId };
    else if (pscope === 'own') pw.assignedToId = user.id;
    const prop = await this.prisma.property.findFirst({ where: pw, select: { status: true } });
    if (!prop) throw new NotFoundException('ไม่พบทรัพย์ในสิทธิ์ของคุณ');
    if (prop.status !== 'available') {
      throw new ConflictException(`ทรัพย์สถานะ "${prop.status}" ทำสัญญาไม่ได้ (ต้องเป็นทรัพย์ว่าง)`);
    }
    // #3: กันทำสัญญาซ้อน — ทรัพย์เดียวห้ามมีสัญญาที่ "ครองทรัพย์" (pending_documents+) มากกว่า 1 ฉบับ
    const liveCount = await this.prisma.contract.count({
      where: { propertyId: dto.propertyId, deletedAt: null, status: { in: LIVE_CONTRACT_STATUSES } },
    });
    if (liveCount > 0) {
      throw new ConflictException('ทรัพย์นี้มีสัญญาที่กำลังดำเนินการอยู่แล้ว (ปิด/ยกเลิกสัญญาเดิมก่อน)');
    }
    // A5: ลูกค้า/เจ้าของ/agent ที่อ้างอิงต้องอยู่ในสิทธิ์ของผู้ใช้
    await this.assertCustomer(user, dto.customerId);
    await this.assertOwner(user, dto.ownerId);
    await this.assertAgent(user, dto.agentId);

    // G1: retry เมื่อรหัสชน (concurrent create)
    let contract: Contract | undefined;
    for (let attempt = 0; ; attempt++) {
      const code = await this.genCode();
      try {
        contract = await this.prisma.contract.create({
          data: {
            code, status: 'draft', startDate: dto.startDate, endDate: dto.endDate,
            monthlyRent: dto.monthlyRent, depositAmount: dto.depositAmount, commissionAmount: dto.commissionAmount,
            branchId: user.branchId, createdBy: user.id, updatedBy: user.id,
            property: { connect: { id: dto.propertyId } },
            owner: { connect: { id: dto.ownerId } },
            customer: { connect: { id: dto.customerId } },
            agent: { connect: { id: dto.agentId } },
          },
        });
        break;
      } catch (e) {
        if (attempt < 4 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
    // ทรัพย์ยังคง available ระหว่างสัญญาเป็นร่าง (live-contract guard กันทำสัญญาซ้อน) → กลายเป็น rented ตอนสัญญามีผล
    await this.activity.log({ entityType: 'contract', entityId: contract.id, action: 'create', actorId: user.id, summary: `สร้างสัญญา ${contract.code}` });
    await this.audit.record(user, { action: 'create', entityType: 'contract', entityId: contract.id, newValue: { code: contract.code }, ...meta });
    return contract;
  }

  async findMany(user: AuthenticatedUser, query: QueryContractDto) {
    const scope = this.require(user, 'read');
    const and: Prisma.ContractWhereInput[] = [this.scopeWhere(user, scope)];
    if (query.status) and.push({ status: query.status });
    if (query.customerId) and.push({ customerId: query.customerId });
    if (query.propertyId) and.push({ propertyId: query.propertyId });
    if (query.q) and.push({ OR: [
      { code: { contains: query.q, mode: 'insensitive' } },
      { customer: { fullName: { contains: query.q, mode: 'insensitive' } } },
      { property: { titleTh: { contains: query.q, mode: 'insensitive' } } },
    ] });
    if (query.endDateFrom || query.endDateTo) {
      const range: Prisma.DateTimeFilter = {};
      if (query.endDateFrom) { const s = new Date(query.endDateFrom); s.setHours(0, 0, 0, 0); range.gte = s; }
      if (query.endDateTo) { const e = new Date(query.endDateTo); e.setHours(0, 0, 0, 0); e.setDate(e.getDate() + 1); range.lt = e; }
      and.push({ endDate: range });
    }
    const where: Prisma.ContractWhereInput = { AND: and };
    const page = query.page ?? 1, limit = query.limit ?? 20;
    const orderBy: Prisma.ContractOrderByWithRelationInput =
      query.sort === 'code' ? { code: 'asc' }
        : query.sort === 'rent' ? { monthlyRent: 'desc' }
          : query.sort === 'expiry' ? { endDate: 'asc' }
            : { createdAt: 'desc' }; // MR-12
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where, orderBy, skip: (page - 1) * limit, take: limit,
        // include ข้อมูลที่ผูกไว้ (ลูกค้า/ทรัพย์) เพื่อให้ลิสต์เห็นว่าเป็นสัญญาของใคร/ทรัพย์ไหน
        include: {
          customer: { select: { fullName: true, phone: true } }, // R2: phone → ผู้เช่า ชื่อ+เบอร์
          property: { select: { titleTh: true, code: true } },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    // หน้า detail ต้องเห็น "คู่สัญญา" (ลูกค้า/ทรัพย์/เจ้าของ/พนักงาน) เพื่อกระโดดต่อได้ —
    // include relations พร้อมบังคับ scope เหมือน requireInScope (query เดียว)
    const scope = this.require(user, 'read');
    const c = await this.prisma.contract.findFirst({
      where: { AND: [this.scopeWhere(user, scope), { id }] },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        property: { select: { id: true, code: true, titleTh: true } },
        owner: { select: { id: true, fullName: true, phone: true } },
        agent: { select: { fullName: true } },
      },
    });
    if (!c) throw new NotFoundException('ไม่พบสัญญา');
    return c;
  }

  /**
   * ลบสัญญา — เฉพาะฉบับร่าง (draft) เท่านั้น (ยังไม่ใช่เอกสารผูกพัน → ลบทิ้งได้ถ้าสร้างผิด)
   * สัญญาที่ active/ended ห้ามลบ (เก็บเป็นหลักฐาน/audit). soft-delete (เคารพประวัติ)
   * แก้ปัญหา deadlock: สัญญาร่างที่สร้างผิดเคยลบไม่ได้ → ทรัพย์/เจ้าของที่ผูกก็ลบไม่ได้ตาม
   */
  async remove(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const c = await this.requireInScope(user, id, 'delete');
    if (c.status !== 'draft') {
      throw new ConflictException('ลบได้เฉพาะสัญญาฉบับร่าง — สัญญาที่มีผล/สิ้นสุดแล้วต้องเก็บเป็นหลักฐาน');
    }
    await this.prisma.contract.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: user.id },
    });
    await this.audit.record(user, {
      action: 'delete', entityType: 'contract', entityId: id,
      oldValue: { code: c.code, status: c.status }, ...meta,
    });
    return { success: true };
  }

  async sign(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const c = await this.requireInScope(user, id, 'sign');
    if (c.status !== 'draft') {
      throw new ConflictException('เซ็นได้เฉพาะสัญญาที่เป็นร่าง');
    }
    // กัน active ซ้อน — ทรัพย์เดียวห้ามมีสัญญาที่ใช้งานอยู่ฉบับอื่น
    const occupying = await this.prisma.contract.count({
      where: { propertyId: c.propertyId, deletedAt: null, id: { not: id }, status: { in: OCCUPYING_CONTRACT_STATUSES } },
    });
    if (occupying > 0) {
      throw new ConflictException('ทรัพย์นี้มีสัญญาที่ใช้งานอยู่แล้ว — เซ็นสัญญาซ้อนไม่ได้');
    }
    // #6: ต้องมีเอกสารสัญญาเช่า (lease) ที่ผ่านการตรวจ (verified/active) ผูกกับสัญญานี้ก่อนเซ็น
    const leaseDocs = await this.prisma.document.count({
      where: {
        deletedAt: null,
        documentType: 'lease',
        status: { in: ['verified', 'active'] },
        links: { some: { entityType: 'contract', entityId: id } },
      },
    });
    if (leaseDocs === 0) {
      throw new ConflictException('ต้องแนบและตรวจสอบเอกสารสัญญาเช่า (lease) ที่ผ่านการ verify ก่อนเซ็น');
    }
    const updated = await this.prisma.contract.update({
      where: { id }, data: { status: 'active', signedAt: new Date(), updatedBy: user.id },
    });
    // ทรัพย์ available → rented (สัญญามีผล ทรัพย์ไม่ว่างแล้ว)
    await this.propertySync.sync(c.propertyId, 'rented', user.id);
    await this.activity.log({ entityType: 'contract', entityId: id, action: 'sign', actorId: user.id, summary: 'เซ็นสัญญา (มีผลบังคับ)' });
    await this.audit.record(user, { action: 'sign', entityType: 'contract', entityId: id, oldValue: { status: c.status }, newValue: { status: 'active' }, ...meta });
    return updated;
  }

  async changeStatus(user: AuthenticatedUser, id: string, to: ContractStatus, reason: string | undefined, meta: RequestMeta) {
    const c = await this.requireInScope(user, id, 'change_status');
    if (!canTransitionContract(c.status, to)) {
      throw new ConflictException(`เปลี่ยนสถานะสัญญาจาก ${c.status} ไป ${to} ไม่ได้`);
    }
    // #3: กัน active ซ้อน — เปิดใช้สัญญาได้ก็ต่อเมื่อไม่มีสัญญาอื่นครองทรัพย์อยู่
    if (to === 'active') {
      const occupying = await this.prisma.contract.count({
        where: {
          propertyId: c.propertyId, deletedAt: null, id: { not: id },
          status: { in: OCCUPYING_CONTRACT_STATUSES },
        },
      });
      if (occupying > 0) {
        throw new ConflictException('ทรัพย์นี้มีสัญญาที่ใช้งานอยู่แล้ว — เปิดใช้สัญญาซ้อนไม่ได้');
      }
    }
    const updated = await this.prisma.contract.update({
      where: { id }, data: { status: to, terminatedReason: to === 'ended' ? reason : c.terminatedReason, updatedBy: user.id },
    });
    // sync สถานะทรัพย์ตามสัญญา: active → rented | ended → available (คืนทรัพย์ขึ้นเว็บ)
    if (to === 'active') {
      await this.propertySync.sync(c.propertyId, 'rented', user.id);
    } else if (to === 'ended') {
      await this.propertySync.sync(c.propertyId, 'available', user.id);
    }
    await this.activity.log({ entityType: 'contract', entityId: id, action: 'status_change', actorId: user.id, summary: `สัญญา: ${c.status} → ${to}`, metadata: { from: c.status, to, reason } });
    await this.audit.record(user, { action: 'change_status', entityType: 'contract', entityId: id, oldValue: { status: c.status }, newValue: { status: to, reason }, ...meta });
    return updated;
  }

  // sync สถานะทรัพย์ตามสัญญา → ย้ายไป PropertySyncService (MR-29) เรียกผ่าน this.propertySync.sync()

  /**
   * ต่อสัญญา (renewal) — สร้างสัญญาใหม่ต่อจากฉบับเดิม
   * - สัญญาเดิมต้องอยู่ใน active
   * - สัญญาใหม่: status=draft, renewedFromId=เดิม, สืบทอด property/owner/customer/agent
   * - สัญญาเดิม → ended (ทรัพย์คง rented — สัญญาใหม่จะมีผลต่อ)
   */
  async renew(user: AuthenticatedUser, id: string, dto: RenewContractDto, meta: RequestMeta) {
    this.require(user, 'create');
    const old = await this.requireInScope(user, id, 'change_status');
    if (!RENEWABLE_CONTRACT_STATUSES.includes(old.status)) {
      throw new ConflictException(`ต่อสัญญาได้เฉพาะสัญญาที่มีผลบังคับ (สถานะปัจจุบัน: ${old.status})`);
    }
    const startDate = dto.startDate ?? old.endDate;
    if (!startDate) throw new BadRequestException('ต้องระบุวันเริ่มสัญญาใหม่ (หรือสัญญาเดิมต้องมีวันสิ้นสุด)');
    if (new Date(dto.endDate) <= new Date(startDate)) {
      throw new BadRequestException('วันสิ้นสุดสัญญาใหม่ต้องอยู่หลังวันเริ่ม');
    }

    // G1: retry เมื่อรหัสชน — สร้างใหม่ + ปิดสัญญาเดิมในทรานแซกชันเดียว (atomic)
    let created: Contract | undefined;
    for (let attempt = 0; ; attempt++) {
      const code = await this.genCode();
      try {
        created = await this.prisma.$transaction(async (tx) => {
          const next = await tx.contract.create({
            data: {
              code, status: 'draft',
              startDate, endDate: dto.endDate,
              monthlyRent: dto.monthlyRent ?? old.monthlyRent,
              depositAmount: dto.depositAmount ?? old.depositAmount,
              commissionAmount: dto.commissionAmount ?? old.commissionAmount,
              branchId: old.branchId, createdBy: user.id, updatedBy: user.id,
              property: { connect: { id: old.propertyId } },
              owner: { connect: { id: old.ownerId } },
              customer: { connect: { id: old.customerId } },
              agent: { connect: { id: old.agentId } },
              renewedFrom: { connect: { id: old.id } },
            },
          });
          await tx.contract.update({ where: { id: old.id }, data: { status: 'ended', updatedBy: user.id } });
          return next;
        });
        break;
      } catch (e) {
        if (attempt < 4 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }

    // ทรัพย์ยังคง rented (สัญญาใหม่จะมีผลต่อเนื่อง) — ไม่ต้อง sync
    await this.activity.log({ entityType: 'contract', entityId: old.id, action: 'status_change', actorId: user.id, summary: `ต่อสัญญา → ${created.code}`, metadata: { renewedTo: created.id } });
    await this.activity.log({ entityType: 'contract', entityId: created.id, action: 'create', actorId: user.id, summary: `สัญญาต่ออายุจาก ${old.code}` });
    await this.audit.record(user, { action: 'renew', entityType: 'contract', entityId: old.id, oldValue: { status: old.status }, newValue: { status: 'ended', newContractId: created.id, newCode: created.code }, ...meta });
    return created;
  }

  /**
   * ออกใบเสร็จรับเงิน (Document Lifecycle §Receipt) — สร้าง HTML จาก template
   * เก็บเป็น Document(type=receipt) ผูกกับสัญญา (no-orphan) → ดาวน์โหลด/พิมพ์ผ่าน flow เอกสารที่เช็คสิทธิ์
   */
  async generateReceipt(user: AuthenticatedUser, id: string, dto: GenerateReceiptDto, meta: RequestMeta) {
    this.require(user, 'update');
    const scope = this.require(user, 'read');
    const c = await this.prisma.contract.findFirst({
      where: { AND: [this.scopeWhere(user, scope), { id }] },
      include: {
        customer: { select: { fullName: true } },
        property: { select: { titleTh: true, code: true } },
        agent: { select: { fullName: true } },
      },
    });
    if (!c) throw new NotFoundException('ไม่พบสัญญา');
    // MR-29: ตรรกะออกใบเสร็จย้ายไป ReceiptService (เช็ค scope+โหลดสัญญาที่นี่ แล้ว delegate)
    return this.receipts.generate(user, c, dto, meta);
  }

  // --- เงื่อนไขสัญญาเพิ่มเติม (ContractTerm) ---
  async listTerms(user: AuthenticatedUser, id: string) {
    await this.requireInScope(user, id, 'read');
    return this.prisma.contractTerm.findMany({ where: { contractId: id }, orderBy: { createdAt: 'asc' } });
  }

  async addTerm(user: AuthenticatedUser, id: string, termKey: string, termValue: string) {
    await this.requireInScope(user, id, 'update');
    return this.prisma.contractTerm.create({ data: { contractId: id, termKey, termValue } });
  }

  async removeTerm(user: AuthenticatedUser, id: string, termId: string) {
    await this.requireInScope(user, id, 'update');
    await this.prisma.contractTerm.deleteMany({ where: { id: termId, contractId: id } });
    return { success: true };
  }

  private async requireInScope(user: AuthenticatedUser, id: string, action: string): Promise<Contract> {
    const scope = this.require(user, action);
    const c = await this.prisma.contract.findFirst({ where: { AND: [this.scopeWhere(user, scope), { id }] } });
    if (!c) throw new NotFoundException('ไม่พบสัญญา');
    return c;
  }
}
