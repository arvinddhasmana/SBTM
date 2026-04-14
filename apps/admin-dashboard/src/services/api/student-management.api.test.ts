import { describe, it, expect, vi, beforeEach } from 'vitest';
import { studentManagementApi } from './student-management.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('studentManagementApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStudents', () => {
    it('should return students from API without params', async () => {
      const mockStudents = [
        { id: 'stu-1', firstName: 'Alice', lastName: 'Smith' },
        { id: 'stu-2', firstName: 'Bob', lastName: 'Jones' },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockStudents });

      const result = await studentManagementApi.getStudents();

      expect(result).toEqual(mockStudents);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/students', {
        params: undefined,
      });
    });

    it('should pass params when provided', async () => {
      const params = { schoolId: 'school-1', grade: '5' };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await studentManagementApi.getStudents(params);

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/students', { params });
    });
  });

  describe('getStudentById', () => {
    it('should return a single student by id', async () => {
      const mockStudent = { id: 'stu-1', firstName: 'Alice', lastName: 'Smith' };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockStudent });

      const result = await studentManagementApi.getStudentById('stu-1');

      expect(result).toEqual(mockStudent);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/students/stu-1');
    });
  });

  describe('enrollStudent', () => {
    it('should post new student data', async () => {
      const studentData = {
        firstName: 'Charlie',
        lastName: 'Brown',
        schoolId: 'school-1',
        grade: '3',
      };
      const mockResponse = { id: 'stu-3', ...studentData };

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await studentManagementApi.enrollStudent(studentData);

      expect(result).toEqual(mockResponse);
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/students', studentData);
    });
  });

  describe('updateStudent', () => {
    it('should patch student data by id', async () => {
      const updateData = { grade: '4' };
      const mockResponse = { id: 'stu-1', firstName: 'Alice', grade: '4' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockResponse });

      const result = await studentManagementApi.updateStudent('stu-1', updateData);

      expect(result).toEqual(mockResponse);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/students/stu-1', updateData);
    });
  });

  describe('assignRoute', () => {
    it('should patch student route assignment', async () => {
      const assignment = { routeId: 'route-1', stopId: 'stop-5' };
      const mockResponse = { id: 'stu-1', routeId: 'route-1', stopId: 'stop-5' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockResponse });

      const result = await studentManagementApi.assignRoute('stu-1', assignment);

      expect(result).toEqual(mockResponse);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/students/stu-1/assignment', assignment);
    });
  });
});
