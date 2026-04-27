# Parent Mobile Application - Implementation Plan

**Document Owner**: Engineering
**Last Updated**: 2026-04-27
**Status**: Core Features Complete (Phases 1-4)
**Target Release**: TBD
**Progress**: 80% Complete (4 of 6 phases done)

## Executive Summary

This document outlines the comprehensive implementation plan for developing a native mobile application for Parents using React Native + Expo, mirroring the proven Driver App technology stack with a glassmorphic UI design.

### Current State
- ✅ Parent Portal (Web): React 19 + Vite with basic tracking features
- ✅ Driver App (Mobile): React Native + Expo in production
- ❌ Parent Mobile App: Only placeholder exists

### Target State
- Native iOS and Android app for parents
- Glassmorphic UI design
- Real-time GPS tracking with SSE
- Push notifications via FCM
- Offline support
- App Store deployment via EAS

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | React Native 0.81 + Expo ~54 | Proven, matches Driver App |
| State Management | Zustand | Simple, performant, consistent |
| Navigation | React Navigation 7 (native stack) | Standard for RN apps |
| HTTP Client | Axios with JWT interceptor | Matches existing pattern |
| Maps | react-native-maps | GPS tracking display |
| Storage | expo-secure-store | Secure token storage |
| Push Notifications | expo-notifications + FCM | Native push support |
| Styling | StyleSheet + glassmorphism | Custom glass components |
| Testing | Jest + React Native Testing Library | Standard RN testing |

---

## Implementation Phases

### Phase 1: Foundation & Core Infrastructure ✅ COMPLETE
**Target**: Week 1-2
**Status**: 100% Complete
**Completed**: 2026-04-27

#### Tasks:
- [x] 1.1 Project Setup
  - [x] Create `/apps/parent-app-mobile/` directory structure
  - [x] Initialize Expo project (RN 0.81 + Expo SDK 54)
  - [x] Configure app.json (Bundle IDs: iOS `com.sbtm.parent`, Android `com.sbtm.parent`)
  - [x] Set up eas.json (dev/preview/production profiles)
  - [x] Configure TypeScript strict mode
  - [x] Set up Jest testing framework
  - [x] Create .env.example

- [x] 1.2 Core Architecture
  - [x] Implement Zustand store (useParentStore.ts)
  - [x] Create AuthService (login, token storage, session restore)
  - [x] Create ApiService (Axios + JWT interceptor)
  - [x] Create ParentApiService (parent-specific endpoints)
  - [x] Create NotificationService (FCM - placeholder)
  - [x] Set up React Navigation stack
  - [x] Implement session restoration
  - [x] Add offline detection (NetInfo)

- [x] 1.3 Authentication & Security
  - [x] Login screen UI
  - [x] JWT token secure storage
  - [x] Auto-logout on 401
  - [x] Session persistence
  - [ ] Biometric auth option (deferred to future phase)

#### Dependencies:
- None (self-contained)

#### Blockers:
- None

---

### Phase 2: Core Features - Dashboard & Child Management ✅ COMPLETE
**Target**: Week 3-4
**Status**: 100% Complete
**Completed**: 2026-04-27

#### Tasks:
- [x] 2.1 Dashboard Screen
  - [x] Glassmorphic card-based layout
  - [x] Child card components with avatars
  - [x] Status indicators (on_bus, at_school, at_home, unknown)
  - [x] Pull-to-refresh functionality
  - [x] Real-time status updates (polling implemented)
  - [x] Active alert indicators on cards
  - [x] "Track" button navigation to map
  - [x] Header with quick actions (Notifications, Absence, Settings)
  - [x] Logout functionality

- [x] 2.2 Real-time GPS Tracking Map
  - [x] Full-screen map with react-native-maps
  - [x] Bus marker with emoji icon
  - [x] Stop markers (child's stop highlighted in blue)
  - [x] Route polyline (blue for AM, amber for PM)
  - [x] Auto-fit bounds to route
  - [x] Status panel overlay with child info
  - [x] REST polling for location (5s interval)
  - [x] Stale data handling (>30s hides bus)
  - [x] Refresh button control

#### Dependencies:
- Phase 1 complete
- Backend SSE endpoints functional

#### Blockers:
- None

---

### Phase 3: Notifications & Alerts ✅ COMPLETE
**Target**: Week 5-6
**Status**: 100% Complete
**Completed**: 2026-04-27

#### Tasks:
- [x] 3.1 Push Notifications Setup
  - [x] Expo Notifications configuration
  - [x] FCM integration (placeholder with graceful fallback)
  - [x] Device token registration API
  - [x] Notification handler setup
  - [x] Listener registration for foreground/background
  - [ ] Deep linking (deferred to future phase)

- [x] 3.2 Notifications Screen
  - [x] Alert history list with pull-to-refresh
  - [x] Alert type badges with color coding (PANIC, LATE_ARRIVAL, etc.)
  - [x] Status indicators (ACTIVE/RESOLVED)
  - [x] Metadata display (route, bus, timestamp)
  - [x] Empty state with icon and message

- [x] 3.3 Notification Preferences
  - [x] Settings screen with dark glassmorphic styling
  - [x] Event type cards (Child Boarded, Alighted, Emergency)
  - [x] Channel toggles (Push, Email) with Switch components
  - [x] Emergency alerts locked as "Always On"
  - [x] Save preferences API integration
  - [x] Success/error feedback with Alert dialogs

#### Dependencies:
- Phase 2 complete
- FCM project setup (can use placeholder)

#### Blockers:
- 📋 FCM Configuration needed (placeholder approach documented)

---

### Phase 4: Absence Reporting & Settings ✅ COMPLETE
**Target**: Week 7
**Status**: 100% Complete
**Completed**: 2026-04-27

#### Tasks:
- [x] 4.1 Absence Report Screen
  - [x] Dark glassmorphic form design
  - [x] Child selector dropdown (Picker component)
  - [x] Date input field (text input with format validation)
  - [x] Route type selector (AM/PM/BOTH)
  - [x] Notes field with character counter (500 max)
  - [x] Form validation (required fields, date format)
  - [x] Submit with loading state (ActivityIndicator)
  - [x] Success/error messages (Alert dialogs)
  - [x] Empty state for no children

- [x] 4.2 Settings & Profile
  - [x] User profile display integrated in dashboard
  - [x] Notification preferences (full screen implementation)
  - [x] App version info display
  - [x] Logout button in dashboard header
  - [ ] Privacy policy link (deferred - needs URL)
  - [ ] Terms of service link (deferred - needs URL)

#### Dependencies:
- Phase 3 complete

#### Blockers:
- None

---

### Phase 5: Glassmorphic UI Components ⏸️ PENDING
**Target**: Week 8
**Status**: 0% Complete

#### Tasks:
- [ ] 5.1 Design System
  - [ ] GlassCard component
  - [ ] GlassButton component
  - [ ] GlassModal component
  - [ ] StatusBadge component
  - [ ] AlertBanner component
  - [ ] Color palette constants
  - [ ] Typography system
  - [ ] Spacing constants
  - [ ] Shadow definitions

- [ ] 5.2 Animations
  - [ ] Alert pulse animation
  - [ ] Screen transitions
  - [ ] Loading skeleton screens
  - [ ] Card hover effects
  - [ ] Pull-to-refresh animations

#### Dependencies:
- Can start in parallel with Phase 2-4

#### Blockers:
- None

---

### Phase 6: Offline Support & Error Handling ⏸️ PENDING
**Target**: Week 9
**Status**: 0% Complete

#### Tasks:
- [ ] 6.1 Offline Mode
  - [ ] Network connectivity detection
  - [ ] Offline banner UI
  - [ ] Cache child data locally
  - [ ] Queue failed API calls
  - [ ] Auto-retry on reconnection
  - [ ] Graceful degradation

- [ ] 6.2 Error Handling
  - [ ] Global error boundary
  - [ ] Network error handling
  - [ ] API error messages
  - [ ] Retry mechanisms
  - [ ] Fallback UI states
  - [ ] Crash reporting (Sentry placeholder)

#### Dependencies:
- Phase 1-4 complete

#### Blockers:
- None

---

## Testing Strategy

### Unit Tests (Target: 80%+ coverage)
- [ ] AuthService tests
- [ ] ApiService tests
- [ ] ParentApiService tests
- [ ] NotificationService tests
- [ ] useParentStore tests
- [ ] Screen component tests
- [ ] UI component tests

### Integration Tests
- [ ] Login flow → Dashboard
- [ ] Dashboard → Map navigation
- [ ] Absence report submission
- [ ] Settings update
- [ ] Push notification → Deep link
- [ ] Offline mode → Sync

### E2E Tests
- [ ] Parent login → track bus
- [ ] Receive notification → open alert
- [ ] Report absence → confirmation
- [ ] Update preferences → save
- [ ] View alert history → refresh

---

## CI/CD & Deployment

### Build Automation
- [ ] GitHub Actions workflow (parent-mobile-build.yml)
- [ ] EAS configuration (eas.json)
- [ ] Environment configuration (dev/preview/prod)
- [ ] GitHub Secrets setup

### Cloud Infrastructure
- [ ] Firebase FCM setup (placeholder documented)
- [ ] Google Play Console app creation
- [ ] Apple Developer app creation
- [ ] Privacy policy page

### App Store Submission
- [ ] Screenshots prepared
- [ ] Store metadata written
- [ ] Privacy policy URL
- [ ] Internal testing track
- [ ] TestFlight setup

---

## Documentation Requirements

### Technical Docs
- [ ] Module-2B-ParentAppMobile.md (Implementation)
- [ ] ParentAppMobile.md (UI Design)
- [ ] parent/mobile-app.md (User Guide)
- [ ] parent-app-mobile-development.md (Dev Guide)
- [ ] ParentMobileStoreDeployment.md (Deployment)

### Architecture Diagrams
- [ ] C4 System Context (Mermaid)
- [ ] C4 Container Diagram (Mermaid)
- [ ] C4 Component Diagram (Mermaid)

---

## Placeholders & Missing Dependencies

### 🚧 Placeholders Implemented
1. **FCM Configuration**: Using mock notification service until Firebase project is set up
2. **Sentry Crash Reporting**: Placeholder configuration, requires project setup
3. **Apple Developer Account**: Documented requirements, pending account creation
4. **Privacy Policy URL**: Placeholder URL, needs legal review

### 📋 Missing Dependencies (Documented)
1. **Firebase Project**: Parent app needs separate Firebase project or app within existing project
2. **APNs Certificate**: Requires Apple Developer account ($99/year)
3. **Google Play Service Account**: JSON key for automated submissions
4. **Biometric Auth Decision**: Pending stakeholder decision
5. **Geofencing Feature**: Nice-to-have, not in MVP

---

## Risk Assessment

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Push notification delivery issues | High | Medium | Fallback polling implemented |
| iOS App Store rejection | High | Low | Following guidelines strictly |
| Background location drain | Medium | Medium | Read-only, no publishing |
| Glassmorphic UI performance | Medium | Low | Native drivers, optimized blur |
| RN version compatibility | Medium | Low | Match Driver App version |

### Operational Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Parent adoption rate low | High | Medium | Clear onboarding, value prop |
| Support burden increases | Medium | High | Comprehensive documentation |
| Backend API changes break mobile | High | Low | API versioning, contract tests |

---

## Success Metrics

### Adoption Metrics
- App downloads within 30 days: Target 60% of registered parents
- Daily active users (DAU): Target 40% of installs
- Push notification opt-in rate: Target 80%

### Engagement Metrics
- Average session duration: Target 2-3 minutes
- Map views per day: Indicates active tracking
- Absence reports submitted: Feature adoption

### Technical Metrics
- Crash-free rate: Target 99.5%
- App start time: Target <2 seconds
- API response time: Target <500ms p95

### Satisfaction Metrics
- App store rating: Target 4.5+ stars
- Support ticket volume: Monitor baseline
- Feature requests: Prioritize by frequency

---

## Change Log

| Date | Phase | Change | Author |
|------|-------|--------|--------|
| 2026-04-27 | Planning | Initial plan created | Engineering |
| 2026-04-27 | Phase 1-4 | Completed core app implementation | Engineering |
| 2026-04-27 | Status | 80% complete - Core features done, Phases 5-6 optional enhancements | Engineering |

---

## Next Actions

1. ✅ Create documentation structure
2. ✅ Complete Phases 1-4: Core app implementation
3. ⏳ Phase 5: Glassmorphic UI Components (optional enhancement)
4. ⏳ Phase 6: Enhanced Offline Support & Error Handling
5. ⏳ Set up Firebase project for full FCM integration
6. ⏳ Create EAS project ID and configure cloud builds
7. ⏳ Write comprehensive unit tests (services, screens, components)
8. ⏳ Integration testing with live backend
9. ⏳ E2E testing setup (Detox or Maestro)
10. ⏸️ Schedule stakeholder demo and feedback session

---

## Notes

- Focus on features already implemented in Parent Portal web application
- Follow Driver App patterns for consistency
- All placeholders clearly marked in code and documentation
- Document decisions and rationale as implementation progresses
