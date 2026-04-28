import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

export interface PresignedUrls {
  uploadUrl: string;
  thumbnailUploadUrl?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: Minio.Client | null = null;
  private readonly storageType: string;
  private readonly bucketName: string;
  private readonly urlExpirySeconds: number;

  constructor(private configService: ConfigService) {
    this.storageType = this.configService.get('STORAGE_TYPE', 'minio');
    this.bucketName = this.configService.get('MINIO_BUCKET_NAME', 'videos');
    this.urlExpirySeconds = parseInt(
      this.configService.get('PRESIGNED_URL_EXPIRY', '3600'),
      10,
    );

    if (this.storageType === 'minio') {
      this.initializeMinIO();
    }
  }

  private async initializeMinIO() {
    try {
      this.minioClient = new Minio.Client({
        endPoint: this.configService.get('MINIO_ENDPOINT', 'localhost'),
        port: parseInt(this.configService.get('MINIO_PORT', '9000'), 10),
        useSSL: this.configService.get('MINIO_USE_SSL', 'false') === 'true',
        accessKey: this.configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
        secretKey: this.configService.getOrThrow<string>('MINIO_SECRET_KEY'),
      });

      // Ensure bucket exists
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Created bucket: ${this.bucketName}`);
      }

      this.logger.log('MinIO client initialized successfully');
    } catch (error) {
      this.logger.warn('MinIO not available, falling back to local storage');
      this.minioClient = null;
      // Don't throw - allow service to start with local storage fallback
    }
  }

  async generatePresignedUploadUrls(
    videoEventId: string,
  ): Promise<PresignedUrls> {
    if (this.storageType === 'minio' && this.minioClient) {
      return this.generateMinIOPresignedUrls(videoEventId);
    } else {
      return this.generateLocalStorageUrls(videoEventId);
    }
  }

  private async generateMinIOPresignedUrls(
    videoEventId: string,
  ): Promise<PresignedUrls> {
    const videoKey = `videos/${videoEventId}/${uuidv4()}.mp4`;
    const thumbnailKey = `thumbnails/${videoEventId}/${uuidv4()}.jpg`;

    try {
      const uploadUrl = await this.minioClient.presignedPutObject(
        this.bucketName,
        videoKey,
        this.urlExpirySeconds,
      );

      const thumbnailUploadUrl = await this.minioClient.presignedPutObject(
        this.bucketName,
        thumbnailKey,
        this.urlExpirySeconds,
      );

      return {
        uploadUrl,
        thumbnailUploadUrl,
      };
    } catch (error) {
      this.logger.error('Failed to generate presigned URLs', error);
      throw error;
    }
  }

  private generateLocalStorageUrls(videoEventId: string): PresignedUrls {
    const baseUrl = this.configService.get(
      'STORAGE_BASE_URL',
      'http://localhost:3005',
    );
    const videoId = uuidv4();
    const thumbnailId = uuidv4();

    return {
      uploadUrl: `${baseUrl}/api/v1/upload/video/${videoEventId}/${videoId}`,
      thumbnailUploadUrl: `${baseUrl}/api/v1/upload/thumbnail/${videoEventId}/${thumbnailId}`,
    };
  }

  async generatePresignedDownloadUrl(objectKey: string): Promise<string> {
    if (this.storageType === 'minio' && this.minioClient) {
      try {
        return await this.minioClient.presignedGetObject(
          this.bucketName,
          objectKey,
          this.urlExpirySeconds,
        );
      } catch (error) {
        this.logger.error('Failed to generate download URL', error);
        throw error;
      }
    } else {
      const baseUrl = this.configService.get(
        'STORAGE_BASE_URL',
        'http://localhost:3005',
      );
      return `${baseUrl}/api/v1/download/${objectKey}`;
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    if (this.storageType === 'minio' && this.minioClient) {
      try {
        await this.minioClient.removeObject(this.bucketName, objectKey);
        this.logger.log(`Deleted object: ${objectKey}`);
      } catch (error) {
        this.logger.error(`Failed to delete object: ${objectKey}`, error);
        throw error;
      }
    } else {
      this.logger.warn('Delete operation not implemented for local storage');
    }
  }

  extractObjectKeyFromUrl(url: string): string {
    // Extract the object key from the full URL
    const urlParts = url.split('/');
    const bucketIndex = urlParts.indexOf(this.bucketName);
    if (bucketIndex !== -1) {
      return urlParts.slice(bucketIndex + 1).join('/');
    }
    return url;
  }
}
