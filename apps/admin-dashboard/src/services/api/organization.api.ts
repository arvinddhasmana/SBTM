import { apiClient } from './api-client';

export interface Board {
    id: string;
    name: string;
    schools?: { id: string; name: string }[];
}

export interface CreateBoardPayload {
    name: string;
}

export interface UpdateBoardPayload {
    name?: string;
}

export const organizationApi = {
    async listBoards(): Promise<Board[]> {
        const response = await apiClient.get<Board[]>('/api/v1/boards');
        return response.data;
    },

    async getBoard(id: string): Promise<Board> {
        const response = await apiClient.get<Board>(`/api/v1/boards/${id}`);
        return response.data;
    },

    async createBoard(payload: CreateBoardPayload): Promise<Board> {
        const response = await apiClient.post<Board>('/api/v1/boards', payload);
        return response.data;
    },

    async updateBoard(id: string, payload: UpdateBoardPayload): Promise<Board> {
        const response = await apiClient.patch<Board>(`/api/v1/boards/${id}`, payload);
        return response.data;
    },

    async deleteBoard(id: string): Promise<void> {
        await apiClient.delete(`/api/v1/boards/${id}`);
    },

    async listSchools(boardId?: string): Promise<School[]> {
        const response = await apiClient.get<School[]>('/api/v1/schools', {
            params: boardId ? { boardId } : undefined,
        });
        return response.data;
    },

    async getSchool(id: string): Promise<School> {
        const response = await apiClient.get<School>(`/api/v1/schools/${id}`);
        return response.data;
    },

    async createSchool(payload: CreateSchoolPayload): Promise<School> {
        const response = await apiClient.post<School>('/api/v1/schools', payload);
        return response.data;
    },

    async updateSchool(id: string, payload: UpdateSchoolPayload): Promise<School> {
        const response = await apiClient.patch<School>(`/api/v1/schools/${id}`, payload);
        return response.data;
    },

    async deleteSchool(id: string): Promise<void> {
        await apiClient.delete(`/api/v1/schools/${id}`);
    },
};

export interface School {
    id: string;
    name: string;
    boardId: string;
}

export interface CreateSchoolPayload {
    name: string;
    boardId: string;
}

export interface UpdateSchoolPayload {
    name?: string;
    boardId?: string;
}
