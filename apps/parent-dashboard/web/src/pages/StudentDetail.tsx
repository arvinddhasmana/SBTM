import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, ArrowLeft, User, Bus } from 'lucide-react';
import { parentApi, type StudentDetail, type StudentTransportLeg } from '../services/api';

interface PanelProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Panel: React.FC<PanelProps> = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-white/5 hover:bg-white/10 transition"
      >
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
        {open ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>
      {open && <div className="p-6">{children}</div>}
    </div>
  );
};

const Field: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => (
  <div>
    <dt className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</dt>
    <dd className="mt-1 text-sm font-semibold text-slate-200">{value || '—'}</dd>
  </div>
);

const LegCard: React.FC<{ title: string; leg: StudentTransportLeg | undefined }> = ({
  title,
  leg,
}) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">{title}</h3>
    {leg ? (
      <dl className="grid grid-cols-2 gap-3">
        <Field label="Time" value={leg.time?.slice(0, 5) ?? null} />
        <Field label="Stop" value={leg.stopName} />
        <Field label="Route : Run" value={`${leg.routeId} : ${leg.tripId}`} />
        <Field label="Operator" value={leg.operatorCode} />
        <Field label="Starting Date" value={leg.effectiveFrom} />
      </dl>
    ) : (
      <p className="text-sm text-slate-500">Not assigned</p>
    )}
  </div>
);

const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<StudentDetail>({
    queryKey: ['student-detail', id],
    queryFn: () => parentApi.getStudentDetail(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="px-4 py-8 text-slate-300">Loading…</div>;
  }
  if (error || !data) {
    return <div className="px-4 py-8 text-slate-300">Unable to load student details.</div>;
  }

  const a = data.address;
  const fullName = `${data.firstName} ${data.lastName}`.trim();

  return (
    <div className="px-4 sm:px-0 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{fullName}</h1>
          {data.preferredName && data.preferredName !== fullName && (
            <p className="text-slate-400">aka {data.preferredName}</p>
          )}
        </div>
      </div>

      <Panel title="Student Information" defaultOpen>
        <div className="flex items-start gap-4 mb-4">
          <User className="h-5 w-5 text-indigo-400 mt-1" />
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1">
            <Field label="First Name" value={data.firstName} />
            <Field label="Last Name" value={data.lastName} />
            <Field label="Student Number" value={data.studentNumber} />
            <Field label="OEN" value={data.oen} />
            <Field label="School" value={data.schoolName} />
            <Field label="District" value={data.districtName} />
            <Field label="Grade" value={data.grade} />
          </dl>
        </div>
        <div className="border-t border-white/5 pt-4">
          <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">
            Address
          </h3>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Street Number" value={a.streetNumber} />
            <Field label="Street Name" value={a.streetName} />
            <Field label="Apt / Unit" value={a.apt} />
            <Field label="Municipality" value={a.municipality} />
            <Field label="Province" value={a.province} />
            <Field label="Postal Code" value={a.postalCode} />
          </dl>
          {a.raw && <p className="mt-3 text-xs text-slate-500 italic">{a.raw}</p>}
        </div>
      </Panel>

      <Panel title="Transportation" defaultOpen>
        <div className="flex items-start gap-4">
          <Bus className="h-5 w-5 text-emerald-400 mt-1" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            <LegCard title="AM Pickup" leg={data.transportation.amPickup} />
            <LegCard title="AM Dropoff" leg={data.transportation.amDropoff} />
            <LegCard title="PM Pickup" leg={data.transportation.pmPickup} />
            <LegCard title="PM Dropoff" leg={data.transportation.pmDropoff} />
          </div>
        </div>
      </Panel>
    </div>
  );
};

export default StudentDetailPage;
