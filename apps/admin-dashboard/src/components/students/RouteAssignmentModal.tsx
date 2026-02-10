import React, { useState, useEffect } from 'react';
import { Bus, X, Save, MapPin } from 'lucide-react';
import { Card, LoadingSpinner } from '../common';
import { routesApi } from '../../services/api';

interface RouteAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    onSave: (assignment: any) => Promise<void>;
}

const RouteAssignmentModal: React.FC<RouteAssignmentModalProps> = ({ isOpen, onClose, student, onSave }) => {
    const [routes, setRoutes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [amRoute, setAmRoute] = useState(student?.am_route_id || '');
    const [pmRoute, setPmRoute] = useState(student?.pm_route_id || '');
    const [amStop, setAmStop] = useState(student?.am_stop_id || '');
    const [pmStop, setPmStop] = useState(student?.pm_stop_id || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchRoutes = async () => {
                try {
                    const data = await routesApi.getActiveRoutes();
                    setRoutes(data);
                } catch (error) {
                    console.error('Error fetching routes:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchRoutes();

            // Reset local state to student data
            setAmRoute(student?.am_route_id || '');
            setPmRoute(student?.pm_route_id || '');
            setAmStop(student?.am_stop_id || '');
            setPmStop(student?.pm_stop_id || '');
        }
    }, [isOpen, student]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                am_route_id: amRoute,
                pm_route_id: pmRoute,
                am_stop_id: amStop,
                pm_stop_id: pmStop,
            });
            onClose();
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <Card className="w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Bus size={24} className="text-primary-500" />
                    Route Assignment
                </h2>

                {isLoading ? (
                    <div className="py-12 flex justify-center">
                        <LoadingSpinner />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-dashboard-border">
                            <p className="text-white font-medium">{student?.first_name} {student?.last_name}</p>
                            <p className="text-sm text-slate-400">{student?.grade} • {student?.school_id.substring(0, 8)}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">AM Route</label>
                                <select
                                    value={amRoute}
                                    onChange={(e) => setAmRoute(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
                                >
                                    <option value="">No AM Route</option>
                                    {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">PM Route</label>
                                <select
                                    value={pmRoute}
                                    onChange={(e) => setPmRoute(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
                                >
                                    <option value="">No PM Route</option>
                                    {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={onClose} className="px-6 py-2 rounded-xl text-slate-400 hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`px-6 py-2 rounded-xl font-bold bg-primary-500 text-white transition-all flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600 shadow-lg shadow-primary-500/25'
                                    }`}
                            >
                                <Save size={18} />
                                {isSaving ? 'Saving...' : 'Save Assignment'}
                            </button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default RouteAssignmentModal;
