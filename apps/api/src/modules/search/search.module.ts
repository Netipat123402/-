import { Controller, Get, Module, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { CurrentUser } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

/**
 * Global search — ค้นข้ามโมดูล (ทรัพย์/lead/ลูกค้า/เจ้าของ)
 * ต้อง login (JwtAuthGuard global) + จำกัดผลลัพธ์ตาม scope ของผู้ใช้ (logic ใน SearchService — MR-27)
 */
@Controller('search')
class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  search(@CurrentUser() user: AuthenticatedUser, @Query('q') q?: string) {
    return this.service.search(user, q);
  }
}

@Module({ controllers: [SearchController], providers: [SearchService] })
export class SearchModule {}
