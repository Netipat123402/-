import { DocType, EntityType } from '@prisma/client';
import {
  IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min,
} from 'class-validator';

/** ลงทะเบียนเอกสาร — บังคับผูก entity (no-orphan rule, Phase 1) */
export class RegisterDocumentDto {
  @IsEnum(DocType) documentType!: DocType;

  @IsString() @MaxLength(200) name!: string;

  @IsEnum(EntityType) entityType!: EntityType;
  @IsUUID() entityId!: string;

  @IsOptional() @IsString() @MaxLength(100) mimeType?: string;
  @IsOptional() @IsInt() @Min(0) fileSize?: number;
  @IsOptional() @IsString() @MaxLength(64) checksum?: string;
}

export class AddVersionDto {
  @IsOptional() @IsString() @MaxLength(100) mimeType?: string;
  @IsOptional() @IsInt() @Min(0) fileSize?: number;
  @IsOptional() @IsString() @MaxLength(64) checksum?: string;
}
