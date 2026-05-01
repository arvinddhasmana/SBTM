import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { parentApi } from '../services/api';
import { queryKeys } from '../services/query-keys';
import { useAlerts } from '../hooks/useAlerts';
import { useGpsLocation } from '../hooks/useGpsLocation';
import { decodePolyline } from '../utils/polyline';
import { getTileLayerConfig } from '../lib/mapTiles';
import type { BusLocationUpdate, Child } from '../types';
import { ArrowLeft, Navigation, RotateCcw } from 'lucide-react';

// Fix for default Leaflet marker icons not showing in React
import iconImg from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: iconImg,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

/**
 * Bus status colors matching admin dashboard legend:
 *   Normal    → #22c55e (green)
 *   Delayed   → #eab308 (yellow)
 *   Emergency → #ef4444 (red)
 */
type BusStatus = 'normal' | 'delay' | 'emergency';

const BUS_STATUS_COLORS: Record<BusStatus, string> = {
  normal: '#22c55e',
  delay: '#eab308',
  emergency: '#ef4444',
};

const EMERGENCY_EVENT_TYPES = new Set(['PANIC_BUTTON', 'PANIC_ALERT', 'INCIDENT']);
const DELAY_EVENT_TYPES = new Set(['LATE_ARRIVAL', 'ROUTE_DEVIATION', 'ROUTE_DIVERSION']);

/** Stale threshold: if last GPS update is older than 120 seconds, bus signal is lost.
 *  Real devices may experience brief network gaps, app switching, or signal loss —
 *  120 s tolerates real-world jitter while still hiding truly inactive buses. */
const STALE_THRESHOLD_MS = 120 * 1000;

function createBusIcon(status: BusStatus) {
  const bgColor = BUS_STATUS_COLORS[status];
  const borderColor =
    status === 'normal' ? '#f59e0b' : status === 'emergency' ? '#b91c1c' : '#a16207';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;
      background:${bgColor};
      border-radius:50%;
      border:3px solid ${borderColor};
      box-shadow:0 4px 12px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
      </svg>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

/**
 * Admin-style stop marker icon — matching LiveMap.tsx from admin dashboard.
 * Child's stop: blue (#3b82f6) with white border, larger.
 * Other stops: transparent gray with subtle border.
 */
function createStopIcon(sequence: number, isChildStop: boolean) {
  const bg = isChildStop ? '#3b82f6' : 'rgba(156,163,175,0.35)';
  const border = isChildStop ? '2px solid #fff' : '2px solid rgba(156,163,175,0.5)';
  const size = isChildStop ? 28 : 22;
  const shadow = isChildStop
    ? 'box-shadow:0 0 15px #3b82f644, 0 2px 8px rgba(0,0,0,0.4);'
    : 'box-shadow:0 2px 4px rgba(0,0,0,0.15);';
  const badgeBorder = isChildStop ? '#3b82f6' : '#9ca3af';
  const badgeColor = isChildStop ? '#3b82f6' : '#6b7280';
  const svgFill = isChildStop ? 'white' : 'rgba(75,85,99,0.7)';

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${bg};
      border:${border};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      ${shadow}
      position:relative;
    ">
      <div style="display:flex; flex-direction:column; align-items:center; transform:translateY(-1px);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="${svgFill}">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
      <div style="
        position:absolute; bottom:-3px; right:-3px;
        width:14px;height:14px; background:#fff; border:2px solid ${badgeBorder};
        border-radius:50%; display:flex; align-items:center; justify-content:center;
        font-size:8px; font-weight:900; color:${badgeColor};
        box-shadow:0 2px 4px rgba(0,0,0,0.2);
      ">${sequence}</div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
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
  popupAnchor: [0, -18],
});

/** Parse WKT POINT(lng lat) to [lat, lng] */
function parseWktPoint(wkt: string): [number, number] | null {
  const m = wkt.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
  if (m) return [parseFloat(m[2]), parseFloat(m[1])];
  return null;
}

// Writes the Leaflet map instance into a ref — mirrors Admin Dashboard mapInstanceRef pattern.
// Using a ref (not state) avoids triggering re-renders on map interaction.
function MapInstanceCapture({
  mapInstanceRef,
  onReady,
}: {
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  onReady: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    mapInstanceRef.current = map;
    onReady();
  }, [map, mapInstanceRef, onReady]);
  return null;
}

const MapPage: React.FC = () => {
  const { t } = useTranslation('common');
  const location = useLocation();
  const childId = (location.state as { childId?: string } | null)?.childId;
  const { user } = useAuth();
  const navigate = useNavigate();
  // --- Admin Dashboard pattern: refs for map instance and bound-fitting guard ---
  const mapInstanceRef = useRef<L.Map | null>(null);
  const lastActiveRouteIdRef = useRef<string>('');
  const initialFitDoneRef = useRef(false);

  // Ottawa coords center
  const defaultCenter: [number, number] = [45.4215, -75.6972];

  // Fresh fetch for children to bypass stale context (Issue 2).
  // On 403 the session is mismatched (e.g. admin cookie in the browser) — redirect
  // to login so the parent can re-authenticate with correct credentials.
  const { data: freshChildren } = useQuery({
    queryKey: queryKeys.children?.all || ['children'],
    queryFn: async () => {
      try {
        return await parentApi.getChildren();
      } catch (e: unknown) {
        const err = e as { response?: { status?: number } };
        if (err?.response?.status === 403 || err?.response?.status === 401) {
          navigate('/login', { replace: true });
          return [];
        }
        throw e;
      }
    },
    enabled: !!user,
    staleTime: 15 * 1000,
  });

  // Derive child reactively — avoids setState-in-effect cascade
  const child = useMemo<Child | null>(() => {
    const childrenList = freshChildren ?? user?.children ?? [];
    if (!childrenList.length) return null;
    const foundChild = childId ? childrenList.find((c) => c.id === childId) : undefined;
    return foundChild ?? childrenList[0] ?? null;
  }, [freshChildren, user, childId]);

  // --- Admin Dashboard pattern: poll BOTH AM and PM live-location endpoints
  //     in parallel (every 5 s). Reactively pick whichever has fresh GPS data. ---
  const amRouteId = child?.amRouteId ?? '';
  const pmRouteId = child?.pmRouteId ?? '';

  // SSE push (with polling fallback) via useGpsLocation.
  // Inactive routes return null silently — no console errors.
  const { location: amLocation } = useGpsLocation(child && amRouteId ? amRouteId : undefined);
  const { location: pmLocation } = useGpsLocation(child && pmRouteId ? pmRouteId : undefined);

  // Mirrors Admin Dashboard: pick the route that is currently live (freshest GPS).
  // If both are stale/absent fall back to the most recently updated one.
  // Date.now() is intentionally moved into a callback-safe context via a state tick.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);

  const { activeRouteId, locationData } = useMemo<{
    activeRouteId: string;
    locationData: BusLocationUpdate | null;
  }>(() => {
    const now = nowMs;
    const amFresh =
      amLocation && now - new Date(amLocation.timestamp).getTime() < STALE_THRESHOLD_MS;
    const pmFresh =
      pmLocation && now - new Date(pmLocation.timestamp).getTime() < STALE_THRESHOLD_MS;

    if (amFresh && pmFresh) {
      // Both live — pick the most recently updated
      const amAge = now - new Date(amLocation!.timestamp).getTime();
      const pmAge = now - new Date(pmLocation!.timestamp).getTime();
      return pmAge <= amAge
        ? { activeRouteId: pmRouteId, locationData: pmLocation! }
        : { activeRouteId: amRouteId, locationData: amLocation! };
    }
    if (pmFresh) return { activeRouteId: pmRouteId, locationData: pmLocation! };
    if (amFresh) return { activeRouteId: amRouteId, locationData: amLocation! };

    // Neither live — show whichever was most recently updated (or fall back to AM)
    if (amLocation && pmLocation) {
      const amAge = now - new Date(amLocation.timestamp).getTime();
      const pmAge = now - new Date(pmLocation.timestamp).getTime();
      return pmAge <= amAge
        ? { activeRouteId: pmRouteId, locationData: pmLocation }
        : { activeRouteId: amRouteId, locationData: amLocation };
    }
    if (pmLocation) return { activeRouteId: pmRouteId, locationData: pmLocation };
    if (amLocation) return { activeRouteId: amRouteId, locationData: amLocation };
    return { activeRouteId: amRouteId || pmRouteId, locationData: null };
  }, [amLocation, pmLocation, amRouteId, pmRouteId, nowMs]);

  // Fetch route details (polyline + stops) for the active route
  const { data: routeDetails } = useQuery({
    queryKey: queryKeys.route.details(activeRouteId),
    queryFn: () => parentApi.getRouteDetails(activeRouteId),
    enabled: !!activeRouteId,
    staleTime: 5 * 60_000,
  });

  // Decode polyline to coordinates
  const routePath = useMemo(() => {
    if (routeDetails?.polyline) return decodePolyline(routeDetails.polyline);
    return null;
  }, [routeDetails]);

  // Parse stops positions
  const stopPositions = useMemo(() => {
    if (!routeDetails?.stops) return [];
    return routeDetails.stops
      .map((stop) => {
        let pos: [number, number] | null = null;
        if (stop.location) pos = parseWktPoint(stop.location);
        if (!pos && stop.lat != null && stop.lng != null) pos = [stop.lat, stop.lng];
        return pos ? { ...stop, pos } : null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }, [routeDetails]);

  // Derive school position from route details
  const schoolPosition = useMemo<[number, number] | null>(() => {
    if (routeDetails?.schoolLat && routeDetails?.schoolLng) {
      return [routeDetails.schoolLat, routeDetails.schoolLng];
    }
    return null;
  }, [routeDetails]);

  // Determine student's assigned stop for the active route
  const childStopId = useMemo(() => {
    if (!child) return undefined;
    return activeRouteId.includes('AM') ? child.amStopId : child.pmStopId;
  }, [child, activeRouteId]);

  // Fetch alerts for the route to determine bus status color
  const routeIds = useMemo(() => {
    if (!child) return [];
    return [child.amRouteId, child.pmRouteId, child.routeId].filter((id): id is string => !!id);
  }, [child]);
  const { alerts } = useAlerts(routeIds);

  // Determine bus status from API-enriched status or client-side alerts
  const busStatus: BusStatus = useMemo(() => {
    // Prefer server-side enriched status from live-location API
    if (locationData?.status && ['normal', 'delay', 'emergency'].includes(locationData.status)) {
      return locationData.status as BusStatus;
    }
    // Fallback: derive from client-side alert data
    if (alerts.length === 0) return 'normal';
    const hasEmergency = alerts.some((a) => EMERGENCY_EVENT_TYPES.has(a.eventType));
    if (hasEmergency) return 'emergency';
    const hasDelay = alerts.some((a) => DELAY_EVENT_TYPES.has(a.eventType));
    if (hasDelay) return 'delay';
    return 'emergency';
  }, [alerts, locationData]);

  const busIcon = useMemo(() => createBusIcon(busStatus), [busStatus]);

  const busLocation = locationData ?? null;
  const isAM = routeDetails?.direction === 'AM' || activeRouteId.includes('AM');
  const routeColor = isAM ? '#3b82f6' : '#f59e0b';

  // Determine if the bus is actively running (not stale data)
  const isLive = useMemo(() => {
    if (!busLocation?.timestamp) return false;
    const lastUpdate = new Date(busLocation.timestamp).getTime();
    return nowMs - lastUpdate < STALE_THRESHOLD_MS;
  }, [busLocation, nowMs]);

  // Route status label — cross-check child presence status and GPS freshness
  const routeStatusLabel = (() => {
    const isPM = child ? activeRouteId === child.pmRouteId : false;
    const isCurrentAM = child ? activeRouteId === child.amRouteId : false;
    // Presence-confirmed completion takes priority
    if (isPM && child?.status === 'at_home') return t('tracking.statuses.completed');
    if (isCurrentAM && child?.status === 'at_school') return t('tracking.statuses.completed');
    if (isLive) return t('tracking.statuses.live');
    // GPS stale but route not confirmed complete — signal lost
    if (busLocation) return t('tracking.statuses.noSignal');
    return t('tracking.statuses.completed');
  })();

  // Compute map bounds from route path + bus position + school
  const mapBounds = useMemo(() => {
    const pts: [number, number][] = [];
    if (routePath) pts.push(...routePath);
    if (busLocation && isLive) pts.push([busLocation.lat, busLocation.lng]);
    if (schoolPosition) pts.push(schoolPosition);
    if (pts.length < 2) return null;
    return L.latLngBounds(pts);
  }, [routePath, busLocation, isLive, schoolPosition]);

  // Track when Leaflet map instance is captured — state change triggers fitBounds effect
  const [mapReady, setMapReady] = useState(false);

  const handleMapReady = React.useCallback(() => setMapReady(true), []);

  // --- Admin Dashboard pattern: fitBounds only on initial load OR when active route changes ---
  useEffect(() => {
    if (!mapBounds || !mapReady) return;
    const routeChanged = lastActiveRouteIdRef.current !== activeRouteId;
    const initialLoad = !initialFitDoneRef.current;
    if (routeChanged || initialLoad) {
      mapInstanceRef.current?.fitBounds(mapBounds, { padding: [60, 60], maxZoom: 15 });
      initialFitDoneRef.current = true;
      lastActiveRouteIdRef.current = activeRouteId;
    }
  }, [mapBounds, activeRouteId, mapReady]);

  // Map Reset — same as Admin Dashboard onReset pattern
  const handleResetMap = () => {
    if (mapBounds) {
      mapInstanceRef.current?.fitBounds(mapBounds, { padding: [60, 60], maxZoom: 15 });
    }
  };

  if (!child) return <div>{t('tracking.map.loading')}</div>;

  const currentPosition: [number, number] = busLocation
    ? [busLocation.lat, busLocation.lng]
    : defaultCenter;

  const statusLabel =
    busStatus === 'normal' ? t('tracking.statuses.normal') : busStatus === 'delay' ? t('tracking.statuses.delayed') : t('tracking.statuses.emergency');

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-40">
      {/* Back button — top-left */}
      <button
        onClick={() => navigate('/dashboard')}
        className="absolute top-[15px] left-4 z-[1000] bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 flex items-center text-gray-700"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>

      {/* Status panel — top-right */}
      <div className="absolute top-[15px] right-4 z-[1000] bg-white p-3 rounded-lg shadow-lg max-w-sm w-full">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-gray-900">{child.name}</h3>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isLive ? 'bg-green-100 text-green-800' : routeStatusLabel === 'No Signal' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}
          >
            {routeStatusLabel}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          {t('tracking.map.route')} {routeDetails?.name || activeRouteId} ({isAM ? t('tracking.map.am') : t('tracking.map.pm')})
        </p>
        <p className="text-xs text-gray-400">
          {t('tracking.map.vehicle')} {routeDetails?.vehicleId || child.vehicleId || t('tracking.map.notAvailable')}
        </p>
        {isLive && busLocation && (
          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
            <div className="flex items-center text-blue-600">
              <Navigation className="h-4 w-4 mr-1" />
              <span className="font-semibold text-sm">
                {t('tracking.map.eta')}{busLocation.etaToNextStop ?? '—'} {t('tracking.map.min')}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {t('tracking.map.updated')}{new Date(busLocation.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
        {alerts.length > 0 && (
          <div className="mt-2 border-t border-gray-100 pt-2">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold"
              style={{
                backgroundColor: BUS_STATUS_COLORS[busStatus] + '22',
                color: BUS_STATUS_COLORS[busStatus],
              }}
            >
              {statusLabel}: {alerts.map((a) => a.eventType.replace(/_/g, ' ')).join(', ')}
            </span>
          </div>
        )}
        {!isLive && routeStatusLabel === t('tracking.statuses.noSignal') && (
          <p className="text-xs text-yellow-600 mt-1">
            {t('tracking.map.busSignalLost')}
          </p>
        )}
        {!isLive && routeStatusLabel !== t('tracking.statuses.noSignal') && (
          <p className="text-xs text-gray-400 mt-1">{t('tracking.map.routeNotActive')}</p>
        )}
      </div>

      {/* Map Reset Button */}
      <button
        onClick={handleResetMap}
        className="absolute top-[15px] left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-lg text-white shadow-lg transition-all flex items-center gap-2 group"
        title={t('tracking.map.resetMap')}
      >
        <RotateCcw size={16} className="group-hover:rotate-[-45deg] transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest pt-0.5">{t('tracking.map.mapReset')}</span>
      </button>

      {/* Legend - bottom left, matching admin dashboard */}
      <div className="absolute bottom-6 left-4 z-[1000] pointer-events-auto bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-xs">
        <div className="font-semibold text-gray-700 mb-1.5">{t('tracking.map.legend')}</div>
        {(['normal', 'delay', 'emergency'] as BusStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-2 mb-0.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: BUS_STATUS_COLORS[s] }}
            />
            <span className="text-gray-600">
              {s === 'delay' ? t('tracking.statuses.delayed') : s === 'emergency' ? t('tracking.statuses.emergency') : t('tracking.statuses.normal')}
            </span>
          </div>
        ))}
        <div className="border-t border-gray-200 mt-1.5 pt-1.5">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-gray-600">{t('tracking.map.yourChildsStop')}</span>
          </div>
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: 'rgba(156,163,175,0.35)',
                border: '1px solid rgba(156,163,175,0.5)',
              }}
            />
            <span className="text-gray-600">{t('tracking.map.otherStops')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded"
              style={{ backgroundColor: '#8b5cf6' }}
            />
            <span className="text-gray-600">{t('tracking.map.school')}</span>
          </div>
        </div>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution={getTileLayerConfig().attribution}
          url={getTileLayerConfig().url}
          subdomains={getTileLayerConfig().subdomains}
          maxZoom={getTileLayerConfig().maxZoom}
        />

        {/* Capture map instance into ref — mirrors Admin Dashboard mapInstanceRef pattern */}
        <MapInstanceCapture mapInstanceRef={mapInstanceRef} onReady={handleMapReady} />

        {/* Route polyline */}
        {routePath && (
          <Polyline
            positions={routePath}
            pathOptions={{ color: routeColor, weight: 6, opacity: 0.8, lineJoin: 'round' }}
          />
        )}

        {/* Stop markers — admin-style divIcon with person SVG and sequence badge */}
        {stopPositions.map((stop) => {
          const isChildStop = stop.id === childStopId;
          const seq = stop.sequence ?? 0;
          const stopIcon = createStopIcon(seq, isChildStop);
          return (
            <Marker
              key={stop.id}
              position={stop.pos}
              icon={stopIcon}
              zIndexOffset={isChildStop ? 500 : 0}
            >
              <Popup>
                <div style={{ minWidth: '140px', fontFamily: 'sans-serif' }}>
                  <strong
                    style={{
                      color: '#1e293b',
                      display: 'block',
                      borderBottom: '1px solid #e2e8f0',
                      paddingBottom: '4px',
                      marginBottom: '4px',
                    }}
                  >
                    {isChildStop
                      ? t('tracking.map.stopNumber', { seq, name: child.name })
                      : t('tracking.map.stopAddress', { seq, address: stop.address })}
                  </strong>
                  <div
                    style={{
                      fontSize: '11px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <span style={{ color: '#64748b' }}>
                      {t('tracking.map.route')}
                      <span style={{ color: '#1e293b', fontWeight: 600 }}>
                        {routeDetails?.name || activeRouteId}
                      </span>
                    </span>
                    <span style={{ color: '#64748b' }}>
                      {t('tracking.map.vehicle')}
                      <span style={{ color: '#1e293b', fontWeight: 600 }}>
                        {routeDetails?.vehicleId || child.vehicleId || t('tracking.map.notAvailable')}
                      </span>
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Bus marker — only show if actively running (not stale) */}
        {busLocation && isLive && (
          <Marker position={currentPosition} icon={busIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-bold">{t('tracking.map.bus')}{busLocation.vehicleId}</p>
                <p>{t('tracking.map.route')}{routeDetails?.name || busLocation.routeId}</p>
                <p className="text-xs mt-1" style={{ color: BUS_STATUS_COLORS[busStatus] }}>
                  {t('tracking.status')}: {statusLabel}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* School marker */}
        {schoolPosition && (
          <Marker position={schoolPosition} icon={SCHOOL_ICON} zIndexOffset={600}>
            <Popup>
              <div className="text-center">
                <p className="font-bold" style={{ color: '#8b5cf6' }}>
                  {routeDetails?.schoolName || child.schoolName}
                </p>
                <p className="text-xs text-gray-500">{t('tracking.map.school')}</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapPage;
