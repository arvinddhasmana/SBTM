import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InternalServiceAuthGuard } from '@sbtm/common';
import { DeliveryLogService } from './delivery-log.service';

@Controller('delivery-log')
@UseGuards(InternalServiceAuthGuard)
export class DeliveryController {
  constructor(private readonly deliveryLogService: DeliveryLogService) {}

  @Get()
  async getDeliveryLog(
    @Query('userId') userId: string,
    @Query('schoolId') schoolId: string,
  ) {
    return this.deliveryLogService.getForUser(userId, schoolId);
  }
}
