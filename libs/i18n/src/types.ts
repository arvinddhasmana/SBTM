/**
 * Supported languages in SBTM
 */
export type SupportedLanguage = 'en' | 'fr';

/**
 * Translation namespaces for organizing translations
 */
export type TranslationNamespace =
  | 'common'
  | 'errors'
  | 'notifications'
  | 'alerts'
  | 'validation'
  | 'entities';

/**
 * Language preference for a user or tenant
 */
export interface LanguagePreference {
  language: SupportedLanguage;
  timezone?: string;
}

/**
 * Translation options
 */
export interface TranslationOptions {
  lng?: SupportedLanguage;
  ns?: TranslationNamespace;
  defaultValue?: string;
  [key: string]: any;
}

/**
 * Language detection result
 */
export interface DetectedLanguage {
  language: SupportedLanguage;
  source: 'user' | 'tenant' | 'header' | 'default';
}
