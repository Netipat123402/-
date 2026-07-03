import { PropertyType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  Equals, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';

export class PublicSearchDto {
  @IsOptional() @IsEnum(PropertyType) type?: PropertyType;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minRent?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxRent?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) bedrooms?: number;
  @IsOptional() @IsString() @MaxLength(100) q?: string;

  // สถานีรถไฟ — map → amenity code (near_bts / near_mrt / near_airport_link)
  @IsOptional() @IsIn(['near_bts', 'near_mrt', 'near_airport_link']) train?: string;

  // สิ่งอำนวยความสะดวก (amenity code เช่น pet_friendly) — สำหรับหมวดทรัพย์บนหน้าแรก
  @IsOptional() @IsString() @MaxLength(40) amenity?: string;

  // เฉพาะทรัพย์ที่แอดมินกดดาวแนะนำ
  @IsOptional() @IsIn(['true', 'false']) featured?: string;

  @IsOptional() @IsIn(['newest', 'price_asc', 'price_desc', 'popular'])
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' = 'newest';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number = 20;
}

/** ฟอร์มนัดดูทรัพย์ (Public — Phase 1 Lead Flow) */
export class PublicLeadDto {
  @IsString() @MaxLength(150) fullName!: string;
  @IsString() @MaxLength(20) phone!: string;

  @IsOptional() @IsString() @MaxLength(30) propertyCode?: string;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
  @IsOptional() @Type(() => Date) preferredViewAt?: Date;

  /** PDPA consent — ต้องยินยอม (true) เท่านั้น (Phase 1/7) */
  @Equals(true, { message: 'ต้องยอมรับนโยบายความเป็นส่วนตัวก่อน' })
  consent!: boolean;
}
