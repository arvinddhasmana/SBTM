# SBTM Parent Mobile App — Store Deployment

- Document owner: Engineering
- Last reviewed: 2026-04-27
- Audience: DevOps engineers, release managers

## Overview

The SBTM Parent Mobile App (`apps/parent-app-mobile`) is a React Native + Expo application built for parents to track their child's school bus in real time. Builds are managed via **Expo Application Services (EAS Build)** and submitted to stores via **EAS Submit**.

| Platform | Store             | Account Status             | Build Profile                   |
| -------- | ----------------- | -------------------------- | ------------------------------- |
| Android  | Google Play Store | Account exists             | `eas.json` → production profile |
| iOS      | Apple App Store   | **Account setup required** | `eas.json` → production profile |

---

## Prerequisites

### Accounts Required

| Service                                                          | Purpose                           | Status                      |
| ---------------------------------------------------------------- | --------------------------------- | --------------------------- |
| [Expo EAS](https://expo.dev)                                     | Cloud builds and store submission | Exists                      |
| [Google Play Console](https://play.google.com/console)           | Android distribution              | Exists                      |
| [Apple Developer Program](https://developer.apple.com/programs/) | iOS distribution + TestFlight     | **Setup needed — $99/year** |
| [Firebase Console](https://console.firebase.google.com)          | Push notifications (FCM)          | **Setup needed**            |

### One-Time EAS Project Registration

The `app.json` ships with a placeholder project ID that must be replaced before any EAS operations:

```bash
cd apps/parent-app-mobile

# Log in to your Expo account
eas login

# Register the project — replaces "PLACEHOLDER-PARENT-APP-PROJECT-ID" in app.json
eas init

# Commit the updated app.json
git add app.json
git commit -m "feat: register parent-app-mobile with EAS"
```

### Apple Developer Account Setup (One-Time)

1. Enroll at [developer.apple.com/programs](https://developer.apple.com/programs/) ($99/year USD)
2. Once approved (24–48 hours), create an App Identifier:
   - Bundle ID: `com.sbtm.parent`
   - Capabilities: Push Notifications, Background Modes (Remote Notifications)
3. Generate an APNs Auth Key for FCM → APNs bridge:
   - Keys → Create → Select "Apple Push Notifications service (APNs)"
   - Download the `.p8` file and note the Key ID and Team ID
4. Add the APNs key to Firebase Console → Project Settings → Cloud Messaging → APNs Authentication Key
5. Run `eas credentials` to let EAS manage provisioning profiles and certificates automatically

### Firebase FCM Setup

The app ships with a graceful FCM placeholder. To enable full push notifications:

1. Create (or reuse) a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add an Android app with package name `com.sbtm.parent`
3. Add an iOS app with bundle ID `com.sbtm.parent`
4. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
5. Add the files to the app per [expo-notifications docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
6. Store the FCM Server Key as an EAS secret (for backend notification delivery)

---

## EAS Configuration

### app.json — Key Values

| Field               | Value                 | Notes                                           |
| ------------------- | --------------------- | ----------------------------------------------- |
| iOS Bundle ID       | `com.sbtm.parent`     | Different from Driver App (`com.sbtm.driver`)   |
| Android Package     | `com.sbtm.parent`     | Different from Driver App                       |
| Background mode     | `remote-notification` | For push notifications only (no background GPS) |
| Location permission | When-in-use only      | Parent app is read-only, no background GPS      |

### eas.json — Build Profiles

```json
"preview": {
  "distribution": "internal",
  "android": { "buildType": "apk" },
  "env": { "EXPO_PUBLIC_API_URL": "https://api.demo.sbtm.example.com/api/v1" }
},
"production": {
  "autoIncrement": true,
  "android": { "buildType": "app-bundle" },
  "env": { "EXPO_PUBLIC_API_URL": "https://api.sbtm.example.com/api/v1" }
}
```

- `buildType: "app-bundle"` produces `.aab` for Google Play (not `.apk`).
- `autoIncrement: true` auto-increments `versionCode` (Android) and `buildNumber` (iOS) on each production build.

---

## Google Maps API Key for Android Builds

`react-native-maps` requires a Google Maps API key for Android standalone builds. Not needed for Expo Go development.

### 1. Create the key

Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis) → Create an API key → restrict to:

- Android apps: package `com.sbtm.parent`
- EAS-managed keystore SHA-1 fingerprint (from `eas credentials`)

### 2. Store as EAS secret

```bash
cd apps/parent-app-mobile
eas env:create --scope project --name GOOGLE_MAPS_ANDROID_API_KEY --value YOUR_KEY --visibility secret
```

### 3. Create app.config.js

Copy `apps/driver-app/app.config.js` to `apps/parent-app-mobile/app.config.js` — it works unchanged (reads `GOOGLE_MAPS_ANDROID_API_KEY` from env and injects into the Android manifest).

---

## Build Process

### Install EAS CLI (one time)

```bash
pnpm add -g eas-cli
eas login
```

### Android Build

```bash
cd apps/parent-app-mobile

# Preview APK (sideload / QA)
eas build --platform android --profile preview

# Production AAB (Google Play Store)
eas build --platform android --profile production
```

### iOS Build (requires Apple Developer account)

```bash
cd apps/parent-app-mobile

# First-time: configure credentials
eas credentials

# Production IPA (App Store)
eas build --platform ios --profile production
```

### Build Both Platforms

```bash
cd apps/parent-app-mobile
eas build --platform all --profile production
```

### Preview vs Production

|                               | `preview`                     | `production`             |
| ----------------------------- | ----------------------------- | ------------------------ |
| Output format                 | `.apk` (installable directly) | `.aab` (Play Store only) |
| Distribution                  | Internal (sideload / QR)      | Google Play Store        |
| Auto-increments `versionCode` | No                            | Yes                      |
| Use for                       | QA, demos, testing            | Store submission         |

Once the preview build finishes, EAS prints a QR code:

1. Open the build URL (or scan QR code) on the Android device.
2. Tap **Install** → download the `.apk`.
3. If prompted, enable **"Install unknown apps"** for your browser.
4. Grant Location and Notification permissions on first launch.

---

## Store Submission

### Google Play Store

**First-time app creation:**

1. Google Play Console → Create app → App name: "SBTM Parent"
2. Set up store listing (screenshots, description, privacy policy URL)
3. Create Internal Testing track
4. Link EAS to Play Console via service account JSON key

**Submit build:**

```bash
cd apps/parent-app-mobile

# Submit latest production build
eas submit --platform android --profile production

# Submit a specific build by ID
eas submit --platform android --profile production --id <build-id>
```

**Track progression:**
Internal Testing → Closed Testing (Alpha) → Open Testing (Beta) → Production

### Apple App Store (TestFlight)

**First-time app creation:**

1. App Store Connect → New App → Bundle ID: `com.sbtm.parent`
2. Set up app metadata (screenshots for iPhone 6.5", 5.5", iPad)
3. Add a Privacy Policy URL
4. Configure TestFlight for external testers

**Submit build:**

```bash
cd apps/parent-app-mobile
eas submit --platform ios --profile production
```

---

## Privacy Policy Requirement

Both stores require a privacy policy URL. The Parent App collects:

- Location data (when in use — for viewing child's bus position) ✓
- Push notification tokens ✓
- Personal data (parent name, linked children) ✓

Add the URL to:

- `app.json` → `expo.extra.privacyPolicyUrl`
- Google Play Console → Store listing → Privacy Policy
- App Store Connect → App Information → Privacy Policy URL

---

## App Store Metadata

### Screenshots (both stores)

| Device                              | Required                                   |
| ----------------------------------- | ------------------------------------------ |
| Android phone (1080×1920 or higher) | Yes                                        |
| iPhone 6.5" screenshot (1242×2688)  | Yes (App Store)                            |
| iPhone 5.5" screenshot (1242×2208)  | Yes (App Store)                            |
| iPad Pro 12.9" (2048×2732)          | If `supportsTablet: true` (currently true) |

Recommended screenshots to capture:

1. Login screen (indigo gradient)
2. Dashboard — child cards with bus status
3. Map screen — live GPS tracking
4. Notifications screen — alert history
5. Absence report form

### Short Description (Play Store)

> "Track your child's school bus in real time. Get alerts, report absences, and stay informed."

### Long Description

> SBTM Parent gives parents peace of mind by providing live school bus tracking, instant emergency alerts, and easy absence reporting in one app. Features include real-time GPS map showing your child's bus position, push notifications for boarding/alighting events and emergencies, absence report submission, and notification preference management. Designed for parents in SBTM-managed school districts.

---

## CI/CD Integration

Parent mobile builds are triggered via `.github/workflows/parent-app-build.yml` on:

- Release tag matching `v*.*.*-parent` (or the shared `v*.*.*` pattern)
- Push to `parent-mobile/**` branch

See [Azure/CICD.md](Azure/CICD.md) for the full workflow.

---

## Version Management

- Version is managed remotely via EAS (`eas.json` → `cli.appVersionSource: "remote"`)
- `autoIncrement: true` auto-increments `buildNumber` / `versionCode` on each production build
- Update `version` in `app.json` manually before creating a GitHub release tag

---

## Known App Store Review Considerations

| Concern            | Mitigation                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Location usage     | "When in use" only — permission string clearly states tracking child's bus                  |
| Push notifications | Used for safety alerts; emergency type cannot be disabled — document in App Review notes    |
| Background modes   | Only `remote-notification` — no background GPS (parents are read-only)                      |
| Children's data    | App may display data about minors — review Google Play Family Policy and COPPA requirements |

---

## Related Documents

- [parent-app-mobile-development.md](../dev/parent-app-mobile-development.md) — Local development setup
- [MobileStoreDeployment.md](MobileStoreDeployment.md) — Driver App store deployment (same EAS workflow)
- [Azure/CICD.md](Azure/CICD.md) — CI/CD pipeline including mobile build workflows
- [Azure/Architecture.md](Azure/Architecture.md) — Backend infrastructure the app connects to
