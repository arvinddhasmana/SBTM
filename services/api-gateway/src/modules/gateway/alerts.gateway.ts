import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, map } from 'rxjs/operators';
import { lastValueFrom, throwError } from 'rxjs';

@Injectable()
export class AlertsGateway {
    private readonly serviceUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.serviceUrl = this.configService.get<string>('ALERTS_SERVICE_URL');
    }

    async getActiveAlerts() {
        const url = `${this.serviceUrl}/alerts/active`;
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

    async getAlertById(id: string) {
        const url = `${this.serviceUrl}/alerts/${id}`;
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

    async createEmergencyEvent(event: any) {
        const url = `${this.serviceUrl}/api/v1/emergency-events`; // Assuming path based on module docs or examples
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
