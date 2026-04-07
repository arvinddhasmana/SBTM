import React from 'react';
import { User, Edit2, Trash2, MapPin, Bus } from 'lucide-react';
import { Card } from '../common';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  grade: string;
  address?: string;
  status: string;
  am_route_id?: string;
  pm_route_id?: string;
}

interface StudentTableProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onAssign: (student: Student) => void;
}

const StudentTable: React.FC<StudentTableProps> = ({ students, onEdit, onDelete, onAssign }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-dashboard-border text-slate-400 text-xs uppercase tracking-wider">
            <th className="px-6 py-4 font-semibold">Student</th>
            <th className="px-6 py-4 font-semibold">Grade</th>
            <th className="px-6 py-4 font-semibold">Assignments</th>
            <th className="px-6 py-4 font-semibold">Status</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dashboard-border">
          {students.map((student) => (
            <tr key={student.id} className="group hover:bg-slate-800/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-primary-500/20 group-hover:text-primary-400 transition-colors">
                    <User size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {student.first_name} {student.last_name}
                    </div>
                    {student.address && (
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin size={10} /> {student.address}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-300">{student.grade}</td>
              <td className="px-6 py-4">
                <div className="space-y-1">
                  {student.am_route_id && (
                    <div className="text-xs text-green-400 flex items-center gap-1">
                      <Bus size={10} /> AM: {student.am_route_id.substring(0, 8)}
                    </div>
                  )}
                  {student.pm_route_id && (
                    <div className="text-xs text-blue-400 flex items-center gap-1">
                      <Bus size={10} /> PM: {student.pm_route_id.substring(0, 8)}
                    </div>
                  )}
                  {!student.am_route_id && !student.pm_route_id && (
                    <span className="text-xs text-slate-500 italic">No routes assigned</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    student.status === 'ENROLLED'
                      ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                      : student.status === 'WITHDRAWN'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}
                >
                  {student.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onAssign(student)}
                    className="p-2 text-slate-400 hover:text-primary-400 transition-colors"
                    title="Assign Routes"
                  >
                    <Bus size={18} />
                  </button>
                  <button
                    onClick={() => onEdit(student)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(student.id)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                No students found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;
