import React from 'react';
import { Siren, Split, Bus, Route as RouteIcon } from 'lucide-react';
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
            className={`w-full text-left glass-item p-2 rounded-lg group transition-all duration-300 ${isResolved ? 'opacity-30' : 'hover:bg-white/5'}`}
        >
            <div className="flex items-start gap-2.5">
                <div className={`p-1.5 rounded-lg border shrink-0 shadow-lg ${isPanic
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-500 shadow-rose-500/10'
                    : 'bg-amber-500/20 border-amber-500/30 text-amber-500 shadow-amber-500/10'
                    }`}>
                    {isPanic ? (
                        <Siren size={14} className="animate-pulse" />
                    ) : (
                        <Split size={14} className="rotate-90" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isPanic ? 'text-rose-400' : 'text-amber-400'}`}>
                            {alert.eventType.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-1">
                            <div className="flex items-center gap-0.5 px-1 bg-white/10 rounded text-[7px] font-black text-slate-300 uppercase">
                                <RouteIcon size={7} />
                                <span>{alert.routeId.split('-').pop()}</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-white font-black line-clamp-1 leading-none mb-1.5">{alert.description || 'Event'}</p>

                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                        <div className="flex items-center gap-1">
                            <Bus size={8} />
                            <span className="text-slate-400">{alert.vehicleId}</span>
                        </div>
                        <span className="text-slate-500 tabular-nums">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            </div>
        </button>
    );
};

export default AlertCard;
