import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { parentApi } from '../services/api';
import { queryKeys } from '../services/query-keys';
import { useAlerts } from '../hooks/useAlerts';
import { decodePolyline } from '../utils/polyline';
import type { BusLocationUpdate, Child } from '../types';
import { ArrowLeft, Navigation } from 'lucide-react';

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

/** Stale threshold: if last GPS update is older than 2 minutes, bus is not actively running */
const STALE_THRESHOLD_MS = 2 * 60 * 1000;

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
  const color = isChildStop ? '#3b82f6' : '#9ca3af';
  const bg = isChildStop ? '#3b82f6' : 'rgba(156,163,175,0.35)';
  const border = isChildStop ? '2px solid #fff' : '2px solid rgba(156,163,175,0.5)';
  const size = isChildStop ? 32 : 28;
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
        position:absolute; bottom:-4px; right:-4px;
        width:16px;height:16px; background:#fff; border:2px solid ${badgeBorder};
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

/** Parse WKT POINT(lng lat) to [lat, lng] */
function parseWktPoint(wkt: string): [number, number] | null {
  const m = wkt.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
  if (m) return [parseFloat(m[2]), parseFloat(m[1])];
  return null;
}

// Component to fit map bounds
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
}

const MapPage: React.FC = () => {
  const { childId } = useParams<{ childId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [activeRouteId, setActiveRouteId] = useState<string>('');

  // Ottawa coords center
  const defaultCenter: [number, number] = [45.4215, -75.6972];

  useEffect(() => {
    if (user && childId) {
      const foundChild = user.children.find((c) => c.id === childId);
      if (foundChild) {
        setChild(foundChild);
        // Pick active route: AM before noon, PM after noon
        const hour = new Date().getHours();
        if (hour < 12 && foundChild.amRouteId) {
          setActiveRouteId(foundChild.amRouteId);
        } else if (hour >= 12 && foundChild.pmRouteId) {
          setActiveRouteId(foundChild.pmRouteId);
        } else {
          setActiveRouteId(foundChild.amRouteId || foundChild.pmRouteId || foundChild.routeId);
        }
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, childId, navigate]);

  // Fetch route details (polyline + stops)
  const { data: routeDetails } = useQuery({
    queryKey: queryKeys.route.details(activeRouteId),
    queryFn: () => parentApi.getRouteDetails(activeRouteId),
    enabled: !!activeRouteId,
    staleTime: 5 * 60_000,
  });

  // Decode polyline to coordinates
  const routePath = useMemo(() => {
    if (routeDetails?.polyline) {
      return decodePolyline(routeDetails.polyline);
    }
    return null;
  }, [routeDetails?.polyline]);

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
  }, [routeDetails?.stops]);

  // Determine student's assigned stop ID for this route
  const childStopId = useMemo(() => {
    if (!child) return undefined;
    const isAM = activeRouteId.includes('AM');
    return isAM ? child.amStopId : child.pmStopId;
  }, [child, activeRouteId]);

  // Fetch live location — try active route, fall back to alternate
  const alternateRouteId = child
    ? (activeRouteId === child.amRouteId ? child.pmRouteId : child.amRouteId) || ''
    : '';

  const { data: locationData, error: locationError } = useQuery({
    queryKey: queryKeys.location.live(activeRouteId),
    queryFn: async () => {
      try {
        const data = await parentApi.getLiveLocation(activeRouteId);
        return {
          routeId: data.routeId,
          vehicleId: data.vehicleId,
          timestamp: data.lastUpdate,
          lat: data.position.lat,
          lng: data.position.lng,
          speed: 0,
          heading: 0,
          etaToNextStop: data.etaToNextStopMinutes,
          status: data.status,
        } as BusLocationUpdate;
      } catch {
        if (alternateRouteId) {
          const data = await parentApi.getLiveLocation(alternateRouteId);
          return {
            routeId: data.routeId,
            vehicleId: data.vehicleId,
            timestamp: data.lastUpdate,
            lat: data.position.lat,
            lng: data.position.lng,
            speed: 0,
            heading: 0,
            etaToNextStop: data.etaToNextStopMinutes,
            status: data.status,
          } as BusLocationUpdate;
        }
        throw new Error('No live location available');
      }
    },
    enabled: !!child && !!activeRouteId,
    refetchInterval: 5_000,
    retry: 1,
  });

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
  }, [alerts, locationData?.status]);

  const busIcon = useMemo(() => createBusIcon(busStatus), [busStatus]);

  const busLocation = locationData ?? null;
  const isAM = routeDetails?.direction === 'AM' || activeRouteId.includes('AM');
  const routeColor = isAM ? '#3b82f6' : '#f59e0b';

  // Determine if the bus is actively running (not stale data)
  const isLive = useMemo(() => {
    if (!busLocation?.timestamp) return false;
    const lastUpdate = new Date(busLocation.timestamp).getTime();
    return Date.now() - lastUpdate < STALE_THRESHOLD_MS;
  }, [busLocation?.timestamp]);

  // Route status label
  const routeStatusLabel = isLive ? 'Live' : 'Completed';

  // Compute map bounds from route path + bus position
  const mapBounds = useMemo(() => {
    const pts: [number, number][] = [];
    if (routePath) pts.push(...routePath);
    if (busLocation && isLive) pts.push([busLocation.lat, busLocation.lng]);
    if (pts.length < 2) return null;
    return L.latLngBounds(pts);
  }, [routePath, busLocation, isLive]);

  if (!child) return <div>Loading...</div>;

  const currentPosition: [number, number] = busLocation
    ? [busLocation.lat, busLocation.lng]
    : defaultCenter;

  const statusLabel =
    busStatus === 'normal' ? 'Normal' : busStatus === 'delay' ? 'Delayed' : 'Emergency';

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col relative">
      <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <button
            onClick={() => navigate('/dashboard')}
            className="pointer-events-auto bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 flex items-center text-gray-700"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>

          <div className="pointer-events-auto bg-white p-3 rounded-lg shadow-lg max-w-sm w-full ml-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900">{child.name}</h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isLive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
              >
                {routeStatusLabel}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Route: {routeDetails?.name || activeRouteId} ({isAM ? 'AM' : 'PM'})
            </p>
            <p className="text-xs text-gray-400">
              Vehicle: {routeDetails?.vehicleId || child.vehicleId || 'N/A'}
            </p>
            {isLive && busLocation && (
              <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                <div className="flex items-center text-blue-600">
                  <Navigation className="h-4 w-4 mr-1" />
                  <span className="font-semibold text-sm">
                    ETA: {busLocation.etaToNextStop ?? '—'} min
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  Updated: {new Date(busLocation.timestamp).toLocaleTimeString()}
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
            {!isLive && !locationError && (
              <p className="text-xs text-gray-400 mt-1">Route is not currently active.</p>
            )}
            {locationError && (
              <p className="text-xs text-red-400 mt-1">
                Bus is not currently active on this route.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Legend - bottom left, matching admin dashboard */}
      <div className="absolute bottom-6 left-4 z-[1000] pointer-events-auto bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-xs">
        <div className="font-semibold text-gray-700 mb-1.5">Legend</div>
        {(['normal', 'delay', 'emergency'] as BusStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-2 mb-0.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: BUS_STATUS_COLORS[s] }}
            />
            <span className="text-gray-600">
              {s === 'delay' ? 'Delayed' : s === 'emergency' ? 'Emergency' : 'Normal'}
            </span>
          </div>
        ))}
        <div className="border-t border-gray-200 mt-1.5 pt-1.5">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-gray-600">Your child's stop</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: 'rgba(156,163,175,0.35)',
                border: '1px solid rgba(156,163,175,0.5)',
              }}
            />
            <span className="text-gray-600">Other stops</span>
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fit map to route bounds initially */}
        {mapBounds && <FitBounds bounds={mapBounds} />}

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
                      ? `Stop ${seq}: ${child.name}'s Stop`
                      : `Stop ${seq}: ${stop.address}`}
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
                      Route:{' '}
                      <span style={{ color: '#1e293b', fontWeight: 600 }}>
                        {routeDetails?.name || activeRouteId}
                      </span>
                    </span>
                    <span style={{ color: '#64748b' }}>
                      Vehicle:{' '}
                      <span style={{ color: '#1e293b', fontWeight: 600 }}>
                        {routeDetails?.vehicleId || child.vehicleId || 'N/A'}
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
                <p className="font-bold">Bus {busLocation.vehicleId}</p>
                <p>Route: {routeDetails?.name || busLocation.routeId}</p>
                <p className="text-xs mt-1" style={{ color: BUS_STATUS_COLORS[busStatus] }}>
                  Status: {statusLabel}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapPage;
