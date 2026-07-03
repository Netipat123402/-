import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreatePropertyDto } from './create-property.dto';

/**
 * แก้ไขทรัพย์ — ทุก field เป็น optional (ยกเว้นเปลี่ยน owner ไม่ได้ผ่าน update ปกติ)
 */
export class UpdatePropertyDto extends PartialType(
  OmitType(CreatePropertyDto, ['ownerId'] as const),
) {
  @IsOptional() @IsBoolean() isFeatured?: boolean; // แอดมินกดดาว = ทรัพย์แนะนำ
}
