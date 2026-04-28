import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>('STORAGE_BASE_URL');
  }

  async handleVideoUpload(
    eventId: string,
    videoId: string,
    file: Express.Multer.File,
  ) {
    this.logger.log(
      `Processed video upload: ${file.filename} for event ${eventId}`,
    );

    const videoUrl = `${this.baseUrl}/uploads/videos/${file.filename}`;

    return {
      success: true,
      videoUrl,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async handleThumbnailUpload(
    eventId: string,
    thumbnailId: string,
    file: Express.Multer.File,
  ) {
    this.logger.log(
      `Processed thumbnail upload: ${file.filename} for event ${eventId}`,
    );

    const thumbnailUrl = `${this.baseUrl}/uploads/thumbnails/${file.filename}`;

    return {
      success: true,
      thumbnailUrl,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
