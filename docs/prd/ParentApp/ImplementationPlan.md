# Parent Mobile Application - Implementation Plan

**Document Owner**: Engineering
**Last Updated**: 2026-04-27
**Status**: In Progress
**Target Release**: TBD

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

### Phase 1: Foundation & Core Infrastructure ⏳ IN PROGRESS
**Target**: Week 1-2
**Status**: 0% Complete

#### Tasks:
- [ ] 1.1 Project Setup
  - [ ] Create `/apps/parent-app-mobile/` directory structure
  - [ ] Initialize Expo project (RN 0.81 + Expo SDK 54)
  - [ ] Configure app.json (Bundle IDs: iOS `com.sbtm.parent`, Android `com.sbtm.parent`)
  - [ ] Set up eas.json (dev/preview/production profiles)
  - [ ] Configure TypeScript strict mode
  - [ ] Set up ESLint + Prettier
  - [ ] Create .env.example

- [ ] 1.2 Core Architecture
  - [ ] Implement Zustand store (useParentStore.ts)
  - [ ] Create AuthService (login, token storage, session restore)
  - [ ] Create ApiService (Axios + JWT interceptor)
  - [ ] Create ParentApiService (parent-specific endpoints)
  - [ ] Create NotificationService (FCM - placeholder)
  - [ ] Set up React Navigation stack
  - [ ] Implement session restoration
  - [ ] Add offline detection (NetInfo)

- [ ] 1.3 Authentication & Security
  - [ ] Login screen UI
  - [ ] JWT token secure storage
  - [ ] Auto-logout on 401
  - [ ] Session persistence
  - [ ] Biometric auth option (optional)

#### Dependencies:
- None (self-contained)

#### Blockers:
- None

---

### Phase 2: Core Features - Dashboard & Child Management ⏸️ PENDING
**Target**: Week 3-4
**Status**: 0% Complete

#### Tasks:
- [ ] 2.1 Dashboard Screen
  - [ ] Glassmorphic card-based layout
  - [ ] Child card components
  - [ ] Status indicators (on_bus, at_school, at_home, unknown)
  - [ ] Pull-to-refresh
  - [ ] Real-time status updates (polling 15s)
  - [ ] Active alert banner
  - [ ] "Track Live" navigation

- [ ] 2.2 Real-time GPS Tracking Map
  - [ ] Full-screen map with react-native-maps
  - [ ] Bus marker (colored by status)
  - [ ] Stop markers (child's stop highlighted)
  - [ ] School marker
  - [ ] Route polyline
  - [ ] Auto-fit bounds
  - [ ] Status panel overlay
  - [ ] SSE connection with REST fallback
  - [ ] Stale data handling
  - [ ] Map controls

#### Dependencies:
- Phase 1 complete
- Backend SSE endpoints functional

#### Blockers:
- None

---

### Phase 3: Notifications & Alerts ⏸️ PENDING
**Target**: Week 5-6
**Status**: 0% Complete

#### Tasks:
- [ ] 3.1 Push Notifications Setup
  - [ ] Expo Notifications configuration
  - [ ] FCM integration (placeholder if not ready)
  - [ ] Device token registration
  - [ ] Foreground notification handling
  - [ ] Background notification handling
  - [ ] Deep linking

- [ ] 3.2 Notifications Screen
  - [ ] Alert history list
  - [ ] Alert type badges with colors
  - [ ] Status indicators
  - [ ] Pull-to-refresh
  - [ ] Empty state

- [ ] 3.3 Notification Preferences
  - [ ] Settings screen (glassmorphic)
  - [ ] Event type cards
  - [ ] Channel toggles (Push, Email)
  - [ ] Save preferences API
  - [ ] Success/error feedback

#### Dependencies:
- Phase 2 complete
- FCM project setup (can use placeholder)

#### Blockers:
- 📋 FCM Configuration needed (placeholder approach documented)

---

### Phase 4: Absence Reporting & Settings ⏸️ PENDING
**Target**: Week 7
**Status**: 0% Complete

#### Tasks:
- [ ] 4.1 Absence Report Screen
  - [ ] Light theme form design
  - [ ] Child selector dropdown
  - [ ] Date picker
  - [ ] Route type selector
  - [ ] Notes field
  - [ ] Form validation
  - [ ] Submit with loading state
  - [ ] Success/error messages

- [ ] 4.2 Settings & Profile
  - [ ] User profile display
  - [ ] Notification preferences link
  - [ ] App version info
  - [ ] Logout button
  - [ ] Privacy policy link
  - [ ] Terms of service link

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
| 2026-04-27 | Phase 1 | Starting implementation | Engineering |

---

## Next Actions

1. ✅ Create documentation structure
2. ⏳ Begin Phase 1.1: Project Setup
3. ⏸️ Schedule stakeholder review for open questions
4. ⏸️ Set up Firebase project (or document placeholder approach)
5. ⏸️ Review backend API readiness for SSE streams

---

## Notes

- Focus on features already implemented in Parent Portal web application
- Follow Driver App patterns for consistency
- All placeholders clearly marked in code and documentation
- Document decisions and rationale as implementation progresses
