# SBTM Multi-Language Support Implementation Plan

- Document owner: Engineering and Architecture
- Created: 2026-04-30
- Status: Implementation in Progress
- Primary use: Complete implementation guide for adding English and French language support

## Executive Summary

This document outlines the complete implementation plan for adding multi-language support to the School Bus Transport Management System (SBTM). The system will support English and French languages with runtime language switching capability, following industry-standard internationalization (i18n) practices.

## Scope Decisions

### Approved Decisions

1. **Content Translation Scope**: System content only (UI labels, notifications, errors, alerts)
   - User-entered content (school names, routes, students) will NOT be translated in Phase 1

2. **Language Selection**: Both user-level and tenant-level preferences
   - Tenant (school board) can set default language
   - Individual users can override with personal preference

3. **Initial Languages**: English and French only
   - Architecture designed to support additional languages easily in future

4. **Translation Management**: JSON files in codebase (Phase 1)
   - Can migrate to Translation Management System (TMS) in Phase 2

5. **Mobile Language Strategy**: Device locale as default with persistence
   - Apps detect device language automatically
   - User preference persists across sessions

6. **Notification Templates**: Hybrid approach
   - Structure shared, content translated via keys
   - Supports email, SMS, and push notifications

### Translation Style Guide

- **Tone**: Formal (vouvoiement in French)
- **Consistency**: Standardized terminology across all system components
- **Length**: Short forms acceptable where space is limited (mobile, SMS)
- **Context**: Translation keys include comments for translator context

## Technical Architecture

### Language Detection Flow

```
User Request → Authenticated?
  ├─ Yes → User Language Preference Set?
  │         ├─ Yes → Use User Preference
  │         └─ No → Tenant Default Language?
  │                  ├─ Yes → Use Tenant Default
  │                  └─ No → Accept-Language Header → Default: English
  └─ No → Accept-Language Header → Default: English
```

### Technology Stack

**Frontend (React/React Native)**:
- `react-i18next` - React bindings for i18next
- `i18next` - Core internationalization framework
- `i18next-browser-languagedetector` - Automatic language detection (web)
- `i18next-react-native-language-detector` - Language detection (mobile)
- `i18next-http-backend` - Load translations via HTTP

**Backend (NestJS)**:
- `i18next` - Core internationalization framework
- `i18next-fs-backend` - File system backend for translations
- `i18next-http-middleware` - Express/NestJS integration

**Tooling**:
- `i18next-parser` - Extract translation keys from code
- ESLint plugin: `eslint-plugin-i18next` - Enforce i18n best practices

## Implementation Phases

### Phase 1: Foundation & Infrastructure (Weeks 1-3)

#### Backend Infrastructure

**1.1 Create Shared i18n Library**
- Location: `/libs/i18n`
- Components:
  - Translation service
  - Language detection middleware
  - Format utilities (dates, numbers)
  - Type definitions

**1.2 Database Schema Updates**
```sql
-- Users table
ALTER TABLE users
  ADD COLUMN language_preference VARCHAR(10) DEFAULT 'en',
  ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/Toronto';

-- School boards table (tenant-level defaults)
ALTER TABLE school_boards
  ADD COLUMN default_language VARCHAR(10) DEFAULT 'en',
  ADD COLUMN default_timezone VARCHAR(50) DEFAULT 'America/Toronto';
```

**1.3 API Gateway Integration**
- Add language detection middleware
- Add user preference endpoints
- Include language in JWT context
- Update user profile API

**1.4 Translation File Structure**
```
services/*/locales/
├── en/
│   ├── common.json          # Shared terms (roles, statuses)
│   ├── errors.json          # Error messages
│   ├── notifications.json   # Email/SMS templates
│   ├── alerts.json          # Alert types and messages
│   ├── validation.json      # Input validation messages
│   └── entities.json        # Entity field labels
└── fr/
    └── (same structure)
```

#### Frontend Infrastructure

**1.5 Admin Dashboard Setup**
- Install i18n dependencies
- Configure i18next
- Create language context provider
- Add language switcher to header
- Setup translation file structure

**1.6 Driver App Setup**
- Install React Native i18n dependencies
- Configure i18next for mobile
- Add language switcher to settings
- Setup AsyncStorage persistence

**1.7 Parent Dashboard Setup**
- Similar to Admin Dashboard
- Simplified UI for parent users

### Phase 2: Backend Content Migration (Weeks 4-7)

#### Notification Service Translation

**2.1 Email Templates**
- Convert HTML templates to use translation keys
- Create English and French template sets
- Preserve dynamic variable insertion
- Test HTML rendering in both languages

**2.2 SMS Templates**
- Create character-conscious French translations
- Respect SMS length limits (160 chars)
- Test with actual SMS providers

**2.3 Push Notifications**
- Translate notification titles and bodies
- Handle notification actions/buttons
- Test on iOS and Android devices

#### Alert Service Translation

**2.4 Alert Messages**
- Emergency alert types and messages
- Operational alert messages
- Alert status labels (pending, acknowledged, resolved)
- Alert severity levels (critical, high, medium, low)

#### Error Messages

**2.5 API Errors**
- Validation errors
- Business logic errors
- System errors
- HTTP error responses

### Phase 3: Frontend Content Migration (Weeks 8-12)

#### Admin Dashboard (Weeks 8-11)

**Priority 1: Authentication & Navigation**
- Login page
- Sidebar navigation
- Header and user menu
- Error pages

**Priority 2: Dashboard & Alerts**
- Main dashboard
- Alert management
- Live map interface
- Common components

**Priority 3: Operations**
- Route management
- Vehicle/fleet management
- Student management
- Presence tracking

**Priority 4: Settings & Admin**
- Settings pages
- User management
- Configuration pages
- Compliance and audit

#### Driver App (Week 12)

**Priority 1: Core Workflow**
- Login screen
- Route selection
- Active route screen
- Presence logging

**Priority 2: Alerts & Safety**
- Emergency alert button
- Alert messages
- Pre-trip inspection

**Priority 3: Settings**
- Driver profile
- App settings
- Help screens

#### Parent Dashboard (Week 12)

**Priority 1: Core Features**
- Login screen
- Child selection
- Live bus tracking
- ETA display

**Priority 2: Communication**
- Notification list
- Alert history
- Absence reporting

### Phase 4: Formatting & Localization (Weeks 13-14)

#### Date and Time Formatting

**4.1 Frontend**
- Replace all Date displays with Intl.DateTimeFormat
- Add timezone support
- Implement relative time ("2 hours ago")
- Format timestamps consistently

**4.2 Backend**
- Format dates in notifications
- Include timezone information
- Generate localized reports

#### Number and Distance Formatting

**4.3 Localization**
- Distance (km)
- Speed (km/h)
- Percentages
- Currency (if applicable)

### Phase 5: Testing (Weeks 15-17)

#### Automated Testing

**5.1 Translation Coverage**
- Verify no hardcoded strings
- Check all keys exist in both languages
- Detect missing translations

**5.2 Functional Testing**
- Language switching E2E tests
- Persistence tests
- Notification delivery tests

#### Manual Testing

**5.3 User Acceptance**
- Complete user journeys in both languages
- Layout testing (French text is typically 30% longer)
- Cross-browser testing
- Mobile device testing

**5.4 Translation Quality**
- Native French speaker review
- Context appropriateness
- Terminology consistency
- Accessibility compliance

### Phase 6: Documentation & Training (Weeks 18-19)

#### Technical Documentation

**6.1 Developer Guide**
- How to add new translations
- Translation key naming conventions
- Testing guidelines
- How to add new languages

**6.2 Architecture Updates**
- Update system architecture diagrams
- Document i18n data flow
- API documentation updates

#### User Documentation

**6.3 User Guides**
- Language preference settings
- Language-specific user guides
- FAQ in both languages

**6.4 Admin Guides**
- Managing language preferences
- Monitoring translation issues
- Support workflows

### Phase 7: Deployment (Weeks 19-20)

#### Deployment Strategy

**7.1 Pre-deployment**
- Database schema migration
- Translation file validation
- Performance testing

**7.2 Gradual Rollout**
- Phase 1: Internal testing (1 week)
- Phase 2: Pilot school board (1 week)
- Phase 3: All Canadian boards (1 week)
- Phase 4: General availability

**7.3 Monitoring**
- Track language usage distribution
- Monitor translation errors
- Track performance metrics
- Collect user feedback

## Translation Workflow

### Initial Translation Process

1. **Extract Keys**: Use i18next-parser to extract all translation keys
2. **Create English Base**: Write all English translations
3. **Professional Translation**: Get French translations from qualified translator
4. **Review**: Native speaker review for context and accuracy
5. **Testing**: Validate in application context
6. **Iteration**: Refine based on feedback

### Ongoing Translation

1. **New Features**: Extract new keys during development
2. **Staged Translation**: English first, French within sprint
3. **Quality Gate**: PR approval requires both languages
4. **Continuous Review**: Quarterly review by native speakers

## Translation Tools & Resources

### Recommended Translation Approach

Since AI-generated translations require review, here's the recommended workflow:

#### Option 1: Google Translate (Free)
1. Export English JSON files
2. Use Google Translate API or web interface
3. Manual review and correction by French speaker
4. Import corrected translations

#### Option 2: DeepL (Higher Quality)
1. Export English JSON files
2. Use DeepL API (better context awareness)
3. Review for technical terminology
4. Import corrected translations

#### Option 3: ChatGPT/Claude (Context-Aware)
1. Provide context about SBTM system
2. Translate in batches with context
3. Specify formal tone and transportation domain
4. Review for consistency
5. Example prompt:
```
Translate the following English text to Canadian French.
Context: School bus transportation management system
Tone: Formal (vouvoiement)
Domain: Educational transportation, safety, and logistics
Maintain placeholders like {{studentName}} unchanged.

English text:
[paste JSON content]
```

#### Option 4: Professional Translation Service
- Hire certified translator familiar with educational/transportation domain
- Provide glossary of technical terms
- Review cycle with development team
- Cost: $0.10-0.25 per word (~$1000-2500 for initial translations)

### Translation Management

**Initial Phase (Weeks 1-20)**:
- JSON files in repository
- Version controlled with code
- PR review process for translations

**Future Phase (Phase 2)**:
- Consider Lokalise, Crowdin, or Phrase TMS
- Enable non-technical translation updates
- Translation memory for consistency
- Collaboration features for translators

## Key Translation Guidelines

### Terminology Consistency

| English | French | Context |
|---------|--------|---------|
| Dashboard | Tableau de bord | Main view |
| School Board | Conseil scolaire | Organization |
| School | École | Institution |
| Route | Itinéraire / Parcours | Bus route |
| Driver | Conducteur / Chauffeur | Bus driver |
| Student | Élève | Child |
| Parent | Parent / Tuteur | Guardian |
| Bus | Autobus | Vehicle |
| Alert | Alerte | Notification |
| Emergency | Urgence | Critical situation |
| Presence | Présence | Attendance |
| Boarding | Embarquement | Getting on |
| Alighting | Débarquement | Getting off |
| Vehicle | Véhicule | Bus/car |
| Fleet | Flotte | Vehicle collection |
| Compliance | Conformité | Regulations |
| Inspection | Inspection | Safety check |

### Formatting Guidelines

**Dates**:
- English: January 15, 2024 (Month DD, YYYY)
- French: 15 janvier 2024 (DD month YYYY)

**Times**:
- English: 3:45 PM (12-hour)
- French: 15h45 (24-hour)

**Numbers**:
- English: 1,234.56 (comma separator, period decimal)
- French: 1 234,56 (space separator, comma decimal)

**Addresses**:
- English: 123 Main Street
- French: 123, rue Main

## Success Metrics

### Key Performance Indicators

1. **Translation Coverage**: 100% of user-facing text
2. **Performance**: < 100ms translation overhead
3. **User Adoption**: > 30% French usage in Canadian deployments
4. **Error Rate**: < 0.1% translation errors
5. **Test Coverage**: > 90% of i18n features tested

### Acceptance Criteria

- ✅ Users can switch language without reload
- ✅ Language preference persists
- ✅ All notifications in user's language
- ✅ All errors in user's language
- ✅ Dates/times/numbers properly formatted
- ✅ No hardcoded text visible
- ✅ Fallback to English works
- ✅ Performance not degraded
- ✅ Existing functionality intact

## Risk Mitigation

| Risk | Mitigation | Impact |
|------|------------|--------|
| Performance degradation | Lazy loading, caching, CDN | Low |
| Translation inconsistency | Shared service, glossary, automated checks | Medium |
| Incomplete translations | Fallback to English, completeness checks | Low |
| Layout breaking (long French text) | Flexible layouts, overflow handling | Medium |
| Database query performance | Indexed fields, caching | Low (system content only) |

## Resource Requirements

### Team Composition
- 1 Full-Stack Lead Developer (architecture)
- 2 Frontend Developers (React/React Native)
- 1 Backend Developer (NestJS services)
- 1 QA Engineer (bilingual testing)
- 1 French Translator/Reviewer (native speaker)
- 1 DevOps Engineer (deployment)

### Timeline
- **Total Duration**: 20 weeks (5 months)
- **Effort**: ~4-5 developer months
- **Translation Work**: ~40-60 hours

### Budget Considerations
- Development: Internal team resources
- Translation: $1000-2500 (if professional service)
- Infrastructure: Minimal (uses existing infrastructure)
- Optional TMS: $500-2000/month (Phase 2)

## Next Steps

### Immediate Actions (Week 1)

1. ✅ Create documentation (this document)
2. ⏳ Set up i18n library structure
3. ⏳ Install dependencies in all apps
4. ⏳ Create initial translation file structure
5. ⏳ Implement language detection middleware
6. ⏳ Add database schema for language preferences

### Week 2-3

7. ⏳ Configure i18next in all frontend apps
8. ⏳ Add language switcher UI components
9. ⏳ Implement user preference API
10. ⏳ Create translation extraction tooling

### Week 4+

Continue with content migration phases as outlined above.

## Support and Maintenance

### Ongoing Maintenance

- **Weekly**: Review new translation needs
- **Monthly**: Translation quality review
- **Quarterly**: Native speaker comprehensive review
- **Annually**: Update translation guidelines

### Support Resources

- Technical lead: i18n architecture questions
- Translation coordinator: French translation questions
- QA lead: Testing and validation
- Product owner: Scope and priority decisions

---

**Document Status**: ✅ Approved for Implementation
**Implementation Start Date**: 2026-04-30
**Target Completion**: 2026-09-30 (20 weeks)
