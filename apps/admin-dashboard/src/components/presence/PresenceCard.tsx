import React from 'react';
import { User, Clock } from 'lucide-react';
import type { StudentPresence } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';

interface PresenceCardProps {
    student: StudentPresence;
}

const PresenceCard: React.FC<PresenceCardProps> = ({ student }) => {
    const isBoarded = student.status === 'BOARDED';

    return (
        <div className="flex items-center gap-3 p-3 bg-dashboard-bg rounded-xl">
            <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${isBoarded ? 'bg-green-500/20' : 'bg-slate-500/20'
                    }`}
            >
                <User size={18} className={isBoarded ? 'text-green-400' : 'text-slate-400'} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{student.name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span
                        className={`px-2 py-0.5 rounded-full ${isBoarded ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'
                            }`}
                    >
                        {student.status}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatRelativeTime(student.lastSeen)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PresenceCard;
