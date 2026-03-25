import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import { Header, Card, LoadingSpinner } from '../components/common';
import { routesApi, OptimizationResult } from '../services/api/routes.api';
import { Plus, Save, Wand2, MapPin } from 'lucide-react';
import type { Route, RouteStop } from '../types';

// Default viewport centred on Toronto for initial map load
const DEFAULT_CENTER: [number, number] = [43.6532, -79.3832];
const DEFAULT_ZOOM = 11;

interface StopDraft extends Partial<RouteStop> {
    lat?: string;
    lng?: string;
}

const RoutePlanner: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [stops, setStops] = useState<StopDraft[]>([]);
    const [routeName, setRouteName] = useState('');
    const [direction, setDirection] = useState<'AM' | 'PM'>('AM');
    const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
    const [optimizationError, setOptimizationError] = useState<string | null>(null);

    const handleAddStop = () => {
        setStops([...stops, { address: '', sequence: stops.length + 1, lat: '', lng: '' }]);
    };

    const handleStopChange = (index: number, field: keyof StopDraft, value: string) => {
        const updated = [...stops];
        (updated[index] as any)[field] = value;
        setStops(updated);
    };

    /** Build WKT POINT from raw lat/lng string inputs for each stop */
    const buildStopsForApi = () =>
        stops.map((s, i) => {
            const lat = parseFloat(s.lat ?? '');
            const lng = parseFloat(s.lng ?? '');
            const location =
                !isNaN(lat) && !isNaN(lng)
                    ? `POINT(${lng} ${lat})`
                    : '';
            return {
                sequence: i,
                address: s.address ?? '',
                location,
            };
        });

    const handleOptimize = async () => {
        if (stops.length < 2) return;
        setIsLoading(true);
        setOptimizationError(null);
        try {
            const result = await routesApi.optimizeRoute(buildStopsForApi());
            setOptimizationResult(result);
        } catch (error) {
            setOptimizationError('Optimization request failed. Please check coordinates and try again.');
            console.error('Optimization failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await routesApi.createRoute({
                name: routeName,
                direction,
                schoolId: 's1',
                stops: buildStopsForApi(),
                startTime: '07:00',
                estimatedDuration: optimizationResult?.totalDuration ?? 60,
            });
            alert('Route saved successfully!');
        } catch (error) {
            console.error('Save failed:', error);
        }
    };

    /** Derive Leaflet Polyline positions from the GeoJSON coordinates [lng, lat] → [lat, lng] */
    const polylinePositions: [number, number][] =
        optimizationResult?.polylineGeoJson?.coordinates.map(([lng, lat]) => [lat, lng]) ?? [];

    /** Derive stop marker positions from optimized stops or original input */
    const stopMarkers: { lat: number; lng: number; label: string }[] = (() => {
        const source = optimizationResult?.optimizedStops ?? stops;
        return source.flatMap((s: any, i: number) => {
            const coordMatch = (s.location ?? '').match(
                /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i,
            );
            if (coordMatch) {
                return [{ lng: parseFloat(coordMatch[1]), lat: parseFloat(coordMatch[2]), label: s.address ?? `Stop ${i + 1}` }];
            }
            const lat = parseFloat(s.lat ?? '');
            const lng = parseFloat(s.lng ?? '');
            if (!isNaN(lat) && !isNaN(lng)) {
                return [{ lat, lng, label: s.address ?? `Stop ${i + 1}` }];
            }
            return [];
        });
    })();

    const mapCenter: [number, number] =
        stopMarkers.length > 0
            ? [stopMarkers[0].lat, stopMarkers[0].lng]
            : DEFAULT_CENTER;

    return (
        <>
            <Header
                title="Route Planner"
                subtitle="Design and optimize school bus routes"
                action={
                    <div className="flex gap-3">
                        <button onClick={handleOptimize} disabled={isLoading} className="btn-secondary flex items-center gap-2">
                            <Wand2 size={20} className="text-primary-400" /> Optimize Route
                        </button>
                        <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                            <Save size={20} /> Save Route
                        </button>
                    </div>
                }
            />

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Controls */}
                    <Card title="Route Details" className="lg:col-span-1">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Route Name</label>
                                <input
                                    type="text"
                                    value={routeName}
                                    onChange={(e) => setRouteName(e.target.value)}
                                    className="w-full bg-slate-800 border-dashboard-border rounded-lg text-white p-2.5 outline-none focus:border-primary-500"
                                    placeholder="e.g. Route 101 North"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Direction</label>
                                <select
                                    value={direction}
                                    onChange={(e) => setDirection(e.target.value as 'AM' | 'PM')}
                                    className="w-full bg-slate-800 border-dashboard-border rounded-lg text-white p-2.5 outline-none focus:border-primary-500"
                                >
                                    <option value="AM">AM (Morning Dropoff)</option>
                                    <option value="PM">PM (Afternoon Pickup)</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-dashboard-border">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-medium text-white flex items-center gap-2">
                                        <MapPin size={18} className="text-primary-400" /> Stops
                                    </h4>
                                    <button onClick={handleAddStop} className="text-xs text-primary-400 hover:underline flex items-center gap-1">
                                        <Plus size={14} /> Add Stop
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {stops.map((stop, index) => (
                                        <div key={index} className="bg-slate-800/50 p-2 rounded-lg border border-dashboard-border space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                                                    {index + 1}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={stop.address}
                                                    onChange={(e) => handleStopChange(index, 'address', e.target.value)}
                                                    className="flex-1 bg-transparent border-none text-sm text-slate-200 outline-none"
                                                    placeholder="Address..."
                                                />
                                            </div>
                                            <div className="flex gap-2 pl-8">
                                                <input
                                                    type="text"
                                                    value={stop.lat ?? ''}
                                                    onChange={(e) => handleStopChange(index, 'lat', e.target.value)}
                                                    className="w-1/2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 p-1 outline-none"
                                                    placeholder="Latitude"
                                                />
                                                <input
                                                    type="text"
                                                    value={stop.lng ?? ''}
                                                    onChange={(e) => handleStopChange(index, 'lng', e.target.value)}
                                                    className="w-1/2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 p-1 outline-none"
                                                    placeholder="Longitude"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {optimizationResult && (
                                <div className="pt-4 border-t border-dashboard-border space-y-2">
                                    <h4 className="text-sm font-medium text-slate-300">Optimization Result</h4>
                                    {optimizationResult.polylineGeoJson ? (
                                        <>
                                            <p className="text-xs text-slate-400">
                                                Distance: <span className="text-white font-semibold">{optimizationResult.totalDistance} km</span>
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                Duration: <span className="text-white font-semibold">{optimizationResult.totalDuration} min</span>
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-xs text-amber-400">
                                            Route provider unavailable — add valid coordinates to enable real route geometry.
                                        </p>
                                    )}
                                </div>
                            )}

                            {optimizationError && (
                                <p className="text-xs text-red-400 pt-2">{optimizationError}</p>
                            )}
                        </div>
                    </Card>

                    {/* Map */}
                    <Card title="Route Preview" className="lg:col-span-2">
                        <div className="h-[500px] rounded-lg overflow-hidden">
                            {isLoading ? (
                                <div className="h-full bg-slate-800 flex items-center justify-center">
                                    <LoadingSpinner text="Calculating optimal route..." />
                                </div>
                            ) : (
                                <MapContainer
                                    center={mapCenter}
                                    zoom={DEFAULT_ZOOM}
                                    style={{ height: '100%', width: '100%' }}
                                    key={`${mapCenter[0]}-${mapCenter[1]}`}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    {polylinePositions.length > 1 && (
                                        <Polyline
                                            positions={polylinePositions}
                                            color="#3b82f6"
                                            weight={4}
                                            opacity={0.85}
                                        />
                                    )}
                                    {stopMarkers.map((marker, i) => (
                                        <CircleMarker
                                            key={i}
                                            center={[marker.lat, marker.lng]}
                                            radius={8}
                                            fillColor="#f59e0b"
                                            color="#ffffff"
                                            weight={2}
                                            fillOpacity={0.9}
                                        >
                                            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                                                <span className="text-xs">{marker.label}</span>
                                            </Tooltip>
                                        </CircleMarker>
                                    ))}
                                </MapContainer>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default RoutePlanner;

