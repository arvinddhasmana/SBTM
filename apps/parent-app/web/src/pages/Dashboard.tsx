import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, School, Home, HelpCircle, ArrowRight } from 'lucide-react';
import type { Child } from '../types';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    const getStatusIcon = (status: Child['status']) => {
        switch (status) {
            case 'on_bus':
                return <MapPin className="h-5 w-5 text-blue-500" />;
            case 'at_school':
                return <School className="h-5 w-5 text-green-500" />;
            case 'at_home':
                return <Home className="h-5 w-5 text-gray-500" />;
            default:
                return <HelpCircle className="h-5 w-5 text-yellow-500" />;
        }
    };

    const getStatusText = (status: Child['status']) => {
        switch (status) {
            case 'on_bus': return 'On the Bus';
            case 'at_school': return 'At School';
            case 'at_home': return 'At Home';
            case 'unknown': return 'Status Unknown';
            default: return status;
        }
    };

    const getStatusColor = (status: Child['status']) => {
        switch (status) {
            case 'on_bus': return 'bg-blue-100 text-blue-800';
            case 'at_school': return 'bg-green-100 text-green-800';
            case 'at_home': return 'bg-gray-100 text-gray-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    return (
        <div className="px-4 sm:px-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">My Children</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {user.children.map((child) => (
                    <div key={child.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <img className="h-12 w-12 rounded-full bg-gray-200" src={child.avatarUrl} alt={child.name} />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <h3 className="text-lg font-medium text-gray-900 truncate">
                                        {child.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 truncate">{child.schoolName}</p>
                                </div>
                            </div>

                            <div className="mt-4 border-t border-gray-100 pt-4">
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                    <div className="sm:col-span-1">
                                        <dt className="text-xs font-medium text-gray-500">Route</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{child.routeId}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-xs font-medium text-gray-500">Bus Number</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{child.vehicleId}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(child.status)}`}>
                                    {getStatusIcon(child.status)}
                                    <span className="ml-1.5">{getStatusText(child.status)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-5 py-3">
                            <button
                                onClick={() => navigate(`/map/${child.id}`)}
                                className="w-full flex justify-center items-center text-sm font-medium text-blue-700 hover:text-blue-900"
                            >
                                Track Bus Live
                                <ArrowRight className="ml-1 h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {user.children.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">No children linked to your account.</p>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
