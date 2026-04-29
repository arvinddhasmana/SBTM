import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, CheckCircle, XCircle, MessageSquare, Send } from 'lucide-react';
import { alertConfigApi } from '../services/api/alert-config.api';
import type { ChangeRequest } from '../types/alert-config';
import { useAuth } from '../context/AuthContext';

export const ChangeRequestsPage: React.FC = () => {
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
    if (
      !reviewNotes &&
      !confirm(`Are you sure you want to ${action.toLowerCase()} this request without notes?`)
    ) {
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
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-yellow-400" />
            <h1 className="text-3xl font-bold text-white">Configuration Change Requests</h1>
          </div>
          {!isSuperAdmin && (
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Send size={20} />
              {isCreating ? 'Cancel' : 'Submit Request'}
            </button>
          )}
        </div>
        <p className="text-gray-400">
          {isSuperAdmin
            ? 'Review and approve/reject configuration change requests from admins'
            : 'Submit requests for configuration changes and track their status'}
        </p>
      </div>

      {/* Create Request Form (Board/School Admin only) */}
      {!isSuperAdmin && isCreating && (
        <form
          onSubmit={handleCreateRequest}
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Submit Configuration Change Request</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Configuration Type
              </label>
              <select
                value={newRequest.configType}
                onChange={(e) => setNewRequest({ ...newRequest, configType: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="alert_event_type_config">Event Type Configuration</option>
                <option value="alert_escalation_config">Escalation Timing</option>
                <option value="notification_routing_config">Notification Routing</option>
                <option value="alert_workflow_config">Workflow Configuration</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Change Description *
              </label>
              <textarea
                value={newRequest.changeDescription}
                onChange={(e) =>
                  setNewRequest({ ...newRequest, changeDescription: e.target.value })
                }
                placeholder="Describe the change you would like to make..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white h-24"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Justification (Optional)
              </label>
              <textarea
                value={newRequest.justification}
                onChange={(e) => setNewRequest({ ...newRequest, justification: e.target.value })}
                placeholder="Explain why this change is needed..."
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
              Submit Request
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Status Filter */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-white font-semibold">Filter by Status</h3>
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
            All
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === 'PENDING'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === 'APPROVED'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === 'REJECTED'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="text-white">Loading change requests...</div>
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
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-gray-300 mb-2">{request.changeDescription}</p>
                    {request.justification && (
                      <div className="bg-gray-700 p-3 rounded-lg mb-2">
                        <p className="text-sm text-gray-400">
                          <span className="font-semibold">Justification:</span>{' '}
                          {request.justification}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>
                        Requested by: <span className="text-white">{request.requestorEmail}</span>
                      </span>
                      <span>
                        Date: <span className="text-white">{formatDate(request.requestedAt)}</span>
                      </span>
                    </div>
                    {request.reviewedBy && (
                      <div className="mt-2 text-sm text-gray-400">
                        <span>
                          Reviewed by: <span className="text-white">{request.reviewedBy}</span>
                        </span>
                        {request.reviewedAt && (
                          <span className="ml-4">
                            on <span className="text-white">{formatDate(request.reviewedAt)}</span>
                          </span>
                        )}
                      </div>
                    )}
                    {request.reviewNotes && (
                      <div className="mt-2 bg-gray-700 p-3 rounded-lg">
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold text-white">Review Notes:</span>{' '}
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
                          Review Notes (Optional)
                        </label>
                        <textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Add notes about your decision..."
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white h-20 mb-3"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReview(request.id!, 'APPROVED')}
                            disabled={reviewMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                          >
                            <CheckCircle size={18} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(request.id!, 'REJECTED')}
                            disabled={reviewMutation.isPending}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                          >
                            <XCircle size={18} />
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              setReviewingId(null);
                              setReviewNotes('');
                            }}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReviewingId(request.id!)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <MessageSquare size={18} />
                        Review Request
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center text-gray-400">
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} change requests found.`
                : 'No change requests found.'}
            </div>
          )}
        </div>
      )}

      {requests && requests.length > 0 && (
        <div className="mt-4 text-sm text-gray-400">
          Showing {requests.length} {requests.length === 1 ? 'request' : 'requests'}
        </div>
      )}
    </div>
  );
};

export default ChangeRequestsPage;
