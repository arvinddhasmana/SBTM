import { Test, TestingModule } from '@nestjs/testing';
import { GpsGateway } from './gps.gateway';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';

describe('GpsGateway', () => {
    let service: GpsGateway;
    let httpService: HttpService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GpsGateway,
                {
                    provide: HttpService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(() => 'http://gps-service'),
                    },
                },
            ],
        }).compile();

        service = module.get<GpsGateway>(GpsGateway);
        httpService = module.get<HttpService>(HttpService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getLiveLocation', () => {
        it('should return data from http service', async () => {
            const mockResponse = { data: { lat: 10, lng: 10 } };
            jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse as any));

            const result = await service.getLiveLocation('route1');
            expect(result).toEqual({ lat: 10, lng: 10 });
            expect(httpService.get).toHaveBeenCalledWith('http://gps-service/routes/route1/live-location');
        });
    });
});
