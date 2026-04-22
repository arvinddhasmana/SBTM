# SBTM Mobile App Store Deployment

- Document owner: Engineering
- Last reviewed: 2026-04-21
- Audience: DevOps engineers, release managers

## Overview

The SBTM Driver App (`apps/driver-app`) is a React Native + Expo application. Builds are managed via **Expo Application Services (EAS Build)** and submitted to stores via **EAS Submit**.

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

### Apple Developer Account Setup (One-Time)

1. Enroll at [developer.apple.com/programs](https://developer.apple.com/programs/) ($99/year USD)
2. Once approved (24–48 hours), create an App Identifier:
   - Bundle ID: `com.sbtm.driver`
   - Capabilities: Push Notifications, Background Modes (Location, Background Fetch)
3. Generate an APNs Auth Key (used for FCM → APNs bridge):
   - Keys → Create → Select "Apple Push Notifications service (APNs)"
   - Download the `.p8` key file and note the Key ID and Team ID
4. Add the APNs key to Firebase Console → Project Settings → Cloud Messaging → APNs Authentication Key
5. Run `eas credentials` to let EAS manage provisioning profiles and distribution certificates automatically

---

## EAS Configuration

### app.json (current state — no changes needed)

Key values already configured:

- iOS Bundle ID: `com.sbtm.driver`
- Android Package: `com.sbtm.driver`
- All required permissions declared (Bluetooth, background location, foreground service)
- New Architecture enabled

### eas.json — Production Profile

The production profile in `apps/driver-app/eas.json` is fully configured for store submission:

```json
"production": {
  "autoIncrement": true,
  "android": {
    "buildType": "app-bundle"
  },
  "ios": {
    "simulator": false
  }
}
```

- `buildType: "app-bundle"` produces an `.aab` file required by Google Play (not an `.apk`).
- `simulator: false` is required for real-device / App Store builds.

---

## Build Process

### Android Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build Android AAB for production
cd apps/driver-app
eas build --platform android --profile production

# This produces: <build-id>.aab
# Download URL provided in Expo dashboard
```

### iOS Build (requires Apple Developer account)

```bash
# First-time: configure credentials (EAS manages automatically)
eas credentials

# Build iOS IPA for production
cd apps/driver-app
eas build --platform ios --profile production

# This produces: <build-id>.ipa
```

### Build Both Platforms

```bash
cd apps/driver-app
eas build --platform all --profile production
```

### Using the Build Script

```bash
# From project root
bash scripts/mobile-build.sh [android|ios|all]
```

---

## Store Submission

### Google Play Store

**First-time app creation:**

1. Google Play Console → Create app → App name: "SBTM Driver"
2. Set up store listing (screenshots, description, privacy policy URL)
3. Create Internal Testing track
4. Link EAS to Play Console:
   ```bash
   # Create a service account in Google Cloud Console
   # Download JSON key
   # Configure in EAS: eas submit --platform android will prompt
   ```

**Submit build:**

```bash
cd apps/driver-app

# Submit latest build to Play Store internal testing
eas submit --platform android --profile production

# Or submit a specific build by ID
eas submit --platform android --profile production --id <build-id>
```

**Track progression:**

- Internal Testing → Closed Testing (Alpha) → Open Testing (Beta) → Production

### Apple App Store (TestFlight)

**First-time app creation:**

1. App Store Connect → New App → Bundle ID: `com.sbtm.driver`
2. Set up app metadata (screenshots for iPhone 6.5", 5.5", iPad if applicable)
3. Add a Privacy Policy URL (required — host a simple privacy policy page)
4. Configure TestFlight: Builds → Add External Testers

**Submit build:**

```bash
cd apps/driver-app
eas submit --platform ios --profile production
```

**Using the submit script:**

```bash
# From project root
bash scripts/mobile-submit.sh [android|ios|all]
```

---

## Privacy Policy Requirement

Both Google Play and Apple App Store **require a privacy policy URL** for apps that:

- Collect location data ✓
- Use Bluetooth ✓
- Access personal data ✓

Create a simple privacy policy page (can be a static HTML page hosted on Azure Static Web Apps or GitHub Pages) and add the URL to:

- `app.json` → `expo.extra.privacyPolicyUrl`
- Google Play Console → Store listing → Privacy Policy
- App Store Connect → App Information → Privacy Policy URL

---

## App Store Metadata Required

### Screenshots (both stores)

| Device                              | Required                                   |
| ----------------------------------- | ------------------------------------------ |
| Android phone (1080×1920 or higher) | Yes                                        |
| iPhone 6.5" screenshot (1242×2688)  | Yes (App Store)                            |
| iPhone 5.5" screenshot (1242×2208)  | Yes (App Store)                            |
| iPad Pro 12.9" (2048×2732)          | If `supportsTablet: true` (currently true) |

### Short Description (Play Store)

> "Real-time school bus route management and student safety tracking for drivers."

### Long Description

> SBTM Driver enables school bus drivers to manage routes, track student attendance, respond to emergencies, and communicate with school administrators in real time. Features include GPS route tracking, BLE SmartTag student detection, emergency alerts with one-tap panic button, offline operation support, and real-time route deviation detection.

---

## CI/CD Integration

Mobile builds are triggered via `.github/workflows/mobile-build.yml` on:

- Release tag matching `v*.*.*`
- Push to `mobile/**` branch (for testing changes)

See [AzureCICD.md](AzureCICD.md) for the full workflow.

---

## Version Management

- Version is managed remotely via EAS (`eas.json` → `cli.appVersionSource: "remote"`)
- `autoIncrement: true` automatically increments `buildNumber` (iOS) and `versionCode` (Android) on each production build
- The human-readable version (`version` in `app.json`) should be updated manually before creating a GitHub release

---

## Known App Store Review Considerations

| Concern                   | Mitigation                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| Background location usage | Permission descriptions in `app.json` clearly state transportation safety purpose             |
| Bluetooth always usage    | `bluetoothAlwaysPermission` string explains SmartTag student detection                        |
| Background modes          | Required for route tracking when screen is off; justified in permission strings               |
| Push notifications        | Used for emergency alerts; cannot be disabled (by design) — document this in App Review notes |

---

## Related Documents

- [AzureCICD.md](AzureCICD.md) — CI/CD pipeline including mobile-build.yml workflow
- [AzureArchitecture.md](AzureArchitecture.md) — Backend infrastructure the app connects to
- [driver-app-development.md](../dev/driver-app-development.md) — Local development setup for the driver app
