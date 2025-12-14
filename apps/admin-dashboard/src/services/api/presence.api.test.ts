import { describe, it, expect, vi, beforeEach } from 'vitest';
import { presenceApi } from './presence.api';

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        isAxiosError: vi.fn((error) => error.isAxiosError),
    },
}));

import axios from 'axios';

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

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockStudents });

            const result = await presenceApi.getStudentsByRoute('route-1');

            expect(result).toEqual(mockStudents);
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/routes/route-1/students')
            );
        });
    });

    describe('getAllBoardedStudents', () => {
        it('should return all boarded students', async () => {
            const mockStudents = [
                { studentId: 'stud-1', status: 'BOARDED' },
                { studentId: 'stud-2', status: 'BOARDED' },
            ];

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockStudents });

            const result = await presenceApi.getAllBoardedStudents();

            expect(result).toEqual(mockStudents);
        });
    });
});
