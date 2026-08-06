import { Module } from '@nestjs/common';
import { PropertyRequestController } from './property-request.controller';
import { PropertyRequestService } from './property-request.service';

@Module({
  controllers: [PropertyRequestController],
  providers: [PropertyRequestService],
  exports: [PropertyRequestService],
})
export class PropertyRequestModule {}
