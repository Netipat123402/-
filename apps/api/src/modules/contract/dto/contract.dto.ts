import { ContractStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min,
} from 'class-validator';

export class CreateContractDto {
  @IsUUID() propertyId!: string;
  @IsUUID() ownerId!: string;
  @IsUUID() customerId!: string;
  @IsUUID() agentId!: string;

  @IsOptional() @Type(() => Date) @IsDate() startDate?: Date;
  @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;

  @IsNumber() @Min(0) monthlyRent!: number;
  @IsOptional() @IsNumber() @Min(0) depositAmount?: number;
  @IsOptional() @IsNumber() @Min(0) commissionAmount?: number;
}

export class ChangeContractStatusDto {
  @IsEnum(ContractStatus) toStatus!: ContractStatus;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

/** ต่อสัญญา (renewal) — สร้างสัญญาใหม่ต่อจากฉบับเดิม (Phase 1 §10) */
export class RenewContractDto {
  // เริ่มสัญญาใหม่ (ไม่ระบุ = ต่อจากวันสิ้นสุดสัญญาเดิม)
  @IsOptional() @Type(() => Date) @IsDate() startDate?: Date;
  // วันสิ้นสุดสัญญาใหม่ (บังคับ)
  @Type(() => Date) @IsDate() endDate!: Date;
  // ค่าเช่าใหม่ (ไม่ระบุ = ใช้ค่าเดิม)
  @IsOptional() @IsNumber() @Min(0) monthlyRent?: number;
  @IsOptional() @IsNumber() @Min(0) depositAmount?: number;
  @IsOptional() @IsNumber() @Min(0) commissionAmount?: number;
}

/** ออกใบเสร็จรับเงิน (rent receipt) จากสัญญา */
export class GenerateReceiptDto {
  @IsNumber() @Min(0) amount!: number;
  // งวด/รายการ เช่น "ค่าเช่าเดือน มิถุนายน 2569" หรือ "เงินมัดจำ"
  @IsOptional() @IsString() @MaxLength(150) periodLabel?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class QueryContractDto {
  @IsOptional() @IsEnum(ContractStatus) status?: ContractStatus;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() propertyId?: string;
  @IsOptional() @IsString() q?: string;
  // ช่วงวันสิ้นสุดสัญญา (endDate) — เช่น "สัญญาใกล้ครบใน 30 วัน" ในแดชบอร์ด/แจ้งเตือน
  @IsOptional() @Type(() => Date) @IsDate() endDateFrom?: Date;
  @IsOptional() @Type(() => Date) @IsDate() endDateTo?: Date;
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 20;
  @IsOptional() @IsString() sort?: string; // code | rent | expiry | new (MR-12)
}

// MR-30: เงื่อนไขสัญญาเพิ่มเติม — เดิมรับ inline type ไม่ validate
export class AddContractTermDto {
  @IsString() @MaxLength(100) termKey!: string;
  @IsString() @MaxLength(1000) termValue!: string;
}
