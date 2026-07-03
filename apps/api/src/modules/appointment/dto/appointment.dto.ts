import { AppointmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';

export class CreateAppointmentDto {
  // นัดดูทรัพย์: ต้องมี lead + property — นัดนอกรอบ: เว้นว่าง แล้วใส่ title แทน
  @IsOptional() @IsUUID() leadId?: string;
  @IsOptional() @IsUUID() propertyId?: string;
  @IsUUID() agentId!: string;

  @IsOptional() @IsString() @MaxLength(160)
  title?: string;

  @Type(() => Date) @IsDate()
  scheduledAt!: Date;

  @IsOptional() @IsInt() @Min(5) @Max(480)
  durationMin?: number;

  @IsOptional() @IsString()
  location?: string;

  @IsOptional() @IsString()
  note?: string;
}

export class RescheduleDto {
  @Type(() => Date) @IsDate()
  scheduledAt!: Date;

  @IsOptional() @IsInt() @Min(5) @Max(480)
  durationMin?: number;
}

export class CancelDto {
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class QueryAppointmentDto {
  @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;
  @IsOptional() @IsUUID() agentId?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Type(() => Date) @IsDate() date?: Date;
  // ช่วงวันที่ (เช่น "สัปดาห์นี้") — ใช้แทน date เมื่อกรองมากกว่า 1 วัน
  @IsOptional() @Type(() => Date) @IsDate() dateFrom?: Date;
  @IsOptional() @Type(() => Date) @IsDate() dateTo?: Date;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
  @IsOptional() @IsString() sort?: string; // asc | desc (วันนัด) (MR-12)
}
