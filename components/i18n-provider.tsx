'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UiLang, translate } from '@/lib/i18n';

const STORAGE_KEY = 'nightingale-ui-lang';

interface I18nContextValue {
  lang: UiLang;
  setLang: (lang: UiLang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Always default to 'en' on server + first client render to avoid hydration mismatch.
  const [lang, setLangState] = useState<UiLang>('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as UiLang | null;
      if (stored === 'en' || stored === 'uk') {
        // A previously saved manual choice always wins.
        setLangState(stored);
        document.documentElement.lang = stored;
        return;
      }
      // No saved preference yet: fall back to the browser/OS language,
      // limited to the two supported languages (Ukrainian or English).
      const prefs = [
        ...(navigator.languages ?? []),
        navigator.language,
      ].filter(Boolean) as string[];
      const prefersUk = prefs.some((l) => l.toLowerCase().startsWith('uk'));
      const detected: UiLang = prefersUk ? 'uk' : 'en';
      if (detected !== 'en') {
        setLangState(detected);
      }
      document.documentElement.lang = detected;
    } catch {
      // ignore
    }
  }, []);

  const setLang = useCallback((next: UiLang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
