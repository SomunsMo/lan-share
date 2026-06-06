import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';

const LANG_KEY = 'lan-share-language';

/**
 * Detect language:
 * 1. Check saved preference from localStorage
 * 2. Fall back to navigator.language
 * 3. Default to 'en' for non-Chinese languages
 */
const detectLanguage = (): string => {
  try {
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang) return savedLang;
  } catch (e) {
    console.warn('Failed to read language from localStorage:', e);
  }

  const navLang = navigator.language;
  if (navLang.startsWith('zh')) return 'zh-CN';
  return 'en';
};

/**
 * Initialize i18next with static imports (for singlefile compat).
 * Called before React renders to ensure translations are ready.
 */
const initI18n = () => {
  const lng = detectLanguage();

  i18n.use(initReactI18next).init({
    resources: {
      'zh-CN': { translation: zhCN },
      'en': { translation: en },
    },
    lng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    returnObjects: true,
  });

  return i18n;
};

/**
 * Switch language and persist preference to localStorage.
 */
export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
  try {
    localStorage.setItem(LANG_KEY, lng);
  } catch (e) {
    console.warn('Failed to save language setting:', e);
  }
};

export default initI18n;
