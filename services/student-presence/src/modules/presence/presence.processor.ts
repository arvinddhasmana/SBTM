
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('presence')
export class PresenceProcessor extends WorkerHost {
    private readonly logger = new Logger(PresenceProcessor.name);

    async process(job: Job): Promise<any> {
        this.logger.log(`Processing presence event job: ${job.id}`);

        // Future: Add additional async processing here
        // - Send notifications to parents
        // - Update analytics
        // - Trigger alerts if needed

        return { processed: true };
    }
}
