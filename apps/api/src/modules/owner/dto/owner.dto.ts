import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOwnerDto {
  @IsString() @MaxLength(150)
  fullName!: string;

  @IsOptional() @IsString() @MaxLength(20)
  phone?: string;

  @IsOptional() @IsEmail()
  email?: string;

  /** เลขบัตรประชาชน (PII) — เข้ารหัส AES-256-GCM ที่ service ก่อนเก็บ (CryptoService) */
  @IsOptional() @IsString() @MaxLength(20)
  idCardNo?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString()
  note?: string;
}

export class UpdateOwnerDto extends PartialType(CreateOwnerDto) {}

export class QueryOwnerDto {
  @IsOptional() @IsString()
  q?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number = 20;

  @IsOptional() @IsString()
  sort?: string; // name | most_properties | new

  /** กรองเฉพาะเจ้าของที่มีทรัพย์ว่าง (status available) — หน้า owner list toggle */
  @IsOptional() @IsString()
  hasVacant?: string;
}
