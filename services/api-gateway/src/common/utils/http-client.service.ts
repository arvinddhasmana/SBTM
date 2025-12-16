import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

@Injectable()
export class HttpClientService {
    private readonly client: AxiosInstance;

    constructor(private readonly configService: ConfigService) {
        this.client = axios.create({
            timeout: this.configService.get<number>('HTTP_TIMEOUT', 10000),
        });
    }

    async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        try {
            const response = await this.client.get<T>(url, config);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        try {
            const response = await this.client.post<T>(url, data, config);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        try {
            const response = await this.client.put<T>(url, data, config);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        try {
            const response = await this.client.delete<T>(url, config);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (axiosError.response) {
                // Downstream service returned an error response
                const status = axiosError.response.status;
                const data = axiosError.response.data as Record<string, unknown>;

                throw new HttpException(
                    {
                        code: 'DOWNSTREAM_ERROR',
                        message: (data?.message as string) || 'Downstream service error',
                        details: { originalStatus: status, originalError: data },
                    },
                    status >= 500 ? HttpStatus.BAD_GATEWAY : status,
                );
            } else if (axiosError.request) {
                // No response received (network error, timeout)
                throw new HttpException(
                    {
                        code: 'SERVICE_UNAVAILABLE',
                        message: 'Downstream service is unavailable',
                        details: { originalMessage: axiosError.message },
                    },
                    HttpStatus.SERVICE_UNAVAILABLE,
                );
            }
        }

        // Unknown error
        throw new HttpException(
            {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
                details: {},
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
}
