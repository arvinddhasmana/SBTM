import axios from 'axios';
import type { StudentPresence } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Mock presence data
const mockPresence: StudentPresence[] = [
    { studentId: 'stud-001', name: 'Alice Johnson', status: 'BOARDED', lastSeen: new Date().toISOString(), routeId: 'route-123' },
    { studentId: 'stud-002', name: 'Bob Smith', status: 'BOARDED', lastSeen: new Date().toISOString(), routeId: 'route-123' },
    { studentId: 'stud-003', name: 'Charlie Brown', status: 'ALIGHTED', lastSeen: new Date(Date.now() - 600000).toISOString(), routeId: 'route-123' },
    { studentId: 'stud-004', name: 'Diana Ross', status: 'BOARDED', lastSeen: new Date().toISOString(), routeId: 'route-456' },
    { studentId: 'stud-005', name: 'Eddie Murphy', status: 'BOARDED', lastSeen: new Date().toISOString(), routeId: 'route-456' },
];

export const presenceApi = {
    /**
     * Get students by route
     */
    async getStudentsByRoute(routeId: string): Promise<StudentPresence[]> {
        try {
            const response = await axios.get<StudentPresence[]>(
                `${API_BASE_URL}/api/v1/routes/${routeId}/students`
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return mockPresence.filter(p => p.routeId === routeId);
            }
            throw error;
        }
    },

    /**
     * Get all students currently on buses
     */
    async getAllBoardedStudents(): Promise<StudentPresence[]> {
        try {
            const response = await axios.get<StudentPresence[]>(
                `${API_BASE_URL}/api/v1/students/boarded`
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return mockPresence.filter(p => p.status === 'BOARDED');
            }
            throw error;
        }
    },

    /**
     * Get all presence records
     */
    async getAllPresence(): Promise<StudentPresence[]> {
        try {
            const response = await axios.get<StudentPresence[]>(
                `${API_BASE_URL}/api/v1/students/presence`
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return mockPresence;
            }
            throw error;
        }
    },
};
