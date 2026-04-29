export interface EventTypeConfig {
  eventType: string;
  tier: string;
  description?: string;
  severity?: string;
  requiresLocation?: boolean;
  isActive?: boolean;
}

export interface EscalationConfig {
  id?: string;
  tier: string;
  confirmationTimeoutMs?: number;
  boardEscalationMs?: number;
  ostaEscalationMs?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface NotificationRoutingConfig {
  id?: string;
  tier: string;
  eventType?: string;
  recipientRole: string;
  notificationTiming: string;
  channels: string[];
  isMandatory: boolean;
  isActive?: boolean;
}

export interface WorkflowConfig {
  id?: string;
  actionName: string;
  allowedForTier: string;
  allowedForStatus: string;
  requiredRole: string;
  requiresNotes: boolean;
  statusTransition?: string;
  isActive?: boolean;
}

export interface ChangeRequest {
  id?: string;
  configType: string;
  changeDescription: string;
  requestedConfig: Record<string, any>;
  justification?: string;
  status?: string;
  requestorId?: string;
  requestorRole?: string;
  requestorEmail?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  requestedAt?: string;
  reviewedAt?: string;
}

export interface ConfigAuditLog {
  id?: string;
  configTable: string;
  configId: string;
  action: string;
  changedByUserId: string;
  changedByRole: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changeReason?: string;
  changedAt?: string;
}
