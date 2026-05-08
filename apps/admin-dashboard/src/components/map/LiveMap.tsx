import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Maximize2, Minimize2, RotateCcw, Users } from 'lucide-react';
import type { LiveLocation, Route } from '../../types';
import { getStatusColorClass } from '../../utils/formatters';
import { parseWktPoint } from '../../utils/geo';
import { getTileLayerConfig } from '../../lib/mapTiles';

interface LiveMapProps {
  locations: LiveLocation[];
  selectedRoute?: Route | null;
  plannedRoute?: [number, number][]; // Array of [lat, lng]
  onMarkerClick?: (location: LiveLocation) => void;
  onReset?: () => void;
  className?: string;
  routeNames?: Record<string, string>;
}

const LiveMap: React.FC<LiveMapProps> = ({
  locations,
  selectedRoute,
  plannedRoute,
  onMarkerClick,
  onReset,
  className = '',
  routeNames = {},
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const lastSelectedRouteIdRef = useRef<string | undefined>(selectedRoute?.id);
  const initialFitDoneRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Escape Key Listener
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onReset) {
        onReset();
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([45.392, -75.713], 12);
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onReset]);

  useEffect(() => {
    if (!mapRef.current) return;

    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    observer.observe(mapRef.current);

    // Periodically check for the first 5 seconds to handle any late layout shifts
    const interval = setInterval(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
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
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 300);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    mapInstanceRef.current = L.map(mapRef.current).setView([45.392, -75.713], 12);

    // Add tile layer (provider configured in src/lib/mapTiles.ts)
    const tile = getTileLayerConfig();
    L.tileLayer(tile.url, {
      attribution: tile.attribution,
      subdomains: tile.subdomains,
      maxZoom: tile.maxZoom,
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current.clear();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // 1. Clear existing stop markers and route data
    stopMarkersRef.current.forEach((marker) => marker.remove());
    stopMarkersRef.current = [];

    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    // 2. Render Planned/Selected Route Path
    const pathData = selectedRoute?.path || plannedRoute;
    if (pathData && pathData.length > 0) {
      const color = selectedRoute?.direction === 'AM' ? '#3b82f6' : '#f59e0b';
      routePolylineRef.current = L.polyline(pathData as L.LatLngExpression[], {
        color: color,
        weight: 6,
        opacity: 0.8,
        lineJoin: 'round',
      }).addTo(mapInstanceRef.current);
    }

    // 2b. Render Stops for Selected Route
    if (selectedRoute?.stops) {
      selectedRoute.stops.forEach((stop, idx) => {
        let pos: [number, number] = [0, 0];

        if (stop.location) {
          pos = parseWktPoint(stop.location);
        } else if ((stop as any).lat !== undefined && (stop as any).lng !== undefined) {
          pos = [Number((stop as any).lat), Number((stop as any).lng)];
        }

        if (pos[0] === 0 && pos[1] === 0) return;

        const seq = stop.sequence ?? idx + 1;
        const color = selectedRoute?.direction === 'AM' ? '#3b82f6' : '#f59e0b';
        const stopIcon = L.divIcon({
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
                        <!-- Children Stop Icon (Marked with more detail) -->
                        <div style="display:flex; flex-direction:column; align-items:center; transform:translateY(-1px);">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                        <div style="
                            position:absolute; bottom:-4px; right:-4px;
                            width:16px;height:16px; background:#fff; border:2px solid ${color};
                            border-radius:50%; display:flex; align-items:center; justify-content:center;
                            font-size:8px; font-weight:900; color:${color};
                            box-shadow:0 2px 4px rgba(0,0,0,0.2);
                        ">${seq}</div>
                    </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const stopMarker = L.marker(pos, { icon: stopIcon, zIndexOffset: 500 }).addTo(
          mapInstanceRef.current!,
        ).bindPopup(`
            <div style="min-width: 140px; font-family: sans-serif;">
              <strong style="color:#1e293b; display:block; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:4px;">Stop ${seq}: ${stop.address}</strong>
              <div style="font-size:11px; display:flex; flex-direction:column; gap:2px;">
                <span style="color:#64748b">Route ID: <span style="color:#1e293b; font-weight:600">${selectedRoute.id}</span></span>
                <span style="color:#64748b">Vehicle ID: <span style="color:#1e293b; font-weight:600">${selectedRoute.vehicleId || 'N/A'}</span></span>
              </div>
            </div>
          `);

        stopMarkersRef.current.push(stopMarker);
      });
    }

    // 2c. Render School Marker for Selected Route
    if (selectedRoute?.schoolLat && selectedRoute?.schoolLng) {
      const schoolIcon = L.divIcon({
        className: '',
        html: `<div style="
                    width:32px;height:32px;
                    background:#8b5cf6;
                    border:3px solid #fff;
                    border-radius:6px;
                    display:flex;align-items:center;justify-content:center;
                    box-shadow:0 0 15px #8b5cf644, 0 2px 8px rgba(0,0,0,0.4);
                ">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
                    </svg>
                </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const schoolMarker = L.marker([selectedRoute.schoolLat, selectedRoute.schoolLng], {
        icon: schoolIcon,
        zIndexOffset: 600,
      }).addTo(mapInstanceRef.current!).bindPopup(`
          <div style="min-width: 140px; font-family: sans-serif;">
            <strong style="color:#1e293b;">${selectedRoute.schoolName || 'School'}</strong>
          </div>
        `);

      stopMarkersRef.current.push(schoolMarker);
    }

    // 3. Render Vehicle Markers (with synchronization to prevent "jumping")
    const deduplicatedLocations = new Map<string, LiveLocation>();
    locations.forEach((l) => {
      const existing = deduplicatedLocations.get(l.vehicleId);
      if (!existing || selectedRoute?.id === l.routeId) {
        deduplicatedLocations.set(l.vehicleId, l);
      }
    });

    const activeVehicleIds = new Set(deduplicatedLocations.keys());

    // Remove markers for vehicles no longer present
    const markersMap = markersRef.current;

    markersMap.forEach((marker: L.Marker, vId: string) => {
      if (!activeVehicleIds.has(vId)) {
        marker.remove();
        markersMap.delete(vId);
      }
    });

    // Add or Update markers (skip locations without position data)
    [...deduplicatedLocations.values()]
      .filter((l) => l.position?.lat != null)
      .forEach((location) => {
        const statusClass = getStatusColorClass(location.status);
        const colorMap: Record<string, string> = {
          'bg-green-500': '#22c55e',
          'bg-yellow-500': '#eab308',
          'bg-red-500': '#ef4444',
          'bg-gray-500': '#6b7280',
        };
        const color = colorMap[statusClass] || '#6b7280';
        const isSelected = selectedRoute?.id === location.routeId;
        const borderColor = isSelected ? '#3b82f6' : 'white';
        const borderWidth = isSelected ? '4px' : '2px';
        const scale = isSelected ? 1.2 : 1.0;

        const iconHtml = `
        <div style="
          width: ${32 * scale}px;
          height: ${32 * scale}px;
          background: ${color};
          border-radius: 50%;
          border: ${borderWidth} solid ${borderColor};
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          ${isSelected ? 'transform: scale(1.1);' : ''}
        ">
          <svg width="${16 * scale}" height="${16 * scale}" viewBox="0 0 24 24" fill="white">
            <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
          </svg>
        </div>
      `;

        const icon = L.divIcon({
          className: 'custom-bus-marker',
          html: iconHtml,
          iconSize: [32 * scale, 32 * scale],
          iconAnchor: [16 * scale, 16 * scale],
        });

        let marker = markersMap.get(location.vehicleId);
        const pos: [number, number] = [location.position.lat, location.position.lng];

        if (marker) {
          marker.setLatLng(pos);
          marker.setIcon(icon);
          marker.setZIndexOffset(isSelected ? 1000 : 0);
        } else {
          marker = L.marker(pos, {
            icon,
            zIndexOffset: isSelected ? 1000 : 0,
          }).addTo(mapInstanceRef.current!);

          if (onMarkerClick) {
            marker.on('click', () => onMarkerClick(location));
          }
          markersMap.set(location.vehicleId, marker);
        }

        marker.bindPopup(`
        <div style="min-width: 150px;">
          <strong>Vehicle: ${location.vehicleId}</strong><br/>
          <span>Route: ${routeNames[location.routeId] || location.routeId}</span><br/>
          <span>ETA: ${location.etaToNextStopMinutes} min</span>
        </div>
      `);
      });

    // Calculate bounds for potential fitting
    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    const allPoints = selectedRoute?.path || plannedRoute || [];
    allPoints.forEach((p) => {
      bounds.extend(p as L.LatLngExpression);
      hasPoints = true;
    });

    locations
      .filter((l) => l.position?.lat != null)
      .forEach((l) => {
        bounds.extend([l.position.lat, l.position.lng] as L.LatLngExpression);
        hasPoints = true;
      });

    // Fit bounds only on initial load or when the selected route changes
    const routeChanged = lastSelectedRouteIdRef.current !== selectedRoute?.id;
    const initialDataLoaded = !initialFitDoneRef.current && locations.length > 0;

    if (hasPoints && mapInstanceRef.current && (routeChanged || initialDataLoaded)) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 });
      initialFitDoneRef.current = true;
    }

    lastSelectedRouteIdRef.current = selectedRoute?.id;
  }, [locations, selectedRoute, plannedRoute, onMarkerClick, routeNames]);

  return (
    <div
      className={`w-full h-full transition-all duration-300 ease-in-out ${
        isFullscreen ? 'fixed inset-0 z-[9999] p-0 rounded-none' : 'relative'
      }`}
    >
      <div
        ref={mapRef}
        data-testid="live-map"
        className={`w-full h-full bg-slate-900 overflow-hidden ${
          isFullscreen ? 'rounded-none' : 'rounded-xl'
        } ${className}`}
        style={{
          minHeight: isFullscreen ? '100vh' : '100%',
          height: isFullscreen ? '100vh' : '100%',
        }}
      />

      {/* Map Reset Button - Aligned with Tactical Alert Y-Axis (80px) */}
      {onReset && (
        <button
          onClick={() => {
            onReset();
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([45.392, -75.713], 12);
            }
          }}
          className="absolute top-[80px] left-1/2 -translate-x-1/2 z-[5000] px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-lg text-white shadow-lg transition-all flex items-center gap-2 group pointer-events-auto"
          title="Reset Map (Esc)"
        >
          <RotateCcw size={16} className="group-hover:rotate-[-45deg] transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest pt-0.5">Map Reset</span>
        </button>
      )}

      {/* Fullscreen Toggle */}
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="absolute top-4 right-4 z-[1000] p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-lg text-white shadow-lg transition-all"
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>

      {/* Legend is now managed by the Dashboard layout for better alignment */}
    </div>
  );
};

export default LiveMap;
