import { describe, it, expect, vi, beforeEach } from 'vitest';
import { presenceApi } from './presence.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
    apiClient: {
        get: vi.fn(),
    },
}));

describe('presenceApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getStudentsByRoute', () => {
        it('should return students for a route', async () => {
            const mockStudents = [
                { studentId: 'stud-1', name: 'Alice', status: 'BOARDED' },
                { studentId: 'stud-2', name: 'Bob', status: 'BOARDED' },
            ];

            vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { students: mockStudents } });

            const result = await presenceApi.getStudentsByRoute('route-1');

            expect(result).toEqual([
                { ...mockStudents[0], routeId: 'route-1' },
                { ...mockStudents[1], routeId: 'route-1' },
            ]);
            expect(apiClient.get).toHaveBeenCalledWith(
                '/api/v1/routes/route-1/students'
            );
        });
    });

    describe('getAllBoardedStudents', () => {
        it('should return all boarded students across routes', async () => {
            const mockStudents = [
                { studentId: 'stud-1', status: 'BOARDED' },
                { studentId: 'stud-2', status: 'ALIGHTED' },
            ];

            vi.mocked(apiClient.get)
                .mockResolvedValueOnce({ data: { students: mockStudents } })
                .mockResolvedValueOnce({ data: { students: [] } });

            const result = await presenceApi.getAllBoardedStudents(['route-1', 'route-2']);

            expect(result).toEqual([
                { ...mockStudents[0], routeId: 'route-1' },
            ]);
        });
    });
});
