import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Plus } from 'lucide-react';
import { Header, LoadingSpinner } from '../components/common';
import { PresenceStats } from '../components/presence/PresenceStats';
import { PresenceFilters } from '../components/presence/PresenceFilters';
import { PresenceTable } from '../components/presence/PresenceTable';
import {
  StudentTable,
  BulkImportModal,
  RouteAssignmentModal,
  EnrollStudentModal,
  EditStudentModal,
  WithdrawStudentModal,
} from '../components/students';
import { presenceApi, routesApi, studentManagementApi } from '../services/api';
import { presenceWs } from '../services/websocket/presence.ws';
import { queryKeys } from '../services/query-keys';
import type { Route } from '../types';
import type { PresenceStats as StatsType, PresenceEvent } from '../services/api/presence.api';

const Students: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'presence' | 'management'>('presence');

  // Presence State
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    studentName: '',
    routeId: '',
    eventType: '',
  });

  // Management State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const presenceQueryKey = queryKeys.presence.events({ ...filters, page });

  const {
    data: presenceData,
    isLoading: isPresenceLoading,
    isFetching: isRefreshing,
  } = useQuery({
    queryKey: presenceQueryKey,
    queryFn: async () => {
      const [statsData, eventsData] = await Promise.all([
        presenceApi.getStats(),
        presenceApi.getEvents({ ...filters, page, limit: 10 }),
      ]);
      return { stats: statsData, events: eventsData.items, totalEvents: eventsData.total };
    },
    enabled: activeTab === 'presence',
  });

  const stats = presenceData?.stats ?? {
    totalStudents: 0,
    boarded: 0,
    alighted: 0,
    unknown: 0,
    byRoute: [],
  };
  const events = presenceData?.events ?? [];
  const totalEvents = presenceData?.totalEvents ?? 0;

  const { data: managedStudents = [], isLoading: isManagementLoading } = useQuery({
    queryKey: queryKeys.students.all,
    queryFn: () => studentManagementApi.getStudents(),
    enabled: activeTab === 'management',
  });

  const isLoading = activeTab === 'presence' ? isPresenceLoading : isManagementLoading;

  // WebSocket for real-time presence updates
  useEffect(() => {
    if (activeTab !== 'presence') return;

    presenceWs.connect();
    const unsubscribe = presenceWs.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.presence.all });
    });

    return () => {
      unsubscribe();
    };
  }, [activeTab, queryClient]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleImport = async (file: File) => {
    const res: any = await studentManagementApi.bulkImport(
      file,
      's0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
    );
    if (res.success > 0) queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    return res;
  };

  const handleAssignSave = async (assignment: any) => {
    if (!selectedStudent) return;
    await studentManagementApi.assignRoute(selectedStudent.id, assignment);
    queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
  };

  if (isLoading) {
    return (
      <>
        <Header title="Students" />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" text="Loading student data..." />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Student Presence"
        subtitle={
          activeTab === 'presence'
            ? `Live monitoring of student boardings and alightings`
            : 'Manage student enrollments and assignments'
        }
      />

      <div className="p-6 space-y-6">
        {/* Tab Switcher */}
        <div className="flex gap-4 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('presence')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'presence'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Presence
          </button>
          <button
            onClick={() => setActiveTab('management')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'management'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Administration
          </button>
        </div>

        {activeTab === 'presence' ? (
          <div className="animate-in fade-in duration-500">
            <PresenceStats stats={stats} loading={isRefreshing} />

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Recent Events</h3>
              {isRefreshing && (
                <div className="text-xs text-blue-400 animate-pulse">Refreshing...</div>
              )}
            </div>

            <PresenceFilters filters={filters} onFilterChange={handleFilterChange} />

            <PresenceTable
              events={events}
              total={totalEvents}
              page={page}
              limit={10}
              onPageChange={setPage}
              loading={isRefreshing}
            />
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Student Roster</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-white/10"
                >
                  <Upload size={18} />
                  Bulk Import
                </button>
                <button
                  onClick={() => setIsEnrollModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25"
                >
                  <Plus size={18} />
                  Enroll Student
                </button>
              </div>
            </div>

            <div className="glass-card p-0 overflow-hidden">
              <StudentTable
                students={managedStudents}
                onEdit={(s) => {
                  setSelectedStudent(s);
                  setIsEditModalOpen(true);
                }}
                onDelete={(id) => {
                  const student = managedStudents.find((s: any) => s.id === id);
                  if (student) {
                    setSelectedStudent(student);
                    setIsWithdrawModalOpen(true);
                  }
                }}
                onAssign={(s) => {
                  setSelectedStudent(s);
                  setIsAssignModalOpen(true);
                }}
              />
            </div>
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

      <EnrollStudentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.students.all })}
      />

      <EditStudentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={selectedStudent}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.students.all })}
      />

      <WithdrawStudentModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        student={selectedStudent}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.students.all })}
      />
    </>
  );
};

export default Students;
