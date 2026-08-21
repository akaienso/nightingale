'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowRight, Sparkles, MessageSquare, Mic, ImageIcon, LogIn, BookOpen, Feather } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Header from './header';
import TwoPanelMode from './two-panel-mode';
import ChatMode from './chat-mode';
import LiveConversationMode from './live-conversation-mode';
import HelpPanel from './help-panel';
import ImageTranslateMode from './image-translate-mode';
import SettingsPanel from './settings-panel';
import HistoryPanel from './history-panel';
import OnboardingTour from './onboarding-tour';
import { useI18n } from '@/components/i18n-provider';
import { UI_LANGS, UiLang } from '@/lib/i18n';

export type TranslationMode = 'panel' | 'chat' | 'conversation' | 'image';

export interface TranslationSettings {
  dialect: string;
  englishDialect: string;
  englishVarietyChosen: boolean;
  speakerGender: string;
  addresseeGender: string;
  formality: string;
  // "Output Style" in the UI (kept as `outputFormat` internally to avoid a data
  // migration of persisted settings + TranslationHistory rows).
  outputFormat: string;
  // "Output Format" in the UI: the delivery medium the translation is shaped for.
  messageFormat: string;
  direction: string;
  // Per-tab send behaviour: 'enter' = Enter sends, 'mod' = Ctrl/Cmd+Enter sends.
  enterKeyTranslate: string;
  enterKeyChat: string;
  // Insert culturally appropriate emojis into the translation output.
  emojis: boolean;
}

const DEFAULT_SETTINGS: TranslationSettings = {
  dialect: 'western',
  englishDialect: 'american',
  englishVarietyChosen: false,
  speakerGender: 'male',
  addresseeGender: 'female',
  formality: 'informal',
  outputFormat: 'conversational',
  messageFormat: 'general',
  direction: 'en-to-ua',
  enterKeyTranslate: 'mod',
  enterKeyChat: 'mod',
  emojis: false,
};

const AUTH_REQUIRED_MODES: TranslationMode[] = ['chat', 'conversation', 'image'];

export default function TranslatorApp() {
  const { data: session, status } = useSession() || {};
  const { t, lang, setLang } = useI18n();
  const [mode, setMode] = useState<TranslationMode>('panel');
  const [settingsOpen, setSettingsOpen] = useState(false);
  // When set, the settings panel scrolls to this section once opened (e.g.
  // clicking your name in the header jumps straight to the profile block).
  const [settingsScrollTarget, setSettingsScrollTarget] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settings, setSettings] = useState<TranslationSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  // Live Conversation mode is experimental and only exposed on the
  // development/testing host (the abacusai.app URL). Default false so SSR and
  // the initial client render agree; the effect flips it on the dev host.
  const [liveEnabled, setLiveEnabled] = useState(false);

  const isAuthenticated = status === 'authenticated';

  // Refs for account-level settings sync. When signed in, the account is the
  // source of truth so preferences follow the user across devices/browsers.
  const accountHydratedRef = useRef(false);
  const lastSavedRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      if (typeof window !== 'undefined' && window.location.hostname.endsWith('abacusai.app')) {
        setLiveEnabled(true);
      }
    } catch {
      // ignore
    }
    try {
      const saved = localStorage?.getItem?.('ua-us-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings((prev: TranslationSettings) => ({ ...(prev ?? {}), ...(parsed ?? {}) }));
      }
      const welcomed = localStorage?.getItem?.('nightingale-welcomed');
      if (welcomed === 'true') {
        setShowWelcome(false);
      }
      // Auto-launch the guided tour on the very first visit only.
      const tourDone = localStorage?.getItem?.('nightingale-tour-done');
      if (tourDone !== 'true') {
        setTimeout(() => setTourOpen(true), 600);
      }
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator?.serviceWorker?.register?.('/sw.js')?.catch?.(() => {});
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      try {
        localStorage?.setItem?.('ua-us-settings', JSON.stringify(settings));
      } catch {
        // ignore
      }
    }
  }, [settings, mounted]);

  // Load preferences from the signed-in user's account (server wins over the
  // browser copy). Runs once each time the user becomes authenticated.
  useEffect(() => {
    if (status !== 'authenticated') {
      accountHydratedRef.current = false;
      return;
    }
    let cancelled = false;
    fetch('/api/account')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const s = data?.settings;
        if (s && typeof s === 'object') {
          setSettings((prev: TranslationSettings) => ({ ...(prev ?? {}), ...s }));
          const validLang = typeof s.uiLang === 'string' && UI_LANGS.some((l) => l.value === s.uiLang);
          if (validLang) setLang(s.uiLang as UiLang);
          lastSavedRef.current = JSON.stringify({
            dialect: s.dialect ?? DEFAULT_SETTINGS.dialect,
            englishDialect: s.englishDialect ?? DEFAULT_SETTINGS.englishDialect,
            englishVarietyChosen: typeof s.englishVarietyChosen === 'boolean' ? s.englishVarietyChosen : DEFAULT_SETTINGS.englishVarietyChosen,
            speakerGender: s.speakerGender ?? DEFAULT_SETTINGS.speakerGender,
            addresseeGender: s.addresseeGender ?? DEFAULT_SETTINGS.addresseeGender,
            formality: s.formality ?? DEFAULT_SETTINGS.formality,
            outputFormat: s.outputFormat ?? DEFAULT_SETTINGS.outputFormat,
            messageFormat: s.messageFormat ?? DEFAULT_SETTINGS.messageFormat,
            direction: s.direction ?? DEFAULT_SETTINGS.direction,
            enterKeyTranslate: s.enterKeyTranslate ?? DEFAULT_SETTINGS.enterKeyTranslate,
            enterKeyChat: s.enterKeyChat ?? DEFAULT_SETTINGS.enterKeyChat,
            emojis: typeof s.emojis === 'boolean' ? s.emojis : DEFAULT_SETTINGS.emojis,
            uiLang: validLang ? s.uiLang : lang,
          });
        }
        accountHydratedRef.current = true;
      })
      .catch(() => {
        if (!cancelled) accountHydratedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, setLang]);

  // Auto-persist preference changes to the account (debounced) for signed-in
  // users. Guests rely on the local-storage effect above.
  useEffect(() => {
    if (status !== 'authenticated' || !accountHydratedRef.current) return;
    const blob = JSON.stringify({
      dialect: settings.dialect,
      englishDialect: settings.englishDialect,
      englishVarietyChosen: settings.englishVarietyChosen,
      speakerGender: settings.speakerGender,
      addresseeGender: settings.addresseeGender,
      formality: settings.formality,
      outputFormat: settings.outputFormat,
      messageFormat: settings.messageFormat,
      direction: settings.direction,
      enterKeyTranslate: settings.enterKeyTranslate,
      enterKeyChat: settings.enterKeyChat,
      emojis: settings.emojis,
      uiLang: lang,
    });
    if (blob === lastSavedRef.current) return;
    lastSavedRef.current = blob;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: JSON.parse(blob) }),
      }).catch(() => {});
    }, 600);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [settings, lang, status]);

  const updateSettings = useCallback((updates: Partial<TranslationSettings>) => {
    setSettings((prev: TranslationSettings) => ({ ...(prev ?? {}), ...(updates ?? {}) }));
  }, []);

  const toggleDirection = useCallback(() => {
    setSettings((prev: TranslationSettings) => ({
      ...(prev ?? {}),
      direction: prev?.direction === 'en-to-ua' ? 'ua-to-en' : 'en-to-ua',
    }));
  }, []);

  const handleModeChange = useCallback((newMode: TranslationMode) => {
    setMode(newMode);
    setShowWelcome(false);
    try {
      localStorage?.setItem?.('nightingale-welcomed', 'true');
    } catch {}
  }, []);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    try {
      localStorage?.setItem?.('nightingale-welcomed', 'true');
    } catch {}
  }, []);

  const startTour = useCallback(() => {
    setMode('panel');
    setTourOpen(true);
  }, []);

  const reopenWelcome = useCallback(() => {
    setMode('panel');
    setShowWelcome(true);
    try {
      localStorage?.removeItem?.('nightingale-welcomed');
    } catch {}
  }, []);

  const saveToHistory = useCallback(async (data: {
    sourceText: string;
    translation: string;
    culturalNote?: string | null;
    direction: string;
    dialect: string;
    englishDialect?: string;
    formality: string;
    outputFormat: string;
    mode: string;
  }) => {
    if (!isAuthenticated) return;
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      // silent fail
    }
  }, [isAuthenticated]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        mode={mode}
        onModeChange={handleModeChange}
        onSettingsToggle={() => setSettingsOpen((p: boolean) => !p)}
        onHistoryToggle={() => setHistoryOpen((p: boolean) => !p)}
        settingsOpen={settingsOpen}
        isAuthenticated={isAuthenticated}
        liveEnabled={liveEnabled}
        onHelpToggle={() => setHelpOpen((p: boolean) => !p)}
        onOpenProfile={() => { setSettingsScrollTarget('profile'); setSettingsOpen(true); }}
      />

      <div className="flex flex-1 overflow-hidden">
        <SettingsPanel
          open={settingsOpen}
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setSettingsOpen(false)}
          scrollTarget={settingsScrollTarget}
          onScrollHandled={() => setSettingsScrollTarget(null)}
        />

        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {/* Welcome Splash */}
          {showWelcome && mode === 'panel' && (
            <div className="hero-gradient">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                  {/* Animated Portrait */}
                  <div className="shrink-0">
                    <div className="relative w-48 h-64 sm:w-56 sm:h-72 md:w-64 md:h-80 rounded-2xl overflow-hidden shadow-lg ring-1 ring-border/30 bg-muted">
                      <video
                        src="/olia-welcome.mp4"
                        autoPlay
                        muted
                        loop
                        playsInline
                        poster="/olia-welcome.jpg"
                        className="absolute inset-0 w-full h-full object-cover object-top"
                      />
                    </div>
                  </div>
                  {/* Text */}
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <div>
                      <p className="text-sm font-medium text-primary mb-1">{t('welcome.badge')}</p>
                      <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">
                        {t('welcome.greeting')}
                      </h2>
                    </div>
                    <p className="text-muted-foreground leading-relaxed max-w-lg">
                      {t('welcome.intro', { english: t(`welcome.english.${settings.englishVarietyChosen ? settings.englishDialect : 'none'}`) })}
                    </p>
                    {!isAuthenticated && (
                      <p className="text-muted-foreground leading-relaxed max-w-lg text-sm">
                        {t('welcome.introAuth')}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                      <Button
                        onClick={dismissWelcome}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                      >
                        <Sparkles className="w-4 h-4" />
                        {t('welcome.start')}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      {isAuthenticated ? (
                        <Button
                          variant="outline"
                          onClick={() => { dismissWelcome(); handleModeChange('chat'); }}
                          className="gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          {t('welcome.chat')}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          asChild
                          className="gap-2"
                        >
                          <Link href="/auth/login">
                            <LogIn className="w-4 h-4" />
                            {t('welcome.loginRegister')}
                          </Link>
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2.5 items-center md:items-start">
                      <Link
                        href="/learn"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                      >
                        <BookOpen className="w-4 h-4" />
                        {t('learn.badge')}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href="/why-nightingale"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                      >
                        <Feather className="w-4 h-4" />
                        {t('why.link')}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 justify-center md:justify-start">
                      <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary" /> {t('welcome.feature.ai')}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-primary" /> {t('welcome.feature.culture')}</span>
                      <span className="flex items-center gap-1"><Mic className="w-3 h-3 text-primary" /> {t('welcome.feature.voice')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === 'panel' ? (
            <TwoPanelMode
              settings={settings}
              onToggleDirection={toggleDirection}
              onSaveHistory={saveToHistory}
              onUpdate={updateSettings}
            />
          ) : mode === 'chat' ? (
            <ChatMode
              speakerGender={settings.speakerGender}
              englishDialect={settings.englishDialect}
              emojis={settings.emojis}
              enterKeyChat={settings.enterKeyChat}
            />
          ) : mode === 'conversation' && liveEnabled ? (
            <LiveConversationMode settings={settings} />
          ) : mode === 'image' ? (
            <ImageTranslateMode settings={settings} />
          ) : null}
        </main>
      </div>

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      <HelpPanel
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onShowWelcome={reopenWelcome}
        onStartTour={() => { setHelpOpen(false); startTour(); }}
      />

      <OnboardingTour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        isAuthenticated={isAuthenticated}
        liveEnabled={liveEnabled}
        onComplete={() => setSettingsOpen(true)}
      />
    </div>
  );
}