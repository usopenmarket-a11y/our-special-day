import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';

i18n
  .use(LanguageDetector) // Detects user language
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources: {
      en: { translation: enTranslations },
      ar: { translation: arTranslations },
    },
    fallbackLng: 'en', // Fallback to English if language not found
    supportedLngs: ['en', 'ar'], // Supported languages
    detection: {
      // Order of language detection - check browser language first, then localStorage
      order: ['navigator', 'localStorage', 'htmlTag'],
      // Cache user language preference after they manually change it
      caches: ['localStorage'],
      // Look for 'lang' key in localStorage
      lookupLocalStorage: 'i18nextLng',
      // Convert detected language code (e.g., 'ar-EG', 'ar-SA') to 'ar'
      convertDetectedLanguage: (lng: string) => {
        // Map Arabic variants to 'ar'
        if (lng.startsWith('ar')) {
          return 'ar';
        }
        // Map English variants to 'en'
        if (lng.startsWith('en')) {
          return 'en';
        }
        // Return detected language or fallback
        return lng.split('-')[0];
      },
    },
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for better compatibility
    },
  });

export default i18n;

