import type { AbsenceRecord } from '../../api/absence.api';
import { MOCK_ABSENCES } from '../data/absence.data';

export const mockAbsenceApi = {
  listAbsences: async (_date?: string, _schoolId?: string): Promise<AbsenceRecord[]> =>
    MOCK_ABSENCES,
  deleteAbsence: async (_id: string): Promise<void> => {},
  confirmAbsence: async (_id: string): Promise<void> => {},
  rejectAbsence: async (_id: string, _notes?: string): Promise<void> => {},
};
