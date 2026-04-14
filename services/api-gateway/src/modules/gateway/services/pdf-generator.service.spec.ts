import { Test, TestingModule } from '@nestjs/testing';
import { PdfGeneratorService } from './pdf-generator.service';

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfGeneratorService],
    }).compile();

    service = module.get<PdfGeneratorService>(PdfGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateFleetAssignmentPdf', () => {
    it('should generate a valid PDF buffer for fleet assignment', async () => {
      const data = {
        schoolName: 'Greenfield Elementary',
        routeName: 'Route A AM',
        vehicleId: 'BUS-01',
        driverId: 'driver-1',
        effectiveDate: '2025-06-01',
        proposedBy: 'Admin User',
        reviewedBy: 'School Admin',
        status: 'ACCEPTED',
        createdAt: '2025-01-15T10:00:00Z',
      };

      const result = await service.generateFleetAssignmentPdf(data);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      // PDF files start with %PDF
      expect(result.toString('ascii', 0, 5)).toBe('%PDF-');
    });

    it('should handle missing optional fields gracefully', async () => {
      const data = {
        schoolName: 'Test School',
        routeName: 'Route B',
        vehicleId: 'BUS-02',
        proposedBy: 'Admin',
        status: 'PROPOSED',
        createdAt: '2025-01-01T00:00:00Z',
      };

      const result = await service.generateFleetAssignmentPdf(data);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generateRoutePlanPdf', () => {
    it('should generate a valid PDF buffer for route plan', async () => {
      const data = {
        routeName: 'Route A AM',
        direction: 'AM',
        stops: [
          { name: 'Main St & 1st Ave', sequence: 1, arrivalTime: '07:30' },
          { name: 'Oak Park', sequence: 2, arrivalTime: '07:40' },
          { name: 'Greenfield Elementary', sequence: 3, arrivalTime: '07:50' },
        ],
      };

      const result = await service.generateRoutePlanPdf(data);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(result.toString('ascii', 0, 5)).toBe('%PDF-');
    });

    it('should handle empty stops array', async () => {
      const data = {
        routeName: 'Empty Route',
        direction: 'PM',
        stops: [],
      };

      const result = await service.generateRoutePlanPdf(data);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
