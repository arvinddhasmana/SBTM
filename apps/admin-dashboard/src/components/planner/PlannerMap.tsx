import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Maximize2, Minimize2, MousePointer2 } from 'lucide-react';
import { parseWktPoint } from '../../utils/geo';
import type { PlannerStop, MapInteractionMode } from '../../hooks/useRoutePlanner';
import type { Route } from '../../types';

/** Find the index in `path` whose point is closest to (lat, lng). */
function findClosestPathIndex(path: [number, number][], lat: number, lng: number): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < path.length; i++) {
    const d = (path[i][0] - lat) ** 2 + (path[i][1] - lng) ** 2;
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }
  return minIdx;
}

/** Sample a point at `fraction` (0–1) along the sub-path from startIdx to endIdx. */
function sampleAlongPath(
  path: [number, number][],
  startIdx: number,
  endIdx: number,
  fraction: number,
): [number, number] {
  if (startIdx >= endIdx || path.length === 0) {
    return path[startIdx] || [0, 0];
  }
  let totalDist = 0;
  const cumDists = [0];
  for (let i = startIdx + 1; i <= endIdx; i++) {
    totalDist += Math.sqrt((path[i][0] - path[i - 1][0]) ** 2 + (path[i][1] - path[i - 1][1]) ** 2);
    cumDists.push(totalDist);
  }
  if (totalDist === 0) return path[startIdx];
  const target = fraction * totalDist;
  for (let i = 1; i < cumDists.length; i++) {
    if (cumDists[i] >= target) {
      const segFrac = (target - cumDists[i - 1]) / (cumDists[i] - cumDists[i - 1]);
      const a = path[startIdx + i - 1];
      const b = path[startIdx + i];
      return [a[0] + (b[0] - a[0]) * segFrac, a[1] + (b[1] - a[1]) * segFrac];
    }
  }
  return path[endIdx];
}

interface PlannerMapProps {
  stops: PlannerStop[];
  direction: 'AM' | 'PM';
  schoolLocation: { lat: number; lng: number; name: string } | null;
  routePath: [number, number][];
  selectedRoute: Route | null;
  mapMode: MapInteractionMode;
  isEditing: boolean;
  mapResetKey: number;
  onStopAdded: (lat: number, lng: number) => void;
  onStopMoved: (stopId: string, lat: number, lng: number) => void;
  onPathAdjusted: (segmentIndex: number, lat: number, lng: number) => void;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [45.392, -75.713];
const DEFAULT_ZOOM = 12;

function createStopIcon(sequence: number, direction: 'AM' | 'PM'): L.DivIcon {
  const color = direction === 'AM' ? '#3b82f6' : '#f59e0b';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;
      background:${color};
      border:2px solid #fff;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 15px ${color}44, 0 2px 8px rgba(0,0,0,0.4);
      position:relative;
      cursor:grab;
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
      <div style="
        position:absolute; bottom:-4px; right:-4px;
        width:16px;height:16px; background:#fff; border:2px solid ${color};
        border-radius:50%; display:flex; align-items:center; justify-content:center;
        font-size:8px; font-weight:900; color:${color};
        box-shadow:0 2px 4px rgba(0,0,0,0.2);
      ">${sequence}</div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createReadOnlyStopIcon(sequence: number, direction: 'AM' | 'PM'): L.DivIcon {
  const color = direction === 'AM' ? '#3b82f6' : '#f59e0b';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;
      background:${color};
      border:2px solid #fff;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 15px ${color}44, 0 2px 8px rgba(0,0,0,0.4);
      position:relative;
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
      <div style="
        position:absolute; bottom:-4px; right:-4px;
        width:16px;height:16px; background:#fff; border:2px solid ${color};
        border-radius:50%; display:flex; align-items:center; justify-content:center;
        font-size:8px; font-weight:900; color:${color};
        box-shadow:0 2px 4px rgba(0,0,0,0.2);
      ">${sequence}</div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const SCHOOL_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;
    background:#8b5cf6;
    border:3px solid #fff;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 20px rgba(139,92,246,0.4), 0 4px 12px rgba(0,0,0,0.4);
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const MIDPOINT_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:14px;height:14px;
    background:rgba(255,255,255,0.5);
    border:2px solid rgba(255,255,255,0.8);
    border-radius:50%;
    cursor:grab;
    box-shadow:0 1px 4px rgba(0,0,0,0.3);
    transition: background 0.2s;
  " onmouseenter="this.style.background='rgba(59,130,246,0.7)'" onmouseleave="this.style.background='rgba(255,255,255,0.5)'"
  ></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const PlannerMap: React.FC<PlannerMapProps> = ({
  stops,
  direction,
  schoolLocation,
  routePath,
  selectedRoute,
  mapMode,
  isEditing,
  mapResetKey,
  onStopAdded,
  onStopMoved,
  onPathAdjusted,
  className = '',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const stopMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const schoolMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const midpointMarkersRef = useRef<L.Marker[]>([]);
  const readOnlyMarkersRef = useRef<L.Marker[]>([]);
  const readOnlyPolylineRef = useRef<L.Polyline | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track callbacks in refs to avoid re-registering click handler
  const onStopAddedRef = useRef(onStopAdded);
  onStopAddedRef.current = onStopAdded;
  const mapModeRef = useRef(mapMode);
  mapModeRef.current = mapMode;
  const isEditingRef = useRef(isEditing);
  isEditingRef.current = isEditing;

  // --- Initialize map ---
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current, {
      zoomControl: true,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapInstanceRef.current);

    // Click handler for adding stops
    mapInstanceRef.current.on('click', (e: L.LeafletMouseEvent) => {
      if (mapModeRef.current === 'add-stop' && isEditingRef.current) {
        onStopAddedRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        stopMarkersRef.current.forEach((m) => m.remove());
        stopMarkersRef.current.clear();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // --- ResizeObserver ---
  useEffect(() => {
    if (!mapRef.current) return;

    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    observer.observe(mapRef.current);

    // Periodic check for late layout shifts
    const interval = setInterval(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 1000);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
    }
  }, [isFullscreen]);

  // --- Cursor for add-stop mode ---
  // Leaflet controls .leaflet-container cursor directly, so we must use
  // inline style on the actual Leaflet container element.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const container = map.getContainer();
    if (mapMode === 'add-stop' && isEditing) {
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = '';
    }
  }, [mapMode, isEditing]);

  // --- Clear all map layers helper ---
  const clearAllLayers = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current.clear();

    readOnlyMarkersRef.current.forEach((m) => m.remove());
    readOnlyMarkersRef.current = [];

    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (readOnlyPolylineRef.current) {
      readOnlyPolylineRef.current.remove();
      readOnlyPolylineRef.current = null;
    }

    midpointMarkersRef.current.forEach((m) => m.remove());
    midpointMarkersRef.current = [];

    if (schoolMarkerRef.current) {
      schoolMarkerRef.current.remove();
      schoolMarkerRef.current = null;
    }
  };

  // --- Render selected route (read-only view) ---
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Always clear read-only layers first
    readOnlyMarkersRef.current.forEach((m) => m.remove());
    readOnlyMarkersRef.current = [];
    if (readOnlyPolylineRef.current) {
      readOnlyPolylineRef.current.remove();
      readOnlyPolylineRef.current = null;
    }

    if (!selectedRoute || isEditing) return;

    // Clear editing layers when viewing a selected route
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current.clear();
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
    midpointMarkersRef.current.forEach((m) => m.remove());
    midpointMarkersRef.current = [];
    if (schoolMarkerRef.current) {
      schoolMarkerRef.current.remove();
      schoolMarkerRef.current = null;
    }

    const pathData = selectedRoute.path;
    if (pathData && pathData.length > 0) {
      const color = selectedRoute.direction === 'AM' ? '#3b82f6' : '#f59e0b';
      readOnlyPolylineRef.current = L.polyline(pathData, {
        color,
        weight: 6,
        opacity: 0.8,
        lineJoin: 'round',
      }).addTo(map);
    }

    if (selectedRoute.stops) {
      selectedRoute.stops.forEach((stop, idx) => {
        let pos: [number, number] = [0, 0];
        if (stop.location) {
          pos = parseWktPoint(stop.location);
        }
        if (pos[0] === 0 && pos[1] === 0) return;

        const seq = stop.sequence ?? idx + 1;
        const marker = L.marker(pos, {
          icon: createReadOnlyStopIcon(seq, selectedRoute.direction),
          zIndexOffset: 500,
        }).addTo(map);

        marker.bindPopup(`
          <div style="min-width:140px;font-family:sans-serif;">
            <strong style="color:#1e293b;display:block;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px;">
              Stop ${seq}: ${stop.address}
            </strong>
            <div style="font-size:11px;display:flex;flex-direction:column;gap:2px;">
              <span style="color:#64748b">Route: <span style="color:#1e293b;font-weight:600">${selectedRoute.name}</span></span>
              <span style="color:#64748b">Direction: <span style="color:#1e293b;font-weight:600">${selectedRoute.direction}</span></span>
            </div>
          </div>
        `);

        readOnlyMarkersRef.current.push(marker);
      });
    }

    // School marker for selected route
    if (selectedRoute.schoolLat && selectedRoute.schoolLng) {
      const schoolMarker = L.marker([selectedRoute.schoolLat, selectedRoute.schoolLng], {
        icon: SCHOOL_ICON,
        zIndexOffset: 600,
      }).addTo(map);
      schoolMarker.bindPopup(`
        <div style="min-width:120px;font-family:sans-serif;">
          <strong style="color:#8b5cf6;display:block;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px;">
            ${selectedRoute.schoolName || 'School'}
          </strong>
          <div style="font-size:11px;color:#64748b;">School Location</div>
        </div>
      `);
      schoolMarker.bindTooltip(selectedRoute.schoolName || 'School', {
        direction: 'top',
        offset: [0, -18],
      });
      readOnlyMarkersRef.current.push(schoolMarker);
    }

    // Fit bounds
    const bounds = L.latLngBounds([]);
    let hasBounds = false;
    pathData?.forEach((p) => {
      bounds.extend(p);
      hasBounds = true;
    });
    selectedRoute.stops?.forEach((s) => {
      if (s.location) {
        const pos = parseWktPoint(s.location);
        if (pos[0] !== 0 || pos[1] !== 0) {
          bounds.extend(pos);
          hasBounds = true;
        }
      }
    });
    if (selectedRoute.schoolLat && selectedRoute.schoolLng) {
      bounds.extend([selectedRoute.schoolLat, selectedRoute.schoolLng]);
      hasBounds = true;
    }
    if (hasBounds) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [selectedRoute, isEditing]);

  // --- Render editing/creating stops, polyline, school marker ---
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || (!isEditing && !selectedRoute)) {
      // If nothing to show, clear editing layers
      if (map && !isEditing && !selectedRoute) {
        stopMarkersRef.current.forEach((m) => m.remove());
        stopMarkersRef.current.clear();
        if (routePolylineRef.current) {
          routePolylineRef.current.remove();
          routePolylineRef.current = null;
        }
        midpointMarkersRef.current.forEach((m) => m.remove());
        midpointMarkersRef.current = [];
        if (schoolMarkerRef.current) {
          schoolMarkerRef.current.remove();
          schoolMarkerRef.current = null;
        }
      }
      return;
    }

    if (!isEditing) return; // Read-only view handled by the other effect

    // Clear old editing layers
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current.clear();
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
    midpointMarkersRef.current.forEach((m) => m.remove());
    midpointMarkersRef.current = [];
    if (schoolMarkerRef.current) {
      schoolMarkerRef.current.remove();
      schoolMarkerRef.current = null;
    }
    // Also clear read-only layers
    readOnlyMarkersRef.current.forEach((m) => m.remove());
    readOnlyMarkersRef.current = [];
    if (readOnlyPolylineRef.current) {
      readOnlyPolylineRef.current.remove();
      readOnlyPolylineRef.current = null;
    }

    const validStops = stops.filter((s) => s.lat !== 0 && s.lng !== 0);

    // School marker
    if (schoolLocation) {
      schoolMarkerRef.current = L.marker([schoolLocation.lat, schoolLocation.lng], {
        icon: SCHOOL_ICON,
        zIndexOffset: 600,
      }).addTo(map);

      schoolMarkerRef.current.bindPopup(`
        <div style="min-width:120px;font-family:sans-serif;">
          <strong style="color:#8b5cf6;display:block;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px;">
            ${schoolLocation.name}
          </strong>
          <div style="font-size:11px;color:#64748b;">School Location</div>
        </div>
      `);

      schoolMarkerRef.current.bindTooltip(schoolLocation.name, {
        direction: 'top',
        offset: [0, -18],
      });
    }

    // Route polyline
    if (routePath.length >= 2) {
      const color = direction === 'AM' ? '#3b82f6' : '#f59e0b';
      const isOptimized = routePath.length > validStops.length + 2;
      routePolylineRef.current = L.polyline(routePath, {
        color,
        weight: 5,
        opacity: 0.8,
        lineJoin: 'round',
        dashArray: isOptimized ? undefined : '8 6',
      }).addTo(map);
    }

    // Draggable stop markers
    validStops.forEach((stop) => {
      const marker = L.marker([stop.lat, stop.lng], {
        icon: createStopIcon(stop.sequence, direction),
        draggable: true,
        zIndexOffset: 500,
      }).addTo(map);

      marker.bindTooltip(`Stop ${stop.sequence}: ${stop.address || 'New Stop'}`, {
        direction: 'top',
        offset: [0, -14],
      });

      marker.bindPopup(`
        <div style="min-width:140px;font-family:sans-serif;">
          <strong style="color:#1e293b;display:block;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px;">
            Stop ${stop.sequence}: ${stop.address || 'New Stop'}
          </strong>
          <div style="font-size:11px;display:flex;flex-direction:column;gap:2px;">
            <span style="color:#64748b">Lat: <span style="color:#1e293b;font-weight:600">${stop.lat.toFixed(5)}</span></span>
            <span style="color:#64748b">Lng: <span style="color:#1e293b;font-weight:600">${stop.lng.toFixed(5)}</span></span>
          </div>
        </div>
      `);

      const stopId = stop.id;
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onStopMoved(stopId, pos.lat, pos.lng);
      });

      stopMarkersRef.current.set(stop.id, marker);
    });

    // Midpoint drag handles for polyline path adjustment (4 per segment)
    if (validStops.length >= 2) {
      // When a routePath is available, sample midpoints along the actual polyline
      const usePolyline = routePath.length >= 2;
      const stopPathIndices = usePolyline
        ? validStops.map((s) => findClosestPathIndex(routePath, s.lat, s.lng))
        : [];

      for (let i = 0; i < validStops.length - 1; i++) {
        const fractions = [0.2, 0.4, 0.6, 0.8];
        for (const frac of fractions) {
          let handleLat: number;
          let handleLng: number;

          if (usePolyline) {
            let sIdx = stopPathIndices[i];
            let eIdx = stopPathIndices[i + 1];
            if (sIdx > eIdx) [sIdx, eIdx] = [eIdx, sIdx];
            const pt = sampleAlongPath(routePath, sIdx, eIdx, frac);
            handleLat = pt[0];
            handleLng = pt[1];
          } else {
            handleLat = validStops[i].lat + (validStops[i + 1].lat - validStops[i].lat) * frac;
            handleLng = validStops[i].lng + (validStops[i + 1].lng - validStops[i].lng) * frac;
          }

          const midMarker = L.marker([handleLat, handleLng], {
            icon: MIDPOINT_ICON,
            draggable: true,
            zIndexOffset: 300,
          }).addTo(map);

          midMarker.bindTooltip('Drag to change path', {
            direction: 'top',
            offset: [0, -8],
          });

          const segmentIdx = i;
          midMarker.on('dragend', () => {
            const pos = midMarker.getLatLng();
            onPathAdjusted(segmentIdx, pos.lat, pos.lng);
          });

          midpointMarkersRef.current.push(midMarker);
        }
      }
    }
  }, [
    stops,
    direction,
    schoolLocation,
    routePath,
    isEditing,
    selectedRoute,
    onStopMoved,
    onPathAdjusted,
  ]);

  // --- Fit viewport only when mapResetKey changes (route select, new create, start edit) ---
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = L.latLngBounds([]);
    let hasBounds = false;

    if (selectedRoute && !isEditing) {
      // Selected route in read-only view
      selectedRoute.path?.forEach((p) => {
        bounds.extend(p);
        hasBounds = true;
      });
      selectedRoute.stops?.forEach((s) => {
        if (s.location) {
          const pos = parseWktPoint(s.location);
          if (pos[0] !== 0 || pos[1] !== 0) {
            bounds.extend(pos);
            hasBounds = true;
          }
        }
      });
      if (selectedRoute.schoolLat && selectedRoute.schoolLng) {
        bounds.extend([selectedRoute.schoolLat, selectedRoute.schoolLng]);
        hasBounds = true;
      }
    } else if (isEditing) {
      // Editing/creating – fit to stops + school
      const validStops = stops.filter((s) => s.lat !== 0 && s.lng !== 0);
      validStops.forEach((s) => {
        bounds.extend([s.lat, s.lng]);
        hasBounds = true;
      });
      if (schoolLocation) {
        bounds.extend([schoolLocation.lat, schoolLocation.lng]);
        hasBounds = true;
      }
    }

    if (hasBounds) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapResetKey]);

  return (
    <div
      className={`w-full h-full transition-all duration-300 ease-in-out ${
        isFullscreen ? 'fixed inset-0 z-[9999]' : 'relative'
      }`}
    >
      <div
        ref={mapRef}
        data-testid="planner-map"
        className={`w-full h-full bg-slate-900 overflow-hidden ${
          isFullscreen ? 'rounded-none' : ''
        } ${className}`}
        style={{
          minHeight: isFullscreen ? '100vh' : '100%',
          height: isFullscreen ? '100vh' : '100%',
        }}
      />

      {/* Fullscreen toggle */}
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="absolute top-4 right-4 z-[1000] p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-lg text-white shadow-lg transition-all"
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        data-testid="fullscreen-toggle"
      >
        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>

      {/* Add-stop mode indicator */}
      {mapMode === 'add-stop' && isEditing && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-md border border-blue-500/30 rounded-lg text-blue-400 shadow-lg"
          data-testid="add-stop-indicator"
        >
          <MousePointer2 size={16} />
          <span className="text-xs font-black uppercase tracking-widest">
            Click map to place stop
          </span>
        </div>
      )}
    </div>
  );
};

export default PlannerMap;
