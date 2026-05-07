import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { routesApi, organizationApi, useMock } from '../services/api';
import { queryKeys } from '../services/query-keys';
import { useAuth } from '../context/AuthContext';
import {
  distributeStopsOnRadius,
  toWktPoint,
  haversineDistance,
  isWithinRadius,
  parseWktPoint,
} from '../utils/geo';
import type { Route } from '../types';
import type { School } from '../services/api/organization.api';
import type { OptimizationResult } from '../services/api/routes.api';

export interface PlannerStop {
  id: string;
  sequence: number;
  address: string;
  lat: number;
  lng: number;
}

export type PlannerMode = 'list' | 'create' | 'edit';
export type MapInteractionMode = 'view' | 'add-stop';

/** Minimum distance between consecutive stops in km (OSTA guideline). */
export const MIN_STOP_SPACING_KM = 0.2;
/** Maximum route radius from school in km. */
export const MAX_ROUTE_RADIUS_KM = 5;
/** Default auto-generation radius in km. */
export const DEFAULT_RADIUS_KM = 4.5;

let stopIdCounter = 0;
function nextStopId(): string {
  return `draft-${++stopIdCounter}-${Date.now()}`;
}

export function useRoutePlanner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // --- Mode ---
  const [mode, setMode] = useState<PlannerMode>('list');
  const [mapMode, setMapMode] = useState<MapInteractionMode>('view');

  // --- Selected route (viewing from list) ---
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  // --- Form state ---
  const [formSchoolId, setFormSchoolId] = useState('');
  const [routeName, setRouteName] = useState('');
  const [direction, setDirection] = useState<'AM' | 'PM'>('AM');
  const [startTime, setStartTime] = useState('07:00');
  const [numberOfStops, setNumberOfStops] = useState(5);

  // --- Stops ---
  const [stops, setStops] = useState<PlannerStop[]>([]);

  // --- Editing an existing route ---
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  // --- Optimization ---
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  // --- Map reset key: only changes on selectRoute / startCreate / startEdit ---
  const [mapResetKey, setMapResetKey] = useState(0);

  // --- Search & filter ---
  const [routeSearch, setRouteSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'AM' | 'PM' | ''>('');
  const [schoolFilter, setSchoolFilter] = useState('');

  // --- Snap-to-road debounce ---
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Queries ---
  const { data: allRoutes = [], isLoading: routesLoading } = useQuery({
    queryKey: queryKeys.routes.active(),
    queryFn: () => routesApi.getAllRoutes(),
    refetchInterval: 30_000,
  });

  // Fetch ALL schools (no boardId filter) so the dropdown always has options.
  // In mock mode the real user's boardId won't match mock data, so fetching all is safer.
  const { data: schools = [] } = useQuery({
    queryKey: queryKeys.schools.all,
    queryFn: () => organizationApi.listSchools(),
  });

  // --- Derived: filtered routes ---
  const filteredRoutes = useMemo(() => {
    let result = allRoutes;

    // Apply user-context filter only when NOT in mock mode
    // (mock data IDs don't match real auth IDs).
    if (!useMock) {
      if (user?.schoolId) {
        result = result.filter((r) => r.schoolId === user.schoolId);
      } else if (user?.boardId && schools.length > 0) {
        const boardSchoolIds = new Set(schools.map((s) => s.id));
        result = result.filter((r) => boardSchoolIds.has(r.schoolId));
      }
    }

    // Direction filter
    if (directionFilter) {
      result = result.filter((r) => r.direction === directionFilter);
    }

    // School filter (dropdown)
    if (schoolFilter) {
      result = result.filter((r) => r.schoolId === schoolFilter);
    }

    // Text search
    if (routeSearch) {
      const q = routeSearch.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          (r.schoolName && r.schoolName.toLowerCase().includes(q)) ||
          (r.vehicleId && r.vehicleId.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [allRoutes, user, schools, directionFilter, schoolFilter, routeSearch]);

  // --- Derived: selected school info ---
  const selectedSchool: School | undefined = useMemo(
    () => schools.find((s) => s.id === formSchoolId),
    [schools, formSchoolId],
  );

  const schoolLocation = useMemo(() => {
    if (!selectedSchool?.location) return null;
    return { ...selectedSchool.location, name: selectedSchool.name };
  }, [selectedSchool]);

  // --- Derived: route path from optimization or straight lines ---
  const routePath: [number, number][] = useMemo(() => {
    if (optimizationResult?.polylineGeoJson?.coordinates) {
      return optimizationResult.polylineGeoJson.coordinates.map(([lng, lat]) => [lat, lng]);
    }
    // Straight-line fallback connecting all valid stops
    const validStops = stops.filter((s) => s.lat !== 0 && s.lng !== 0);
    if (validStops.length >= 2) {
      return validStops.map((s) => [s.lat, s.lng] as [number, number]);
    }
    return [];
  }, [optimizationResult, stops]);

  // --- Snap-to-road helper (debounced) ---
  const snapRouteToRoad = useCallback(
    (stopsToSnap: PlannerStop[]) => {
      if (snapTimerRef.current) {
        clearTimeout(snapTimerRef.current);
      }
      snapTimerRef.current = setTimeout(async () => {
        const validStops = stopsToSnap.filter((s) => s.lat !== 0 && s.lng !== 0);
        if (validStops.length < 2) return;

        try {
          setIsSnapping(true);
          const waypoints = validStops.map((s) => ({ lat: s.lat, lng: s.lng }));

          if (schoolLocation) {
            if (direction === 'AM') {
              waypoints.push({ lat: schoolLocation.lat, lng: schoolLocation.lng });
            } else {
              waypoints.unshift({ lat: schoolLocation.lat, lng: schoolLocation.lng });
            }
          }

          const result = await routesApi.snapToRoad(waypoints);
          if (result.polylineGeoJson) {
            setOptimizationResult((prev) => ({
              optimizedStops: prev?.optimizedStops ?? [],
              polyline: result.polyline,
              polylineGeoJson: result.polylineGeoJson,
              totalDistance: result.totalDistance,
              totalDuration: result.totalDuration,
            }));
          }
        } catch {
          // Snap unavailable; keep current state
        } finally {
          setIsSnapping(false);
        }
      }, 300);
    },
    [schoolLocation, direction],
  );

  // --- Actions ---
  const resetForm = useCallback(() => {
    setFormSchoolId('');
    setRouteName('');
    setDirection('AM');
    setStartTime('07:00');
    setNumberOfStops(5);
    setStops([]);
    setOptimizationResult(null);
    setEditingRouteId(null);
    setMapMode('view');
  }, []);

  const selectRoute = useCallback(async (route: Route) => {
    setSelectedRoute(route);
    setMode('list');
    setMapResetKey((k) => k + 1);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRoute(null);
  }, []);

  const startCreate = useCallback(() => {
    resetForm();
    // Auto-select school for SCHOOL_ADMIN users
    if (user?.role === 'SCHOOL_ADMIN' && user.schoolId) {
      setFormSchoolId(user.schoolId);
    }
    setMode('create');
    setSelectedRoute(null);
    setMapResetKey((k) => k + 1);
  }, [resetForm, user]);

  const startEdit = useCallback((route: Route) => {
    setMode('edit');
    setSelectedRoute(null);
    setEditingRouteId(route.id);
    setFormSchoolId(route.schoolId);
    setRouteName(route.name);
    setDirection(route.direction);
    setStartTime(route.startTime.slice(0, 5));
    setNumberOfStops(route.stops.length);

    const plannerStops: PlannerStop[] = route.stops.map((s) => {
      const [lat, lng] = parseWktPoint(s.location);
      return {
        id: s.id || nextStopId(),
        sequence: s.sequence,
        address: s.address,
        lat,
        lng,
      };
    });
    setStops(plannerStops);
    setOptimizationResult(null);
    setMapMode('view');
    setMapResetKey((k) => k + 1);
  }, []);

  const cancelEdit = useCallback(() => {
    resetForm();
    setMode('list');
  }, [resetForm]);

  const addStop = useCallback(
    (lat: number, lng: number, address?: string) => {
      const newStop: PlannerStop = {
        id: nextStopId(),
        sequence: stops.length + 1,
        address: address || `Stop ${stops.length + 1}`,
        lat: Math.round(lat * 100000) / 100000,
        lng: Math.round(lng * 100000) / 100000,
      };
      setStops((prev) => {
        const next = [...prev, newStop];
        snapRouteToRoad(next);
        return next;
      });
      setOptimizationResult(null);
    },
    [stops.length, snapRouteToRoad],
  );

  const addBlankStop = useCallback(() => {
    const newStop: PlannerStop = {
      id: nextStopId(),
      sequence: stops.length + 1,
      address: '',
      lat: 0,
      lng: 0,
    };
    setStops((prev) => [...prev, newStop]);
  }, [stops.length]);

  const removeStop = useCallback(
    (stopId: string) => {
      setStops((prev) => {
        const next = prev.filter((s) => s.id !== stopId).map((s, i) => ({ ...s, sequence: i + 1 }));
        snapRouteToRoad(next);
        return next;
      });
      setOptimizationResult(null);
    },
    [snapRouteToRoad],
  );

  const moveStop = useCallback(
    (stopId: string, lat: number, lng: number) => {
      setStops((prev) => {
        const next = prev.map((s) =>
          s.id === stopId
            ? {
                ...s,
                lat: Math.round(lat * 100000) / 100000,
                lng: Math.round(lng * 100000) / 100000,
              }
            : s,
        );
        snapRouteToRoad(next);
        return next;
      });
      setOptimizationResult(null);
    },
    [snapRouteToRoad],
  );

  const updateStopField = useCallback(
    (stopId: string, field: 'address' | 'lat' | 'lng', value: string) => {
      setStops((prev) => {
        const next = prev.map((s) => {
          if (s.id !== stopId) return s;
          if (field === 'lat' || field === 'lng') {
            const parsed = parseFloat(value);
            return { ...s, [field]: isNaN(parsed) ? 0 : parsed };
          }
          return { ...s, [field]: value };
        });
        if (field === 'lat' || field === 'lng') {
          snapRouteToRoad(next);
        }
        return next;
      });
      setOptimizationResult(null);
    },
    [snapRouteToRoad],
  );

  const reorderStop = useCallback(
    (stopId: string, newIndex: number) => {
      setStops((prev) => {
        const copy = [...prev];
        const oldIndex = copy.findIndex((s) => s.id === stopId);
        if (oldIndex === -1 || newIndex < 0 || newIndex >= copy.length) return prev;
        const [moved] = copy.splice(oldIndex, 1);
        copy.splice(newIndex, 0, moved);
        const next = copy.map((s, i) => ({ ...s, sequence: i + 1 }));
        snapRouteToRoad(next);
        return next;
      });
      setOptimizationResult(null);
    },
    [snapRouteToRoad],
  );

  /** Called when a midpoint handle is dragged — adjusts path, does NOT add a stop. */
  const adjustPath = useCallback(
    async (_segmentIndex: number, lat: number, lng: number) => {
      // Get current valid stops plus the dragged waypoint for re-snapping
      const validStops = stops.filter((s) => s.lat !== 0 && s.lng !== 0);
      if (validStops.length < 2) return;

      // Build waypoint list: include the dragged point between the right pair of stops
      const waypoints: { lat: number; lng: number }[] = [];
      for (let i = 0; i < validStops.length; i++) {
        waypoints.push({ lat: validStops[i].lat, lng: validStops[i].lng });
        if (i === _segmentIndex) {
          waypoints.push({
            lat: Math.round(lat * 100000) / 100000,
            lng: Math.round(lng * 100000) / 100000,
          });
        }
      }

      try {
        setIsSnapping(true);
        const result = await routesApi.snapToRoad(waypoints);
        if (result.polylineGeoJson) {
          setOptimizationResult((prev) => ({
            optimizedStops: prev?.optimizedStops ?? [],
            polyline: result.polyline,
            polylineGeoJson: result.polylineGeoJson,
            totalDistance: result.totalDistance,
            totalDuration: result.totalDuration,
          }));
        }
      } catch {
        // Keep current state
      } finally {
        setIsSnapping(false);
      }
    },
    [stops],
  );

  /** Force snap entire route to road. */
  const snapToRoad = useCallback(async () => {
    const validStops = stops.filter((s) => s.lat !== 0 && s.lng !== 0);
    if (validStops.length < 2) return;

    setIsSnapping(true);
    try {
      const waypoints = validStops.map((s) => ({ lat: s.lat, lng: s.lng }));
      const result = await routesApi.snapToRoad(waypoints);
      if (result.polylineGeoJson) {
        setOptimizationResult((prev) => ({
          optimizedStops: prev?.optimizedStops ?? [],
          polyline: result.polyline,
          polylineGeoJson: result.polylineGeoJson,
          totalDistance: result.totalDistance,
          totalDuration: result.totalDuration,
        }));
      }
    } catch {
      // Keep current state
    } finally {
      setIsSnapping(false);
    }
  }, [stops]);

  const autoGenerate = useCallback(async () => {
    if (!schoolLocation) {
      console.warn('Cannot generate: school has no location');
      return;
    }

    const radiusKm = DEFAULT_RADIUS_KM;
    const generated = distributeStopsOnRadius(
      schoolLocation.lat,
      schoolLocation.lng,
      radiusKm,
      numberOfStops,
    );

    // Sort by distance from school: AM → farthest first, PM → closest first
    generated.sort((a, b) => {
      const distA = haversineDistance(a.lat, a.lng, schoolLocation.lat, schoolLocation.lng);
      const distB = haversineDistance(b.lat, b.lng, schoolLocation.lat, schoolLocation.lng);
      return direction === 'AM' ? distB - distA : distA - distB;
    });

    // Enforce minimum stop spacing (OSTA guideline: ≥200m between consecutive stops)
    const spaced: { lat: number; lng: number }[] = [generated[0]];
    for (let i = 1; i < generated.length; i++) {
      const prev = spaced[spaced.length - 1];
      const dist = haversineDistance(prev.lat, prev.lng, generated[i].lat, generated[i].lng);
      if (dist >= MIN_STOP_SPACING_KM) {
        spaced.push(generated[i]);
      }
    }

    const plannerStops: PlannerStop[] = spaced.map((pt, i) => ({
      id: nextStopId(),
      sequence: i + 1,
      address: `Stop ${i + 1}`,
      lat: Math.round(pt.lat * 100000) / 100000,
      lng: Math.round(pt.lng * 100000) / 100000,
    }));

    setStops(plannerStops);
    setOptimizationResult(null);

    // Auto-optimize after generation (this also road-snaps)
    try {
      setIsOptimizing(true);
      const apiStops = plannerStops.map((s) => ({
        id: s.id.startsWith('draft-') ? undefined : s.id,
        sequence: s.sequence,
        address: s.address,
        location: toWktPoint(s.lat, s.lng),
      }));

      // Inject school
      if (schoolLocation) {
        const schoolStop = {
          id: undefined,
          sequence: direction === 'AM' ? 99999 : 0,
          address: 'School',
          location: toWktPoint(schoolLocation.lat, schoolLocation.lng),
        };
        if (direction === 'AM') {
          apiStops.push(schoolStop);
        } else {
          apiStops.unshift(schoolStop);
        }
      }

      const result = await routesApi.optimizeRoute(apiStops);
      if (result.optimizedStops) {
        result.optimizedStops = result.optimizedStops.filter((s) => s.address !== 'School');
      }
      setOptimizationResult(result);
    } catch {
      // Optimization unavailable; try snap-to-road as fallback
      try {
        const waypoints = plannerStops.map((s) => ({ lat: s.lat, lng: s.lng }));
        if (schoolLocation) {
          if (direction === 'AM') {
            waypoints.push({ lat: schoolLocation.lat, lng: schoolLocation.lng });
          } else {
            waypoints.unshift({ lat: schoolLocation.lat, lng: schoolLocation.lng });
          }
        }
        const snapResult = await routesApi.snapToRoad(waypoints);
        if (snapResult.polylineGeoJson) {
          setOptimizationResult({
            optimizedStops: [],
            polyline: snapResult.polyline,
            polylineGeoJson: snapResult.polylineGeoJson,
            totalDistance: snapResult.totalDistance,
            totalDuration: snapResult.totalDuration,
          });
        }
      } catch {
        // Keep straight-line fallback
      }
    } finally {
      setIsOptimizing(false);
    }
  }, [schoolLocation, numberOfStops, direction]);

  const optimize = useCallback(async () => {
    const validStops = stops.filter((s) => s.lat !== 0 && s.lng !== 0);
    if (validStops.length < 2) return;

    setIsOptimizing(true);
    try {
      const apiStops = validStops.map((s) => ({
        id: s.id.startsWith('draft-') ? undefined : s.id,
        sequence: s.sequence,
        address: s.address,
        location: toWktPoint(s.lat, s.lng),
      }));

      // Inject school for accurate route line to/from school
      if (schoolLocation) {
        const schoolStop = {
          id: undefined,
          sequence: direction === 'AM' ? 99999 : 0,
          address: 'School',
          location: toWktPoint(schoolLocation.lat, schoolLocation.lng),
        };
        if (direction === 'AM') {
          apiStops.push(schoolStop);
        } else {
          apiStops.unshift(schoolStop);
        }
      }

      const result = await routesApi.optimizeRoute(apiStops);

      // Filter out the injected school from the returned stops to prevent it appearing as a student stop
      if (result.optimizedStops) {
        result.optimizedStops = result.optimizedStops.filter((s) => s.address !== 'School');
      }

      setOptimizationResult(result);
    } catch {
      // keep existing state
    } finally {
      setIsOptimizing(false);
    }
  }, [stops, schoolLocation, direction]);

  const saveRoute = useCallback(async () => {
    const validStops = stops.filter((s) => s.lat !== 0 && s.lng !== 0);
    if (!routeName || !formSchoolId || validStops.length === 0) return;

    const stopPayload = validStops.map((s) => ({
      id: s.id.startsWith('draft-') ? undefined : s.id,
      sequence: s.sequence,
      address: s.address,
      location: toWktPoint(s.lat, s.lng),
    }));

    setIsSaving(true);
    try {
      if (editingRouteId) {
        await routesApi.updateRoute(editingRouteId, {
          name: routeName,
          direction,
          startTime,
          estimatedDuration: Math.max(1, Math.round(optimizationResult?.totalDuration || 60)),
          polyline: optimizationResult?.polyline || undefined,
          stops: stopPayload,
        });
      } else {
        await routesApi.createRoute({
          name: routeName,
          direction,
          schoolId: formSchoolId,
          startTime,
          estimatedDuration: Math.max(1, Math.round(optimizationResult?.totalDuration || 60)),
          polyline: optimizationResult?.polyline || undefined,
          stops: stopPayload,
        });
      }
      resetForm();
      setMode('list');
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.all });
    } catch (error) {
      console.error('Failed to save route:', error);
    } finally {
      setIsSaving(false);
    }
  }, [
    stops,
    routeName,
    formSchoolId,
    direction,
    startTime,
    optimizationResult,
    editingRouteId,
    resetForm,
    queryClient,
  ]);

  const deleteRoute = useCallback(
    async (routeId: string) => {
      try {
        await routesApi.deleteRoute(routeId);
        resetForm();
        setMode('list');
        setSelectedRoute(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.routes.all });
      } catch (error) {
        console.error('Failed to delete route:', error);
      }
    },
    [resetForm, queryClient],
  );

  // --- Radius warnings: stop outside 5km from school ---
  const stopWarnings = useMemo(() => {
    if (!schoolLocation) return new Set<string>();
    const warnings = new Set<string>();
    stops.forEach((s) => {
      if (
        s.lat !== 0 &&
        s.lng !== 0 &&
        !isWithinRadius(s.lat, s.lng, schoolLocation.lat, schoolLocation.lng, MAX_ROUTE_RADIUS_KM)
      ) {
        warnings.add(s.id);
      }
    });
    return warnings;
  }, [stops, schoolLocation]);

  // --- Stop spacing warnings: consecutive stops closer than 200m ---
  const spacingWarnings = useMemo(() => {
    const warnings = new Set<string>();
    const validStops = stops.filter((s) => s.lat !== 0 && s.lng !== 0);
    for (let i = 1; i < validStops.length; i++) {
      const dist = haversineDistance(
        validStops[i - 1].lat,
        validStops[i - 1].lng,
        validStops[i].lat,
        validStops[i].lng,
      );
      if (dist < MIN_STOP_SPACING_KM) {
        warnings.add(validStops[i].id);
      }
    }
    return warnings;
  }, [stops]);

  return {
    // State
    mode,
    mapMode,
    selectedRoute,
    stops,
    routePath,
    schoolLocation,
    optimizationResult,
    isOptimizing,
    isSaving,
    isSnapping,
    routesLoading,
    editingRouteId,
    stopWarnings,
    spacingWarnings,
    mapResetKey,

    // Form fields
    formSchoolId,
    routeName,
    direction,
    startTime,
    numberOfStops,
    schools,

    // Lists
    filteredRoutes,

    // Search/filter
    routeSearch,
    directionFilter,
    schoolFilter,
    setRouteSearch,
    setDirectionFilter,
    setSchoolFilter,

    // Form setters
    setFormSchoolId,
    setRouteName,
    setDirection,
    setStartTime,
    setNumberOfStops,
    setMapMode,

    // Actions
    selectRoute,
    clearSelection,
    startCreate,
    startEdit,
    cancelEdit,
    addStop,
    addBlankStop,
    removeStop,
    moveStop,
    updateStopField,
    reorderStop,
    adjustPath,
    snapToRoad,
    autoGenerate,
    optimize,
    saveRoute,
    deleteRoute,
  };
}
