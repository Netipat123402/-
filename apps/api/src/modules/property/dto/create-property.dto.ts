import { Furnished, PropertyType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePropertyDto {
  @IsUUID(undefined, { message: 'ownerId ไม่ถูกต้อง' })
  ownerId!: string;

  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @IsString()
  @MaxLength(200)
  titleTh!: string;

  @IsOptional() @IsString() @MaxLength(200)
  titleEn?: string;

  @IsOptional() @IsString()
  descriptionTh?: string;

  @IsOptional() @IsString()
  descriptionEn?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString() @MaxLength(100)
  province?: string;

  @IsOptional() @IsString() @MaxLength(100)
  district?: string;

  @IsOptional() @IsString() @MaxLength(100)
  subdistrict?: string;

  @IsOptional() @IsString() @MaxLength(150)
  projectName?: string;

  @IsOptional() @IsNumber() @Min(-90) @Max(90)
  latitude?: number;

  @IsOptional() @IsNumber() @Min(-180) @Max(180)
  longitude?: number;

  @IsNumber() @Min(0)
  monthlyRent!: number;

  @IsOptional() @IsInt() @Min(0) @Max(36)
  depositMonths?: number;

  @IsOptional() @IsInt() @Min(0)
  bedrooms?: number;

  @IsOptional() @IsInt() @Min(0)
  bathrooms?: number;

  @IsOptional() @IsNumber() @Min(0)
  areaSqm?: number;

  @IsOptional() @IsString() @MaxLength(20)
  floor?: string;

  @IsOptional() @IsEnum(Furnished)
  furnished?: Furnished;

  @IsOptional() @IsObject()
  amenities?: Record<string, unknown>;

  /** มอบหมายให้ agent คนใด (ถ้าไม่ระบุ = ผู้สร้าง) */
  @IsOptional() @IsUUID()
  assignedToId?: string;
}
