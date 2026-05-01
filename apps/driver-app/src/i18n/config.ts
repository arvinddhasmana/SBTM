import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from '../../locales/en/common.json';
import fr from '../../locales/fr/common.json';

const LANGUAGE_KEY = '@driver_app:language';
const SUPPORTED = ['en', 'fr'] as const;

// Get device language using only built-in React Native APIs.
// Avoids react-native-localize (TurboModule not registered in Expo Go).
const getDeviceLanguage = (): string => {
  try {
    let raw: string | undefined;
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      raw = settings?.AppleLocale || settings?.AppleLanguages?.[0];
    } else if (Platform.OS === 'android') {
      raw = NativeModules.I18nManager?.localeIdentifier;
    }
    const code = (raw || 'en').toLowerCase().split(/[-_]/)[0];
    return (SUPPORTED as readonly string[]).includes(code) ? code : 'en';
  } catch (error) {
    console.warn('[i18n] Failed to detect device language, using en:', error);
    return 'en';
  }
};

// Get stored language preference
const getStoredLanguage = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    return stored || getDeviceLanguage();
  } catch (error) {
    console.error('Error getting stored language:', error);
    return getDeviceLanguage();
  }
};

// Store language preference
export const setStoredLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Failed to store language preference:', error);
  }
};

// Initialize i18next
export const initI18n = async (): Promise<void> => {
  try {
    const language = await getStoredLanguage();

    await i18n.use(initReactI18next).init({
      compatibilityJSON: 'v3',
      resources: {
        en: {
          common: en,
        },
        fr: {
          common: fr,
        },
      },
      lng: language,
      fallbackLng: 'en',
      supportedLngs: ['en', 'fr'],
      defaultNS: 'common',
      ns: ['common'],
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });

    console.log('i18n initialized successfully with language:', i18n.language);
  } catch (error) {
    console.error('Error initializing i18n:', error);
    // Fallback to English if initialization fails
    await i18n.use(initReactI18next).init({
      compatibilityJSON: 'v3',
      resources: {
        en: {
          common: en,
        },
        fr: {
          common: fr,
        },
      },
      lng: 'en',
      fallbackLng: 'en',
      supportedLngs: ['en', 'fr'],
      defaultNS: 'common',
      ns: ['common'],
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
  }
};

export default i18n;
