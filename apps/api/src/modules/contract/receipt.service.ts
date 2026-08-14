import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { AuditService } from '../../common/trail/audit.service';
import { ActivityService } from '../../common/trail/activity.service';
import { renderReceiptHtml, type ReceiptData } from './receipt.template';
import { GenerateReceiptDto } from './dto/contract.dto';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';

/** สัญญา (เท่าที่ ReceiptService ต้องใช้) — ผ่านการเช็ค scope จาก ContractService มาแล้ว */
export interface ContractForReceipt {
  id: string;
  code: string;
  branchId: string | null;
  customer: { fullName: string };
  property: { titleTh: string; code: string };
  agent: { fullName: string };
}

/**
 * ReceiptService (MR-29) — แยกตรรกะออกใบเสร็จออกจาก ContractService (god service)
 * สร้างไฟล์ใบเสร็จ (HTML) + เอกสาร receipt ผูกกับสัญญา + audit/activity
 */
@Injectable()
export class ReceiptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
  ) {}

  async generate(user: AuthenticatedUser, c: ContractForReceipt, dto: GenerateReceiptDto, meta: RequestMeta) {
    const receiptNo = await this.genReceiptNo();
    const html = renderReceiptHtml({
      receiptNo, date: new Date(), companyName: await this.companyName(),
      contractCode: c.code, customerName: c.customer.fullName,
      propertyTitle: c.property.titleTh, propertyCode: c.property.code,
      agentName: c.agent.fullName, amount: dto.amount,
      periodLabel: dto.periodLabel ?? 'ค่าเช่า', note: dto.note,
    } as ReceiptData);

    // เก็บไฟล์ใบเสร็จผ่าน StorageService (local/MinIO) — เสิร์ฟผ่าน /documents/:id/download (MR-04)
    const storageKey = this.storage.keyFor('documents', '.html');
    const buf = Buffer.from(html, 'utf8');
    await this.storage.putObject(storageKey, buf, 'text/html');

    const doc = await this.prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: { documentType: 'receipt', name: receiptNo, status: 'active', branchId: c.branchId, createdBy: user.id, updatedBy: user.id },
      });
      const version = await tx.documentVersion.create({
        data: { documentId: created.id, versionNo: 1, storageKey, mimeType: 'text/html', fileSize: buf.byteLength, createdBy: user.id },
      });
      await tx.document.update({ where: { id: created.id }, data: { currentVersionId: version.id } });
      await tx.documentLink.create({ data: { documentId: created.id, entityType: 'contract', entityId: c.id, createdBy: user.id } });
      return created;
    });

    await this.activity.log({ entityType: 'contract', entityId: c.id, action: 'receipt', actorId: user.id, summary: `ออกใบเสร็จ ${receiptNo} (฿${dto.amount})`, i18nKey: 'activity.contract.receipt', i18nParams: { no: receiptNo, amount: dto.amount } });
    await this.audit.record(user, { action: 'receipt', entityType: 'contract', entityId: c.id, newValue: { receiptNo, amount: dto.amount, documentId: doc.id }, ...meta });
    return { document: doc, receiptNo };
  }

  private async companyName(): Promise<string> {
    const s = await this.prisma.setting.findUnique({ where: { key: 'company.name' } });
    const v = s?.value as unknown;
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object' && 'value' in v && typeof (v as { value: unknown }).value === 'string') {
      return (v as { value: string }).value;
    }
    return 'ROS Real Estate';
  }

  private async genReceiptNo(): Promise<string> {
    const head = `RC-${new Date().getFullYear()}-`;
    const last = await this.prisma.document.findFirst({
      where: { documentType: 'receipt', name: { startsWith: head } },
      orderBy: { name: 'desc' }, select: { name: true },
    });
    const n = last ? parseInt(last.name.slice(head.length), 10) : 0;
    return head + String((Number.isFinite(n) ? n : 0) + 1).padStart(4, '0');
  }
}
