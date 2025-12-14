import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, map } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class GpsGateway {
    private readonly serviceUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.serviceUrl = this.configService.get<string>('GPS_SERVICE_URL');
    }

    async getLiveLocation(routeId: string) {
        const url = `${this.serviceUrl}/routes/${routeId}/live-location`;
        const response = await lastValueFrom(
            this.httpService.get(url).pipe(
                map((res) => res.data),
                catchError((e) => {
                    throw new HttpException(e.response?.data || 'Downstream Error', e.response?.status || 502);
                }),
            ),
        );
        return response;
    }

    async getHistory(routeId: string, from?: string, to?: string) {
        const url = `${this.serviceUrl}/routes/${routeId}/history`;
        const response = await lastValueFrom(
            this.httpService.get(url, { params: { from, to } }).pipe(
                map((res) => res.data),
                catchError((e) => {
                    throw new HttpException(e.response?.data || 'Downstream Error', e.response?.status || 502);
                }),
            )
        );
        return response;
    }
}
