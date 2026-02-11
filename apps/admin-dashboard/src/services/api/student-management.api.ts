import { apiClient } from './api-client';

export const studentManagementApi = {
    getStudents: async (params?: any) => {
        const response = await apiClient.get('/api/v1/students', { params });
        return response.data;
    },

    getStudentById: async (id: string) => {
        const response = await apiClient.get(`/api/v1/students/${id}`);
        return response.data;
    },

    enrollStudent: async (studentData: any) => {
        const response = await apiClient.post('/api/v1/students', studentData);
        return response.data;
    },

    updateStudent: async (id: string, studentData: any) => {
        const response = await apiClient.patch(`/api/v1/students/${id}`, studentData);
        return response.data;
    },

    assignRoute: async (id: string, assignment: any) => {
        const response = await apiClient.patch(`/api/v1/students/${id}/assignment`, assignment);
        return response.data;
    },

    bulkImport: async (file: File, schoolId: string) => {
        // For bulk import, we'll read the file and send as base64 or string for now
        // In a real app, use FormData
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = async () => {
                try {
                    const response = await apiClient.post('/api/v1/students/bulk-import', {
                        file: reader.result,
                        school_id: schoolId,
                    });
                    resolve(response.data);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },
};
