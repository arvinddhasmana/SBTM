import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

// Add auth header interceptor (assuming it exists in other files)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const studentManagementApi = {
    getStudents: async (params?: any) => {
        const response = await api.get('/students', { params });
        return response.data;
    },

    getStudentById: async (id: string) => {
        const response = await api.get(`/students/${id}`);
        return response.data;
    },

    enrollStudent: async (studentData: any) => {
        const response = await api.post('/students', studentData);
        return response.data;
    },

    updateStudent: async (id: string, studentData: any) => {
        const response = await api.patch(`/students/${id}`, studentData);
        return response.data;
    },

    assignRoute: async (id: string, assignment: any) => {
        const response = await api.patch(`/students/${id}/assignment`, assignment);
        return response.data;
    },

    bulkImport: async (file: File, schoolId: string) => {
        // For bulk import, we'll read the file and send as base64 or string for now
        // In a real app, use FormData
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = async () => {
                try {
                    const response = await api.post('/students/bulk-import', {
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
