import React from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/common';
import { PlannerMap, RoutePlannerSidebar } from '../components/planner';
import { useRoutePlanner } from '../hooks/useRoutePlanner';
import { useAuth } from '../context/AuthContext';

const RoutePlanner: React.FC = () => {
  const { t } = useTranslation(['routes']);
  const { user } = useAuth();
  const planner = useRoutePlanner();
  const isSchoolAdmin = user?.role === 'SCHOOL_ADMIN';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title={t('routes:planner.title')} subtitle={t('routes:planner.subtitle')} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane — Route List / Form */}
        <RoutePlannerSidebar
          mode={planner.mode}
          filteredRoutes={planner.filteredRoutes}
          routesLoading={planner.routesLoading}
          routeSearch={planner.routeSearch}
          directionFilter={planner.directionFilter}
          schoolFilter={planner.schoolFilter}
          schools={planner.schools}
          setRouteSearch={planner.setRouteSearch}
          setDirectionFilter={planner.setDirectionFilter}
          setSchoolFilter={planner.setSchoolFilter}
          selectedRoute={planner.selectedRoute}
          selectRoute={planner.selectRoute}
          clearSelection={planner.clearSelection}
          startCreate={planner.startCreate}
          startEdit={planner.startEdit}
          cancelEdit={planner.cancelEdit}
          formSchoolId={planner.formSchoolId}
          routeName={planner.routeName}
          direction={planner.direction}
          startTime={planner.startTime}
          numberOfStops={planner.numberOfStops}
          stops={planner.stops}
          stopWarnings={planner.stopWarnings}
          spacingWarnings={planner.spacingWarnings}
          mapMode={planner.mapMode}
          optimizationResult={planner.optimizationResult}
          isOptimizing={planner.isOptimizing}
          isSaving={planner.isSaving}
          editingRouteId={planner.editingRouteId}
          setFormSchoolId={planner.setFormSchoolId}
          setRouteName={planner.setRouteName}
          setDirection={planner.setDirection}
          setStartTime={planner.setStartTime}
          setNumberOfStops={planner.setNumberOfStops}
          setMapMode={planner.setMapMode}
          addBlankStop={planner.addBlankStop}
          removeStop={planner.removeStop}
          updateStopField={planner.updateStopField}
          reorderStop={planner.reorderStop}
          autoGenerate={planner.autoGenerate}
          optimize={planner.optimize}
          snapToRoad={planner.snapToRoad}
          isSnapping={planner.isSnapping}
          saveRoute={planner.saveRoute}
          deleteRoute={planner.deleteRoute}
          isSchoolAdmin={isSchoolAdmin}
        />

        {/* Right Pane — Map (fills remaining space) */}
        <div className="flex-1 relative">
          <PlannerMap
            stops={planner.stops}
            direction={planner.direction}
            schoolLocation={planner.schoolLocation}
            routePath={planner.routePath}
            selectedRoute={planner.selectedRoute}
            mapMode={planner.mapMode}
            isEditing={planner.mode === 'create' || planner.mode === 'edit'}
            mapResetKey={planner.mapResetKey}
            onStopAdded={planner.addStop}
            onStopMoved={planner.moveStop}
            onPathAdjusted={planner.adjustPath}
          />
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;
