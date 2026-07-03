import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  email!: string;

  // MR-43: login ไม่บังคับความยาว/ความแข็งแรง (เช็คเฉพาะตอน create/reset)
  // เพื่อให้ "ทุก" ความพยายามไปถึง service → ถูกนับใน lockout + no-enumeration
  // (เดิม MinLength(6) ทำให้รหัสสั้นโดน 400 ก่อนถึง service จึงไม่ถูกนับ = ช่องโหว่ brute-force)
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่าน' })
  password!: string;
}
