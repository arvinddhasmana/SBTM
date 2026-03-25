import React, { useEffect, useState } from 'react';
import { absenceApi } from '../../services/api/absence.api';
import type { AbsenceRecord } from '../../services/api/absence.api';
import { useAuth } from '../../context/AuthContext';

const ROUTE_TYPE_LABELS: Record<string, string> = {
    AM: 'Morning (AM)',
    PM: 'Afternoon (PM)',
    BOTH: 'Full Day (Both)',
};

export const AbsenceManagement: React.FC = () => {
    const { user } = useAuth();
    const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterDate, setFilterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

    const fetchAbsences = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const schoolId = user?.schoolId;
            const data = await absenceApi.listAbsences(filterDate || undefined, schoolId);
            setAbsences(data);
        } catch {
            setError('Failed to load absences.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchAbsences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterDate]);

    const handleDelete = async (absence: AbsenceRecord) => {
        if (!window.confirm('Remove this absence record?')) return;
        try {
            await absenceApi.deleteAbsence(absence.id);
            await fetchAbsences();
        } catch {
            setError('Failed to remove absence record.');
        }
    };

    return (
        <div className="p-8">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-white">Absence Reports</h1>
                <div className="flex items-center gap-3">
                    <label className="text-white/60 text-sm">Date:</label>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                        onClick={() => setFilterDate('')}
                        className="text-white/40 hover:text-white/70 text-xs"
                    >
                        All dates
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="text-white/60">Loading…</div>
            ) : (
                <div className="bg-dashboard-card rounded-xl overflow-hidden border border-white/10">
                    <table className="w-full text-left text-white">
                        <thead className="bg-white/5 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Student ID</th>
                                <th className="px-6 py-4">Trip Date</th>
                                <th className="px-6 py-4">Route</th>
                                <th className="px-6 py-4">Notes</th>
                                <th className="px-6 py-4">Reported</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {absences.map(absence => (
                                <tr key={absence.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs">{absence.studentId}</td>
                                    <td className="px-6 py-4 text-sm">{absence.tripDate}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs bg-amber-900/40 text-amber-300 px-2 py-1 rounded">
                                            {ROUTE_TYPE_LABELS[absence.routeType] ?? absence.routeType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white/70 max-w-xs truncate">
                                        {absence.notes ?? '—'}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-white/50">
                                        {new Date(absence.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleDelete(absence)}
                                            className="text-red-400 hover:text-red-300 text-sm"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {absences.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-white/50">
                                        No absences reported{filterDate ? ` for ${filterDate}` : ''}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
