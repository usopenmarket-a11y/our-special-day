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
    const updateDirection = (lang: string) => {
      const currentLang = lang || i18n.language || 'en';
      const isRTL = currentLang === 'ar' || currentLang.startsWith('ar-');
      
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = currentLang;
    };

    // Set initial direction
    updateDirection(i18n.language);

    // Listen for language changes using useEffect dependency instead of event listeners
    // This is more reliable and doesn't require i18n.on/off methods
  }, [i18n.language]); // Re-run when language changes

  return null; // This component doesn't render anything
};

export default LanguageInitializer;

