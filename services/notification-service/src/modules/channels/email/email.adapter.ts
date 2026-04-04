import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailAdapter implements OnModuleInit {
  private readonly logger = new Logger(EmailAdapter.name);
  private transporter: any;
  private dryRun: boolean;
  private fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    this.dryRun =
      this.configService.get<string>('EMAIL_DRY_RUN', 'true') === 'true';
    this.fromAddress = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@sbtm.local',
    );
  }

  async onModuleInit() {
    if (this.dryRun) {
      this.logger.log('Email adapter running in DRY_RUN mode');
      return;
    }

    try {
      const nodemailer = await import('nodemailer');
      this.transporter = nodemailer.default.createTransport({
        host: this.configService.get<string>('SMTP_HOST', 'localhost'),
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure:
          this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
        auth: {
          user: this.configService.get<string>('SMTP_USER', ''),
          pass: this.configService.get<string>('SMTP_PASS', ''),
        },
      });
      this.logger.log('Email adapter initialized with SMTP transport');
    } catch (error) {
      this.logger.warn(
        'Email adapter failed to initialize — falling back to dry-run mode',
      );
      this.dryRun = true;
    }
  }

  async send(
    to: string,
    subject: string,
    htmlBody: string,
  ): Promise<EmailResult> {
    if (this.dryRun) {
      this.logger.log(`[DRY_RUN] Email: to="${to}", subject="${subject}"`);
      return { success: true, messageId: `dry-run-${Date.now()}` };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html: htmlBody,
      });
      return { success: true, messageId: info.messageId as string };
    } catch (error: any) {
      this.logger.error(`Email send failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
