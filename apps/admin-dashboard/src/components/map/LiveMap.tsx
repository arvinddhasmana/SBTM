import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { LiveLocation, Route } from '../../types';
import { getStatusColorClass } from '../../utils/formatters';

/** Route IDs assigned to live drivers using the phone app (highlighted on map) */
const LIVE_DRIVER_ROUTE_IDS = ['ROUTE-R01', 'ROUTE-R02', 'ROUTE-R11', 'ROUTE-R12'];

const parseWktPoint = (wkt: string): [number, number] => {
    const coords = wkt.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (coords) {
        return [parseFloat(coords[2]), parseFloat(coords[1])]; // [lat, lng]
    }
    return [0, 0];
};

interface LiveMapProps {
    locations: LiveLocation[];
    selectedRoute?: Route | null;
    plannedRoute?: [number, number][]; // Array of [lat, lng]
    onMarkerClick?: (location: LiveLocation) => void;
    className?: string;
}

const LiveMap: React.FC<LiveMapProps> = ({ locations, selectedRoute, plannedRoute, onMarkerClick, className = '' }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);
    const routePolylineRef = useRef<L.Polyline | null>(null);
    const stopMarkersRef = useRef<L.CircleMarker[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);

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
        mapInstanceRef.current = L.map(mapRef.current).setView([45.3920, -75.7130], 12);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstanceRef.current);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!mapInstanceRef.current) return;

        // Clear existing markers and route data
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        stopMarkersRef.current.forEach(marker => marker.remove());
        stopMarkersRef.current = [];

        if (routePolylineRef.current) {
            routePolylineRef.current.remove();
            routePolylineRef.current = null;
        }

        // Render Planned/Selected Route Path
        const pathData = selectedRoute?.path || plannedRoute;
        if (pathData && pathData.length > 0) {
            routePolylineRef.current = L.polyline(pathData as L.LatLngExpression[], {
                color: '#3b82f6',
                weight: 4,
                opacity: 0.8,
                lineJoin: 'round',
            }).addTo(mapInstanceRef.current);
        }

        // Render Stops for Selected Route
        if (selectedRoute?.stops) {
            selectedRoute.stops.forEach(stop => {
                const pos = parseWktPoint(stop.location);
                const stopMarker = L.circleMarker(pos, {
                    radius: 5,
                    fillColor: '#3b82f6',
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 1,
                })
                    .addTo(mapInstanceRef.current!)
                    .bindPopup(`<strong class="text-slate-900">${stop.address}</strong>`);

                stopMarkersRef.current.push(stopMarker);
            });
        }

        // Add new markers
        locations.forEach(location => {
            const statusClass = getStatusColorClass(location.status);
            const colorMap: Record<string, string> = {
                'bg-green-500': '#22c55e',
                'bg-yellow-500': '#eab308',
                'bg-red-500': '#ef4444',
                'bg-gray-500': '#6b7280',
            };
            const color = colorMap[statusClass] || '#6b7280';
            const isLive = LIVE_DRIVER_ROUTE_IDS.includes(location.routeId);
            const isSelected = selectedRoute?.id === location.routeId;
            const borderColor = isSelected ? '#3b82f6' : (isLive ? '#f59e0b' : 'white');
            const borderWidth = isSelected ? '4px' : (isLive ? '3px' : '2px');
            const scale = isSelected ? 1.2 : 1.0;

            const icon = L.divIcon({
                className: 'custom-bus-marker',
                html: `
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
        `,
                iconSize: [32 * scale, 32 * scale],
                iconAnchor: [16 * scale, 16 * scale],
            });

            const marker = L.marker([location.position.lat, location.position.lng], { icon, zIndexOffset: isSelected ? 1000 : 0 })
                .addTo(mapInstanceRef.current!);

            if (onMarkerClick) {
                marker.on('click', () => onMarkerClick(location));
            }

            marker.bindPopup(`
        <div style="min-width: 150px;">
          <strong>Vehicle: ${location.vehicleId}</strong>${isLive ? ' <span style="background:#f59e0b;color:white;padding:1px 6px;border-radius:4px;font-size:11px;">LIVE</span>' : ''}<br/>
          <span>Route: ${location.routeId}</span><br/>
          <span>ETA: ${location.etaToNextStopMinutes} min</span>
        </div>
      `);

            markersRef.current.push(marker);
        });

        // Fit bounds
        const bounds = L.latLngBounds([]);
        let hasPoints = false;

        const allPoints = selectedRoute?.path || plannedRoute || [];
        allPoints.forEach(p => {
            bounds.extend(p as L.LatLngExpression);
            hasPoints = true;
        });

        locations.forEach(l => {
            bounds.extend([l.position.lat, l.position.lng] as L.LatLngExpression);
            hasPoints = true;
        });

        if (hasPoints && mapInstanceRef.current) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 });
        }
    }, [locations, selectedRoute, plannedRoute, onMarkerClick]);

    return (
        <div className={`w-full h-full transition-all duration-300 ease-in-out ${isFullscreen
            ? 'fixed inset-0 z-[9999] p-0 rounded-none'
            : 'relative'
            }`}>
            <div
                ref={mapRef}
                data-testid="live-map"
                className={`w-full h-full bg-slate-900 overflow-hidden ${isFullscreen ? 'rounded-none' : 'rounded-xl'
                    } ${className}`}
                style={{
                    minHeight: isFullscreen ? '100vh' : '100%',
                    height: isFullscreen ? '100vh' : '100%'
                }}
            />

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
