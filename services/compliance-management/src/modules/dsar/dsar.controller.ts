import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { DsarService } from './dsar.service';
import { DsarRequestDto } from './dto/dsar-request.dto';
import { InternalServiceAuthGuard } from '@sbtm/common';

interface ServiceRequest {
  serviceId: string;
  // The school context is passed via the DTO and validated in the service layer
  // against the authenticated principal.
}

/**
 * DsarController exposes the PIPEDA Data Subject Access Request endpoint.
 * Only accessible by internal services (API Gateway on behalf of an authenticated admin).
 *
 * POST /dsar/request — fulfil a data subject access request for a student.
 */
@Controller('dsar')
@UseGuards(InternalServiceAuthGuard)
export class DsarController {
  constructor(private readonly dsarService: DsarService) {}

  @Post('request')
  async requestDsar(@Body() dto: DsarRequestDto, @Request() req: ServiceRequest): Promise<unknown> {
    // schoolId is from the DTO in this service context since there's no user JWT here.
    // The InternalServiceAuthGuard confirms this is called by a trusted service peer.
    // The caller (API Gateway) is responsible for deriving schoolId from the user's JWT
    // and passing it in the request body. See docs for gateway-side enforcement.
    return this.dsarService.fulfil(dto, dto.schoolId);
  }
}
