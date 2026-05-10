import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, XCircle, HelpCircle, Clock, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Alert } from '../../types';
import { formatEventType } from '../../utils/formatters';
import { useConfirmationTimeoutMs } from '../../hooks/useEscalationConfig';

interface AlertConfirmationModalProps {
  alert: Alert;
  onConfirm: (id: string) => Promise<void>;
  onFalseAlarm: (id: string, notes?: string) => Promise<void>;
  onRequestInfo: (id: string) => Promise<void>;
  onClose: () => void;
  routeName?: string;
}

/**
 * AlertConfirmationModal
 *
 * Shown to School Admin when a Tier 1 alert arrives in PENDING_CONFIRMATION status.
 * Displays a countdown timer and three action buttons:
 *   - Confirm and Notify Parents (green) — triggers parent notifications
 *   - Mark as False Alarm (orange)        — suppresses parent notification
 *   - Request More Information (blue)     — logs intent, timer continues
 *
 * The countdown window is read from the alert-config service so it always
 * matches the backend escalation scheduler (no hardcoded constants).
 *
 * When the countdown expires, the modal auto-dismisses (backend auto-escalates independently).
 */
const AlertConfirmationModal: React.FC<AlertConfirmationModalProps> = ({
  alert,
  onConfirm,
  onFalseAlarm,
  onRequestInfo,
  onClose,
  routeName,
}) => {
  const { t } = useTranslation(['alerts']);
  const confirmationWindowMs = useConfirmationTimeoutMs(alert.tier ?? 'TIER_1');
  const confirmationWindowSec = Math.floor(confirmationWindowMs / 1000);

  const computeRemaining = useCallback((): number => {
    const createdAt = new Date(alert.createdAt ?? alert.timestamp).getTime();
    // Clamp elapsed >= 0 so future-dated demo data does not extend the timer.
    const elapsed = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
    return Math.max(0, confirmationWindowSec - elapsed);
  }, [alert.createdAt, alert.timestamp, confirmationWindowSec]);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(computeRemaining);

  // When the configured window arrives (or the alert prop changes), recompute.
  useEffect(() => {
    setSecondsRemaining(computeRemaining());
  }, [computeRemaining]);

  const [isActing, setIsActing] = useState(false);
  const [infoRequested, setInfoRequested] = useState(false);
  const [activeAction, setActiveAction] = useState<
    'confirm' | 'false-alarm' | 'request-info' | null
  >(null);

  // Countdown ticker
  useEffect(() => {
    if (secondsRemaining <= 0) {
      onClose();
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining, onClose]);

  const handleConfirm = useCallback(async () => {
    setIsActing(true);
    setActiveAction('confirm');
    try {
      await onConfirm(alert.id);
      onClose();
    } finally {
      setIsActing(false);
      setActiveAction(null);
    }
  }, [alert.id, onConfirm, onClose]);

  const handleFalseAlarm = useCallback(async () => {
    setIsActing(true);
    setActiveAction('false-alarm');
    try {
      await onFalseAlarm(alert.id);
      onClose();
    } finally {
      setIsActing(false);
      setActiveAction(null);
    }
  }, [alert.id, onFalseAlarm, onClose]);

  const handleRequestInfo = useCallback(async () => {
    setIsActing(true);
    setActiveAction('request-info');
    try {
      await onRequestInfo(alert.id);
      setInfoRequested(true);
      // Do not close — admin is gathering info, timer continues on backend
    } finally {
      setIsActing(false);
      setActiveAction(null);
    }
  }, [alert.id, onRequestInfo]);

  const timerPct = confirmationWindowSec > 0 ? (secondsRemaining / confirmationWindowSec) * 100 : 0;
  const timerColor =
    secondsRemaining > 60
      ? 'text-green-400'
      : secondsRemaining > 30
        ? 'text-amber-400'
        : 'text-red-400';

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div className="bg-dashboard-card rounded-2xl border border-red-500/40 max-w-lg w-full shadow-2xl shadow-red-500/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dashboard-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
              <AlertTriangle size={20} className="text-red-400 animate-pulse" />
            </div>
            <div>
              <h3 id="confirmation-modal-title" className="text-lg font-bold text-white">
                {t('alerts:confirmationModal.title')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('alerts:confirmationModal.tier1Label')} — {formatEventType(alert.eventType)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label={t('alerts:confirmationModal.closeModal')}
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Countdown timer */}
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">
                {t('alerts:confirmationModal.autoEscalatesIn')}
              </span>
            </div>
            <span
              className={`text-2xl font-black tabular-nums ${timerColor}`}
              aria-live="polite"
              aria-atomic="true"
              data-testid="countdown-timer"
            >
              {formattedTime}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                secondsRemaining > 60
                  ? 'bg-green-400'
                  : secondsRemaining > 30
                    ? 'bg-amber-400'
                    : 'bg-red-400'
              }`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {t('alerts:confirmationModal.noActionWarning')}
          </p>
        </div>

        {/* Alert details */}
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-dashboard-bg rounded-xl">
              <p className="text-xs text-slate-500 mb-0.5">{t('alerts:confirmationModal.route')}</p>
              <p className="text-sm font-semibold text-white">{routeName || 'Unknown Route'}</p>
            </div>
            <div className="p-3 bg-dashboard-bg rounded-xl">
              <p className="text-xs text-slate-500 mb-0.5">
                {t('alerts:confirmationModal.vehicle')}
              </p>
              <p className="text-sm font-semibold text-white">{alert.vehicleId}</p>
            </div>
            <div className="col-span-2 p-3 bg-dashboard-bg rounded-xl">
              <p className="text-xs text-slate-500 mb-0.5">{t('alerts:confirmationModal.event')}</p>
              <p className="text-sm font-semibold text-white">
                {formatEventType(alert.eventType)}
                {alert.description && (
                  <span className="text-slate-400 font-normal ml-2">— {alert.description}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-6 pt-0 border-t border-dashboard-border flex flex-col gap-3">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
            {t('alerts:confirmationModal.chooseAction')}
          </p>

          <button
            onClick={handleConfirm}
            disabled={isActing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-semibold hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="btn-confirm"
          >
            <CheckCircle size={18} />
            {activeAction === 'confirm'
              ? t('alerts:confirmationModal.confirmingButton')
              : t('alerts:confirmationModal.confirmButton')}
          </button>

          <button
            onClick={handleFalseAlarm}
            disabled={isActing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="btn-false-alarm"
          >
            <XCircle size={18} />
            {activeAction === 'false-alarm'
              ? t('alerts:confirmationModal.markingButton')
              : t('alerts:confirmationModal.falseAlarmButton')}
          </button>

          <button
            onClick={handleRequestInfo}
            disabled={isActing || infoRequested}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              infoRequested
                ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                : 'bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30'
            }`}
            data-testid="btn-request-info"
          >
            {infoRequested ? <Check size={18} /> : <HelpCircle size={18} />}
            {infoRequested
              ? t('alerts:confirmationModal.infoRequestedButton')
              : activeAction === 'request-info'
                ? t('alerts:confirmationModal.requestingButton')
                : t('alerts:confirmationModal.requestInfoButton')}
          </button>
          {infoRequested && (
            <p
              className="text-xs text-slate-500 text-center mt-1"
              data-testid="info-requested-note"
            >
              {t('alerts:confirmationModal.infoRequestedNote')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertConfirmationModal;
