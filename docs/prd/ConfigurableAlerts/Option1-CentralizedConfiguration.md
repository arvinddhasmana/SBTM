# Option 1: Centralized Configuration Management (Super Admin Control)

**Document Owner:** Product and Architecture
**Last Updated:** 2026-04-29
**Status:** Implementation In Progress
**Scope:** Centralized alert and notification configuration controlled by Super Admin

---

## Executive Summary

Option 1 implements a centralized configuration system where the Super Admin has full control over all alert and notification rules, workflows, escalation timing, and notification routing. Board and School Admins have **read-only access** to view current configuration settings.

This approach ensures consistency across all boards and schools while allowing Super Admin to respond to configuration change requests through a simple in-app workflow.

---

## 1. Identified Hardcoded Rules & Workflows

### 1.1 Alert Classification Rules

**Location:** `services/emergency-alerts/src/modules/alerts/alert-classifier.service.ts:25-56`

**Currently Hardcoded:**
```typescript
// Tier 1 Events (Safety-critical, require confirmation)
PANIC_BUTTON, MEDICAL, INCIDENT, PANIC_ALERT

// Tier 2 Events (Operational, admin-only)
ROUTE_DEVIATION, LATE_ARRIVAL, ROUTE_DIVERSION, LATE_DEPARTURE, COMPLIANCE, OTHER

// Tier 3 Events (Informational, direct to parents)
Handled by presence service
```

**Configurable Parameters:**
- Event type to tier mapping
- Confirmation requirement per event type
- Parent notification rules per tier
- Custom event type definitions

---

### 1.2 Escalation Timing Rules

**Location:** `services/emergency-alerts/src/modules/alerts/alerts.service.ts:31-42`

**Currently Hardcoded:**
```typescript
CONFIRMATION_TIMEOUT_MS = 120,000  // 2 minutes
BOARD_ESCALATION_MS = 300,000      // 5 minutes
OSTA_ESCALATION_MS = 900,000       // 15 minutes
```

**Note:** These are now read from environment variables with defaults, but still not database-configurable.

**Configurable Parameters:**
- Confirmation timeout before auto-escalation to parents
- Time before escalating to Board Admin
- Time before escalating to OSTA Admin
- Different timing per tier or event type

---

### 1.3 Escalation Chain Hierarchy

**Location:** `services/emergency-alerts/src/modules/alerts/alerts.processor.ts:121-300`

**Currently Hardcoded:**
- Fixed escalation path: School Admin → Board Admin → OSTA Admin
- Notification channels per level
- State guards for escalation

**Configurable Parameters:**
- Escalation level order
- Notification channels per level (WebSocket, Push, SMS, Email)
- Time thresholds per level
- Skip levels or add custom levels

---

### 1.4 Notification Routing Rules

**Location:** `services/emergency-alerts/src/modules/alerts/alerts.service.ts:78-153`

**Currently Hardcoded:**
- **Tier 1:** Hold parent notification until confirmation or timeout
- **Tier 2:** Admin-only, no parent notification
- **Tier 3:** Bypass confirmation, direct to parents
- **All Tiers:** Broadcast to admin WebSocket subscribers

**Configurable Parameters:**
- Notification audience per tier/event type
- Channel selection (WebSocket, Push, SMS, Email)
- Parent notification conditions and timing
- Mandatory vs. optional notifications

---

### 1.5 Alert Workflow Actions

**Location:** `services/emergency-alerts/src/modules/alerts/alerts.service.ts:159-402`

**Currently Hardcoded Actions:**
- `confirm()` - School Admin confirms alert
- `falseAlarm()` - School Admin marks as false alarm
- `requestInfo()` - School Admin requests more information
- `resolve()` - Admin resolves alert
- `addStatusUpdate()` - Add status update to alert

**Configurable Parameters:**
- Available actions per alert tier/status
- Role permissions per action
- Status transitions allowed
- Required fields for each action

---

## 2. Implementation Architecture

### 2.1 Database Schema

#### alert_event_type_config
```sql
CREATE TABLE alert_event_type_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) UNIQUE NOT NULL,
  tier VARCHAR(20) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  requires_confirmation BOOLEAN DEFAULT false,
  notify_parents BOOLEAN DEFAULT false,
  is_system_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### alert_escalation_config
```sql
CREATE TABLE alert_escalation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name VARCHAR(100) UNIQUE NOT NULL,
  tier VARCHAR(20) NOT NULL,
  confirmation_timeout_ms INTEGER,
  board_escalation_ms INTEGER,
  osta_escalation_ms INTEGER,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### alert_escalation_chain
```sql
CREATE TABLE alert_escalation_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name VARCHAR(100) NOT NULL,
  sequence_order INTEGER NOT NULL,
  escalation_level VARCHAR(50) NOT NULL,
  time_threshold_ms INTEGER NOT NULL,
  notification_channels JSON,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(config_name, sequence_order)
);
```

#### notification_routing_config
```sql
CREATE TABLE notification_routing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(20) NOT NULL,
  event_type VARCHAR(50),
  recipient_role VARCHAR(50) NOT NULL,
  notification_timing VARCHAR(50) NOT NULL,
  channels JSON NOT NULL,
  is_mandatory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### alert_workflow_config
```sql
CREATE TABLE alert_workflow_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_name VARCHAR(50) NOT NULL,
  allowed_for_tier VARCHAR(20) NOT NULL,
  allowed_for_status VARCHAR(50) NOT NULL,
  required_role VARCHAR(50) NOT NULL,
  requires_notes BOOLEAN DEFAULT false,
  status_transition VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(action_name, allowed_for_tier, allowed_for_status)
);
```

#### alert_config_audit
```sql
CREATE TABLE alert_config_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_table VARCHAR(100) NOT NULL,
  config_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  changed_by_user_id UUID NOT NULL,
  changed_by_role VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### alert_config_change_request (Optional Enhancement)
```sql
CREATE TABLE alert_config_change_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by_user_id UUID NOT NULL,
  requested_by_role VARCHAR(50) NOT NULL,
  config_type VARCHAR(100) NOT NULL,
  change_description TEXT NOT NULL,
  current_config JSONB,
  requested_config JSONB NOT NULL,
  justification TEXT,
  status VARCHAR(50) DEFAULT 'PENDING',
  reviewed_by_user_id UUID,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.2 Configuration Service Layer

#### AlertConfigService
```typescript
@Injectable()
export class AlertConfigService {
  private configCache: Map<string, any>;

  async getEventTypeConfig(eventType: string): Promise<AlertEventTypeConfig>
  async getEscalationConfig(tier: string): Promise<AlertEscalationConfig>
  async getEscalationChain(configName: string): Promise<EscalationStep[]>
  async getNotificationRouting(tier: string, eventType?: string): Promise<NotificationRoutingRule[]>
  async getWorkflowActions(tier: string, status: string): Promise<WorkflowAction[]>
  async refreshCache(): Promise<void>
  async invalidateCache(configType?: string): Promise<void>
}
```

---

### 2.3 API Endpoints

**Authorization:** All modification endpoints require `@Roles(Role.SUPER_ADMIN)`
**Read Access:** Board/School Admins can read configurations via dedicated read-only endpoints

#### Configuration Management
```
GET    /api/alert-config/event-types           [SUPER_ADMIN, BOARD_ADMIN, SCHOOL_ADMIN]
GET    /api/alert-config/event-types/:id       [SUPER_ADMIN, BOARD_ADMIN, SCHOOL_ADMIN]
POST   /api/alert-config/event-types           [SUPER_ADMIN]
PUT    /api/alert-config/event-types/:id       [SUPER_ADMIN]
DELETE /api/alert-config/event-types/:id       [SUPER_ADMIN]

GET    /api/alert-config/escalation            [SUPER_ADMIN, BOARD_ADMIN, SCHOOL_ADMIN]
POST   /api/alert-config/escalation            [SUPER_ADMIN]
PUT    /api/alert-config/escalation/:id        [SUPER_ADMIN]

GET    /api/alert-config/escalation-chain      [SUPER_ADMIN, BOARD_ADMIN, SCHOOL_ADMIN]
POST   /api/alert-config/escalation-chain      [SUPER_ADMIN]
PUT    /api/alert-config/escalation-chain/:id  [SUPER_ADMIN]

GET    /api/alert-config/notification-routing  [SUPER_ADMIN, BOARD_ADMIN, SCHOOL_ADMIN]
POST   /api/alert-config/notification-routing  [SUPER_ADMIN]
PUT    /api/alert-config/notification-routing/:id [SUPER_ADMIN]

GET    /api/alert-config/workflow              [SUPER_ADMIN, BOARD_ADMIN, SCHOOL_ADMIN]
POST   /api/alert-config/workflow              [SUPER_ADMIN]
PUT    /api/alert-config/workflow/:id          [SUPER_ADMIN]

GET    /api/alert-config/audit-log             [SUPER_ADMIN]
```

#### Configuration Change Requests (Simple)
```
POST   /api/alert-config/change-requests       [BOARD_ADMIN, SCHOOL_ADMIN]
GET    /api/alert-config/change-requests       [SUPER_ADMIN, BOARD_ADMIN, SCHOOL_ADMIN]
PUT    /api/alert-config/change-requests/:id/approve [SUPER_ADMIN]
PUT    /api/alert-config/change-requests/:id/reject  [SUPER_ADMIN]
```

---

### 2.4 Frontend UI Components

#### Super Admin Configuration Pages

1. **Alert Configuration Dashboard**
   - Overview of all configurations
   - Configuration health status
   - Recent configuration changes
   - Pending change requests

2. **Event Type Configuration**
   - List all event types with tier assignment
   - Add/edit/delete event types
   - Configure confirmation and notification settings

3. **Escalation Timing Configuration**
   - Configure timeout values for each tier
   - Visual timeline showing escalation stages

4. **Escalation Chain Configuration**
   - Visual flow diagram of escalation chain
   - Configure notification channels per level

5. **Notification Routing Configuration**
   - Matrix view: Event Types × Recipient Roles
   - Configure channels per recipient

6. **Workflow Actions Configuration**
   - Configure available actions per tier/status
   - Set role-based permissions

7. **Configuration Audit Log**
   - View all configuration changes
   - Filter by date, user, config type

8. **Change Requests Management**
   - View pending requests from Board/School Admins
   - Approve/reject with notes

#### Board/School Admin Read-Only Views

1. **Current Alert Settings**
   - View current event type configurations
   - View escalation timing
   - View notification routing rules
   - "Request Change" button for each setting

2. **Request Configuration Change**
   - Simple form to request changes
   - Describe desired change
   - Provide justification
   - View request status

---

## 3. Implementation Decisions

Based on user requirements:

### Q1: Board/School Admin Access
**Decision:** Read-only access to configuration settings
- Can view all current configurations
- Can submit change requests
- Cannot directly modify configurations

### Q3: Change Request Notifications
**Decision:** Keep it simple
- In-app notification counter for Super Admin
- Email notification on new request (optional)
- No complex workflow automation

### Q5: Migration Strategy
**Decision:** Maintain current hardcoded values as defaults
- Migrate existing hardcoded values to database as "system defaults"
- Mark as `is_system_default = true`
- Preserve exact current behavior initially

### Q7: Test Mode
**Decision:** No test mode in initial implementation
- Can be added as future enhancement
- Focus on core functionality first

### Q8: Configuration Templates
**Decision:** No preset templates
- Start with single default configuration
- Templates can be added as future enhancement

### Q9: Configuration Caching
**Decision:** Application-level caching with invalidation
- Cache configuration in memory for performance
- Invalidate cache on configuration changes
- Use Redis for distributed cache (optional)
- Refresh cache across all service instances

### Q10: Configuration Changes Take Effect
**Decision:** Immediately
- Cache invalidation triggers immediate effect
- In-flight alerts continue with old configuration
- New alerts use new configuration
- Clear messaging to Super Admin about impact

---

## 4. Migration Plan

### Phase 1: Database Setup (Week 1)
- Create migration scripts
- Create configuration tables
- Seed default configurations from current hardcoded values
- Test data integrity

### Phase 2: Configuration Service (Week 2)
- Implement AlertConfigService with caching
- Implement cache invalidation mechanism
- Create configuration DTOs
- Write unit tests

### Phase 3: Refactor Alert Processing (Week 3)
- Update AlertClassifierService to use configuration
- Update AlertsService to use configuration
- Update AlertsProcessor to use configuration
- Backward compatibility testing

### Phase 4: Backend API (Week 4)
- Create AlertConfigController
- Create AlertConfigGatewayService
- Implement all CRUD endpoints
- Implement audit logging
- Write integration tests

### Phase 5: Frontend UI - Super Admin (Week 5-6)
- Create configuration dashboard
- Create event type configuration page
- Create escalation configuration pages
- Create notification routing page
- Create audit log viewer

### Phase 6: Frontend UI - Board/School Admin (Week 7)
- Create read-only configuration views
- Create change request form
- Create request status tracking

### Phase 7: Testing & Documentation (Week 8)
- End-to-end testing
- Performance testing
- Documentation updates
- Training materials

---

## 5. Testing Strategy

### Unit Tests
- Configuration service tests
- Alert classifier with configuration
- Alert service with configuration
- Cache invalidation tests

### Integration Tests
- Configuration CRUD operations
- Alert processing with configuration
- Cache synchronization tests
- Configuration change impact tests

### E2E Tests
- Super Admin configuration workflow
- Board Admin read-only access
- Change request workflow
- Alert processing with custom configuration

---

## 6. Success Criteria

- ✅ All hardcoded alert rules moved to database
- ✅ Super Admin can configure all alert settings via UI
- ✅ Board/School Admins have read-only access
- ✅ Configuration changes take effect immediately
- ✅ Configuration changes are fully audited
- ✅ All tests passing (unit, integration, E2E)
- ✅ Documentation updated
- ✅ Zero downtime migration from hardcoded to configurable

---

## 7. Future Enhancements

- Test mode for simulating alerts
- Configuration templates
- Configuration versioning and rollback
- Configuration comparison tools
- Automated configuration validation
- Configuration export/import
- Multi-tenancy support (Option 2)
