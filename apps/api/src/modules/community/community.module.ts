import {
  Body, Controller, Get, HttpCode, Module,
  Param, ParseUUIDPipe, Patch, Post, Query, Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CommunityCategory } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';
import { CommunityService } from './community.service';
import { CurrentUser, Public } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

class CreateCommunityPostDto {
  @IsEnum(CommunityCategory) category!: CommunityCategory;
  @IsString() @MinLength(5) @MaxLength(500) body!: string;
}

/** สาธารณะ — โพสต์ (เข้าคิวรออนุมัติ) + อ่านเฉพาะที่อนุมัติแล้ว */
@Public()
@Controller('public/community')
class PublicCommunityController {
  constructor(private readonly service: CommunityService) {}

  @Get()
  list(@Query('category') category?: string) {
    return this.service.publicList(category);
  }

  // กัน spam/bot — 5 โพสต์/นาที/IP
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post() @HttpCode(201)
  create(@Body() dto: CreateCommunityPostDto, @Req() req: Request) {
    return this.service.publicCreate(dto.category, dto.body, req.ip ?? null);
  }
}

/** ภายใน — moderation (Pending → Approve/Publish · Reject · Archive) */
@Controller('community')
class CommunityModerationController {
  constructor(private readonly service: CommunityService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status = 'pending',
    @Query('page') page = '1',
    @Query('limit') limitRaw?: string,
  ) {
    return this.service.modList(user, status, page, limitRaw);
  }

  @Patch(':id/approve')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.approve(user, id);
  }

  @Patch(':id/reject')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.reject(user, id);
  }

  @Patch(':id/archive')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.archive(user, id);
  }
}

@Module({
  controllers: [PublicCommunityController, CommunityModerationController],
  providers: [CommunityService],
})
export class CommunityModule {}
