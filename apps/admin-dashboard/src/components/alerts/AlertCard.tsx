import React from 'react';
import { AlertTriangle, Bus, Clock } from 'lucide-react';
import type { Alert } from '../../types';

interface AlertCardProps {
    alert: Alert;
    onClick?: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onClick }) => {
    const isPanic = alert.eventType === 'PANIC_BUTTON';
    const isResolved = alert.status === 'RESOLVED';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left glass-item p-2 rounded-lg group transition-all duration-300 ${isResolved ? 'opacity-40' : 'hover:bg-white/5'}`}
        >
            <div className="flex items-start gap-2">
                <div className={`p-1.5 rounded bg-white/5 ${isPanic ? 'text-rose-500' : 'text-amber-500'}`}>
                    <AlertTriangle size={12} className={isPanic ? 'animate-pulse' : ''} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-[8px] font-black uppercase tracking-tighter ${isPanic ? 'text-rose-400' : 'text-amber-400'}`}>
                            {alert.eventType.replace('_', ' ')}
                        </span>
                        <span className={`px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${isResolved
                            ? 'bg-slate-800 text-slate-500'
                            : 'bg-rose-500/20 text-rose-500'
                            }`}>
                            {alert.status}
                        </span>
                    </div>

                    <p className="text-[9px] text-white font-black line-clamp-1 leading-none">{alert.description || 'Event'}</p>

                    <div className="flex items-center gap-2 mt-1 text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                        <div className="flex items-center gap-1">
                            <Bus size={8} />
                            <span className="text-slate-300">{alert.vehicleId}</span>
                        </div>
                        <div className="flex items-center gap-1 ml-auto">
                            <span className="text-slate-400">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </button>
    );
};

export default AlertCard;
