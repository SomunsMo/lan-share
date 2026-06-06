import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';

/**
 * Detect language:
 * 1. Check saved preference from SQLite via IPC
 * 2. Fall back to navigator.language
 * 3. Default to 'en' for non-Chinese languages
 */
const detectLanguage = async (): Promise<string> => {
  try {
    const savedLang = await invoke<string>('get_language');
    if (savedLang) return savedLang;
  } catch (e) {
    console.warn('Failed to get language setting:', e);
  }

  const navLang = navigator.language;
  if (navLang.startsWith('zh')) return 'zh-CN';
  return 'en';
};

/**
 * Initialize i18next with lazy-loaded translation files.
 * Called before React renders to ensure translations are ready.
 */
const initI18n = async () => {
  const lng = await detectLanguage();

  const [zhCN, en] = await Promise.all([
    import('./locales/zh-CN.json'),
    import('./locales/en.json'),
  ]);

  await i18n.use(initReactI18next).init({
    resources: {
      'zh-CN': { translation: zhCN.default || zhCN },
      'en': { translation: en.default || en },
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
 * Switch language and persist preference to SQLite.
 */
export const changeLanguage = async (lng: string) => {
  await i18n.changeLanguage(lng);
  try {
    await invoke('set_language', { language: lng });
  } catch (e) {
    console.warn('Failed to save language setting:', e);
  }
};

export default initI18n;
