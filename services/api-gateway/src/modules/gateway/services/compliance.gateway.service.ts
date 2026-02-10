import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ComplianceGatewayService {
    private readonly serviceUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.serviceUrl = this.configService.get<string>('COMPLIANCE_SERVICE_URL', 'http://compliance-management:3007');
    }

    async forward(method: string, path: string, data?: any, params?: any) {
        try {
            const response = await axios({
                method,
                url: `${this.serviceUrl}${path}`,
                data,
                params,
            });
            return response.data;
        } catch (error) {
            console.error(`Error forwarding request to compliance service: ${error.message}`);
            if (error.response) {
                return error.response.data;
            }
            throw new InternalServerErrorException('Compliance service is currently unavailable');
        }
    }
}
