// Dynamic Expo config. Extends static app.json and injects secrets from env.
// EAS provides env vars at build time from:
//   1. EAS-hosted secrets (eas env:create ... --visibility secret)
//   2. eas.json `build.<profile>.env` blocks
//   3. .env files (local builds only)
//
// GOOGLE_MAPS_ANDROID_API_KEY is required for `react-native-maps` on Android.
// Without it, MapView throws IllegalStateException at construction time.

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

  if (!googleMapsApiKey) {
    // Don't crash the build — just warn. Useful for local `expo start` where
    // Expo Go provides its own key.
    console.warn(
      '[app.config.js] GOOGLE_MAPS_ANDROID_API_KEY not set. ' +
        'Standalone Android builds will crash on MapView.'
    );
  }

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...(config.android && config.android.config),
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
