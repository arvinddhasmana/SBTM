import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const isLocalDev = nodeEnv === 'development' || nodeEnv === 'test';

    // For deployed environments (demo/staging/production) the SPA is hosted on
    // a different origin (Static Web App) than the API, so the auth cookie
    // must be SameSite=None + Secure to be sent cross-site by the browser.
    res.cookie(COOKIE_NAME, result.accessToken, {
      httpOnly: true,
      secure: !isLocalDev,
      sameSite: isLocalDev ? 'lax' : 'none',
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    });

    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: { user: { id: string } }) {
    return this.authService.getProfile(req.user.id);
  }
}
