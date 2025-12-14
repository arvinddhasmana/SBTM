import React from 'react';
import type { StudentPresence } from '../../types';
import PresenceCard from './PresenceCard';

interface PresenceListProps {
    students: StudentPresence[];
    emptyMessage?: string;
}

const PresenceList: React.FC<PresenceListProps> = ({ students, emptyMessage = 'No students' }) => {
    if (students.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {students.map((student) => (
                <PresenceCard key={student.studentId} student={student} />
            ))}
        </div>
    );
};

export default PresenceList;
