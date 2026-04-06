import React from 'react';
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
} from 'lucide-react';
import type { Alert } from '../../types';
import { formatTimestamp, formatEventType } from '../../utils/formatters';

interface AlertDetailProps {
  alert: Alert;
  onClose: () => void;
  onResolve: (id: string) => void;
  onConfirm?: (id: string) => void;
  onFalseAlarm?: (id: string) => void;
  onRequestInfo?: (id: string) => void;
  isResolving?: boolean;
  isActing?: boolean;
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

const AlertDetail: React.FC<AlertDetailProps> = ({
  alert,
  onClose,
  onResolve,
  onConfirm,
  onFalseAlarm,
  onRequestInfo,
  isResolving,
  isActing,
}) => {
  const isPendingConfirmation = alert.status === 'PENDING_CONFIRMATION';
  const isActive = alert.status === 'ACTIVE';
  const tierInfo = alert.tier ? TIER_LABELS[alert.tier] : null;
  const statusInfo = STATUS_LABELS[alert.status] ?? STATUS_LABELS.ACTIVE;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dashboard-card rounded-2xl border border-dashboard-border max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dashboard-border">
          <h3 className="text-xl font-bold text-white">Alert Details</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-2xl font-bold text-white">
              {formatEventType(alert.eventType)}
            </span>
            <div className="flex items-center gap-2">
              {/* Tier badge */}
              {tierInfo && (
                <span
                  className={`px-2 py-1 rounded-lg text-xs font-semibold border ${tierInfo.className}`}
                >
                  {tierInfo.label}
                </span>
              )}
              {/* Status badge */}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>
            </div>
          </div>

          {alert.description && <p className="text-slate-400">{alert.description}</p>}

          {/* Escalation level indicator */}
          {alert.escalationLevel && alert.escalationLevel !== 'SCHOOL' && (
            <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <AlertTriangle size={16} className="text-orange-400 shrink-0" />
              <p className="text-sm text-orange-300">
                Escalated to: <strong>{alert.escalationLevel}</strong> Admin
              </p>
            </div>
          )}

          {/* Confirmation details */}
          {alert.status === 'CONFIRMED' && alert.confirmedAt && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <ShieldCheck size={16} className="text-green-400 shrink-0" />
              <p className="text-sm text-green-300">
                Confirmed at {formatTimestamp(alert.confirmedAt)}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-3 p-3 bg-dashboard-bg rounded-xl">
              <Truck size={18} className="text-primary-500" />
              <div>
                <p className="text-xs text-slate-500">Vehicle</p>
                <p className="text-sm font-medium text-white">{alert.vehicleId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-dashboard-bg rounded-xl">
              <MapPin size={18} className="text-primary-500" />
              <div>
                <p className="text-xs text-slate-500">Route</p>
                <p className="text-sm font-medium text-white">{alert.routeId}</p>
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-3 p-3 bg-dashboard-bg rounded-xl">
              <Clock size={18} className="text-primary-500" />
              <div>
                <p className="text-xs text-slate-500">Timestamp</p>
                <p className="text-sm font-medium text-white">{formatTimestamp(alert.timestamp)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-dashboard-border">
          {isPendingConfirmation ? (
            /* Tier 1 confirmation workflow buttons */
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
                Action required
              </p>
              <div className="flex gap-2 flex-wrap">
                {onConfirm && (
                  <button
                    onClick={() => onConfirm(alert.id)}
                    disabled={isActing}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={15} />
                    Confirm
                  </button>
                )}
                {onFalseAlarm && (
                  <button
                    onClick={() => onFalseAlarm(alert.id)}
                    disabled={isActing}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={15} />
                    False Alarm
                  </button>
                )}
                {onRequestInfo && (
                  <button
                    onClick={() => onRequestInfo(alert.id)}
                    disabled={isActing}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                  >
                    <HelpCircle size={15} />
                    Request Info
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Standard actions */
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
              {isActive && (
                <button
                  onClick={() => onResolve(alert.id)}
                  disabled={isResolving}
                  className="btn-primary flex items-center gap-2"
                >
                  <CheckCircle size={18} />
                  {isResolving ? 'Resolving...' : 'Mark as Resolved'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertDetail;
