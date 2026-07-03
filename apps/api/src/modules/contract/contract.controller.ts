import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ContractService } from './contract.service';
import {
  AddContractTermDto, ChangeContractStatusDto, CreateContractDto, GenerateReceiptDto, QueryContractDto, RenewContractDto,
} from './dto/contract.dto';
import { CurrentUser, RequirePermission } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';

@Controller('contracts')
export class ContractController {
  constructor(private readonly service: ContractService) {}
  private meta(req: Request): RequestMeta {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  @Post() @RequirePermission('contract', 'create')
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateContractDto, @Req() req: Request) {
    return this.service.create(u, dto, this.meta(req));
  }

  @Get() @RequirePermission('contract', 'read')
  findMany(@CurrentUser() u: AuthenticatedUser, @Query() q: QueryContractDto) {
    return this.service.findMany(u, q);
  }

  @Get(':id') @RequirePermission('contract', 'read')
  findOne(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(u, id);
  }

  @Delete(':id') @RequirePermission('contract', 'delete')
  remove(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.remove(u, id, this.meta(req));
  }

  @Post(':id/sign') @RequirePermission('contract', 'sign')
  sign(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.sign(u, id, this.meta(req));
  }

  @Patch(':id/status') @RequirePermission('contract', 'change_status')
  changeStatus(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeContractStatusDto, @Req() req: Request) {
    return this.service.changeStatus(u, id, dto.toStatus, dto.reason, this.meta(req));
  }

  // ต่อสัญญา (renewal) — สร้างสัญญาใหม่ต่อจากฉบับนี้
  @Post(':id/renew') @RequirePermission('contract', 'create')
  renew(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RenewContractDto, @Req() req: Request) {
    return this.service.renew(u, id, dto, this.meta(req));
  }

  // ออกใบเสร็จรับเงิน — สร้างเอกสาร receipt ผูกกับสัญญา
  @Post(':id/receipt') @RequirePermission('contract', 'update')
  receipt(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: GenerateReceiptDto, @Req() req: Request) {
    return this.service.generateReceipt(u, id, dto, this.meta(req));
  }

  // --- เงื่อนไขสัญญาเพิ่มเติม ---
  @Get(':id/terms') @RequirePermission('contract', 'read')
  listTerms(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.listTerms(u, id);
  }

  @Post(':id/terms') @RequirePermission('contract', 'update')
  addTerm(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddContractTermDto) {
    return this.service.addTerm(u, id, dto.termKey, dto.termValue);
  }

  @Delete(':id/terms/:termId') @RequirePermission('contract', 'update')
  removeTerm(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Param('termId', ParseUUIDPipe) termId: string) {
    return this.service.removeTerm(u, id, termId);
  }
}
