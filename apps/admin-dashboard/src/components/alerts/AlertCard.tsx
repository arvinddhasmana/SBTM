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
            className={`w-full text-left glass-item p-4 rounded-xl group transition-all duration-300 ${isResolved ? 'opacity-60' : 'hover:scale-[1.01]'}`}
        >
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shadow-lg ${isPanic
                    ? 'bg-rose-500/20 text-rose-500 shadow-rose-500/10'
                    : 'bg-amber-500/20 text-amber-500 shadow-amber-500/10'
                    }`}>
                    <AlertTriangle size={20} className={isPanic ? 'animate-pulse' : ''} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-sm font-bold tracking-tight uppercase ${isPanic ? 'text-rose-400' : 'text-amber-400'}`}>
                            {alert.eventType.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${isResolved
                            ? 'bg-slate-800 text-slate-500 border-white/5'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}>
                            {alert.status}
                        </span>
                    </div>

                    <p className="text-sm text-white font-medium line-clamp-1">{alert.description || 'No description provided'}</p>

                    <div className="flex items-center gap-3 mt-3 text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                        <div className="flex items-center gap-1">
                            <Bus size={10} />
                            <span>{alert.vehicleId}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </button>
    );
};

export default AlertCard;
