import { SupportedLanguage, DetectedLanguage } from './types';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './constants';

/**
 * Parse Accept-Language header and return best matching supported language
 */
export function parseAcceptLanguage(header: string | undefined): SupportedLanguage {
  if (!header) {
    return DEFAULT_LANGUAGE;
  }

  // Parse Accept-Language header (e.g., "fr-CA,fr;q=0.9,en;q=0.8")
  const languages = header
    .split(',')
    .map((lang) => {
      const parts = lang.trim().split(';');
      const code = parts[0].split('-')[0].toLowerCase();
      const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0;
      return { code, quality };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find first supported language
  for (const { code } of languages) {
    if (SUPPORTED_LANGUAGES.includes(code as SupportedLanguage)) {
      return code as SupportedLanguage;
    }
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Detect user's preferred language from multiple sources
 */
export function detectLanguage(options: {
  userPreference?: SupportedLanguage;
  tenantDefault?: SupportedLanguage;
  acceptLanguageHeader?: string;
}): DetectedLanguage {
  const { userPreference, tenantDefault, acceptLanguageHeader } = options;

  // Priority: User preference > Tenant default > Accept-Language header > Default
  if (userPreference && SUPPORTED_LANGUAGES.includes(userPreference)) {
    return { language: userPreference, source: 'user' };
  }

  if (tenantDefault && SUPPORTED_LANGUAGES.includes(tenantDefault)) {
    return { language: tenantDefault, source: 'tenant' };
  }

  if (acceptLanguageHeader) {
    const detected = parseAcceptLanguage(acceptLanguageHeader);
    if (detected !== DEFAULT_LANGUAGE) {
      return { language: detected, source: 'header' };
    }
  }

  return { language: DEFAULT_LANGUAGE, source: 'default' };
}

/**
 * Validate if a language code is supported
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}
