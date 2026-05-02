import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { TrendingUp, CheckCircle, XCircle, MessageSquare, Send } from 'lucide-react';
import { alertConfigApi } from '../services/api/alert-config.api';
import type { ChangeRequest } from '../types/alert-config';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/common';

export const ChangeRequestsPage: React.FC = () => {
  const { t } = useTranslation(['alertConfig']);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [isCreating, setIsCreating] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [newRequest, setNewRequest] = useState({
    configType: 'alert_event_type_config',
    changeDescription: '',
    requestedConfig: {},
    justification: '',
  });

  // Fetch change requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['alertConfig', 'changeRequests', statusFilter],
    queryFn: () => alertConfigApi.getAllChangeRequests(statusFilter || undefined),
  });

  // Create change request mutation
  const createMutation = useMutation({
    mutationFn: (data: {
      configType: string;
      changeDescription: string;
      requestedConfig: Record<string, any>;
      justification?: string;
    }) => alertConfigApi.createChangeRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfig', 'changeRequests'] });
      setIsCreating(false);
      setNewRequest({
        configType: 'alert_event_type_config',
        changeDescription: '',
        requestedConfig: {},
        justification: '',
      });
    },
  });

  // Review change request mutation
  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      action,
      notes,
    }: {
      id: string;
      action: 'APPROVED' | 'REJECTED';
      notes?: string;
    }) => alertConfigApi.reviewChangeRequest(id, { action, reviewNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfig', 'changeRequests'] });
      setReviewingId(null);
      setReviewNotes('');
    },
  });

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newRequest);
  };

  const handleReview = (id: string, action: 'APPROVED' | 'REJECTED') => {
    if (!reviewNotes && !confirm(t('alertConfig:changeRequests.confirmNoNotes'))) {
      return;
    }
    reviewMutation.mutate({ id, action, notes: reviewNotes });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status?: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-900/50 text-yellow-300',
      APPROVED: 'bg-green-900/50 text-green-300',
      REJECTED: 'bg-red-900/50 text-red-300',
    };
    return colors[status || 'PENDING'] || 'bg-gray-900/50 text-gray-300';
  };

  return (
    <>
      <Header
        title={t('alertConfig:changeRequests.title')}
        subtitle={
          isSuperAdmin
            ? t('alertConfig:changeRequests.subtitle.admin')
            : t('alertConfig:changeRequests.subtitle.readOnly')
        }
      />
      <div className="p-6">
        <div className="flex justify-end mb-6">
          {!isSuperAdmin && (
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Send size={20} />
              {isCreating
                ? t('alertConfig:changeRequests.cancelSubmit')
                : t('alertConfig:changeRequests.submitButton')}
            </button>
          )}
        </div>

        {/* Create Request Form (Board/School Admin only) */}
        {!isSuperAdmin && isCreating && (
          <form
            onSubmit={handleCreateRequest}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">
              {t('alertConfig:changeRequests.form.title')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:changeRequests.form.configType')}
                </label>
                <select
                  value={newRequest.configType}
                  onChange={(e) => setNewRequest({ ...newRequest, configType: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  required
                >
                  <option value="alert_event_type_config">
                    {t('alertConfig:changeRequests.form.configTypes.eventType')}
                  </option>
                  <option value="alert_escalation_config">
                    {t('alertConfig:changeRequests.form.configTypes.escalation')}
                  </option>
                  <option value="notification_routing_config">
                    {t('alertConfig:changeRequests.form.configTypes.notificationRouting')}
                  </option>
                  <option value="alert_workflow_config">
                    {t('alertConfig:changeRequests.form.configTypes.workflow')}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:changeRequests.form.changeDescription')}
                </label>
                <textarea
                  value={newRequest.changeDescription}
                  onChange={(e) =>
                    setNewRequest({ ...newRequest, changeDescription: e.target.value })
                  }
                  placeholder={t('alertConfig:changeRequests.form.changeDescriptionPlaceholder')}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white h-24"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:changeRequests.form.justification')}
                </label>
                <textarea
                  value={newRequest.justification}
                  onChange={(e) => setNewRequest({ ...newRequest, justification: e.target.value })}
                  placeholder={t('alertConfig:changeRequests.form.justificationPlaceholder')}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white h-24"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                <Send size={20} />
                {t('alertConfig:changeRequests.form.submitButton')}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
              >
                {t('alertConfig:changeRequests.form.cancel')}
              </button>
            </div>
          </form>
        )}

        {/* Status Filter */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-white font-semibold">
              {t('alertConfig:changeRequests.statusFilter.title')}
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded-lg ${
                statusFilter === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('alertConfig:changeRequests.statusFilter.all')}
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-4 py-2 rounded-lg ${
                statusFilter === 'PENDING'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('alertConfig:changeRequests.statusFilter.pending')}
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-4 py-2 rounded-lg ${
                statusFilter === 'APPROVED'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('alertConfig:changeRequests.statusFilter.approved')}
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-4 py-2 rounded-lg ${
                statusFilter === 'REJECTED'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('alertConfig:changeRequests.statusFilter.rejected')}
            </button>
          </div>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="text-white">{t('alertConfig:changeRequests.loading')}</div>
        ) : (
          <div className="space-y-4">
            {requests && requests.length > 0 ? (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {request.configType.replace(/_/g, ' ').toUpperCase()}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(request.status)}`}
                        >
                          {request.status
                            ? t(`alertConfig:changeRequests.statuses.${request.status}`, {
                                defaultValue: request.status,
                              })
                            : ''}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-2">{request.changeDescription}</p>
                      {request.justification && (
                        <div className="bg-gray-700 p-3 rounded-lg mb-2">
                          <p className="text-sm text-gray-400">
                            <span className="font-semibold">
                              {t('alertConfig:changeRequests.request.justification')}:
                            </span>{' '}
                            {request.justification}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-4 text-sm text-gray-400">
                        <span>
                          {t('alertConfig:changeRequests.request.requestedBy')}:{' '}
                          <span className="text-white">{request.requestorEmail}</span>
                        </span>
                        <span>
                          {t('alertConfig:changeRequests.request.date')}:{' '}
                          <span className="text-white">{formatDate(request.requestedAt)}</span>
                        </span>
                      </div>
                      {request.reviewedBy && (
                        <div className="mt-2 text-sm text-gray-400">
                          <span>
                            {t('alertConfig:changeRequests.request.reviewedBy')}:{' '}
                            <span className="text-white">{request.reviewedBy}</span>
                          </span>
                          {request.reviewedAt && (
                            <span className="ml-4">
                              {t('alertConfig:changeRequests.request.on')}{' '}
                              <span className="text-white">{formatDate(request.reviewedAt)}</span>
                            </span>
                          )}
                        </div>
                      )}
                      {request.reviewNotes && (
                        <div className="mt-2 bg-gray-700 p-3 rounded-lg">
                          <p className="text-sm text-gray-300">
                            <span className="font-semibold text-white">
                              {t('alertConfig:changeRequests.request.reviewNotes')}:
                            </span>{' '}
                            {request.reviewNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Actions (Super Admin only, for pending requests) */}
                  {isSuperAdmin && request.status === 'PENDING' && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      {reviewingId === request.id ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            {t('alertConfig:changeRequests.review.title')}
                          </label>
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder={t('alertConfig:changeRequests.review.placeholder')}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white h-20 mb-3"
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleReview(request.id!, 'APPROVED')}
                              disabled={reviewMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                            >
                              <CheckCircle size={18} />
                              {t('alertConfig:changeRequests.review.approve')}
                            </button>
                            <button
                              onClick={() => handleReview(request.id!, 'REJECTED')}
                              disabled={reviewMutation.isPending}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                            >
                              <XCircle size={18} />
                              {t('alertConfig:changeRequests.review.reject')}
                            </button>
                            <button
                              onClick={() => {
                                setReviewingId(null);
                                setReviewNotes('');
                              }}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                            >
                              {t('alertConfig:changeRequests.review.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReviewingId(request.id!)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                          <MessageSquare size={18} />
                          {t('alertConfig:changeRequests.review.reviewButton')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center text-gray-400">
                {statusFilter
                  ? t('alertConfig:changeRequests.empty.filtered', {
                      status: statusFilter.toLowerCase(),
                    })
                  : t('alertConfig:changeRequests.empty.all')}
              </div>
            )}
          </div>
        )}

        {requests && requests.length > 0 && (
          <div className="mt-4 text-sm text-gray-400">
            {t('alertConfig:changeRequests.count', { count: requests.length })}
          </div>
        )}
      </div>
    </>
  );
};

export default ChangeRequestsPage;
