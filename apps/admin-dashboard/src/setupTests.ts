import '@testing-library/jest-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Load translations synchronously so tests see real strings, not i18n keys.
// vitest jsdom cannot use HttpBackend (no HTTP server), so we inline the resources.
const loadNs = (lang: string, ns: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`../public/locales/${lang}/${ns}.json`);
};

const namespaces = [
  'common',
  'auth',
  'dashboard',
  'alerts',
  'routes',
  'students',
  'fleet',
  'boards',
  'schools',
  'users',
  'alertConfig',
  'absences',
  'videos',
  'compliance',
  'settings',
];

const resources: Record<string, Record<string, unknown>> = { en: {}, fr: {} };
for (const ns of namespaces) {
  try {
    resources.en[ns] = loadNs('en', ns);
  } catch {
    resources.en[ns] = {};
  }
  try {
    resources.fr[ns] = loadNs('fr', ns);
  } catch {
    resources.fr[ns] = {};
  }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources,
    ns: namespaces,
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

// jsdom doesn't implement ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
