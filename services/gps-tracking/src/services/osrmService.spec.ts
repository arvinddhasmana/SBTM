import axios from 'axios';
import { OsrmService } from './osrmService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OsrmService', () => {
    let osrmService: OsrmService;

    beforeEach(() => {
        osrmService = new OsrmService();
        jest.clearAllMocks();
    });

    describe('snapToRoad', () => {
        it('should return snapped coordinates when OSRM returns Ok', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    code: 'Ok',
                    waypoints: [{
                        location: [-75.69, 45.38],
                        name: 'Bank Street'
                    }]
                }
            });

            const result = await osrmService.snapToRoad(45.37, -75.68);
            expect(result).toEqual({
                lat: 45.38,
                lng: -75.69,
                name: 'Bank Street'
            });
        });

        it('should return null when OSRM returns an error code', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: { code: 'NoSegment' }
            });

            const result = await osrmService.snapToRoad(45.37, -75.68);
            expect(result).toBeNull();
        });

        it('should return null on network error', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

            const result = await osrmService.snapToRoad(45.37, -75.68);
            expect(result).toBeNull();
        });
    });

    describe('getSnappedRoute', () => {
        it('should return route coordinates when OSRM returns Ok', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    code: 'Ok',
                    routes: [{
                        geometry: {
                            coordinates: [[-75.69, 45.38], [-75.68, 45.37]]
                        }
                    }]
                }
            });

            const result = await osrmService.getSnappedRoute([[-75.69, 45.38], [-75.68, 45.37]]);
            expect(result).toEqual([[-75.69, 45.38], [-75.68, 45.37]]);
        });
    });
});
