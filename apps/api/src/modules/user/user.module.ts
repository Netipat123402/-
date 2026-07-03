import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // ใช้ PasswordService
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
