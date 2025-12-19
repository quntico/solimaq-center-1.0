import React, { createContext, useState, useContext, useMemo } from 'react';
import translations from '@/lib/translations';
import { es, enUS, ptBR } from "date-fns/locale";

const LanguageContext = createContext();

const dateLocales = {
  es: es,
  en: enUS,
  pt: ptBR,
};

export function LanguageProvider({ children }) {
  const getInitialLang = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedLang = window.localStorage.getItem('language');
      if (storedLang && ['es', 'en', 'pt'].includes(storedLang)) {
        return storedLang;
      }
    }
    return 'es'; // Default language
  };

  const [language, setLanguage] = useState(getInitialLang);

  const setAndStoreLanguage = (lang) => {
    if (['es', 'en', 'pt'].includes(lang)) {
      setLanguage(lang);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('language', lang);
      }
    }
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let result = translations[language];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        break;
      }
    }

    // Use fallback if result is undefined
    if (result === undefined) {
      let fallback = translations.es;
      for (const fk of keys) {
        fallback = fallback?.[fk];
        if (fallback === undefined) break; // Fallback key also not found
      }
      result = fallback || key;
    }

    // Interpolation logic
    if (typeof result === 'string' && Object.keys(params).length > 0) {
      let text = result;
      for (const [param, value] of Object.entries(params)) {
        text = text.replace(new RegExp(`{${param}}`, 'g'), value);
      }
      return text;
    }

    return result || key;
  };

  const value = useMemo(() => ({
    language,
    setLanguage: setAndStoreLanguage,
    t,
    dateLocale: dateLocales[language] || es,
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}