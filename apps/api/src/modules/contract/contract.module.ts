import { Module } from '@nestjs/common';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { ReceiptService } from './receipt.service';
import { PropertySyncService } from './property-sync.service';

@Module({
  controllers: [ContractController],
  providers: [ContractService, ReceiptService, PropertySyncService], // MR-29
  exports: [ContractService],
})
export class ContractModule {}
