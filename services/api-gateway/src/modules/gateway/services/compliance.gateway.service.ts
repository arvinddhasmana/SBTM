import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';

@Injectable()
export class ComplianceGatewayService {
  private readonly serviceUrl: string;
  private readonly logger = new Logger(ComplianceGatewayService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClientService,
  ) {
    this.serviceUrl = this.configService.getOrThrow<string>(
      'COMPLIANCE_SERVICE_URL',
    );
  }

  async forward(method: string, path: string, data?: any, params?: any) {
    const url = `${this.serviceUrl}${path}`;
    try {
      switch (method.toUpperCase()) {
        case 'GET':
          return await this.httpClient.get(url, { params });
        case 'POST':
          return await this.httpClient.post(url, data, { params });
        case 'PUT':
          return await this.httpClient.put(url, data, { params });
        case 'PATCH':
          return await this.httpClient.patch(url, data, { params });
        case 'DELETE':
          return await this.httpClient.delete(url, { params });
        default:
          return await this.httpClient.get(url, { params });
      }
    } catch (error) {
      this.logger.error(
        `Error forwarding request to compliance service: ${error.message}`,
      );
      if (error.status) {
        throw error; // Re-throw HttpException from HttpClientService
      }
      throw new InternalServerErrorException(
        'Compliance service is currently unavailable',
      );
    }
  }
}
