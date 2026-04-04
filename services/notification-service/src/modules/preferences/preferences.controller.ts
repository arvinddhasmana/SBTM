import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { InternalServiceAuthGuard } from '@sbtm/common';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('notification-preferences')
@UseGuards(InternalServiceAuthGuard)
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  async getPreferences(
    @Query('userId') userId: string,
    @Query('schoolId') schoolId: string,
  ) {
    return this.preferencesService.getForUser(userId, schoolId);
  }

  @Put()
  async updatePreferences(@Body() dto: UpdatePreferencesDto) {
    return this.preferencesService.upsert(
      dto.userId,
      dto.schoolId,
      dto.preferences,
    );
  }
}
