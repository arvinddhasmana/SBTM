import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { parentApi } from '../services/api';
import { queryKeys } from '../services/query-keys';
import { decodePolyline } from '../utils/polyline';
import type { BusLocationUpdate, Child } from '../types';
import { ArrowLeft, Navigation } from 'lucide-react';

// Fix for default Leaflet marker icons not showing in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Bus Icon using inline SVG (matching admin dashboard style)
const createBusIcon = () =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;
      background:#22c55e;
      border-radius:50%;
      border:3px solid #f59e0b;
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

const busIcon = createBusIcon();

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
    staleTime: 5 * 60_000, // route geometry rarely changes
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
        } as BusLocationUpdate;
      } catch {
        // Try alternate route if primary fails
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
          } as BusLocationUpdate;
        }
        throw new Error('No live location available');
      }
    },
    enabled: !!child && !!activeRouteId,
    refetchInterval: 5_000,
    retry: 1,
  });

  const busLocation = locationData ?? null;
  const isConnected = !!locationData;
  const isAM = routeDetails?.direction === 'AM' || activeRouteId.includes('AM');
  const routeColor = isAM ? '#3b82f6' : '#f59e0b';

  // Compute map bounds from route path + bus position
  const mapBounds = useMemo(() => {
    const pts: [number, number][] = [];
    if (routePath) pts.push(...routePath);
    if (busLocation) pts.push([busLocation.lat, busLocation.lng]);
    if (pts.length < 2) return null;
    return L.latLngBounds(pts);
  }, [routePath, busLocation]);

  if (!child) return <div>Loading...</div>;

  const currentPosition: [number, number] = busLocation
    ? [busLocation.lat, busLocation.lng]
    : defaultCenter;

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
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              >
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <p className="text-sm text-gray-500">Route: {activeRouteId}</p>
            {busLocation && (
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
            {!isConnected && !locationError && (
              <p className="text-xs text-gray-400 mt-1">Waiting for bus location...</p>
            )}
            {locationError && (
              <p className="text-xs text-red-400 mt-1">
                Bus is not currently active on this route.
              </p>
            )}
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

        {/* Stop markers */}
        {stopPositions.map((stop) => (
          <CircleMarker
            key={stop.id}
            center={stop.pos}
            radius={10}
            pathOptions={{
              color: '#fff',
              weight: 2,
              fillColor: routeColor,
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div style={{ minWidth: '140px', fontFamily: 'sans-serif' }}>
                <strong
                  style={{
                    display: 'block',
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: '4px',
                    marginBottom: '4px',
                  }}
                >
                  Stop {stop.sequence}: {stop.address}
                </strong>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Route: {activeRouteId}
                  <br />
                  Vehicle: {routeDetails?.vehicleId || child.vehicleId || 'N/A'}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Bus marker */}
        {busLocation && (
          <Marker position={currentPosition} icon={busIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-bold">Bus {busLocation.vehicleId}</p>
                <p>Route: {busLocation.routeId}</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapPage;
