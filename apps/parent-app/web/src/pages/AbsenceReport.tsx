import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { parentApi } from '../services/api';
import type { AbsenceReportPayload } from '../services/api';
import { CheckCircle, AlertTriangle } from 'lucide-react';

const ROUTE_TYPE_OPTIONS: { value: AbsenceReportPayload['routeType']; label: string }[] = [
    { value: 'AM', label: 'Morning route only (AM)' },
    { value: 'PM', label: 'Afternoon route only (PM)' },
    { value: 'BOTH', label: 'Full day (both routes)' },
];

const AbsenceReport: React.FC = () => {
    const { user } = useAuth();
    const [selectedChildId, setSelectedChildId] = useState<string>(user?.children?.[0]?.id ?? '');
    const [tripDate, setTripDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [routeType, setRouteType] = useState<AbsenceReportPayload['routeType']>('BOTH');
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!user || user.children.length === 0) {
        return (
            <div className="px-4 py-8 text-center text-gray-500">
                No children associated with your account.
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChildId) {
            setError('Please select a child.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            await parentApi.reportAbsence({
                studentId: selectedChildId,
                tripDate,
                routeType,
                notes: notes.trim() || undefined,
            });
            setSuccess('Absence reported successfully. The driver and school have been notified.');
            setNotes('');
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Failed to report absence. Please try again.';
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="px-4 sm:px-0 max-w-lg">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Report an Absence</h1>
            <p className="text-sm text-gray-500 mb-6">
                Let the driver and school know your child will not be riding the bus.
            </p>

            {success && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <p className="text-sm">{success}</p>
                </div>
            )}

            {error && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Child</label>
                    <select
                        value={selectedChildId}
                        onChange={(e) => setSelectedChildId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {user.children.map((child) => (
                            <option key={child.id} value={child.id}>
                                {child.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                        type="date"
                        value={tripDate}
                        onChange={(e) => setTripDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                    <select
                        value={routeType}
                        onChange={(e) => setRouteType(e.target.value as AbsenceReportPayload['routeType'])}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {ROUTE_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        maxLength={500}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="E.g. sick today, will return tomorrow"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                    {isSubmitting ? 'Reporting…' : 'Report Absence'}
                </button>
            </form>
        </div>
    );
};

export default AbsenceReport;
