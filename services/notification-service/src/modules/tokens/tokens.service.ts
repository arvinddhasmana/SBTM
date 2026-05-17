import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeviceToken,
  DeviceTokenRecipientKind,
} from './entities/device-token.entity';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    @InjectRepository(DeviceToken)
    private readonly tokenRepo: Repository<DeviceToken>,
  ) {}

  async register(
    recipientKind: DeviceTokenRecipientKind,
    recipientId: string,
    schoolId: string,
    token: string,
    platform: string,
  ): Promise<DeviceToken> {
    const existing = await this.tokenRepo.findOne({
      where: { recipientKind, recipientId, token },
    });

    if (existing) {
      existing.isActive = true;
      existing.platform = platform;
      await this.tokenRepo.save(existing);
      this.logger.log(
        `Reactivated device token for ${recipientKind}=${recipientId}, platform=${platform}`,
      );
      return existing;
    }

    const deviceToken = this.tokenRepo.create({
      recipientKind,
      recipientId,
      schoolId,
      token,
      platform,
      isActive: true,
    });
    const saved = await this.tokenRepo.save(deviceToken);
    this.logger.log(
      `Registered device token for ${recipientKind}=${recipientId}, platform=${platform}`,
    );
    return saved;
  }

  async deactivate(
    tokenId: string,
    recipientKind: DeviceTokenRecipientKind,
    recipientId: string,
  ): Promise<void> {
    await this.tokenRepo.update(
      { id: tokenId, recipientKind, recipientId },
      { isActive: false },
    );
    this.logger.log(
      `Deactivated device token tokenId=${tokenId}, ${recipientKind}=${recipientId}`,
    );
  }

  async deactivateByToken(token: string): Promise<void> {
    await this.tokenRepo.update({ token }, { isActive: false });
    this.logger.log('Deactivated invalid device token');
  }

  async getActiveTokensForRecipient(
    recipientKind: DeviceTokenRecipientKind,
    recipientId: string,
  ): Promise<DeviceToken[]> {
    return this.tokenRepo.find({
      where: { recipientKind, recipientId, isActive: true },
    });
  }

  async listForRecipient(
    recipientKind: DeviceTokenRecipientKind,
    recipientId: string,
    schoolId: string,
  ): Promise<DeviceToken[]> {
    return this.tokenRepo.find({
      where: { recipientKind, recipientId, schoolId },
      order: { createdAt: 'DESC' },
    });
  }
}
