import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface FcmResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class FcmAdapter implements OnModuleInit {
  private readonly logger = new Logger(FcmAdapter.name);
  private firebaseApp: any;
  private messaging: any;
  private dryRun: boolean;

  constructor(private readonly configService: ConfigService) {
    this.dryRun =
      this.configService.get<string>('FCM_DRY_RUN', 'true') === 'true';
  }

  async onModuleInit() {
    if (this.dryRun) {
      this.logger.log('FCM adapter running in DRY_RUN mode');
      return;
    }

    try {
      const firebaseAdmin = await import('firebase-admin');
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>(
        'FIREBASE_CLIENT_EMAIL',
      );
      const privateKey = this.configService
        .get<string>('FIREBASE_PRIVATE_KEY', '')
        .replace(/\\n/g, '\n');

      this.firebaseApp = firebaseAdmin.default.initializeApp({
        credential: firebaseAdmin.default.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      this.messaging = firebaseAdmin.default.messaging();
      this.logger.log('FCM adapter initialized');
    } catch (error) {
      this.logger.warn(
        'FCM adapter failed to initialize — falling back to dry-run mode',
      );
      this.dryRun = true;
    }
  }

  async sendToDevice(token: string, payload: FcmPayload): Promise<FcmResult> {
    if (this.dryRun) {
      this.logger.log(
        `[DRY_RUN] FCM push: title="${payload.title}", body="${payload.body}"`,
      );
      return { success: true, messageId: `dry-run-${Date.now()}` };
    }

    try {
      const messageId: string = await this.messaging.send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
      });
      return { success: true, messageId };
    } catch (error: any) {
      const code = error?.code ?? error?.errorInfo?.code ?? '';
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        return {
          success: false,
          error: 'INVALID_TOKEN',
        };
      }
      this.logger.error(`FCM send failed: ${code}`);
      return { success: false, error: code || 'UNKNOWN_ERROR' };
    }
  }

  async sendToDevices(
    tokens: string[],
    payload: FcmPayload,
  ): Promise<FcmResult[]> {
    const results: FcmResult[] = [];
    for (const token of tokens) {
      results.push(await this.sendToDevice(token, payload));
    }
    return results;
  }
}
