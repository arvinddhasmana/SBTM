import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class SmsAdapter implements OnModuleInit {
  private readonly logger = new Logger(SmsAdapter.name);
  private twilioClient: any;
  private fromNumber: string;
  private dryRun: boolean;

  constructor(private readonly configService: ConfigService) {
    this.dryRun =
      this.configService.get<string>('SMS_DRY_RUN', 'true') === 'true';
    this.fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER', '');
  }

  async onModuleInit() {
    if (this.dryRun) {
      this.logger.log('SMS adapter running in DRY_RUN mode');
      return;
    }

    try {
      const twilio = await import('twilio');
      const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
      const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured');
      }

      this.twilioClient = twilio.default(accountSid, authToken);
      this.logger.log('SMS adapter initialized with Twilio');
    } catch (error) {
      this.logger.warn(
        'SMS adapter failed to initialize — falling back to dry-run mode',
      );
      this.dryRun = true;
    }
  }

  async send(to: string, body: string): Promise<SmsResult> {
    if (this.dryRun) {
      this.logger.log(`[DRY_RUN] SMS: to="${to}", body="${body}"`);
      return { success: true, messageId: `dry-run-${Date.now()}` };
    }

    try {
      const message = await this.twilioClient.messages.create({
        body,
        from: this.fromNumber,
        to,
      });
      return { success: true, messageId: message.sid as string };
    } catch (error: any) {
      this.logger.error(`SMS send failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
