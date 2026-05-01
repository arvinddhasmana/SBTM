import { SupportedLanguage, TranslationNamespace } from './types';

/**
 * Default language for the system
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/**
 * All supported languages
 */
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['en', 'fr'] as const;

/**
 * All translation namespaces
 */
export const TRANSLATION_NAMESPACES: readonly TranslationNamespace[] = [
  'common',
  'errors',
  'notifications',
  'alerts',
  'validation',
  'entities',
] as const;

/**
 * Default namespace
 */
export const DEFAULT_NAMESPACE: TranslationNamespace = 'common';

/**
 * Default timezone for Canadian users
 */
export const DEFAULT_TIMEZONE = 'America/Toronto';

/**
 * Language names for display
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, { en: string; fr: string; native: string }> = {
  en: {
    en: 'English',
    fr: 'Anglais',
    native: 'English',
  },
  fr: {
    en: 'French',
    fr: 'Français',
    native: 'Français',
  },
};
