import React from 'react';
import { Plus, Edit3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PanelSearch } from '../common';
import { RouteListCompact } from '../routes';
import RoutePlannerForm from './RoutePlannerForm';
import type { Route } from '../../types';
import type { School } from '../../services/api/organization.api';
import type { PlannerStop, PlannerMode, MapInteractionMode } from '../../hooks/useRoutePlanner';
import type { OptimizationResult } from '../../services/api/routes.api';

interface RoutePlannerSidebarProps {
  // Mode
  mode: PlannerMode;

  // Route list
  filteredRoutes: Route[];
  routesLoading: boolean;

  // Search/filter
  routeSearch: string;
  directionFilter: '' | 'AM' | 'PM';
  schoolFilter: string;
  schools: School[];
  setRouteSearch: (v: string) => void;
  setDirectionFilter: (v: '' | 'AM' | 'PM') => void;
  setSchoolFilter: (v: string) => void;

  // Selected
  selectedRoute: Route | null;

  // Actions
  selectRoute: (route: Route) => void;
  clearSelection: () => void;
  startCreate: () => void;
  startEdit: (route: Route) => void;
  cancelEdit: () => void;

  // Form props
  formSchoolId: string;
  routeName: string;
  direction: 'AM' | 'PM';
  startTime: string;
  numberOfStops: number;
  stops: PlannerStop[];
  stopWarnings: Set<string>;
  spacingWarnings: Set<string>;
  mapMode: MapInteractionMode;
  optimizationResult: OptimizationResult | null;
  isOptimizing: boolean;
  isSaving: boolean;
  editingRouteId: string | null;

  // Form setters
  setFormSchoolId: (v: string) => void;
  setRouteName: (v: string) => void;
  setDirection: (v: 'AM' | 'PM') => void;
  setStartTime: (v: string) => void;
  setNumberOfStops: (v: number) => void;
  setMapMode: (v: MapInteractionMode) => void;

  // Stop actions
  addBlankStop: () => void;
  removeStop: (id: string) => void;
  updateStopField: (id: string, field: 'address' | 'lat' | 'lng', value: string) => void;
  reorderStop: (id: string, newIndex: number) => void;

  // Route actions
  autoGenerate: () => void;
  optimize: () => void;
  snapToRoad: () => void;
  saveRoute: () => void;
  deleteRoute: (id: string) => void;

  // Snap state
  isSnapping: boolean;

  // User context
  isSchoolAdmin: boolean;
}

const RoutePlannerSidebar: React.FC<RoutePlannerSidebarProps> = (props) => {
  const { t } = useTranslation(['routes']);
  const {
    mode,
    filteredRoutes,
    routesLoading,
    routeSearch,
    directionFilter,
    schoolFilter,
    schools,
    setRouteSearch,
    setDirectionFilter,
    setSchoolFilter,
    selectedRoute,
    selectRoute,
    startCreate,
    startEdit,
    cancelEdit,
  } = props;

  return (
    <div className="w-80 shrink-0 bg-slate-900/80 backdrop-blur-sm border-r border-slate-700/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-700/50 shrink-0">
        {mode === 'list' ? (
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              {t('routes:planner.sidebar.routesHeader')}
            </h3>
            <button
              onClick={startCreate}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-colors"
            >
              <Plus size={12} />
              {t('routes:planner.sidebar.newRoute')}
            </button>
          </div>
        ) : (
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            {mode === 'create'
              ? t('routes:planner.sidebar.newRouteTitle')
              : t('routes:planner.sidebar.editRouteTitle')}
          </h3>
        )}
      </div>

      {/* Content based on mode */}
      {mode === 'list' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search + filters */}
          <div className="p-3 space-y-2 shrink-0">
            <PanelSearch
              value={routeSearch}
              onChange={setRouteSearch}
              placeholder={t('routes:planner.sidebar.searchPlaceholder')}
            />
            <div className="flex gap-1.5">
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as '' | 'AM' | 'PM')}
                className="flex-1 py-1 px-2 bg-slate-800 border border-slate-700 rounded text-[10px] font-bold text-slate-300 outline-none focus:border-primary-500"
              >
                <option value="">{t('routes:planner.sidebar.allDirections')}</option>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
              <select
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="flex-1 py-1 px-2 bg-slate-800 border border-slate-700 rounded text-[10px] font-bold text-slate-300 outline-none focus:border-primary-500 truncate"
              >
                <option value="">{t('routes:planner.sidebar.allSchools')}</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Route list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3">
            {routesLoading ? (
              <div className="text-center py-8 text-slate-500">
                <div className="animate-spin w-5 h-5 border-2 border-slate-500 border-t-blue-400 rounded-full mx-auto mb-2" />
                <p className="text-[10px] font-bold">{t('routes:planner.sidebar.loadingRoutes')}</p>
              </div>
            ) : (
              <>
                <RouteListCompact
                  routes={filteredRoutes}
                  onRouteClick={(route) => selectRoute(route)}
                  onEdit={(route) => startEdit(route)}
                  emptyMessage={t('routes:planner.sidebar.noRoutesMatch')}
                />
                {/* Edit button for selected route */}
                {selectedRoute && (
                  <div className="mt-3 p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-300 truncate">
                          {selectedRoute.name}
                        </p>
                        <p className="text-[8px] text-slate-500">
                          {selectedRoute.direction} •{' '}
                          {t('routes:planner.sidebar.stopsCount', {
                            count: selectedRoute.stops.length,
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => startEdit(selectedRoute)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded transition-colors shrink-0"
                      >
                        <Edit3 size={10} />
                        {t('routes:planner.sidebar.edit')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden p-3">
          <RoutePlannerForm
            formSchoolId={props.formSchoolId}
            routeName={props.routeName}
            direction={props.direction}
            startTime={props.startTime}
            numberOfStops={props.numberOfStops}
            schools={props.schools}
            stops={props.stops}
            stopWarnings={props.stopWarnings}
            spacingWarnings={props.spacingWarnings}
            mapMode={props.mapMode}
            optimizationResult={props.optimizationResult}
            isOptimizing={props.isOptimizing}
            isSaving={props.isSaving}
            isEdit={mode === 'edit'}
            setFormSchoolId={props.setFormSchoolId}
            setRouteName={props.setRouteName}
            setDirection={props.setDirection}
            setStartTime={props.setStartTime}
            setNumberOfStops={props.setNumberOfStops}
            setMapMode={props.setMapMode}
            addBlankStop={props.addBlankStop}
            removeStop={props.removeStop}
            updateStopField={props.updateStopField}
            reorderStop={props.reorderStop}
            autoGenerate={props.autoGenerate}
            optimize={props.optimize}
            snapToRoad={props.snapToRoad}
            isSnapping={props.isSnapping}
            saveRoute={props.saveRoute}
            cancelEdit={cancelEdit}
            deleteRoute={props.deleteRoute}
            editingRouteId={props.editingRouteId}
            isSchoolAdmin={props.isSchoolAdmin}
          />
        </div>
      )}
    </div>
  );
};

export default RoutePlannerSidebar;
