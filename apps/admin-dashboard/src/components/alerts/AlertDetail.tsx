import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  MapPin,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  XCircle,
  HelpCircle,
  MessageSquare,
  GripVertical,
} from 'lucide-react';
import type { Alert, AlertAuditEntry } from '../../types';
import { formatTimestamp, formatEventType } from '../../utils/formatters';

interface AlertDetailProps {
  alert: Alert;
  onClose: () => void;
  onResolve: (id: string, notes?: string) => void;
  onConfirm?: (id: string) => void;
  onFalseAlarm?: (id: string) => void;
  onRequestInfo?: (id: string) => void;
  onAddStatusUpdate?: (id: string, notes: string) => Promise<void>;
  auditTrail?: AlertAuditEntry[];
  isResolving?: boolean;
  isActing?: boolean;
  /** 'modal' = centered backdrop overlay (default); 'overlay' = draggable floating panel */
  variant?: 'modal' | 'overlay';
}

const TIER_LABELS: Record<string, { label: string; className: string }> = {
  TIER_1: {
    label: 'Tier 1 — Safety Critical',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  TIER_2: {
    label: 'Tier 2 — Operational',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  TIER_3: {
    label: 'Tier 3 — Informational',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-red-500/20 text-red-400' },
  RESOLVED: { label: 'Resolved', className: 'bg-green-500/20 text-green-400' },
  PENDING_CONFIRMATION: {
    label: 'Awaiting Confirmation',
    className: 'bg-yellow-500/20 text-yellow-300',
  },
  CONFIRMED: { label: 'Confirmed', className: 'bg-green-500/20 text-green-400' },
  AUTO_ESCALATED: { label: 'Auto-Escalated', className: 'bg-orange-500/20 text-orange-400' },
  FALSE_ALARM: { label: 'False Alarm', className: 'bg-slate-500/20 text-slate-400' },
};

const AUDIT_EVENT_LABELS: Record<string, string> = {
  CREATED: 'Created',
  PENDING_CONFIRMATION: 'Pending Confirmation',
  CONFIRMED: 'Confirmed',
  AUTO_ESCALATED: 'Auto-Escalated',
  FALSE_ALARM: 'False Alarm',
  PARENT_NOTIFIED: 'Parents Notified',
  BOARD_ESCALATED: 'Escalated to Board',
  OSTA_ESCALATED: 'Escalated to OSTA',
  RESOLVED: 'Resolved',
  INFO_REQUESTED: 'Info Requested',
  STATUS_UPDATE: 'Status Update',
};

const OVERLAY_SIZE_KEY = 'alert_detail_overlay_size';
const DEFAULT_OVERLAY_SIZE = { width: 380, height: 520 };

function readOverlaySize(): { width: number; height: number } {
  try {
    const raw = localStorage.getItem(OVERLAY_SIZE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_OVERLAY_SIZE;
}

const AlertDetail: React.FC<AlertDetailProps> = ({
  alert,
  onClose,
  onResolve,
  onConfirm,
  onFalseAlarm,
  onRequestInfo,
  onAddStatusUpdate,
  auditTrail,
  isResolving,
  isActing,
  variant = 'modal',
}) => {
  const [showUpdateInput, setShowUpdateInput] = useState(false);
  const [updateNotes, setUpdateNotes] = useState('');
  const [showResolveInput, setShowResolveInput] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Dragging state for overlay variant
  const [position, setPosition] = useState({ x: 100, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Persisted size for overlay variant — read once on mount from localStorage
  const [overlaySize] = useState<{ width: number; height: number }>(
    variant === 'overlay' ? readOverlaySize : () => DEFAULT_OVERLAY_SIZE,
  );

  const isPendingConfirmation = alert.status === 'PENDING_CONFIRMATION';
  const isActive = alert.status === 'ACTIVE';
  const isConfirmed = alert.status === 'CONFIRMED';
  const isAutoEscalated = alert.status === 'AUTO_ESCALATED';
  const isWorkingState = isConfirmed || isAutoEscalated || isActive;
  const tierInfo = alert.tier ? TIER_LABELS[alert.tier] : null;
  const statusInfo = STATUS_LABELS[alert.status] ?? STATUS_LABELS.ACTIVE;

  // Persist size via ResizeObserver whenever user resizes the overlay
  useEffect(() => {
    if (variant !== 'overlay' || !panelRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        localStorage.setItem(
          OVERLAY_SIZE_KEY,
          JSON.stringify({ width: Math.round(width), height: Math.round(height) }),
        );
      }
    });
    observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, [variant]);

  // Esc key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Drag handlers for overlay variant — only from the drag handle, not the resize corner
  const handleMouseDown = (e: React.MouseEvent) => {
    if (variant !== 'overlay') return;
    if (!(e.target as HTMLElement).closest('.overlay-drag-handle')) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    if (variant !== 'overlay' || !isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [variant, isDragging]);

  const handleSubmitUpdate = async () => {
    if (!updateNotes.trim() || !onAddStatusUpdate) return;
    setIsSubmittingUpdate(true);
    try {
      await onAddStatusUpdate(alert.id, updateNotes.trim());
      setUpdateNotes('');
      setShowUpdateInput(false);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleResolveWithNotes = () => {
    onResolve(alert.id, resolveNotes.trim() || undefined);
  };

  // Shared content block
  const content = (
    <>
      {/* Header / drag handle */}
      <div
        className={`flex items-center justify-between p-4 border-b border-dashboard-border shrink-0 ${variant === 'overlay' ? 'overlay-drag-handle cursor-grab active:cursor-grabbing' : ''}`}
      >
        <div className="flex items-center gap-2">
          {variant === 'overlay' && (
            <GripVertical size={14} className="text-slate-500 pointer-events-none" />
          )}
          <h3 className="text-base font-bold text-white">Alert Details</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-lg font-bold text-white">{formatEventType(alert.eventType)}</span>
            <div className="flex items-center gap-2">
              {tierInfo && (
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${tierInfo.className}`}
                >
                  {tierInfo.label}
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>
            </div>
          </div>

          {alert.description && <p className="text-slate-400 text-sm">{alert.description}</p>}

          {alert.escalationLevel && alert.escalationLevel !== 'SCHOOL' && (
            <div className="flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <AlertTriangle size={14} className="text-orange-400 shrink-0" />
              <p className="text-xs text-orange-300">
                Escalated to: <strong>{alert.escalationLevel}</strong> Admin
              </p>
            </div>
          )}

          {alert.status === 'CONFIRMED' && alert.confirmedAt && (
            <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-xl">
              <ShieldCheck size={14} className="text-green-400 shrink-0" />
              <p className="text-xs text-green-300">
                Confirmed at {formatTimestamp(alert.confirmedAt)}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2 p-2 bg-dashboard-bg rounded-xl">
              <Truck size={14} className="text-primary-500" />
              <div>
                <p className="text-[10px] text-slate-500">Vehicle</p>
                <p className="text-xs font-medium text-white">{alert.vehicleId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-dashboard-bg rounded-xl">
              <MapPin size={14} className="text-primary-500" />
              <div>
                <p className="text-[10px] text-slate-500">Route</p>
                <p className="text-xs font-medium text-white">{alert.routeId}</p>
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-2 p-2 bg-dashboard-bg rounded-xl">
              <Clock size={14} className="text-primary-500" />
              <div>
                <p className="text-[10px] text-slate-500">Timestamp</p>
                <p className="text-xs font-medium text-white">{formatTimestamp(alert.timestamp)}</p>
              </div>
            </div>
          </div>

          {/* Audit Timeline */}
          {auditTrail && auditTrail.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1.5">
                Activity Timeline
              </p>
              <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1.5">
                {auditTrail.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex gap-2 p-1.5 bg-dashboard-bg rounded-lg text-[10px]"
                  >
                    <div className="shrink-0 mt-0.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          entry.eventType === 'STATUS_UPDATE'
                            ? 'bg-blue-400'
                            : entry.eventType === 'RESOLVED'
                              ? 'bg-green-400'
                              : entry.eventType === 'CONFIRMED'
                                ? 'bg-emerald-400'
                                : 'bg-slate-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-300">
                          {AUDIT_EVENT_LABELS[entry.eventType] ||
                            entry.eventType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-slate-500 tabular-nums shrink-0">
                          {formatTimestamp(entry.eventTimestamp)}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-slate-400 mt-0.5 leading-snug">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-dashboard-border shrink-0">
        {isPendingConfirmation ? (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1">
              Action required
            </p>
            <div className="flex gap-2 flex-wrap">
              {onConfirm && (
                <button
                  onClick={() => onConfirm(alert.id)}
                  disabled={isActing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={13} />
                  Confirm
                </button>
              )}
              {onFalseAlarm && (
                <button
                  onClick={() => onFalseAlarm(alert.id)}
                  disabled={isActing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                >
                  <XCircle size={13} />
                  False Alarm
                </button>
              )}
              {onRequestInfo && (
                <button
                  onClick={() => onRequestInfo(alert.id)}
                  disabled={isActing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                >
                  <HelpCircle size={13} />
                  Request Info
                </button>
              )}
            </div>
          </div>
        ) : isWorkingState ? (
          <div className="flex flex-col gap-2">
            {showUpdateInput ? (
              <div className="space-y-2">
                <textarea
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="Enter status update..."
                  data-testid="update-notes-input"
                  className="w-full p-2 bg-dashboard-bg border border-dashboard-border rounded-xl text-xs text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  rows={2}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowUpdateInput(false);
                      setUpdateNotes('');
                    }}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitUpdate}
                    disabled={!updateNotes.trim() || isSubmittingUpdate}
                    data-testid="submit-update-btn"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                  >
                    <MessageSquare size={12} />
                    {isSubmittingUpdate ? 'Submitting...' : 'Submit Update'}
                  </button>
                </div>
              </div>
            ) : (
              onAddStatusUpdate && (
                <button
                  onClick={() => setShowUpdateInput(true)}
                  data-testid="btn-add-update"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors w-fit"
                >
                  <MessageSquare size={13} />
                  Add Status Update
                </button>
              )
            )}

            {showResolveInput ? (
              <div className="space-y-2">
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="Resolution notes (optional)..."
                  data-testid="resolve-notes-input"
                  className="w-full p-2 bg-dashboard-bg border border-dashboard-border rounded-xl text-xs text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-green-500/30"
                  rows={2}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowResolveInput(false);
                      setResolveNotes('');
                    }}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolveWithNotes}
                    disabled={isResolving}
                    data-testid="submit-resolve-btn"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={12} />
                    {isResolving ? 'Resolving...' : 'Confirm Resolution'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <button onClick={onClose} className="btn-secondary text-xs">
                  Close
                </button>
                <button
                  onClick={() => setShowResolveInput(true)}
                  data-testid="btn-resolve-confirmed"
                  className="btn-primary flex items-center gap-1.5 text-xs"
                >
                  <CheckCircle size={14} />
                  Resolve Incident
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary text-xs">
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );

  if (variant === 'overlay') {
    return (
      <div
        ref={panelRef}
        className={`fixed z-[2000] flex flex-col bg-dashboard-card/95 backdrop-blur-md rounded-2xl border border-dashboard-border shadow-2xl ${isDragging ? 'ring-2 ring-blue-500/30' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${overlaySize.width}px`,
          height: `${overlaySize.height}px`,
          minWidth: '280px',
          minHeight: '320px',
          resize: 'both',
          overflow: 'hidden',
        }}
        onMouseDown={handleMouseDown}
      >
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dashboard-card rounded-2xl border border-dashboard-border max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col">
        {content}
      </div>
    </div>
  );
};

export default AlertDetail;
