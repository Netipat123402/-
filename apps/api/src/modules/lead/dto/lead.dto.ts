import { LeadSource, LeadStatus } from '@prisma/client';
import { PartialType, PickType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDate, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min,
} from 'class-validator';

export class CreateLeadDto {
  @IsString() @MaxLength(150)
  fullName!: string;

  @IsString() @MaxLength(20)
  phone!: string;

  @IsOptional() @IsString() @MaxLength(150)
  email?: string;

  @IsOptional() @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional() @IsString()
  message?: string;

  @IsOptional() @Type(() => Date)
  preferredViewAt?: Date;

  /** ทรัพย์ที่ลูกค้าสนใจ (lead_interests) */
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true })
  propertyIds?: string[];
}

export class UpdateLeadDto extends PartialType(
  PickType(CreateLeadDto, ['fullName', 'phone', 'email', 'message', 'preferredViewAt'] as const),
) {}

export class AssignLeadDto {
  @IsUUID()
  assignedToId!: string;

  /** รับดูแลคลิกเดียว (Phase 16): assign + เปลี่ยน new→working ใน transaction เดียว (default: assign อย่างเดียว) */
  @IsOptional() @IsBoolean()
  startWorking?: boolean;
}

export class ChangeLeadStatusDto {
  @IsEnum(LeadStatus)
  toStatus!: LeadStatus;

  @IsOptional() @IsString() @MaxLength(500)
  lostReason?: string;
}

export class QueryLeadDto {
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsEnum(LeadSource) source?: LeadSource;
  @IsOptional() @IsUUID() assignedToId?: string;
  @IsOptional() @IsString() q?: string;
  // ช่วงวันที่เข้ามา (createdAt) — เช่น "Lead ใหม่ 7 วันล่าสุด" ในแดชบอร์ด
  @IsOptional() @Type(() => Date) @IsDate() dateFrom?: Date;
  @IsOptional() @Type(() => Date) @IsDate() dateTo?: Date;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
  @IsOptional() @IsString() sort?: string; // new | code | name (MR-12)
}
