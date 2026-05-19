import '@testing-library/jest-dom';
import i18n from './i18n/config';

// Ensure i18n is initialized with English before any test runs
beforeAll(async () => {
  await i18n.changeLanguage('en');
});
