import React, { useState, useEffect } from 'react';
import { Header, Card, LoadingSpinner } from '../components/common';
import { routesApi, OptimizationResult } from '../services/api/routes.api';
import { Plus, Save, Wand2, MapPin, Users, ArrowRight } from 'lucide-react';
import type { Route, RouteStop } from '../types';

const RoutePlanner: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [stops, setStops] = useState<Partial<RouteStop>[]>([]);
    const [routeName, setRouteName] = useState('');
    const [direction, setDirection] = useState<'AM' | 'PM'>('AM');
    const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);

    const handleAddStop = () => {
        setStops([...stops, { address: '', sequence: stops.length + 1 }]);
    };

    const handleOptimize = async () => {
        if (stops.length < 2) return;
        setIsLoading(true);
        try {
            const result = await routesApi.optimizeRoute(stops);
            setOptimizationResult(result);
            // Update stops with optimized order if needed
            // setStops(result.optimizedStops);
        } catch (error) {
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
                schoolId: 's1', // Demo ID
                stops: stops.map((s, i) => ({ ...s, sequence: i + 1 })),
                startTime: '07:00',
                estimatedDuration: 60
            });
            alert('Route saved successfully!');
        } catch (error) {
            console.error('Save failed:', error);
        }
    };

    return (
        <>
            <Header
                title="Route Planner"
                subtitle="Design and optimize school bus routes"
                action={
                    <div className="flex gap-3">
                        <button onClick={handleOptimize} disabled={isLoading} className="btn-secondary flex items-center gap-2">
                            <Wand2 size={20} className="text-primary-400" /> AI Optimize
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
                                        <div key={index} className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-lg border border-dashboard-border group">
                                            <span className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-300">
                                                {index + 1}
                                            </span>
                                            <input
                                                type="text"
                                                value={stop.address}
                                                onChange={(e) => {
                                                    const newStops = [...stops];
                                                    newStops[index].address = e.target.value;
                                                    setStops(newStops);
                                                }}
                                                className="flex-1 bg-transparent border-none text-sm text-slate-200 outline-none"
                                                placeholder="Enter address..."
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Simple Map Visualization Placeholder */}
                    <Card title="Route Preview" className="lg:col-span-2">
                        <div className="h-[500px] bg-slate-800 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-700">
                            {isLoading ? (
                                <LoadingSpinner text="AI is calculating optimal route..." />
                            ) : optimizationResult ? (
                                <div className="text-center p-8">
                                    <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Wand2 size={32} />
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">Optimization Complete</h4>
                                    <p className="text-slate-400 mb-6">Found optimal path covering {optimizationResult.totalDistance}km in {optimizationResult.totalDuration}min.</p>
                                    <div className="bg-slate-700/30 p-4 rounded-xl text-left font-mono text-xs text-slate-300">
                                        {/* Mocking polyline visualization */}
                                        {"DEBUG: Polyline => " + optimizationResult.polyline.slice(0, 50) + "..."}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <MapPin size={48} className="text-slate-600 mb-4" />
                                    <p className="text-slate-500">Interactive Map Editor Placeholder</p>
                                    <p className="text-xs text-slate-600 mt-2 italic">(In a real app, this would be integrated with Leaflet/Google Maps)</p>
                                </>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default RoutePlanner;
