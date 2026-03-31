import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { parentApi, type NotificationRecord } from '../services/api';
import { queryKeys } from '../services/query-keys';

const Notifications: React.FC = () => {
  const {
    data: notifications = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => parentApi.getNotifications(),
  });

  const error = queryError ? 'Unable to load notifications. Please try again.' : null;

  const formatTimestamp = (ts: string): string => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="px-4 sm:px-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <button
          onClick={() => refetch()}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          aria-label="Refresh notifications"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && notifications.length === 0 && (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {!loading && notifications.length === 0 && !error && (
        <div className="text-center py-12">
          <Bell className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-gray-500">No notifications yet.</p>
          <p className="text-sm text-gray-400">You will see alerts and boarding events here.</p>
        </div>
      )}

      {notifications.length > 0 && (
        <ul className="divide-y divide-gray-200 bg-white rounded-lg shadow overflow-hidden">
          {notifications.map((n) => (
            <li key={n.id} className="flex items-start gap-4 p-4 hover:bg-gray-50">
              <div className="flex-shrink-0 mt-0.5">
                {n.status === 'SENT' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Alert notification</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Channel: {n.channel} &bull; Status: {n.status}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{formatTimestamp(n.timestamp)}</p>
              </div>
              <span
                className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  n.status === 'SENT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {n.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
