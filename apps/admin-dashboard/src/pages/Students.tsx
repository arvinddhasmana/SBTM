import React, { useState, useEffect } from 'react';
import { Filter, Users as UsersIcon, Upload, Plus } from 'lucide-react';
import { Header, Card, LoadingSpinner } from '../components/common';
import { PresenceList } from '../components/presence';
import { StudentTable, BulkImportModal, RouteAssignmentModal } from '../components/students';
import { presenceApi, routesApi, studentManagementApi } from '../services/api';
import type { StudentPresence, Route } from '../types';

const Students: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'presence' | 'management'>('presence');

    // Presence State
    const [presenceData, setPresenceData] = useState<StudentPresence[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [presenceFilter, setPresenceFilter] = useState<'all' | 'boarded' | 'alighted'>('all');
    const [selectedRoute, setSelectedRoute] = useState<string>('all');

    // Management State
    const [managedStudents, setManagedStudents] = useState<any[]>([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [rData, mData] = await Promise.all([
                routesApi.getActiveRoutes(),
                studentManagementApi.getStudents()
            ]);

            const pData = await presenceApi.getAllPresence(rData.map((route) => route.id));
            setPresenceData(pData);
            setRoutes(rData);
            setManagedStudents(mData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredPresence = presenceData.filter((student) => {
        let matches = true;
        if (presenceFilter === 'boarded') matches = student.status === 'BOARDED';
        if (presenceFilter === 'alighted') matches = student.status === 'ALIGHTED';
        if (selectedRoute !== 'all') matches = matches && student.routeId === selectedRoute;
        return matches;
    });

    const boardedCount = presenceData.filter((s) => s.status === 'BOARDED').length;

    const handleImport = async (file: File) => {
        // Assuming current schoolId for simplicity, real app would get from auth context
        const res: any = await studentManagementApi.bulkImport(file, 's0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c');
        if (res.success > 0) fetchData();
        return res;
    };

    const handleAssignSave = async (assignment: any) => {
        if (!selectedStudent) return;
        await studentManagementApi.assignRoute(selectedStudent.id, assignment);
        fetchData();
    };

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
            <Header
                title="Students"
                subtitle={activeTab === 'presence' ? `${boardedCount} students currently onboard` : 'Manage student enrollments and assignments'}
            />

            <div className="p-6 space-y-6">
                {/* Tab Switcher */}
                <div className="flex gap-4 p-1 bg-dashboard-card border border-dashboard-border rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('presence')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'presence' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Presence
                    </button>
                    <button
                        onClick={() => setActiveTab('management')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'management' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Management
                    </button>
                </div>

                {activeTab === 'presence' ? (
                    <div className="space-y-6 animate-in fade-in duration-500">
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
                                        {presenceData.filter((s) => s.status === 'ALIGHTED').length}
                                    </p>
                                    <p className="text-sm text-slate-400">Alighted</p>
                                </div>
                            </Card>
                            <Card className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-primary-500/20 text-primary-500">
                                    <UsersIcon size={20} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{presenceData.length}</p>
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
                                            onClick={() => setPresenceFilter(f)}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${presenceFilter === f
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
                        <Card title={`Live Presence (${filteredPresence.length})`}>
                            <PresenceList students={filteredPresence} emptyMessage="No students tracked" />
                        </Card>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                        {/* Management Actions */}
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Student Roster</h3>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-dashboard-border"
                                >
                                    <Upload size={18} />
                                    Bulk Import
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/25">
                                    <Plus size={18} />
                                    Enroll Student
                                </button>
                            </div>
                        </div>

                        {/* Managed Students Table */}
                        <Card>
                            <StudentTable
                                students={managedStudents}
                                onEdit={() => { }}
                                onDelete={() => { }}
                                onAssign={(s) => {
                                    setSelectedStudent(s);
                                    setIsAssignModalOpen(true);
                                }}
                            />
                        </Card>
                    </div>
                )}
            </div>

            <BulkImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
            />

            <RouteAssignmentModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                student={selectedStudent}
                onSave={handleAssignSave}
            />
        </>
    );
};

export default Students;
