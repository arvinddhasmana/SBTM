import React, { useState, useEffect } from 'react';
import { Filter, Users as UsersIcon } from 'lucide-react';
import { Header, Card, LoadingSpinner } from '../components/common';
import { PresenceList } from '../components/presence';
import { presenceApi, routesApi } from '../services/api';
import type { StudentPresence, Route } from '../types';

const Students: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [students, setStudents] = useState<StudentPresence[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [filter, setFilter] = useState<'all' | 'boarded' | 'alighted'>('all');
    const [selectedRoute, setSelectedRoute] = useState<string>('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [studentsData, routesData] = await Promise.all([
                    presenceApi.getAllPresence(),
                    routesApi.getActiveRoutes(),
                ]);
                setStudents(studentsData);
                setRoutes(routesData);
            } catch (error) {
                console.error('Error fetching students:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredStudents = students.filter((student) => {
        let matches = true;
        if (filter === 'boarded') matches = student.status === 'BOARDED';
        if (filter === 'alighted') matches = student.status === 'ALIGHTED';
        if (selectedRoute !== 'all') matches = matches && student.routeId === selectedRoute;
        return matches;
    });

    const boardedCount = students.filter((s) => s.status === 'BOARDED').length;

    if (isLoading) {
        return (
            <>
                <Header title="Students" />
                <div className="flex items-center justify-center h-96">
                    <LoadingSpinner size="lg" text="Loading students..." />
                </div>
            </>
        );
    }

    return (
        <>
            <Header title="Student Presence" subtitle={`${boardedCount} students currently onboard`} />

            <div className="p-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-500/20 text-green-500">
                            <UsersIcon size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{boardedCount}</p>
                            <p className="text-sm text-slate-400">Boarded</p>
                        </div>
                    </Card>
                    <Card className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-slate-500/20 text-slate-400">
                            <UsersIcon size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">
                                {students.filter((s) => s.status === 'ALIGHTED').length}
                            </p>
                            <p className="text-sm text-slate-400">Alighted</p>
                        </div>
                    </Card>
                    <Card className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary-500/20 text-primary-500">
                            <UsersIcon size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{students.length}</p>
                            <p className="text-sm text-slate-400">Total Tracked</p>
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Filter size={18} />
                            <span className="font-medium">Status:</span>
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'boarded', 'alighted'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${filter === f
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-dashboard-bg text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 ml-4 text-slate-400">
                            <span className="font-medium">Route:</span>
                        </div>
                        <select
                            value={selectedRoute}
                            onChange={(e) => setSelectedRoute(e.target.value)}
                            className="px-4 py-2 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm"
                        >
                            <option value="all">All Routes</option>
                            {routes.map((route) => (
                                <option key={route.id} value={route.id}>
                                    {route.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </Card>

                {/* Students List */}
                <Card title={`Students (${filteredStudents.length})`}>
                    <PresenceList students={filteredStudents} emptyMessage="No students found" />
                </Card>
            </div>
        </>
    );
};

export default Students;
