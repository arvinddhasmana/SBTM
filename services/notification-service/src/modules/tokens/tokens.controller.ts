import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalServiceAuthGuard } from '@sbtm/common';
import { TokensService } from './tokens.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import type { DeviceTokenRecipientKind } from './entities/device-token.entity';

@Controller('device-tokens')
@UseGuards(InternalServiceAuthGuard)
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Post()
  async register(@Body() dto: RegisterDeviceTokenDto) {
    return this.tokensService.register(
      dto.recipientKind ?? 'user',
      dto.recipientId,
      dto.token,
      dto.platform,
    );
  }

  @Delete(':tokenId')
  async deactivate(
    @Param('tokenId') tokenId: string,
    @Query('recipientId') recipientId: string,
    @Query('recipientKind') recipientKind?: DeviceTokenRecipientKind,
  ) {
    await this.tokensService.deactivate(
      tokenId,
      recipientKind ?? 'user',
      recipientId,
    );
    return { success: true };
  }

  @Get()
  async list(
    @Query('recipientId') recipientId: string,
    @Query('recipientKind') recipientKind?: DeviceTokenRecipientKind,
  ) {
    return this.tokensService.listForRecipient(
      recipientKind ?? 'user',
      recipientId,
    );
  }
}
