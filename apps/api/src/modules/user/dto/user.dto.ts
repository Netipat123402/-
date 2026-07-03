import { UserStatus } from '@prisma/client';
import {
  ArrayNotEmpty, IsArray, IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength,
} from 'class-validator';

// นโยบายรหัสผ่าน (ใช้ร่วมตอนสร้าง user และตอนแอดมินรีเซ็ต):
//   อย่างน้อย 8 ตัว + ต้องมีตัวอักษร และตัวเลข อย่างน้อยอย่างละ 1
//   จำกัด ≤128 กัน DoS จาก input ยาวผิดปกติ (scrypt ทำงานหนักตามความยาว)
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;
export const PASSWORD_MSG = 'รหัสผ่านอย่างน้อย 8 ตัว และต้องมีทั้งตัวอักษรและตัวเลข';

export class CreateUserDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  email!: string;

  @IsString() @MaxLength(150)
  fullName!: string;

  @IsOptional() @IsString() @MaxLength(20)
  phone?: string;

  @IsString() @Matches(PASSWORD_RULE, { message: PASSWORD_MSG })
  password!: string;

  @IsArray() @ArrayNotEmpty({ message: 'เลือกบทบาทอย่างน้อย 1' }) @IsString({ each: true })
  roleNames!: string[];
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MaxLength(150) fullName?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @IsOptional() @IsArray() @IsString({ each: true }) roleNames?: string[];
  // แอดมินรีเซ็ตรหัสผ่านให้ผู้ใช้ (โมเดล: ไม่มี self-service / ไม่มี forgot) — ส่งมาเมื่อจะตั้งรหัสใหม่เท่านั้น
  @IsOptional() @IsString() @Matches(PASSWORD_RULE, { message: PASSWORD_MSG }) password?: string;
}
