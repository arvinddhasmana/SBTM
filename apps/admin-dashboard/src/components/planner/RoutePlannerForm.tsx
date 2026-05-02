import React from 'react';
import {
  Wand2,
  Save,
  X,
  Trash2,
  Plus,
  MousePointer2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PlannerStop, MapInteractionMode } from '../../hooks/useRoutePlanner';
import type { School } from '../../services/api/organization.api';
import type { OptimizationResult } from '../../services/api/routes.api';

interface RoutePlannerFormProps {
  // Form fields
  formSchoolId: string;
  routeName: string;
  direction: 'AM' | 'PM';
  startTime: string;
  numberOfStops: number;
  schools: School[];

  // Stops
  stops: PlannerStop[];
  stopWarnings: Set<string>;
  spacingWarnings: Set<string>;
  mapMode: MapInteractionMode;

  // Optimization
  optimizationResult: OptimizationResult | null;
  isOptimizing: boolean;
  isSaving: boolean;
  isEdit: boolean;

  // Setters
  setFormSchoolId: (v: string) => void;
  setRouteName: (v: string) => void;
  setDirection: (v: 'AM' | 'PM') => void;
  setStartTime: (v: string) => void;
  setNumberOfStops: (v: number) => void;
  setMapMode: (v: MapInteractionMode) => void;

  // Actions
  addBlankStop: () => void;
  removeStop: (id: string) => void;
  updateStopField: (id: string, field: 'address' | 'lat' | 'lng', value: string) => void;
  reorderStop: (id: string, newIndex: number) => void;
  autoGenerate: () => void;
  optimize: () => void;
  snapToRoad: () => void;
  isSnapping: boolean;
  saveRoute: () => void;
  cancelEdit: () => void;
  deleteRoute?: (id: string) => void;
  editingRouteId: string | null;

  // User context
  isSchoolAdmin: boolean;
}

const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded-lg text-white text-sm p-2 outline-none focus:border-primary-500 transition-colors';
const labelCls = 'block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider';

const RoutePlannerForm: React.FC<RoutePlannerFormProps> = ({
  formSchoolId,
  routeName,
  direction,
  startTime,
  numberOfStops,
  schools,
  stops,
  stopWarnings,
  spacingWarnings,
  mapMode,
  optimizationResult,
  isOptimizing,
  isSaving,
  isEdit,
  setFormSchoolId,
  setRouteName,
  setDirection,
  setStartTime,
  setNumberOfStops,
  setMapMode,
  addBlankStop,
  removeStop,
  updateStopField,
  reorderStop,
  autoGenerate,
  optimize,
  snapToRoad,
  isSnapping,
  saveRoute,
  cancelEdit,
  deleteRoute,
  editingRouteId,
  isSchoolAdmin,
}) => {
  const { t } = useTranslation(['routes']);
  const validStops = stops.filter((s) => s.lat !== 0 && s.lng !== 0);
  const canOptimize = validStops.length >= 2;
  const canSave = routeName.trim() && formSchoolId && validStops.length > 0;

  return (
    <div className="flex flex-col h-full gap-3 overflow-y-auto custom-scrollbar pr-1">
      {/* School */}
      <div>
        <label className={labelCls}>{t('routes:planner.form.schoolLabel')}</label>
        <select
          value={formSchoolId}
          onChange={(e) => setFormSchoolId(e.target.value)}
          disabled={isSchoolAdmin}
          className={inputCls}
        >
          <option value="">{t('routes:planner.form.selectSchool')}</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Route Name */}
      <div>
        <label className={labelCls}>{t('routes:planner.form.routeNameLabel')}</label>
        <input
          type="text"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          className={inputCls}
          placeholder={t('routes:planner.form.routeNamePlaceholder')}
        />
      </div>

      {/* Direction + Start Time — side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>{t('routes:planner.form.directionLabel')}</label>
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            <button
              type="button"
              onClick={() => setDirection('AM')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                direction === 'AM'
                  ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-400'
                  : 'bg-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setDirection('PM')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                direction === 'PM'
                  ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-400'
                  : 'bg-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              PM
            </button>
          </div>
        </div>
        <div>
          <label className={labelCls}>{t('routes:planner.form.startTimeLabel')}</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Auto-Generate */}
      <div className="border-t border-slate-700 pt-3">
        <label className={labelCls}>{t('routes:planner.form.autoGenerateLabel')}</label>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <input
              type="number"
              value={numberOfStops}
              onChange={(e) =>
                setNumberOfStops(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))
              }
              min={2}
              max={20}
              className={`${inputCls} text-center`}
              title={t('routes:planner.form.autoGenerateLabel')}
            />
          </div>
          <button
            type="button"
            onClick={autoGenerate}
            disabled={!formSchoolId || isOptimizing}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles size={14} />
            {t('routes:planner.form.generateBtn')}
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1">
          {formSchoolId
            ? t('routes:planner.form.generateHint', { count: numberOfStops })
            : t('routes:planner.form.generateHintNoSchool')}
        </p>
      </div>

      {/* Stops List */}
      <div className="border-t border-slate-700 pt-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={12} className="text-primary-400" />
            {t('routes:planner.form.stopsHeader')} ({stops.length})
          </h4>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setMapMode(mapMode === 'add-stop' ? 'view' : 'add-stop')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                mapMode === 'add-stop'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-500 hover:text-slate-300 border border-slate-700'
              }`}
              title={t('routes:planner.form.mapTooltip')}
            >
              <MousePointer2 size={10} />
              {t('routes:planner.form.mapBtn')}
            </button>
            <button
              type="button"
              onClick={addBlankStop}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-300 border border-slate-700 rounded transition-colors"
              title={t('routes:planner.form.manualTooltip')}
            >
              <Plus size={10} />
              {t('routes:planner.form.manualBtn')}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          {stops.map((stop, idx) => (
            <div
              key={stop.id}
              data-testid={`stop-row-${stop.sequence}`}
              className={`bg-slate-800/60 rounded-lg border p-2 transition-colors ${
                stopWarnings.has(stop.id)
                  ? 'border-amber-500/50'
                  : spacingWarnings.has(stop.id)
                    ? 'border-orange-500/50'
                    : 'border-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {/* Sequence badge */}
                <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-black text-slate-300 shrink-0">
                  {stop.sequence}
                </span>

                {/* Address input */}
                <input
                  type="text"
                  value={stop.address}
                  onChange={(e) => updateStopField(stop.id, 'address', e.target.value)}
                  className="flex-1 bg-transparent text-[11px] text-slate-200 outline-none placeholder-slate-600 min-w-0"
                  placeholder={t('routes:planner.form.addressPlaceholder')}
                  data-testid={`stop-address-${stop.sequence}`}
                />

                {/* Radius warning */}
                {stopWarnings.has(stop.id) && (
                  <span
                    title={t('routes:planner.form.radiusWarning')}
                    data-testid={`radius-warning-${stop.sequence}`}
                  >
                    <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                  </span>
                )}

                {/* Spacing warning */}
                {spacingWarnings.has(stop.id) && (
                  <span
                    title={t('routes:planner.form.spacingWarning')}
                    data-testid={`spacing-warning-${stop.sequence}`}
                  >
                    <AlertTriangle size={12} className="text-orange-400 shrink-0" />
                  </span>
                )}

                {/* Reorder */}
                <button
                  type="button"
                  onClick={() => reorderStop(stop.id, idx - 1)}
                  disabled={idx === 0}
                  className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => reorderStop(stop.id, idx + 1)}
                  disabled={idx === stops.length - 1}
                  className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                >
                  <ChevronDown size={12} />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => removeStop(stop.id)}
                  className="p-0.5 text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Lat/Lng row */}
              <div className="flex gap-1.5 mt-1.5 pl-6">
                <input
                  type="text"
                  value={stop.lat !== 0 ? stop.lat : ''}
                  onChange={(e) => updateStopField(stop.id, 'lat', e.target.value)}
                  className="w-1/2 bg-slate-900 border border-slate-700/50 rounded text-[10px] text-slate-400 p-1 outline-none focus:border-primary-500"
                  placeholder={t('routes:planner.form.latitudePlaceholder')}
                />
                <input
                  type="text"
                  value={stop.lng !== 0 ? stop.lng : ''}
                  onChange={(e) => updateStopField(stop.id, 'lng', e.target.value)}
                  className="w-1/2 bg-slate-900 border border-slate-700/50 rounded text-[10px] text-slate-400 p-1 outline-none focus:border-primary-500"
                  placeholder={t('routes:planner.form.longitudePlaceholder')}
                />
              </div>
            </div>
          ))}

          {stops.length === 0 && (
            <p className="text-[10px] text-slate-600 text-center py-4">
              {t('routes:planner.form.noStopsYet')}
            </p>
          )}
        </div>
      </div>

      {/* Optimization Result */}
      {optimizationResult && (
        <div className="border-t border-slate-700 pt-3 space-y-1">
          <h4 className="text-xs font-bold text-slate-300">
            {t('routes:planner.form.optimizationTitle')}
          </h4>
          {optimizationResult.polylineGeoJson ? (
            <div className="flex gap-4">
              <p className="text-[11px] text-slate-400">
                {t('routes:planner.form.distanceLabel')}{' '}
                <span className="text-white font-semibold">
                  {optimizationResult.totalDistance} km
                </span>
              </p>
              <p className="text-[11px] text-slate-400">
                {t('routes:planner.form.durationLabel')}{' '}
                <span className="text-white font-semibold">
                  {optimizationResult.totalDuration} min
                </span>
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-amber-400">
              {t('routes:planner.form.providerUnavailable')}
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="border-t border-slate-700 pt-3 mt-auto space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={optimize}
            disabled={!canOptimize || isOptimizing}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Wand2 size={14} />
            {isOptimizing
              ? t('routes:planner.form.optimizingBtn')
              : t('routes:planner.form.optimizeBtn')}
          </button>
          <button
            type="button"
            onClick={snapToRoad}
            disabled={!canOptimize || isSnapping}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="snap-to-road-btn"
          >
            <MapPin size={14} />
            {isSnapping
              ? t('routes:planner.form.snappingBtn')
              : t('routes:planner.form.snapToRoadBtn')}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveRoute}
            disabled={!canSave || isSaving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {isSaving
              ? t('routes:planner.form.savingBtn')
              : isEdit
                ? t('routes:planner.form.updateBtn')
                : t('routes:planner.form.saveBtn')}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={cancelEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-slate-400 hover:text-white border border-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <X size={14} />
            {t('routes:planner.form.cancelBtn')}
          </button>
          {isEdit && editingRouteId && deleteRoute && (
            <button
              type="button"
              onClick={() => deleteRoute(editingRouteId)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg text-xs font-bold transition-colors"
            >
              <Trash2 size={14} />
              {t('routes:planner.form.deleteBtn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutePlannerForm;
