import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'compliance-management',
      timestamp: new Date().toISOString(),
    };
  }
}
