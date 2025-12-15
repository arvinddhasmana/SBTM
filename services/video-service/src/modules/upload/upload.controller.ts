import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    Param,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
    private readonly logger = new Logger(UploadController.name);

    constructor(private readonly uploadService: UploadService) { }

    @Post('video/:eventId/:videoId')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/videos',
                filename: (req, file, cb) => {
                    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
                    cb(null, uniqueName);
                },
            }),
            limits: {
                fileSize: 100 * 1024 * 1024, // 100MB
            },
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.startsWith('video/')) {
                    return cb(
                        new BadRequestException('Only video files are allowed'),
                        false,
                    );
                }
                cb(null, true);
            },
        }),
    )
    async uploadVideo(
        @Param('eventId') eventId: string,
        @Param('videoId') videoId: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        this.logger.log(`Uploading video for event: ${eventId}`);

        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.uploadService.handleVideoUpload(
            eventId,
            videoId,
            file,
        );

        return result;
    }

    @Post('thumbnail/:eventId/:thumbnailId')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/thumbnails',
                filename: (req, file, cb) => {
                    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
                    cb(null, uniqueName);
                },
            }),
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.startsWith('image/')) {
                    return cb(
                        new BadRequestException('Only image files are allowed'),
                        false,
                    );
                }
                cb(null, true);
            },
        }),
    )
    async uploadThumbnail(
        @Param('eventId') eventId: string,
        @Param('thumbnailId') thumbnailId: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        this.logger.log(`Uploading thumbnail for event: ${eventId}`);

        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.uploadService.handleThumbnailUpload(
            eventId,
            thumbnailId,
            file,
        );

        return result;
    }
}
