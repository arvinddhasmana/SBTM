import {
  Injectable,
  HttpException,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ServiceTokenService } from './service-token.service';
import { CORRELATION_ID_HEADER } from '@sbtm/common';

@Injectable()
export class HttpClientService {
  private readonly client: AxiosInstance;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    private readonly serviceTokenService: ServiceTokenService | null,
  ) {
    this.client = axios.create({
      timeout: this.configService.get<number>('HTTP_TIMEOUT', 10000),
    });
  }

  /**
   * Build internal-call headers: service JWT + correlation ID propagation.
   * The correlationId is optional; when provided it is forwarded to downstream services.
   */
  private internalHeaders(correlationId?: string): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.serviceTokenService) {
      headers['Authorization'] =
        `Bearer ${this.serviceTokenService.createServiceToken()}`;
    }

    if (correlationId) {
      headers[CORRELATION_ID_HEADER] = correlationId;
    }

    return headers;
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
    correlationId?: string,
  ): Promise<T> {
    try {
      const response = await this.client.get<T>(
        url,
        this.mergeHeaders(config, correlationId),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    correlationId?: string,
  ): Promise<T> {
    try {
      const response = await this.client.post<T>(
        url,
        data,
        this.mergeHeaders(config, correlationId),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    correlationId?: string,
  ): Promise<T> {
    try {
      const response = await this.client.put<T>(
        url,
        data,
        this.mergeHeaders(config, correlationId),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    correlationId?: string,
  ): Promise<T> {
    try {
      const response = await this.client.patch<T>(
        url,
        data,
        this.mergeHeaders(config, correlationId),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
    correlationId?: string,
  ): Promise<T> {
    try {
      const response = await this.client.delete<T>(
        url,
        this.mergeHeaders(config, correlationId),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  private mergeHeaders(
    config?: AxiosRequestConfig,
    correlationId?: string,
  ): AxiosRequestConfig {
    return {
      ...config,
      headers: {
        ...(config?.headers as Record<string, string> | undefined),
        ...this.internalHeaders(correlationId),
      },
    };
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
