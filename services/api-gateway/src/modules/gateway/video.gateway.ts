import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, map } from 'rxjs/operators';
import { lastValueFrom, throwError } from 'rxjs';

@Injectable()
export class VideoGateway {
    private readonly serviceUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.serviceUrl = this.configService.get<string>('VIDEO_SERVICE_URL');
    }

    async getVideoEvents() {
        const url = `${this.serviceUrl}/video-events`;
        const response = await lastValueFrom(
            this.httpService.get(url).pipe(
                map((res) => res.data),
                catchError((e) => {
                    return throwError(() => new HttpException(e.response?.data || 'Downstream Error', e.response?.status || 502));
                }),
            )
        );
        return response;
    }

    async getVideoEventById(id: string) {
        const url = `${this.serviceUrl}/video-events/${id}`;
        const response = await lastValueFrom(
            this.httpService.get(url).pipe(
                map((res) => res.data),
                catchError((e) => {
                    throw new HttpException(e.response?.data || 'Downstream Error', e.response?.status || 502);
                }),
            )
        );
        return response;
    }

    async createVideoEvent(event: any) {
        const url = `${this.serviceUrl}/video-events`;
        const response = await lastValueFrom(
            this.httpService.post(url, event).pipe(
                map((res) => res.data),
                catchError((e) => {
                    throw new HttpException(e.response?.data || 'Downstream Error', e.response?.status || 502);
                }),
            )
        );
        return response;
    }
}
