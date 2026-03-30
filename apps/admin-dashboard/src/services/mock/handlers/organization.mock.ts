import type { Board, School, CreateBoardPayload, UpdateBoardPayload, CreateSchoolPayload, UpdateSchoolPayload } from '../../api/organization.api';
import { MOCK_BOARDS, MOCK_SCHOOLS } from '../data/organization.data';

export const mockOrganizationApi = {
    listBoards: async (): Promise<Board[]> => MOCK_BOARDS,
    getBoard: async (id: string): Promise<Board> => MOCK_BOARDS.find(b => b.id === id) || MOCK_BOARDS[0],
    createBoard: async (payload: CreateBoardPayload): Promise<Board> => ({ id: `BRD-${Math.random().toString(36).substr(2, 6)}`, ...payload }),
    updateBoard: async (id: string, payload: UpdateBoardPayload): Promise<Board> => ({ ...MOCK_BOARDS[0], ...payload, id }),
    deleteBoard: async (_id: string): Promise<void> => { },

    listSchools: async (_boardId?: string): Promise<School[]> => MOCK_SCHOOLS,
    getSchool: async (id: string): Promise<School> => MOCK_SCHOOLS.find(s => s.id === id) || MOCK_SCHOOLS[0],
    createSchool: async (payload: CreateSchoolPayload): Promise<School> => ({ id: `SCH-${Math.random().toString(36).substr(2, 6)}`, ...payload }),
    updateSchool: async (id: string, payload: UpdateSchoolPayload): Promise<School> => ({ ...MOCK_SCHOOLS[0], ...payload, id } as School),
    deleteSchool: async (_id: string): Promise<void> => { },
};
