import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceToken } from './entities/device-token.entity';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    @InjectRepository(DeviceToken)
    private readonly tokenRepo: Repository<DeviceToken>,
  ) {}

  async register(
    userId: string,
    schoolId: string,
    token: string,
    platform: string,
  ): Promise<DeviceToken> {
    const existing = await this.tokenRepo.findOne({
      where: { userId, token },
    });

    if (existing) {
      existing.isActive = true;
      existing.platform = platform;
      await this.tokenRepo.save(existing);
      this.logger.log(
        `Reactivated device token for userId=${userId}, platform=${platform}`,
      );
      return existing;
    }

    const deviceToken = this.tokenRepo.create({
      userId,
      schoolId,
      token,
      platform,
      isActive: true,
    });
    const saved = await this.tokenRepo.save(deviceToken);
    this.logger.log(
      `Registered device token for userId=${userId}, platform=${platform}`,
    );
    return saved;
  }

  async deactivate(tokenId: string, userId: string): Promise<void> {
    await this.tokenRepo.update({ id: tokenId, userId }, { isActive: false });
    this.logger.log(
      `Deactivated device token tokenId=${tokenId}, userId=${userId}`,
    );
  }

  async deactivateByToken(token: string): Promise<void> {
    await this.tokenRepo.update({ token }, { isActive: false });
    this.logger.log('Deactivated invalid device token');
  }

  async getActiveTokensForUser(userId: string): Promise<DeviceToken[]> {
    return this.tokenRepo.find({
      where: { userId, isActive: true },
    });
  }

  async listForUser(userId: string, schoolId: string): Promise<DeviceToken[]> {
    return this.tokenRepo.find({
      where: { userId, schoolId },
      order: { createdAt: 'DESC' },
    });
  }
}
