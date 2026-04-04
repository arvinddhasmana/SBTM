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

@Controller('device-tokens')
@UseGuards(InternalServiceAuthGuard)
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Post()
  async register(@Body() dto: RegisterDeviceTokenDto) {
    return this.tokensService.register(
      dto.userId,
      dto.schoolId,
      dto.token,
      dto.platform,
    );
  }

  @Delete(':tokenId')
  async deactivate(
    @Param('tokenId') tokenId: string,
    @Query('userId') userId: string,
  ) {
    await this.tokensService.deactivate(tokenId, userId);
    return { success: true };
  }

  @Get()
  async list(
    @Query('userId') userId: string,
    @Query('schoolId') schoolId: string,
  ) {
    return this.tokensService.listForUser(userId, schoolId);
  }
}
