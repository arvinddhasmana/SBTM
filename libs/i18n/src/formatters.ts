import { SupportedLanguage } from './types';

/**
 * Format a date according to locale
 */
export function formatDate(
  date: Date | string | number,
  language: SupportedLanguage,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };

  const locale = language === 'fr' ? 'fr-CA' : 'en-CA';
  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
}

/**
 * Format a time according to locale
 */
export function formatTime(
  date: Date | string | number,
  language: SupportedLanguage,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: language === 'en', // 12-hour for English, 24-hour for French
    ...options,
  };

  const locale = language === 'fr' ? 'fr-CA' : 'en-CA';
  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
}

/**
 * Format a datetime according to locale
 */
export function formatDateTime(
  date: Date | string | number,
  language: SupportedLanguage,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: language === 'en',
    ...options,
  };

  const locale = language === 'fr' ? 'fr-CA' : 'en-CA';
  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
}

/**
 * Format a number according to locale
 */
export function formatNumber(
  value: number,
  language: SupportedLanguage,
  options?: Intl.NumberFormatOptions
): string {
  const locale = language === 'fr' ? 'fr-CA' : 'en-CA';
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a distance in kilometers
 */
export function formatDistance(
  kilometers: number,
  language: SupportedLanguage
): string {
  const formatted = formatNumber(kilometers, language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return language === 'fr' ? `${formatted} km` : `${formatted} km`;
}

/**
 * Format a speed in km/h
 */
export function formatSpeed(
  kmPerHour: number,
  language: SupportedLanguage
): string {
  const formatted = formatNumber(kmPerHour, language, {
    maximumFractionDigits: 0,
  });
  return language === 'fr' ? `${formatted} km/h` : `${formatted} km/h`;
}

/**
 * Format a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string | number,
  language: SupportedLanguage
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const locale = language === 'fr' ? 'fr-CA' : 'en-CA';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffDays > 0) {
    return rtf.format(-diffDays, 'day');
  } else if (diffHours > 0) {
    return rtf.format(-diffHours, 'hour');
  } else if (diffMinutes > 0) {
    return rtf.format(-diffMinutes, 'minute');
  } else {
    return rtf.format(-diffSeconds, 'second');
  }
}
