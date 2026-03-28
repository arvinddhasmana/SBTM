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
        <div className="flex items-center gap-2 p-1.5 glass-item rounded-lg transition-all duration-300">
            <div
                className={`w-5 h-5 rounded flex items-center justify-center ${isBoarded
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-slate-500/10 text-slate-400'
                    }`}
            >
                <User size={10} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-white tracking-tighter truncate leading-none">{student.name}</p>
                <div className="flex items-center gap-2 mt-0.5 opacity-90">
                    <span
                        className={`px-1 rounded text-[7px] font-black uppercase tracking-widest ${isBoarded
                            ? 'bg-emerald-500/20 text-emerald-500'
                            : 'bg-slate-800 text-slate-500'
                            }`}
                    >
                        {student.status.charAt(0)}
                    </span>
                    <span className="flex items-center gap-1 text-[7px] font-bold text-slate-500 uppercase tracking-tighter">
                        {formatRelativeTime(student.lastSeen)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PresenceCard;
