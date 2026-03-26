import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { LiveLocation } from '../../types';
import { getStatusColorClass } from '../../utils/formatters';

/** Route IDs assigned to live drivers using the phone app (highlighted on map) */
const LIVE_DRIVER_ROUTE_IDS = ['ROUTE-R01', 'ROUTE-R02', 'ROUTE-R11', 'ROUTE-R12'];

interface LiveMapProps {
    locations: LiveLocation[];
    onMarkerClick?: (location: LiveLocation) => void;
    className?: string;
}

const LiveMap: React.FC<LiveMapProps> = ({ locations, onMarkerClick, className = '' }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);

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

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

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
            const borderColor = isLive ? '#f59e0b' : 'white';
            const borderWidth = isLive ? '4px' : '3px';
            const pulseAnimation = isLive
                ? 'animation: live-pulse 2s ease-in-out infinite;'
                : '';

            const icon = L.divIcon({
                className: 'custom-bus-marker',
                html: `
          <style>
            @keyframes live-pulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
              50% { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
            }
          </style>
          <div style="
            width: 32px;
            height: 32px;
            background: ${color};
            border-radius: 50%;
            border: ${borderWidth} solid ${borderColor};
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            ${pulseAnimation}
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
            </svg>
          </div>
        `,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            });

            const marker = L.marker([location.position.lat, location.position.lng], { icon })
                .addTo(mapInstanceRef.current!);

            if (onMarkerClick) {
                marker.on('click', () => onMarkerClick(location));
            }

            marker.bindPopup(`
        <div style="min-width: 150px;">
          <strong>Vehicle: ${location.vehicleId}</strong>${isLive ? ' <span style="background:#f59e0b;color:white;padding:1px 6px;border-radius:4px;font-size:11px;">LIVE</span>' : ''}<br/>
          <span>Route: ${location.routeId}</span><br/>
          <span>ETA: ${location.etaToNextStopMinutes} min</span>
          ${location.deviationFlag ? '<br/><span style="color: red;">⚠️ Deviation</span>' : ''}
        </div>
      `);

            markersRef.current.push(marker);
        });

        // Fit bounds if we have locations
        if (locations.length > 0) {
            const bounds = L.latLngBounds(locations.map(l => [l.position.lat, l.position.lng]));
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [locations, onMarkerClick]);

    return (
        <div className="relative">
            <div
                ref={mapRef}
                data-testid="live-map"
                className={`w-full h-full min-h-[400px] rounded-xl overflow-hidden ${className}`}
            />
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 rounded-lg shadow-md px-3 py-2 text-xs">
                <div className="font-semibold mb-1">Legend</div>
                <div className="flex items-center gap-1 mb-0.5">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 border-2 border-white" /> Normal
                </div>
                <div className="flex items-center gap-1 mb-0.5">
                    <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 border-2 border-white" /> Delayed
                </div>
                <div className="flex items-center gap-1 mb-0.5">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500 border-2 border-white" /> Emergency
                </div>
                <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 border-2 border-amber-500" /> Live Driver
                </div>
            </div>
        </div>
    );
};

export default LiveMap;
