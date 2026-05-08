import React from 'react';
import { User, Bus, Route as RouteIcon } from 'lucide-react';
import type { StudentPresence } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';

interface PresenceCardProps {
  student: StudentPresence;
  onClick?: () => void;
}

const PresenceCard: React.FC<PresenceCardProps> = ({ student, onClick }) => {
  const isBoarded = student.status === 'BOARDED';

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-1.5 glass-item rounded-lg transition-all duration-300 hover:bg-white/5 flex items-center gap-2 group"
    >
      <div
        className={`w-6 h-6 rounded flex items-center justify-center ${
          isBoarded ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
        }`}
      >
        <User size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-white tracking-tighter truncate leading-none">
            {student.name}
          </p>
          <div className="flex items-center gap-1.5 ml-2">
            <div className="flex items-center gap-0.5 px-1 bg-blue-500/10 rounded text-[7px] font-black text-blue-400 uppercase">
              <RouteIcon size={8} />
              <span>{student.routeName || student.routeId?.split('-').pop()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2 opacity-90">
            <span
              className={`px-1 rounded text-[7px] font-black uppercase tracking-widest ${
                isBoarded ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {student.status?.charAt(0) || (isBoarded ? 'B' : 'A')}
            </span>
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter">
              {formatRelativeTime(student.lastSeen)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[7px] font-black text-slate-400 uppercase">
            <Bus size={8} />
            <span>{student.vehicleId || '—'}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

export default PresenceCard;
