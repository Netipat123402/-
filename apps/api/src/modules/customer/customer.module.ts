import {
  Body, Controller, Delete, Get, Module,
  Param, ParseUUIDPipe, Patch, Query, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { CustomerService } from './customer.service';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

class UpdateCustomerDto {
  @IsOptional() @IsString() @MaxLength(150) fullName?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  /** เลขบัตรประชาชน (PII/KYC) — เข้ารหัส AES-256-GCM ก่อนเก็บ (#13) */
  @IsOptional() @IsString() @MaxLength(20) idCardNo?: string;
}

@Controller('customers')
class CustomerController {
  constructor(private readonly service: CustomerService) {}

  @Get() @RequirePermission('customer', 'read')
  list(@CurrentUser() user: AuthenticatedUser, @Query('q') q?: string, @Query('page') page = '1', @Query('limit') limitRaw?: string, @Query('sort') sort?: string, @Query('renting') renting?: string) {
    return this.service.list(user, q, page, limitRaw, sort, renting);
  }

  @Get(':id') @RequirePermission('customer', 'read')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(user, id);
  }

  // Phase 6: เปิดดูเลขบัตรเต็ม — customer:reveal_pii (super_admin) เท่านั้น + audit (สมมาตรกับ owner)
  @Get(':id/idcard') @RequirePermission('customer', 'reveal_pii')
  revealIdCard(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.revealIdCard(user, id, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Patch(':id') @RequirePermission('customer', 'update')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id') @RequirePermission('customer', 'delete')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(user, id);
  }
}

@Module({ controllers: [CustomerController], providers: [CustomerService] })
export class CustomerModule {}
