import { PropertyStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChangeStatusDto {
  @IsEnum(PropertyStatus)
  toStatus!: PropertyStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * F-2: reject ต้องการแค่เหตุผล — แยก DTO ไม่ให้บังคับ toStatus
 * (ปลายทางของ reject คงที่ = draft เสมอ จึงไม่ควรให้ client ส่ง toStatus)
 */
export class RejectDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
