# Option 2: Delegated Configuration Management (Multi-Level Control)

**Document Owner:** Product and Architecture
**Last Updated:** 2026-04-29
**Status:** Future Enhancement
**Scope:** Delegated alert and notification configuration with Board and School Admin control
**Prerequisites:** Option 1 must be fully implemented first

---

## Executive Summary

Option 2 extends Option 1 by allowing Super Admin to delegate specific configuration controls to Board Admins and School Admins. This creates a three-tier configuration hierarchy where settings can be overridden at each level within defined constraints.

This approach provides flexibility for local customization while maintaining system-wide consistency through constraint enforcement and approval workflows.

---

## 1. Configuration Hierarchy

### 1.1 Three-Tier Model

```
SYSTEM (Super Admin)
  └── BOARD (Board Admin)
       └── SCHOOL (School Admin)
```

**Resolution Order:** School → Board → System (most specific to most general)

### 1.2 Scope-Specific Overrides

Each configuration setting can exist at multiple levels:
- **System Level:** Default configuration set by Super Admin
- **Board Level:** Board-specific override (if delegation allows)
- **School Level:** School-specific override (if delegation allows)

When resolving configuration for a specific school:
1. Check for school-level override
2. If not found, check for board-level override
3. If not found, use system-level default

---

## 2. Extended Database Schema

### 2.1 Scope Configuration Table

```sql
CREATE TABLE alert_config_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type VARCHAR(50) NOT NULL,     -- SYSTEM, BOARD, SCHOOL
  scope_id UUID,                        -- NULL for SYSTEM, boardId/schoolId for others
  config_type VARCHAR(100) NOT NULL,   -- EVENT_TYPE, ESCALATION, ROUTING, etc.
  config_key VARCHAR(200) NOT NULL,    -- Specific config identifier
  config_value JSONB NOT NULL,         -- Configuration data
  is_active BOOLEAN DEFAULT true,
  managed_by_role VARCHAR(50) NOT NULL,-- Who can edit this config
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scope_type, scope_id, config_type, config_key)
);

CREATE INDEX idx_config_scope_lookup ON alert_config_scope(scope_type, scope_id, config_type);
```

### 2.2 Delegation Rules Table

```sql
CREATE TABLE alert_config_delegation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type VARCHAR(100) NOT NULL,
  config_key VARCHAR(200) NOT NULL,
  can_be_overridden_by_board BOOLEAN DEFAULT false,
  can_be_overridden_by_school BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  approval_by_role VARCHAR(50),
  min_value NUMERIC,                   -- For numeric configs
  max_value NUMERIC,                   -- For numeric configs
  allowed_values JSON,                 -- For enum-type configs
  validation_rule TEXT,                -- Custom validation expression
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(config_type, config_key)
);
```

---

## 3. Delegatable Configuration Settings

### 3.1 Priority 1: Escalation Timing (Recommended First)

**Business Value:** High - Different schools have different response capabilities
**Risk:** Low - Constrained by min/max values

| Configuration | Board Override | School Override | Constraints |
|--------------|----------------|-----------------|-------------|
| Confirmation Timeout | ✓ Yes | ✓ Yes | Min: 60s, Max: 600s (10 min) |
| Board Escalation Time | ✓ Yes | ✗ No | Min: 180s, Max: 900s (15 min) |
| OSTA Escalation Time | ✗ No | ✗ No | System-controlled only |

**Rationale:**
- Schools with faster response times can reduce confirmation timeout
- Board escalation should be controlled at board level
- OSTA escalation is system-wide policy

### 3.2 Priority 2: Notification Channels (Medium Priority)

**Business Value:** Medium - Schools may have different communication preferences
**Risk:** Low - Cannot disable mandatory notifications

| Configuration | Board Override | School Override | Constraints |
|--------------|----------------|-----------------|-------------|
| Parent Notification Channels | ✓ Yes | ✓ Yes | Cannot disable PUSH for Tier 1 |
| Admin Notification Channels | ✓ Yes | ✓ Yes | Cannot disable WebSocket |
| SMS Notifications | ✓ Yes | ✓ Yes | Optional, budget-dependent |
| Email Notifications | ✓ Yes | ✓ Yes | Optional |

**Rationale:**
- Schools can optimize for their parent population
- Critical channels remain mandatory
- Cost-sensitive features can be toggled

### 3.3 Priority 3: Event Type Customization (Lower Priority)

**Business Value:** High - Schools may have unique event types
**Risk:** Medium - Could lead to inconsistency

| Configuration | Board Override | School Override | Constraints |
|--------------|----------------|-----------------|-------------|
| Add Custom Event Types | ✓ Yes | ✓ Yes | Must specify tier |
| Change Event Tier | ✗ No | ✗ No | System-controlled |
| Enable/Disable Event Types | ✓ Yes | ✓ Yes | Cannot disable Tier 1 events |

**Rationale:**
- Schools can create custom operational alerts
- Safety-critical tier assignments remain system-controlled
- Prevents gaming the system by downgrading alert tiers

### 3.4 Not Delegatable

These remain system-controlled in all cases:
- Alert tier definitions (Tier 1, 2, 3)
- Tier workflow rules (confirmation requirements)
- Escalation chain structure (School → Board → OSTA)
- Workflow action permissions
- Audit logging settings

---

## 4. Configuration Resolution Service

### 4.1 ConfigResolverService

```typescript
@Injectable()
export class ConfigResolverService {
  /**
   * Resolve configuration with scope hierarchy
   * Priority: School > Board > System
   */
  async resolveConfig<T>(
    configType: string,
    configKey: string,
    schoolId?: string,
    boardId?: string
  ): Promise<T> {
    // Check school-level override
    if (schoolId) {
      const schoolConfig = await this.getConfig('SCHOOL', schoolId, configType, configKey);
      if (schoolConfig) return schoolConfig.config_value as T;
    }

    // Check board-level override
    if (boardId) {
      const boardConfig = await this.getConfig('BOARD', boardId, configType, configKey);
      if (boardConfig) return boardConfig.config_value as T;
    }

    // Fallback to system default
    const systemConfig = await this.getConfig('SYSTEM', null, configType, configKey);
    if (systemConfig) return systemConfig.config_value as T;

    throw new NotFoundException(`Configuration not found: ${configType}.${configKey}`);
  }

  /**
   * Check if user can override this configuration
   */
  async canOverride(
    configType: string,
    configKey: string,
    role: Role,
    scopeType: string
  ): Promise<boolean> {
    const delegation = await this.getDelegationRule(configType, configKey);
    if (!delegation) return false;

    if (role === Role.BOARD_ADMIN && scopeType === 'BOARD') {
      return delegation.can_be_overridden_by_board;
    }

    if (role === Role.SCHOOL_ADMIN && scopeType === 'SCHOOL') {
      return delegation.can_be_overridden_by_school;
    }

    return false;
  }

  /**
   * Validate override value against constraints
   */
  async validateOverride(
    configType: string,
    configKey: string,
    value: any
  ): Promise<ValidationResult> {
    const delegation = await this.getDelegationRule(configType, configKey);
    if (!delegation) {
      return { valid: false, error: 'Configuration not delegatable' };
    }

    // Numeric constraints
    if (delegation.min_value !== null && value < delegation.min_value) {
      return { valid: false, error: `Value must be >= ${delegation.min_value}` };
    }
    if (delegation.max_value !== null && value > delegation.max_value) {
      return { valid: false, error: `Value must be <= ${delegation.max_value}` };
    }

    // Enum constraints
    if (delegation.allowed_values && !delegation.allowed_values.includes(value)) {
      return { valid: false, error: `Value must be one of: ${delegation.allowed_values.join(', ')}` };
    }

    return { valid: true };
  }
}
```

---

## 5. Extended API Endpoints

### 5.1 Delegated Configuration Management

```
// Get available configurations for current user's scope
GET    /api/alert-config/delegated/available
       Returns list of configurations user can override

// Get current configuration values for user's scope (with inheritance)
GET    /api/alert-config/delegated/current
       Returns effective configuration with source (system/board/school)

// Update scope-specific configuration
PUT    /api/alert-config/delegated/:configType/:configKey
       Body: { value: any, justification?: string }
       Authorization: Board Admin (for board scope), School Admin (for school scope)

// Reset to parent scope (remove override)
DELETE /api/alert-config/delegated/:configType/:configKey
       Removes override, falls back to parent scope

// View configuration inheritance chain
GET    /api/alert-config/delegated/inheritance/:configType/:configKey
       Shows system → board → school chain with values at each level
```

### 5.2 Delegation Rule Management (Super Admin Only)

```
// Get all delegation rules
GET    /api/alert-config/delegation
       Authorization: SUPER_ADMIN

// Update delegation rules
PUT    /api/alert-config/delegation/:configType/:configKey
       Body: { can_be_overridden_by_board, can_be_overridden_by_school, constraints }
       Authorization: SUPER_ADMIN

// View current overrides across system
GET    /api/alert-config/delegation/overrides
       Shows all active overrides by board/school
       Authorization: SUPER_ADMIN
```

---

## 6. Frontend UI Components

### 6.1 Super Admin: Delegation Management

**New Page:** `/admin/alert-config/delegation`

**Features:**
- List all configuration types and keys
- Toggle delegation to Board Admin / School Admin
- Set constraints (min/max values, allowed values)
- Require approval for overrides
- View current overrides across system

**UI Pattern:**
```
Configuration: Confirmation Timeout
├── Can be overridden by Board Admin: [✓] Yes
├── Can be overridden by School Admin: [✓] Yes
├── Minimum Value: [60] seconds
├── Maximum Value: [600] seconds
├── Requires Approval: [ ] No
└── Current Overrides: [View] (3 boards, 12 schools have overrides)
```

### 6.2 Board/School Admin: My Alert Settings

**New Page:** `/admin/alert-settings`

**Features:**
- Shows all configurable settings for user's scope
- Inherited settings shown in gray with source label
- Overridden settings highlighted with edit controls
- "Reset to Default" option for overridden settings
- Visual inheritance chain

**UI Pattern:**
```
Escalation Timing Settings

Confirmation Timeout: [120] seconds [Edit]
├── Your Setting: 120 seconds
├── Board Default: 90 seconds (inherited)
└── System Default: 120 seconds

[Reset to Board Default]
```

### 6.3 Configuration Preview

**Feature:** "Preview Impact"
- Shows which routes/schools affected by change
- Displays before/after comparison
- Confirms user understands scope of change

---

## 7. Implementation Phases

### Phase 1: Extend Schema (2 weeks)
- Add scope and delegation tables
- Create migration scripts
- Seed delegation rules

### Phase 2: Configuration Resolver (2 weeks)
- Implement ConfigResolverService
- Add validation logic
- Update caching strategy for multi-level configs

### Phase 3: Update Alert Processing (2 weeks)
- Modify services to use ConfigResolver
- Pass schoolId/boardId context through call chain
- Test scope resolution

### Phase 4: Backend API (3 weeks)
- Implement delegated configuration endpoints
- Implement delegation management endpoints
- Add authorization checks
- Write integration tests

### Phase 5: Frontend UI (4 weeks)
- Super Admin delegation management page
- Board/School Admin settings pages
- Configuration preview components
- Inheritance visualization

### Phase 6: Testing & Rollout (2 weeks)
- End-to-end testing
- Pilot with selected boards
- Training for Board/School Admins
- Documentation

**Total Timeline:** ~15 weeks (after Option 1 completion)

---

## 8. Rollout Strategy

### Phase 1: Pilot (Weeks 1-2)
- Enable delegation for 1-2 friendly boards
- Limited to escalation timing only
- Collect feedback

### Phase 2: Expand Scope (Weeks 3-4)
- Enable notification channel delegation
- Add more boards to pilot
- Monitor for issues

### Phase 3: General Availability (Weeks 5-6)
- Enable for all boards
- Full delegation capabilities
- Ongoing support

---

## 9. Risk Mitigation

### Risk: Configuration Fragmentation
**Mitigation:**
- Clear inheritance visualization
- Super Admin can view all overrides
- Regular audits of overrides
- Documentation of best practices

### Risk: Constraint Violations
**Mitigation:**
- Server-side validation
- Clear error messages
- Preview before save
- Automatic constraint checking

### Risk: Performance Impact
**Mitigation:**
- Cache resolved configurations per scope
- Optimize database queries with indexes
- Batch configuration loading
- Monitor query performance

### Risk: User Confusion
**Mitigation:**
- Clear UI showing inheritance
- Tooltips explaining each setting
- Training materials
- Help documentation

---

## 10. Success Criteria

- ✅ Board Admins can override delegated settings within constraints
- ✅ School Admins can override delegated settings within constraints
- ✅ Configuration resolution follows correct hierarchy
- ✅ Constraints are enforced server-side
- ✅ Overrides do not affect other boards/schools
- ✅ Performance remains acceptable (<100ms config resolution)
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Training delivered

---

## 11. Future Enhancements

- Approval workflow for high-risk overrides
- Configuration templates per board/school type
- Bulk configuration operations
- Configuration comparison tools
- Override expiration dates
- Scheduled configuration changes
- A/B testing of configurations
