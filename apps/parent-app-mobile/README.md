# SBTM Parent Mobile App

Native mobile application for parents to track their children's school bus journey in real-time.

## 🎯 Features

### Implemented (Phase 1-5)
- ✅ **Authentication**: Secure login with JWT tokens
- ✅ **Dashboard**: View all children with real-time status
- ✅ **Live Tracking**: GPS map showing bus location and route
- ✅ **Notifications**: Alert history and notification preferences
- ✅ **Absence Reporting**: Report child absence with route selection
- ✅ **Settings**: Manage notification preferences
- ✅ **Offline Support**: Basic connectivity monitoring
- ✅ **Glassmorphic UI Components**: Reusable component library with animations

### In Progress
- ⏳ **Push Notifications**: FCM integration (placeholder implemented)
- ⏳ **Enhanced Map Features**: SSE streaming, geofencing

## 🏗️ Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React Native 0.81 + Expo SDK 54 |
| State Management | Zustand |
| Navigation | React Navigation 7 (native stack) |
| HTTP Client | Axios with JWT interceptor |
| Maps | react-native-maps |
| Storage | expo-secure-store |
| Push Notifications | expo-notifications (FCM placeholder) |
| Testing | Jest + React Native Testing Library |

## 📁 Project Structure

```
apps/parent-app-mobile/
├── App.tsx                 # Root component with navigation
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── GlassCard.tsx
│   │   ├── GlassButton.tsx
│   │   ├── GlassModal.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── StatusBadge.tsx
│   │   └── index.ts
│   ├── screens/            # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── MapScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   ├── AbsenceReportScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/           # API and service layer
│   │   ├── AuthService.ts
│   │   ├── ApiService.ts
│   │   ├── ParentApiService.ts
│   │   ├── NotificationService.ts (FCM placeholder)
│   │   └── ConnectivityService.ts
│   ├── store/              # Zustand store
│   │   └── useParentStore.ts
│   ├── types/              # TypeScript definitions
│   │   └── index.ts
├── assets/                 # Images, fonts, etc.
├── __mocks__/              # Jest mocks
├── app.json                # Expo configuration
├── eas.json                # EAS Build configuration
└── package.json            # Dependencies
```

## 🎨 Component Library

### Glassmorphic UI Components

All screens use a consistent glassmorphic design system with reusable components:

#### GlassCard
Glassmorphic container with backdrop blur effect.
```tsx
import { GlassCard } from '../components';

<GlassCard variant="default | elevated | alert | success" style={styles.card}>
  {children}
</GlassCard>
```

**Variants:**
- `default`: Standard glass effect with subtle border
- `elevated`: Darker gradient for layered appearance
- `alert`: Red tinted for warnings/errors
- `success`: Green tinted for success states

#### GlassButton
Interactive button with press animations and loading state.
```tsx
import { GlassButton } from '../components';

<GlassButton
  title="Click Me"
  onPress={handlePress}
  variant="primary | secondary | danger | ghost"
  disabled={false}
  loading={isLoading}
  style={styles.button}
/>
```

**Features:**
- Spring animation on press
- Built-in loading spinner
- Auto-disabled during loading
- Multiple color variants

#### StatusBadge
Color-coded status indicator with comprehensive variant system.
```tsx
import { StatusBadge } from '../components';

<StatusBadge
  label="On Bus"
  variant="on_bus | at_school | at_home | success | warning | danger"
  size="small | medium | large"
/>
```

**Variants:**
- Child status: `on_bus`, `at_school`, `at_home`, `unknown`
- Generic: `success`, `warning`, `danger`, `info`, `neutral`

#### LoadingSpinner
Animated gradient spinner with pulsing effect.
```tsx
import { LoadingSpinner } from '../components';

<LoadingSpinner size="small | medium | large" color="#6366f1" />
```

**Features:**
- Gradient color animation
- Pulse scale animation
- Customizable size and color

#### GlassModal
Modal overlay with backdrop blur and slide-in animation.
```tsx
import { GlassModal } from '../components';

<GlassModal
  visible={isVisible}
  onClose={() => setVisible(false)}
  title="Modal Title"
  showCloseButton={true}
>
  {modalContent}
</GlassModal>
```

**Features:**
- Backdrop blur effect
- Slide-up animation
- Auto-dismiss on backdrop tap
- Scrollable content

### Design System

**Colors:**
```typescript
Primary: #6366f1 (Indigo)
Success: #10b981 (Emerald)
Warning: #f59e0b (Amber)
Danger: #ef4444 (Red)
Background: #1e293b (Slate-800)
Text: #fff (White)
Muted: #94a3b8 (Slate-400)
```

**Glassmorphic Effect:**
```css
background: rgba(30, 41, 59, 0.6)
backdrop-filter: blur(10px)
border: 1px solid rgba(255, 255, 255, 0.1)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli eas-cli`
- Android Studio (for Android emulator) OR Xcode (for iOS simulator)
- Physical device with Expo Go app (recommended)

### Installation

1. **From the repository root:**
   ```bash
   pnpm install
   ```

2. **Copy environment configuration:**
   ```bash
   cp apps/parent-app-mobile/.env.example apps/parent-app-mobile/.env
   ```

3. **Update `.env` with your API URL:**
   - Android emulator: `http://10.0.2.2:3001/api/v1`
   - Physical device on same WiFi: `http://192.168.x.x:3001/api/v1`
   - WSL2 / ngrok: `https://xxxx.ngrok-free.app/api/v1`

### Running the App

**Start Metro bundler:**
```bash
cd apps/parent-app-mobile
pnpm start
```

**Run on specific platforms:**
```bash
pnpm run android    # Android emulator
pnpm run ios        # iOS simulator
pnpm run web        # Web browser (limited features)
```

**Run on physical device:**
1. Install Expo Go from App Store / Play Store
2. Scan the QR code shown in terminal
3. App will load on your device

### Backend Setup

The app requires the SBTM backend services running:

```bash
# From repository root
docker compose up -d

# Seed database (first time only)
docker compose exec -T postgres psql -U postgres -d sbms < scripts/init-db.sql
```

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# TypeScript check
npx tsc --noEmit
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test AuthService.test.ts
```

### Test Structure

```
apps/parent-app-mobile/
├── src/
│   ├── services/
│   │   ├── AuthService.test.ts        # Authentication tests
│   │   ├── ApiService.test.ts         # HTTP client tests
│   │   └── ParentApiService.test.ts   # API endpoint tests
│   ├── store/
│   │   └── useParentStore.test.ts     # State management tests
│   └── components/
│       ├── GlassCard.test.tsx         # Card component tests
│       └── GlassButton.test.tsx       # Button component tests
├── jest.config.js                      # Jest configuration
├── jest.setup.js                       # Test setup & mocks
└── __mocks__/
    └── axios.js                        # Axios mock
```

### Test Coverage Goals

- **Services**: 80%+ coverage
- **Store**: 80%+ coverage
- **Components**: 70%+ coverage
- **Overall**: 70%+ coverage

### Testing Patterns

**Service Tests**:
- Mock external dependencies (axios, SecureStore)
- Test success and error scenarios
- Verify correct API calls and data transformations

**Store Tests**:
- Use `@testing-library/react-native`'s `renderHook`
- Test state mutations and side effects
- Verify loading states and error handling

**Component Tests**:
- Test rendering and user interactions
- Verify prop handling and variants
- Test accessibility features

### CI/CD Testing

Tests run automatically on:
- Push to `mobile/parent-app/**` branches
- Pull requests to main/master
- Pre-deployment validation

See `.github/workflows/parent-app-ci.yml` for CI configuration.

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Parent | parent1@sbtm.demo | Admin123! |

## 📱 Building for Production

### Android APK (Preview/Testing)
```bash
eas build --platform android --profile preview
```

### Production Builds
```bash
# Android AAB
eas build --platform android --profile production

# iOS IPA (requires Apple Developer account)
eas build --platform ios --profile production
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Yes | API Gateway URL including `/api/v1` suffix |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Android only | Google Maps SDK key (managed by EAS) |

### EAS Build Profiles

- **development**: Dev client for local development
- **preview**: APK for testing/distribution without store
- **production**: Store-ready builds (AAB/IPA)

## 🚧 Placeholders & Known Limitations

### FCM Push Notifications
**Status**: Placeholder implemented

**What's needed:**
1. Firebase project setup
2. `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
3. Backend FCM server key configuration
4. Update `app.json` with Firebase config

**Current behavior:**
- Uses Expo push tokens (works for testing)
- Device token registration fails gracefully
- Local notifications work for testing

### Missing Features
1. **Biometric Authentication**: Not yet implemented
2. **SSE Live Streaming**: Currently using polling (5s interval)
3. **Geofencing**: Not implemented
4. **Widgets**: Not implemented
5. **Sentry Crash Reporting**: Placeholder, needs project setup

## 📚 Documentation

- [Implementation Plan](/docs/prd/ParentApp/ImplementationPlan.md)
- [Parent Portal UI Design](/docs/UiDesign/ParentPortal.md) - Web version reference
- [Driver App Development](/docs/dev/driver-app-development.md) - Similar architecture

## 🤝 Development Notes

### Following Driver App Patterns
This app mirrors the Driver App architecture for consistency:
- Same service layer structure
- Same authentication flow
- Same state management approach
- Same build and deployment processes

### API Endpoints Used
- `POST /auth/login` - Authentication
- `GET /parent/children` - Fetch children list
- `GET /routes/:id/live-location` - Bus GPS location
- `GET /routes/:id` - Route details (stops, polyline)
- `GET /parent/alerts` - Active alerts
- `GET /parent/alerts/history` - Alert history
- `GET /parent/notification-preferences` - Get preferences
- `PUT /parent/notification-preferences` - Update preferences
- `POST /parent/absence-reports` - Report absence
- `POST /parent/device-tokens` - Register for push (placeholder)

## 📝 License

UNLICENSED - Private project

## 🔗 Related Apps

- **Parent Web Portal**: `/apps/parent-app/web` - Web version with same features
- **Driver App**: `/apps/driver-app` - Mobile app for bus drivers
- **Admin Dashboard**: `/apps/admin-dashboard` - Fleet management portal

---

**Need Help?**
- Check documentation in `/docs` folder
- Review similar patterns in `/apps/driver-app`
- Contact the development team
