import { NotificationCategory, NotificationChannel, NotificationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class QueryNotificationDto {
  @IsOptional() @IsEnum(NotificationStatus) status?: NotificationStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}

export class UpdatePreferenceDto {
  @IsEnum(NotificationCategory) category!: NotificationCategory;
  @IsEnum(NotificationChannel) channel!: NotificationChannel;
  @IsBoolean() isEnabled!: boolean;
}
