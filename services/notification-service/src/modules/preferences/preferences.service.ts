import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from './entities/notification-preference.entity';

const EMERGENCY_EVENT_TYPE = 'EMERGENCY';

interface PreferenceItem {
  eventType: string;
  channel: string;
  enabled: boolean;
}

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(
    @InjectRepository(NotificationPreference)
    private readonly prefRepo: Repository<NotificationPreference>,
  ) {}

  async getForUser(
    userId: string,
    schoolId: string,
  ): Promise<NotificationPreference[]> {
    return this.prefRepo.find({
      where: { userId, schoolId },
      order: { eventType: 'ASC', channel: 'ASC' },
    });
  }

  async upsert(
    userId: string,
    schoolId: string,
    preferences: PreferenceItem[],
  ): Promise<NotificationPreference[]> {
    const results: NotificationPreference[] = [];

    for (const pref of preferences) {
      const enabled =
        pref.eventType === EMERGENCY_EVENT_TYPE ? true : pref.enabled;

      const existing = await this.prefRepo.findOne({
        where: {
          userId,
          eventType: pref.eventType,
          channel: pref.channel,
        },
      });

      if (existing) {
        existing.enabled = enabled;
        results.push(await this.prefRepo.save(existing));
      } else {
        const newPref = this.prefRepo.create({
          userId,
          schoolId,
          eventType: pref.eventType,
          channel: pref.channel,
          enabled,
        });
        results.push(await this.prefRepo.save(newPref));
      }
    }

    this.logger.log(
      `Updated ${results.length} preferences for userId=${userId}`,
    );
    return results;
  }

  async isChannelEnabled(
    userId: string,
    eventType: string,
    channel: string,
  ): Promise<boolean> {
    if (eventType === EMERGENCY_EVENT_TYPE) {
      return true;
    }

    const pref = await this.prefRepo.findOne({
      where: { userId, eventType, channel },
    });

    if (!pref) {
      return channel === 'PUSH';
    }

    return pref.enabled;
  }

  async getEnabledChannels(
    userId: string,
    eventType: string,
  ): Promise<string[]> {
    if (eventType === EMERGENCY_EVENT_TYPE) {
      return ['PUSH', 'SMS'];
    }

    const prefs = await this.prefRepo.find({
      where: { userId, eventType, enabled: true },
    });

    if (prefs.length === 0) {
      return ['PUSH'];
    }

    return prefs.map((p) => p.channel);
  }
}
