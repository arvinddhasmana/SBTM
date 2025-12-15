import React from 'react';
import { User, Bell, Shield, Info } from 'lucide-react';
import { Header, Card } from '../components/common';
import { useAuth } from '../context/AuthContext';

const Settings: React.FC = () => {
    const { user } = useAuth();

    return (
        <>
            <Header title="Settings" subtitle="Manage your account and preferences" />

            <div className="p-6 space-y-6">
                {/* Profile */}
                <Card title="Profile">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center">
                            <User size={32} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">{user?.name || 'Admin User'}</h3>
                            <p className="text-slate-400">{user?.email || 'admin@osta.ca'}</p>
                            <span className="inline-block mt-2 px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-sm font-medium">
                                {user?.role || 'Administrator'}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Notification Preferences */}
                <Card title="Notification Preferences">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-dashboard-bg rounded-xl">
                            <div className="flex items-center gap-3">
                                <Bell size={18} className="text-primary-500" />
                                <div>
                                    <p className="font-medium text-white">Emergency Alerts</p>
                                    <p className="text-sm text-slate-400">Get notified for panic buttons and emergencies</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-dashboard-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-dashboard-bg rounded-xl">
                            <div className="flex items-center gap-3">
                                <Bell size={18} className="text-yellow-500" />
                                <div>
                                    <p className="font-medium text-white">Route Deviations</p>
                                    <p className="text-sm text-slate-400">Get notified when buses deviate from route</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-dashboard-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-dashboard-bg rounded-xl">
                            <div className="flex items-center gap-3">
                                <Bell size={18} className="text-slate-400" />
                                <div>
                                    <p className="font-medium text-white">Daily Summary</p>
                                    <p className="text-sm text-slate-400">Receive daily summary reports via email</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-11 h-6 bg-dashboard-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </label>
                        </div>
                    </div>
                </Card>

                {/* Security */}
                <Card title="Security">
                    <div className="p-4 bg-dashboard-bg rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield size={18} className="text-green-500" />
                            <div>
                                <p className="font-medium text-white">Two-Factor Authentication</p>
                                <p className="text-sm text-slate-400">Add an extra layer of security</p>
                            </div>
                        </div>
                        <button className="btn-secondary text-sm">Enable</button>
                    </div>
                </Card>

                {/* About */}
                <Card title="About">
                    <div className="flex items-center gap-3 p-4 bg-dashboard-bg rounded-xl">
                        <Info size={18} className="text-primary-500" />
                        <div>
                            <p className="font-medium text-white">OSTA Admin Dashboard</p>
                            <p className="text-sm text-slate-400">Version 1.0.0 • School Bus Transport Management System</p>
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
};

export default Settings;
