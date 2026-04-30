import i18next, { TFunction } from 'i18next';
import Backend from 'i18next-fs-backend';
import { join } from 'path';
import {
  SupportedLanguage,
  TranslationNamespace,
  TranslationOptions,
} from './types';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  TRANSLATION_NAMESPACES,
  DEFAULT_NAMESPACE,
} from './constants';

export class TranslationService {
  private static instance: typeof i18next | null = null;
  private static initialized = false;

  /**
   * Initialize the translation service
   * @param localesPath Path to locales directory
   */
  static async initialize(localesPath: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.instance = i18next.createInstance();

    await this.instance.use(Backend).init({
      lng: DEFAULT_LANGUAGE,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...SUPPORTED_LANGUAGES],
      ns: [...TRANSLATION_NAMESPACES],
      defaultNS: DEFAULT_NAMESPACE,
      preload: [...SUPPORTED_LANGUAGES],

      backend: {
        loadPath: join(localesPath, '{{lng}}/{{ns}}.json'),
      },

      interpolation: {
        escapeValue: false, // Not needed for server-side
      },

      returnEmptyString: false,
      returnNull: false,
    });

    this.initialized = true;
  }

  /**
   * Get translation function
   */
  static getTranslator(): TFunction {
    if (!this.instance) {
      throw new Error('TranslationService not initialized');
    }
    return this.instance.t.bind(this.instance);
  }

  /**
   * Translate a key
   * @param key Translation key
   * @param options Translation options
   */
  static translate(key: string, options?: TranslationOptions): string {
    if (!this.instance) {
      throw new Error('TranslationService not initialized');
    }
    return this.instance.t(key, options);
  }

  /**
   * Change language
   * @param language Target language
   */
  static async changeLanguage(language: SupportedLanguage): Promise<void> {
    if (!this.instance) {
      throw new Error('TranslationService not initialized');
    }
    await this.instance.changeLanguage(language);
  }

  /**
   * Get current language
   */
  static getCurrentLanguage(): SupportedLanguage {
    if (!this.instance) {
      return DEFAULT_LANGUAGE;
    }
    return (this.instance.language as SupportedLanguage) || DEFAULT_LANGUAGE;
  }

  /**
   * Check if a translation exists
   * @param key Translation key
   * @param options Options including namespace and language
   */
  static exists(
    key: string,
    options?: { ns?: TranslationNamespace; lng?: SupportedLanguage }
  ): boolean {
    if (!this.instance) {
      return false;
    }
    return this.instance.exists(key, options);
  }

  /**
   * Get instance for advanced usage
   */
  static getInstance(): typeof i18next {
    if (!this.instance) {
      throw new Error('TranslationService not initialized');
    }
    return this.instance;
  }
}
