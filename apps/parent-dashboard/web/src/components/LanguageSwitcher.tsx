import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      aria-label="Change language"
    >
      <Languages size={20} className="text-gray-600" />
      <span className="text-sm font-medium text-gray-700">
        {i18n.language === 'en' ? 'FR' : 'EN'}
      </span>
    </button>
  );
};

export default LanguageSwitcher;
