import { PropertyType, PropertyRequestStatus } from '@prisma/client';
import {
  IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min,
} from 'class-validator';

// ขอเพิ่มทรัพย์ (Phase 2) — เซลส่งข้อมูลทรัพย์ที่เจอ (ข้อความล้วน · ไม่อัปรูป)
export class CreatePropertyRequestDto {
  @IsString() @MaxLength(200)
  titleTh!: string;

  @IsOptional() @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional() @IsString() @MaxLength(100) province?: string;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
  @IsOptional() @IsString() @MaxLength(150) projectName?: string;

  @IsOptional() @IsNumber() @Min(0) @Max(99999999) expectedRent?: number;
  @IsOptional() @IsInt() @Min(0) @Max(99) bedrooms?: number;
  @IsOptional() @IsInt() @Min(0) @Max(99) bathrooms?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(999999) areaSqm?: number;
  @IsOptional() @IsString() @MaxLength(4000) note?: string;

  @IsOptional() @IsString() @MaxLength(150) ownerName?: string;
  @IsOptional() @IsString() @Matches(/^[0-9+\-() ]{6,20}$/, { message: 'เบอร์โทรไม่ถูกต้อง' }) ownerPhone?: string;

  // เจ้าของทรัพย์ยินยอมให้ลงประกาศ (consent) — checkbox
  @IsOptional() @IsBoolean() ownerConsent?: boolean;
}

// แก้คำขอ (ตอน needs_info เซลแก้แล้วส่งใหม่) — ฟิลด์เดียวกันแบบ optional
export class UpdatePropertyRequestDto {
  @IsOptional() @IsString() @MaxLength(200) titleTh?: string;
  @IsOptional() @IsEnum(PropertyType) propertyType?: PropertyType;
  @IsOptional() @IsString() @MaxLength(100) province?: string;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
  @IsOptional() @IsString() @MaxLength(150) projectName?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(99999999) expectedRent?: number;
  @IsOptional() @IsInt() @Min(0) @Max(99) bedrooms?: number;
  @IsOptional() @IsInt() @Min(0) @Max(99) bathrooms?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(999999) areaSqm?: number;
  @IsOptional() @IsString() @MaxLength(4000) note?: string;
  @IsOptional() @IsString() @MaxLength(150) ownerName?: string;
  @IsOptional() @IsString() @Matches(/^[0-9+\-() ]{6,20}$/, { message: 'เบอร์โทรไม่ถูกต้อง' }) ownerPhone?: string;
  @IsOptional() @IsBoolean() ownerConsent?: boolean;
}

// ตีกลับให้แก้ (needs_info) หรือ ปฏิเสธ (reject) — ต้องมีเหตุผล/ข้อความ
export class ReviewNoteDto {
  @IsString() @MaxLength(1000)
  reason!: string;
}

export class QueryPropertyRequestDto {
  @IsOptional() @IsEnum(PropertyRequestStatus) status?: PropertyRequestStatus;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsInt() @Min(1) page?: number;
}
