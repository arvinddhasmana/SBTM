import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  MapPin,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  MessageSquare,
  GripVertical,
  Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Alert, AlertAuditEntry } from '../../types';
import { formatTimestamp, formatEventType } from '../../utils/formatters';
import { useConfirmationTimeoutMs } from '../../hooks/useEscalationConfig';

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
  /** kept for API compat — panel is always floating overlay now */
  variant?: 'modal' | 'overlay';
  routeName?: string;
}

function getAuditDotColor(eventType: string): string {
  switch (eventType) {
    case 'STATUS_UPDATE':
      return 'bg-blue-400';
    case 'CONFIRMED':
      return 'bg-emerald-400';
    case 'RESOLVED':
      return 'bg-green-400';
    case 'AUTO_ESCALATED':
    case 'BOARD_ESCALATED':
    case 'STA_ESCALATED':
      return 'bg-orange-400';
    case 'FALSE_ALARM':
      return 'bg-slate-400';
    case 'PARENT_NOTIFIED':
      return 'bg-purple-400';
    case 'CREATED':
      return 'bg-indigo-400';
    case 'INFO_REQUESTED':
      return 'bg-yellow-400';
    default:
      return 'bg-slate-500';
  }
}

const OVERLAY_SIZE_KEY = 'alert_detail_overlay_size';
const DEFAULT_OVERLAY_SIZE = { width: 440, height: 600 };

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
  routeName,
}) => {
  const { t } = useTranslation(['alerts']);
  const [showUpdateInput, setShowUpdateInput] = useState(false);
  const [updateNotes, setUpdateNotes] = useState('');
  const [showResolveInput, setShowResolveInput] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [infoRequested, setInfoRequested] = useState(false);

  // Dragging state
  const [position, setPosition] = useState({ x: 100, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Persisted size
  const [overlaySize] = useState<{ width: number; height: number }>(readOverlaySize);

  // Elapsed-time timer for PENDING_CONFIRMATION — counts UP from the moment the
  // alert was created so the panel always restores the actual elapsed time when
  // reopened, rather than resetting to the full configured window.
  const isPendingConfirmation = alert.status === 'PENDING_CONFIRMATION';
  const confirmationWindowMs = useConfirmationTimeoutMs(alert.tier ?? 'TIER_1');
  const confirmationWindowSec = Math.floor(confirmationWindowMs / 1000);

  const computeElapsed = useCallback((): number => {
    // Use the driver-supplied event timestamp (always close to actual creation time).
    // Avoid alert.createdAt which reflects the DB server clock and may have a
    // timezone offset if the Postgres container is configured differently from UTC.
    const alertTime = new Date(alert.timestamp).getTime();
    if (isNaN(alertTime)) return 0;
    return Math.max(0, Math.floor((Date.now() - alertTime) / 1000));
  }, [alert.timestamp]);

  const [secondsElapsed, setSecondsElapsed] = useState<number>(computeElapsed);

  // Recompute when alert data changes (e.g. after a refetch).
  useEffect(() => {
    setSecondsElapsed(computeElapsed());
  }, [computeElapsed]);

  // Increment every second while the alert is still pending.
  useEffect(() => {
    if (!isPendingConfirmation) return;
    const interval = setInterval(() => {
      setSecondsElapsed(computeElapsed());
    }, 1000);
    return () => clearInterval(interval);
  }, [isPendingConfirmation, computeElapsed]);

  const isActive = alert.status === 'ACTIVE';
  const isConfirmed = alert.status === 'CONFIRMED';
  const isAutoEscalated = alert.status === 'AUTO_ESCALATED';
  const isWorkingState = isConfirmed || isAutoEscalated || isActive;

  const TIER_CLASS_MAP: Record<string, string> = {
    TIER_1: 'bg-red-500/20 text-red-400 border-red-500/30',
    TIER_2: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    TIER_3: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  const STATUS_CLASS_MAP: Record<string, string> = {
    ACTIVE: 'bg-red-500/20 text-red-400',
    RESOLVED: 'bg-green-500/20 text-green-400',
    PENDING_CONFIRMATION: 'bg-yellow-500/20 text-yellow-300',
    CONFIRMED: 'bg-green-500/20 text-green-400',
    AUTO_ESCALATED: 'bg-orange-500/20 text-orange-400',
    FALSE_ALARM: 'bg-slate-500/20 text-slate-400',
  };

  const tierLabel = alert.tier
    ? t(`alerts:detail.tierLabels.${alert.tier}`, { defaultValue: alert.tier })
    : null;
  const tierClassName = alert.tier ? (TIER_CLASS_MAP[alert.tier] ?? '') : '';
  const statusLabel = t(`alerts:detail.statusLabels.${alert.status}`, {
    defaultValue: alert.status,
  });
  const statusClassName = STATUS_CLASS_MAP[alert.status] ?? STATUS_CLASS_MAP.ACTIVE;

  // Persist size via ResizeObserver
  useEffect(() => {
    if (!panelRef.current) return;
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
  }, []);

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

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.overlay-drag-handle')) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
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
  }, [isDragging]);

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

  // Timer display — elapsed time counting up from 0:00
  const timerMinutes = Math.floor(secondsElapsed / 60);
  const timerSeconds = secondsElapsed % 60;
  const formattedTime = `${timerMinutes}:${String(timerSeconds).padStart(2, '0')}`;
  const timerPct =
    confirmationWindowSec > 0 ? Math.min(100, (secondsElapsed / confirmationWindowSec) * 100) : 0;
  const isOverdue = secondsElapsed >= confirmationWindowSec && confirmationWindowSec > 0;
  const timerColor = isOverdue
    ? 'text-red-400'
    : secondsElapsed > confirmationWindowSec * 0.75
      ? 'text-amber-400'
      : 'text-green-400';
  const barColor = isOverdue
    ? 'bg-red-400'
    : secondsElapsed > confirmationWindowSec * 0.75
      ? 'bg-amber-400'
      : 'bg-green-400';

  // Sort audit trail descending (latest first)
  const sortedAudit = auditTrail
    ? [...auditTrail].sort(
        (a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime(),
      )
    : [];

  return (
    <div
      ref={panelRef}
      className={`fixed z-[2000] flex flex-col bg-dashboard-card/95 backdrop-blur-md rounded-2xl border border-dashboard-border shadow-2xl ${isDragging ? 'ring-2 ring-blue-500/30' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${overlaySize.width}px`,
        height: `${overlaySize.height}px`,
        minWidth: '320px',
        minHeight: '380px',
        resize: 'both',
        overflow: 'hidden',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header / drag handle */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-dashboard-border shrink-0 overlay-drag-handle cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-slate-500 pointer-events-none" />
          <h3 className="text-base font-bold text-white">{t('alerts:detail.title')}</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-5 py-4 space-y-4">
          {/* Elapsed timer (PENDING_CONFIRMATION only) */}
          {isPendingConfirmation && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={13} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {isOverdue
                      ? t('alerts:detail.autoEscalationOverdue', {
                          defaultValue: 'Auto-escalation overdue',
                        })
                      : t('alerts:detail.elapsedSinceAlert', {
                          defaultValue: 'Elapsed since alert',
                        })}
                  </span>
                </div>
                <span className={`text-xl font-black tabular-nums ${timerColor}`}>
                  {formattedTime}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                  style={{ width: `${timerPct}%` }}
                />
              </div>
              {!isOverdue && (
                <p className="mt-1 text-[11px] text-slate-500">
                  {t('alerts:detail.noActionWarning')}
                </p>
              )}
            </div>
          )}

          {/* Event type + tier + status badges */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-white">
                {formatEventType(alert.eventType)}
              </span>
              {tierLabel && (
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${tierClassName}`}
                >
                  {tierLabel}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClassName}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Description */}
          {alert.description && (
            <p className="text-slate-300 text-sm leading-relaxed">{alert.description}</p>
          )}

          {/* Escalation notice */}
          {alert.escalationLevel && alert.escalationLevel !== 'SCHOOL' && (
            <div className="flex items-center gap-2 p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <AlertTriangle size={14} className="text-orange-400 shrink-0" />
              <p className="text-xs text-orange-300">
                {t('alerts:detail.escalatedTo', { level: alert.escalationLevel })}
              </p>
            </div>
          )}

          {/* Vehicle / Route / Timestamp info cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-dashboard-bg rounded-xl">
              <Truck size={14} className="text-primary-500" />
              <div>
                <p className="text-[10px] text-slate-500">{t('alerts:detail.vehicleLabel')}</p>
                <p className="text-xs font-semibold text-white">{alert.vehicleId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-dashboard-bg rounded-xl">
              <MapPin size={14} className="text-primary-500" />
              <div>
                <p className="text-[10px] text-slate-500">{t('alerts:detail.routeLabel')}</p>
                <p className="text-xs font-semibold text-white">{routeName || 'Unknown Route'}</p>
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-2 p-3 bg-dashboard-bg rounded-xl">
              <Clock size={14} className="text-primary-500" />
              <div>
                <p className="text-[10px] text-slate-500">{t('alerts:detail.timestampLabel')}</p>
                <p className="text-xs font-semibold text-white">
                  {formatTimestamp(alert.timestamp)}
                </p>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          {sortedAudit.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2">
                {t('alerts:detail.activityTimeline')}
              </p>
              <div className="space-y-0">
                {sortedAudit.map((entry, idx) => (
                  <div key={entry.id} className="flex gap-2.5 pb-2.5">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${getAuditDotColor(entry.eventType)}`}
                      />
                      {idx < sortedAudit.length - 1 && (
                        <div className="w-px flex-1 bg-slate-700/50 mt-0.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-300 text-[11px]">
                          {t(`alerts:detail.auditEvents.${entry.eventType}`, {
                            defaultValue: entry.eventType.replace(/_/g, ' '),
                          })}
                        </span>
                        <span className="text-slate-500 tabular-nums shrink-0 text-[10px]">
                          {formatTimestamp(entry.eventTimestamp)}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-slate-400 mt-0.5 leading-snug text-[11px]">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions footer */}
      <div className="px-5 py-3 border-t border-dashboard-border shrink-0">
        {isPendingConfirmation ? (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-0.5">
              {t('alerts:detail.actionRequired')}
            </p>
            <div className="flex gap-2 flex-wrap">
              {onConfirm && (
                <button
                  onClick={() => onConfirm(alert.id)}
                  disabled={isActing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/30 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={13} />
                  {t('alerts:detail.buttons.confirm')}
                </button>
              )}
              {onFalseAlarm && (
                <button
                  onClick={() => onFalseAlarm(alert.id)}
                  disabled={isActing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                >
                  <XCircle size={13} />
                  {t('alerts:detail.buttons.falseAlarm')}
                </button>
              )}
              {onRequestInfo && (
                <button
                  onClick={async () => {
                    await onRequestInfo(alert.id);
                    setInfoRequested(true);
                  }}
                  disabled={isActing || infoRequested}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
                    infoRequested
                      ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                      : 'bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30'
                  }`}
                >
                  {infoRequested ? <Check size={13} /> : <HelpCircle size={13} />}
                  {infoRequested
                    ? t('alerts:detail.buttons.infoRequested')
                    : t('alerts:detail.buttons.requestInfo')}
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
                  placeholder={t('alerts:detail.buttons.enterStatusUpdate')}
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
                    {t('alerts:detail.buttons.cancel')}
                  </button>
                  <button
                    onClick={handleSubmitUpdate}
                    disabled={!updateNotes.trim() || isSubmittingUpdate}
                    data-testid="submit-update-btn"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                  >
                    <MessageSquare size={12} />
                    {isSubmittingUpdate
                      ? t('alerts:detail.buttons.submitting')
                      : t('alerts:detail.buttons.submitUpdate')}
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
                  {t('alerts:detail.buttons.addStatusUpdate')}
                </button>
              )
            )}

            {showResolveInput ? (
              <div className="space-y-2">
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder={t('alerts:detail.buttons.resolutionNotes')}
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
                    {t('alerts:detail.buttons.cancel')}
                  </button>
                  <button
                    onClick={handleResolveWithNotes}
                    disabled={isResolving}
                    data-testid="submit-resolve-btn"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={12} />
                    {isResolving
                      ? t('alerts:detail.buttons.resolving')
                      : t('alerts:detail.buttons.confirmResolution')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <button onClick={onClose} className="btn-secondary text-xs">
                  {t('alerts:detail.buttons.close')}
                </button>
                <button
                  onClick={() => setShowResolveInput(true)}
                  data-testid="btn-resolve-confirmed"
                  className="btn-primary flex items-center gap-1.5 text-xs"
                >
                  <CheckCircle size={14} />
                  {t('alerts:detail.buttons.resolveIncident')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary text-xs">
              {t('alerts:detail.buttons.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertDetail;
