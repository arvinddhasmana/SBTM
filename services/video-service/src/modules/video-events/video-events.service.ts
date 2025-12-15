import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { VideoEvent, VideoEventStatus } from './entities/video-event.entity';
import { VideoAccessLog } from './entities/video-access-log.entity';
import { CreateVideoEventDto } from './dto/create-video-event.dto';
import { CompleteVideoEventDto } from './dto/complete-video-event.dto';
import { QueryVideoEventsDto } from './dto/query-video-events.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class VideoEventsService {
    private readonly logger = new Logger(VideoEventsService.name);

    constructor(
        @InjectRepository(VideoEvent)
        private videoEventRepository: Repository<VideoEvent>,
        @InjectRepository(VideoAccessLog)
        private videoAccessLogRepository: Repository<VideoAccessLog>,
        private storageService: StorageService,
    ) { }

    async create(createVideoEventDto: CreateVideoEventDto) {
        this.logger.log(
            `Creating video event for vehicle: ${createVideoEventDto.vehicleId}`,
        );

        // Create video event entity
        const videoEvent = this.videoEventRepository.create({
            ...createVideoEventDto,
            timestamp: new Date(createVideoEventDto.timestamp),
            status: VideoEventStatus.UPLOADING,
        });

        // Save to database
        const savedEvent = await this.videoEventRepository.save(videoEvent);

        // Generate presigned upload URLs
        const presignedUrls =
            await this.storageService.generatePresignedUploadUrls(savedEvent.id);

        this.logger.log(`Created video event: ${savedEvent.id}`);

        return {
            videoEventId: savedEvent.id,
            uploadUrl: presignedUrls.uploadUrl,
            thumbnailUploadUrl: presignedUrls.thumbnailUploadUrl,
        };
    }

    async complete(id: string, completeVideoEventDto: CompleteVideoEventDto) {
        this.logger.log(`Completing video event: ${id}`);

        const videoEvent = await this.videoEventRepository.findOne({
            where: { id },
        });

        if (!videoEvent) {
            throw new NotFoundException(`Video event with ID ${id} not found`);
        }

        videoEvent.videoUrl = completeVideoEventDto.videoUrl;
        videoEvent.thumbnailUrl = completeVideoEventDto.thumbnailUrl;
        videoEvent.status = VideoEventStatus.READY;

        await this.videoEventRepository.save(videoEvent);

        this.logger.log(`Completed video event: ${id}`);

        return videoEvent;
    }

    async findAll(queryDto: QueryVideoEventsDto) {
        const page = parseInt(queryDto.page || '1', 10);
        const limit = parseInt(queryDto.limit || '10', 10);
        const skip = (page - 1) * limit;

        const where: any = {};

        if (queryDto.vehicleId) {
            where.vehicleId = queryDto.vehicleId;
        }

        if (queryDto.routeId) {
            where.routeId = queryDto.routeId;
        }

        if (queryDto.driverId) {
            where.driverId = queryDto.driverId;
        }

        if (queryDto.eventType) {
            where.eventType = queryDto.eventType;
        }

        if (queryDto.status) {
            where.status = queryDto.status;
        }

        if (queryDto.startDate && queryDto.endDate) {
            where.timestamp = Between(
                new Date(queryDto.startDate),
                new Date(queryDto.endDate),
            );
        } else if (queryDto.startDate) {
            where.timestamp = Between(new Date(queryDto.startDate), new Date());
        }

        const [events, total] = await this.videoEventRepository.findAndCount({
            where,
            order: { timestamp: 'DESC' },
            skip,
            take: limit,
        });

        return {
            data: events,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string, userId?: string, ipAddress?: string) {
        const videoEvent = await this.videoEventRepository.findOne({
            where: { id },
        });

        if (!videoEvent) {
            throw new NotFoundException(`Video event with ID ${id} not found`);
        }

        // Log access if user info provided
        if (userId && ipAddress) {
            await this.logAccess(id, userId, ipAddress);
        }

        // Generate secure playback URL if video is ready
        if (videoEvent.status === VideoEventStatus.READY && videoEvent.videoUrl) {
            const objectKey =
                this.storageService.extractObjectKeyFromUrl(videoEvent.videoUrl);
            const playbackUrl =
                await this.storageService.generatePresignedDownloadUrl(objectKey);

            return {
                ...videoEvent,
                playbackUrl,
            };
        }

        return videoEvent;
    }

    async markAsFailed(id: string) {
        const videoEvent = await this.videoEventRepository.findOne({
            where: { id },
        });

        if (!videoEvent) {
            throw new NotFoundException(`Video event with ID ${id} not found`);
        }

        videoEvent.status = VideoEventStatus.FAILED;
        await this.videoEventRepository.save(videoEvent);

        this.logger.log(`Marked video event as failed: ${id}`);

        return videoEvent;
    }

    async delete(id: string) {
        const videoEvent = await this.videoEventRepository.findOne({
            where: { id },
        });

        if (!videoEvent) {
            throw new NotFoundException(`Video event with ID ${id} not found`);
        }

        // Delete video from storage if exists
        if (videoEvent.videoUrl) {
            try {
                const objectKey =
                    this.storageService.extractObjectKeyFromUrl(videoEvent.videoUrl);
                await this.storageService.deleteObject(objectKey);
            } catch (error) {
                this.logger.error(`Failed to delete video file: ${error.message}`);
            }
        }

        // Delete thumbnail from storage if exists
        if (videoEvent.thumbnailUrl) {
            try {
                const objectKey = this.storageService.extractObjectKeyFromUrl(
                    videoEvent.thumbnailUrl,
                );
                await this.storageService.deleteObject(objectKey);
            } catch (error) {
                this.logger.error(`Failed to delete thumbnail file: ${error.message}`);
            }
        }

        await this.videoEventRepository.remove(videoEvent);

        this.logger.log(`Deleted video event: ${id}`);

        return { message: 'Video event deleted successfully' };
    }

    private async logAccess(
        videoEventId: string,
        userId: string,
        ipAddress: string,
    ) {
        const accessLog = this.videoAccessLogRepository.create({
            videoEventId,
            userId,
            ipAddress,
            timestamp: new Date(),
        });

        await this.videoAccessLogRepository.save(accessLog);
        this.logger.log(`Logged access to video event ${videoEventId} by ${userId}`);
    }

    async getAccessLogs(videoEventId: string) {
        return this.videoAccessLogRepository.find({
            where: { videoEventId },
            order: { timestamp: 'DESC' },
        });
    }
}
