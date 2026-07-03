import { PropertyStatus, PropertyType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryPropertyDto {
  @IsOptional() @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsOptional() @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional() @IsString()
  province?: string;

  @IsOptional() @IsUUID()
  assignedToId?: string;

  /** ค้นหาข้อความ (ชื่อ/โครงการ) */
  @IsOptional() @IsString()
  q?: string;

  /** การเรียง: code | price_asc | price_desc | new */
  @IsOptional() @IsString()
  sort?: string;

  /** ช่วงค่าเช่า/เดือน (บาท) — กรอง monthlyRent gte/lte */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  rentMin?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  rentMax?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}
