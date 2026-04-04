import { Module } from '@nestjs/common';
import { FcmAdapter } from './fcm/fcm.adapter';
import { EmailAdapter } from './email/email.adapter';
import { SmsAdapter } from './sms/sms.adapter';

@Module({
  providers: [FcmAdapter, EmailAdapter, SmsAdapter],
  exports: [FcmAdapter, EmailAdapter, SmsAdapter],
})
export class ChannelsModule {}
