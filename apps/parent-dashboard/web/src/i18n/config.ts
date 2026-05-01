import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Bundle translation resources directly so the app never depends on a runtime
// network fetch for /locales/{lng}/{ns}.json (which previously caused the UI
// to render raw keys like "children.title" if the asset 404'd or was slow).
import enCommon from '../../public/locales/en/common.json';
import frCommon from '../../public/locales/fr/common.json';

const initPromise = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      fr: { common: frCommon },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    defaultNS: 'common',
    ns: ['common'],

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false,
    },
  });

export { initPromise };
export default i18n;
