import React, { useCallback, useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  importerApi,
  ImportDryRunResult,
  ImportCommitCounts,
} from '../../services/api/importer.api';

type Step = 'select' | 'validating' | 'preview' | 'committing' | 'done' | 'error';

const ACCEPTED_FILES = [
  'manifest.json',
  'sta-routes.csv',
  'sta-stops.csv',
  'sta-stop-times.csv',
  'sta-trips.csv',
  'sta-shapes.csv',
  'sta-operators.csv',
  'sta-vehicles.csv',
  'board-school.csv',
  'students.csv',
  'guardians.csv',
  'student-guardians.csv',
  'ridership.csv',
];

const STA_LAYER_FILES = new Set([
  'manifest.json',
  'sta-routes.csv',
  'sta-stops.csv',
  'sta-stop-times.csv',
  'sta-trips.csv',
  'sta-shapes.csv',
  'sta-operators.csv',
  'sta-vehicles.csv',
]);

function CountRow({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
      <span className="text-white/60">{label}</span>
      <span className="text-white font-medium tabular-nums">{value}</span>
    </div>
  );
}

function ErrorList({
  items,
  title,
  color,
}: {
  items: Array<{ file: string; row?: number; column?: string; message: string }>;
  title: string;
  color: 'red' | 'yellow';
}) {
  const bg =
    color === 'red' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30';
  const text = color === 'red' ? 'text-red-400' : 'text-yellow-400';
  if (items.length === 0) return null;
  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <p className={`text-xs font-semibold uppercase mb-2 ${text}`}>
        {title} ({items.length})
      </p>
      <ul className="space-y-1">
        {items.slice(0, 15).map((e, i) => {
          const loc = [e.file, e.row ? `row ${e.row}` : null, e.column ? e.column : null]
            .filter(Boolean)
            .join(' › ');
          return (
            <li key={i} className="text-xs text-white/80">
              <span className="text-white/40">[{loc}]</span> {e.message}
            </li>
          );
        })}
        {items.length > 15 && (
          <li className="text-xs text-white/40">…and {items.length - 15} more</li>
        )}
      </ul>
    </div>
  );
}

const StaImport: React.FC = () => {
  const { user } = useAuth();
  const isStaAdmin = user?.role === 'STA_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isBoardAdmin = user?.role === 'BOARD_ADMIN';

  const [step, setStep] = useState<Step>('select');
  const [files, setFiles] = useState<File[]>([]);
  const [dryRunResult, setDryRunResult] = useState<ImportDryRunResult | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommitCounts | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedFileNames = isStaAdmin
    ? ACCEPTED_FILES
    : ACCEPTED_FILES.filter((f) => !STA_LAYER_FILES.has(f));

  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const accepted = Array.from(incoming).filter((f) =>
        allowedFileNames.some((name) => name === f.name),
      );
      setFiles((prev) => {
        const map = new Map(prev.map((f) => [f.name, f]));
        accepted.forEach((f) => map.set(f.name, f));
        return Array.from(map.values());
      });
    },
    [allowedFileNames],
  );

  const removeFile = (name: string) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const runDryRun = async () => {
    if (files.length === 0) return;
    setStep('validating');
    setErrorMsg(null);
    try {
      const result = await importerApi.dryRun(files, 'sta-csv');
      setDryRunResult(result);
      setStep('preview');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Validation request failed');
      setStep('error');
    }
  };

  const runCommit = async () => {
    if (!dryRunResult?.importSessionId || !dryRunResult.ok) return;
    setStep('committing');
    setErrorMsg(null);
    try {
      const manifest = files.find((f) => f.name === 'manifest.json');
      let staShortCode = 'UNKNOWN';
      if (manifest) {
        try {
          const text = await manifest.text();
          staShortCode = JSON.parse(text).sta_short_code ?? 'UNKNOWN';
        } catch {
          /* best-effort */
        }
      }
      const counts = await importerApi.commit(dryRunResult.importSessionId, staShortCode);
      setCommitResult(counts);
      setStep('done');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Commit failed');
      setStep('error');
    }
  };

  const reset = () => {
    setStep('select');
    setFiles([]);
    setDryRunResult(null);
    setCommitResult(null);
    setErrorMsg(null);
  };

  if (!isStaAdmin && !isBoardAdmin) {
    return (
      <div className="p-8">
        <p className="text-white/60">You do not have permission to access the import tool.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">STA Data Import</h1>
        <p className="text-sm text-white/50 mt-1">
          {isStaAdmin
            ? 'Upload STA transport data (routes, stops, shapes) and student/guardian layers.'
            : 'Upload board and student data (students, guardians, ridership).'}
        </p>
      </div>

      {/* Step: file selection */}
      {(step === 'select' || step === 'validating') && (
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-blue-400 bg-blue-400/10'
                : 'border-white/20 bg-dashboard-card hover:border-white/40'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            aria-label="Upload bundle files"
          >
            <Upload className="mx-auto mb-3 text-white/40" size={32} />
            <p className="text-white font-medium">Drop bundle files here or click to browse</p>
            <p className="text-xs text-white/40 mt-1">Accepted: {allowedFileNames.join(', ')}</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.json"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="bg-dashboard-card rounded-xl border border-white/10 p-4">
              <p className="text-xs font-semibold text-white/50 uppercase mb-2">
                Selected files ({files.length})
              </p>
              <ul className="space-y-1">
                {files.map((f) => (
                  <li key={f.name} className="flex items-center justify-between text-sm">
                    <span className="text-white/80">{f.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white/40">{(f.size / 1024).toFixed(1)} KB</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(f.name);
                        }}
                        className="text-white/30 hover:text-red-400 transition-colors"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={runDryRun}
            disabled={files.length === 0 || step === 'validating'}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {step === 'validating' ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Validating…
              </>
            ) : (
              <>
                Validate bundle
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      )}

      {/* Step: dry-run preview */}
      {step === 'preview' && dryRunResult && (
        <div className="space-y-4">
          <div
            className={`flex items-center gap-3 rounded-xl p-4 border ${
              dryRunResult.ok
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            {dryRunResult.ok ? (
              <CheckCircle2 size={20} className="text-green-400 shrink-0" />
            ) : (
              <AlertCircle size={20} className="text-red-400 shrink-0" />
            )}
            <span className="text-white font-medium">
              {dryRunResult.ok
                ? 'Validation passed — review counts below before committing.'
                : 'Validation failed — fix the errors below and re-upload.'}
            </span>
          </div>

          <ErrorList items={dryRunResult.validation.errors} title="Errors" color="red" />
          <ErrorList items={dryRunResult.validation.warnings} title="Warnings" color="yellow" />

          {dryRunResult.ok && dryRunResult.counts && (
            <div className="bg-dashboard-card rounded-xl border border-white/10 p-4">
              <p className="text-xs font-semibold text-white/50 uppercase mb-3">
                Staged row counts
              </p>
              {Object.entries(dryRunResult.counts).map(([key, val]) => (
                <CountRow key={key} label={key.replace(/_/g, ' ')} value={val} />
              ))}
            </div>
          )}

          <div className="flex gap-3">
            {dryRunResult.ok ? (
              <button
                onClick={runCommit}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 transition-colors"
              >
                Commit import
                <ChevronRight size={16} />
              </button>
            ) : null}
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-lg border border-white/20 text-white/70 hover:border-white/40 hover:text-white transition-colors"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {/* Step: committing */}
      {step === 'committing' && (
        <div className="flex items-center gap-3 text-white/70 mt-8">
          <Loader2 size={20} className="animate-spin" />
          Committing import to database…
        </div>
      )}

      {/* Step: done */}
      {step === 'done' && commitResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl p-4 border bg-green-500/10 border-green-500/30">
            <CheckCircle2 size={20} className="text-green-400 shrink-0" />
            <span className="text-white font-medium">Import committed successfully.</span>
          </div>
          <div className="bg-dashboard-card rounded-xl border border-white/10 p-4">
            <p className="text-xs font-semibold text-white/50 uppercase mb-3">Committed counts</p>
            <CountRow label="STAs" value={commitResult.sta} />
            <CountRow label="Boards" value={commitResult.boards} />
            <CountRow label="Schools" value={commitResult.schools} />
            <CountRow label="Routes" value={commitResult.routes} />
            <CountRow label="Stops" value={commitResult.stops} />
            <CountRow label="Students" value={commitResult.students} />
            <CountRow label="Guardians" value={commitResult.guardians} />
          </div>
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors"
          >
            Import another bundle
          </button>
        </div>
      )}

      {/* Step: error */}
      {step === 'error' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl p-4 border bg-red-500/10 border-red-500/30">
            <AlertCircle size={20} className="text-red-400 shrink-0" />
            <span className="text-white">{errorMsg ?? 'An unexpected error occurred.'}</span>
          </div>
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg border border-white/20 text-white/70 hover:border-white/40 hover:text-white transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

export default StaImport;
