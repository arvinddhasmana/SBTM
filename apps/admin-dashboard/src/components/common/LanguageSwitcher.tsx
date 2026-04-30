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
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200"
      title={i18n.language === 'en' ? 'Switch to French' : 'Passer à l\'anglais'}
    >
      <Languages size={20} />
      <span className="font-medium">{i18n.language === 'en' ? 'FR' : 'EN'}</span>
    </button>
  );
};

export default LanguageSwitcher;
