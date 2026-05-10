import React from 'react';
import { Link } from 'react-router-dom';
import { User, Bell, Shield, Info, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Header, Card } from '../components/common';
import { useAuth } from '../context/AuthContext';

const Settings: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <>
      <Header title={t('settings:title')} subtitle={t('settings:subtitle')} />

      <div className="p-6 space-y-6">
        {/* Profile */}
        <Card title={t('settings:sections.profile')}>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center">
              <User size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {user?.name || t('settings:profile.defaultName')}
              </h3>
              <p className="text-slate-400">{user?.email || t('settings:profile.defaultEmail')}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-sm font-medium">
                {user?.role?.replace(/_/g, ' ') || t('settings:profile.role')}
              </span>
            </div>
          </div>
        </Card>

        {/* GPS Tracking Source — Super Admin only */}
        {isSuperAdmin && (
          <Card title="GPS Tracking Configuration">
            <Link
              to="/settings/gps-source"
              className="flex items-center justify-between p-4 bg-dashboard-bg rounded-xl hover:bg-slate-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Cpu size={18} className="text-blue-400" />
                <div>
                  <p className="font-medium text-white">GPS Tracking Source</p>
                  <p className="text-sm text-slate-400">
                    Switch between Driver App and Dedicated GPS hardware devices
                  </p>
                </div>
              </div>
              <span className="text-slate-400 group-hover:text-white transition-colors">→</span>
            </Link>
          </Card>
        )}

        {/* Notification Preferences */}
        <Card title={t('settings:sections.notificationPreferences')}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-dashboard-bg rounded-xl">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-primary-500" />
                <div>
                  <p className="font-medium text-white">
                    {t('settings:notifications.emergencyAlerts.title')}
                  </p>
                  <p className="text-sm text-slate-400">
                    {t('settings:notifications.emergencyAlerts.description')}
                  </p>
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
                  <p className="font-medium text-white">
                    {t('settings:notifications.routeDeviations.title')}
                  </p>
                  <p className="text-sm text-slate-400">
                    {t('settings:notifications.routeDeviations.description')}
                  </p>
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
                  <p className="font-medium text-white">
                    {t('settings:notifications.dailySummary.title')}
                  </p>
                  <p className="text-sm text-slate-400">
                    {t('settings:notifications.dailySummary.description')}
                  </p>
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
        <Card title={t('settings:sections.security')}>
          <div className="p-4 bg-dashboard-bg rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-green-500" />
              <div>
                <p className="font-medium text-white">{t('settings:security.twoFactor.title')}</p>
                <p className="text-sm text-slate-400">
                  {t('settings:security.twoFactor.description')}
                </p>
              </div>
            </div>
            <button className="btn-secondary text-sm">
              {t('settings:security.twoFactor.enable')}
            </button>
          </div>
        </Card>

        {/* About */}
        <Card title={t('settings:sections.about')}>
          <div className="flex items-center gap-3 p-4 bg-dashboard-bg rounded-xl">
            <Info size={18} className="text-primary-500" />
            <div>
              <p className="font-medium text-white">{t('settings:about.appName')}</p>
              <p className="text-sm text-slate-400">{t('settings:about.version')}</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default Settings;
