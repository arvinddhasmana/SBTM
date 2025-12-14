import React from 'react';
import { X, MapPin, Clock, Truck, CheckCircle } from 'lucide-react';
import type { Alert } from '../../types';
import { formatTimestamp, formatEventType } from '../../utils/formatters';

interface AlertDetailProps {
    alert: Alert;
    onClose: () => void;
    onResolve: (id: string) => void;
    isResolving?: boolean;
}

const AlertDetail: React.FC<AlertDetailProps> = ({ alert, onClose, onResolve, isResolving }) => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-dashboard-card rounded-2xl border border-dashboard-border max-w-lg w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dashboard-border">
                    <h3 className="text-xl font-bold text-white">Alert Details</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-white">
                            {formatEventType(alert.eventType)}
                        </span>
                        <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${alert.status === 'ACTIVE'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-green-500/20 text-green-400'
                                }`}
                        >
                            {alert.status}
                        </span>
                    </div>

                    {alert.description && (
                        <p className="text-slate-400">{alert.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="flex items-center gap-3 p-3 bg-dashboard-bg rounded-xl">
                            <Truck size={18} className="text-primary-500" />
                            <div>
                                <p className="text-xs text-slate-500">Vehicle</p>
                                <p className="text-sm font-medium text-white">{alert.vehicleId}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-dashboard-bg rounded-xl">
                            <MapPin size={18} className="text-primary-500" />
                            <div>
                                <p className="text-xs text-slate-500">Route</p>
                                <p className="text-sm font-medium text-white">{alert.routeId}</p>
                            </div>
                        </div>
                        <div className="col-span-2 flex items-center gap-3 p-3 bg-dashboard-bg rounded-xl">
                            <Clock size={18} className="text-primary-500" />
                            <div>
                                <p className="text-xs text-slate-500">Timestamp</p>
                                <p className="text-sm font-medium text-white">{formatTimestamp(alert.timestamp)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-dashboard-border flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary">
                        Close
                    </button>
                    {alert.status === 'ACTIVE' && (
                        <button
                            onClick={() => onResolve(alert.id)}
                            disabled={isResolving}
                            className="btn-primary flex items-center gap-2"
                        >
                            <CheckCircle size={18} />
                            {isResolving ? 'Resolving...' : 'Mark as Resolved'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlertDetail;
