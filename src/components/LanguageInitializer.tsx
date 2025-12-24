import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Component to initialize language and direction on app load
 * This ensures the document direction is set immediately based on detected language
 */
const LanguageInitializer = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Set initial direction and language immediately
    const currentLang = i18n.language || 'en';
    const isRTL = currentLang === 'ar' || currentLang.startsWith('ar-');
    
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;

    // Listen for language changes
    const handleLanguageChanged = (lng: string) => {
      const isRTL = lng === 'ar' || lng.startsWith('ar-');
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;
    };

    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  return null; // This component doesn't render anything
};

export default LanguageInitializer;

