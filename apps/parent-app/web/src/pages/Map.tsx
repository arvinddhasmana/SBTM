import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { parentApi } from '../services/api';
import type { BusLocationUpdate, Child } from '../types';
import { ArrowLeft, Navigation } from 'lucide-react';

// Fix for default Leaflet marker icons not showing in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Bus Icon
const busIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', // Placeholder bus icon
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
});

// Component to recenter map when position changes
function RecenterMap({ position }: { position: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(position, map.getZoom());
    }, [position, map]);
    return null;
}

const MapPage: React.FC = () => {
    const { childId } = useParams<{ childId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [child, setChild] = useState<Child | null>(null);
    const [busLocation, setBusLocation] = useState<BusLocationUpdate | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Ottawa coords center
    const defaultCenter: [number, number] = [45.4215, -75.6972];

    useEffect(() => {
        if (user && childId) {
            const foundChild = user.children.find(c => c.id === childId);
            if (foundChild) {
                setChild(foundChild);
            } else {
                navigate('/dashboard');
            }
        }
    }, [user, childId, navigate]);

    useEffect(() => {
        if (!child) return;
        let isCancelled = false;

        const fetchLocation = async () => {
            try {
                const data = await parentApi.getLiveLocation(child.routeId);
                if (isCancelled) return;

                setBusLocation({
                    routeId: data.routeId,
                    vehicleId: data.vehicleId,
                    timestamp: data.lastUpdate,
                    lat: data.position.lat,
                    lng: data.position.lng,
                    speed: 0,
                    heading: 0,
                    etaToNextStop: data.etaToNextStopMinutes,
                });
                setIsConnected(true);
            } catch (error) {
                if (!isCancelled) {
                    setIsConnected(false);
                }
            }
        };

        fetchLocation();
        const interval = setInterval(fetchLocation, 5000);

        return () => {
            isCancelled = true;
            clearInterval(interval);
            setIsConnected(false);
        };
    }, [child]);

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
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {isConnected ? 'Live' : 'Offline'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">Route: {child.routeId}</p>
                        {busLocation && (
                            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                                <div className="flex items-center text-blue-600">
                                    <Navigation className="h-4 w-4 mr-1" />
                                    <span className="font-semibold text-sm">
                                        ETA: {busLocation.etaToNextStop} min
                                    </span>
                                </div>
                                <span className="text-xs text-gray-400">
                                    Updated: {new Date(busLocation.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
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

                {busLocation && (
                    <>
                        <RecenterMap position={currentPosition} />
                        <Marker position={currentPosition} icon={busIcon}>
                            <Popup>
                                <div className="text-center">
                                    <p className="font-bold">Bus {busLocation.vehicleId}</p>
                                    <p>Speed: {busLocation.speed} km/h</p>
                                </div>
                            </Popup>
                        </Marker>
                    </>
                )}
            </MapContainer>
        </div>
    );
};

export default MapPage;
