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
        <div className="flex items-center gap-4 p-4 glass-item rounded-xl transition-all duration-300">
            <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${isBoarded
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-emerald-500/10'
                    : 'bg-slate-500/20 text-slate-400 shadow-slate-500/10'
                    }`}
            >
                <User size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-white tracking-tight truncate">{student.name}</p>
                <div className="flex items-center gap-3 mt-1.5">
                    <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${isBoarded
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-500/10 text-slate-500 border-white/5'
                            }`}
                    >
                        {student.status}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                        <Clock size={10} />
                        {formatRelativeTime(student.lastSeen)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PresenceCard;
