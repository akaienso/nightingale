'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowRightLeft, Copy, Check, Loader2, Sparkles, AlertCircle, Info, Eraser, ClipboardPaste, Smile, Share2 } from 'lucide-react';
import VerifyTranslationIcon from './verify-translation-icon';
import TranslateSettingsIcon from './translate-settings-icon';
import { buildVerifyUrl, VerifyProvider } from '@/lib/verify-translation';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { TranslationSettings } from './translator-app';
import VoiceControls from './voice-controls';
import { useI18n } from '@/components/i18n-provider';
import ProcessingStatus from './processing-status';
import { partnerFlag } from '@/lib/utils';
import SkipNavPill from './skip-nav-pill';

const STYLE_OPTIONS = ['conversational', 'subtitles', 'voiceover', 'business'];
const FORMAT_OPTIONS = ['general', 'spoken', 'email', 'chat', 'social'];

/**
 * Collision-aware toolbar: watches a header row and, the moment its contents
 * would overflow (e.g. the "Verify Translation" label crowding the speaker
 * icon), hides ALL the text labels at once so the buttons collapse to icons.
 * Uses hysteresis (remembers the width it broke at) so it doesn't flip-flop.
 */
function useCollisionCompact<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [compact, setCompact] = useState(false);
  const breakWidthRef = useRef<number>(Infinity);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const w = el.clientWidth;
      if (!compact) {
        if (el.scrollWidth > el.clientWidth + 2) {
          breakWidthRef.current = w;
          setCompact(true);
        }
      } else if (w > breakWidthRef.current + 24) {
        setCompact(false);
      }
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact]);

  return { ref, compact };
}

interface LoadedEntry {
  /** Changes on every pick so re-selecting the same entry still triggers a load. */
  nonce: number;
  sourceText: string;
  translation: string;
  culturalNote: string | null;
}

interface TwoPanelModeProps {
  settings: TranslationSettings;
  onToggleDirection: () => void;
  onSaveHistory?: (data: any) => void;
  onUpdate?: (updates: Partial<TranslationSettings>) => void;
  /** Set when the user picks an entry in the history panel. */
  loadEntry?: LoadedEntry | null;
}

export default function TwoPanelMode({ settings, onToggleDirection, onSaveHistory, onUpdate, loadEntry }: TwoPanelModeProps) {
  const { t, lang } = useI18n();
  const { ref: outHeaderRef, compact: outCompact } = useCollisionCompact<HTMLDivElement>();
  const [sourceText, setSourceText] = useState('');
  const [translation, setTranslation] = useState('');
  const [culturalNote, setCulturalNote] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sourceCopied, setSourceCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [styleOverride, setStyleOverride] = useState<string | null>(null);
  const [formatOverride, setFormatOverride] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Apply an entry picked from the history panel.
  //
  // Keyed on `nonce`, not on the text, so picking the same entry twice still
  // reloads it after the user has edited the box. Any in-flight translation is
  // aborted first — otherwise its stream would land on top of the restored text
  // a moment later and silently overwrite it.
  useEffect(() => {
    if (!loadEntry) return;
    abortRef.current?.abort?.();
    abortRef.current = null;
    setIsTranslating(false);
    setError(null);
    setSourceText(loadEntry.sourceText ?? '');
    setTranslation(loadEntry.translation ?? '');
    setCulturalNote(loadEntry.culturalNote ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadEntry?.nonce]);

  // ---- Mobile stacked-view layout refs & measurements -----------------
  // On mobile the two panes flow at the document level: each fills half the
  // space between the language bar and the AI-disclaimer at empty state, then
  // grows with content (no internal scrollbars — the page scrolls).
  const langBarRef = useRef<HTMLDivElement | null>(null);
  const srcPaneRef = useRef<HTMLDivElement | null>(null);
  const transPaneRef = useRef<HTMLDivElement | null>(null);
  const srcToolbarRef = useRef<HTMLDivElement | null>(null);
  const translateRowRef = useRef<HTMLDivElement | null>(null);
  const transToolbarRef = useRef<HTMLDivElement | null>(null);
  const [srcMinH, setSrcMinH] = useState<number | undefined>(undefined);
  const [transMinH, setTransMinH] = useState<number | undefined>(undefined);

  const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

  // Compute the 50/50 min-heights that make the empty state fill exactly the
  // viewport (header + language bar + panes + disclaimer = 100dvh), leaving the
  // footer just below the fold. Desktop clears them so the md: classes govern.
  const recomputePaneHeights = useCallback(() => {
    if (!isMobile()) {
      setSrcMinH(undefined);
      setTransMinH(undefined);
      return;
    }
    const langBar = langBarRef.current;
    if (!langBar) return;
    const langBottom = langBar.getBoundingClientRect().bottom;
    const disclaimerEl = typeof document !== 'undefined'
      ? (document.querySelector('[data-disclaimer]') as HTMLElement | null)
      : null;
    const discH = disclaimerEl?.offsetHeight ?? 0;
    // The mobile bottom tab bar is position:fixed and overlays the viewport
    // bottom, so its height must be reserved to keep the disclaimer visible
    // just above it (rather than hidden behind it).
    const tabBarEl = typeof document !== 'undefined'
      ? (document.querySelector('[data-mobile-tabbar]') as HTMLElement | null)
      : null;
    const tabBarH = tabBarEl?.offsetHeight ?? 0;
    const avail = window.innerHeight - langBottom - discH - tabBarH;
    if (avail <= 0) return;
    const paneAvail = avail / 2;
    const PAD_TOP = 16; // pt-4 above the textarea / translation content
    const srcChrome = (srcToolbarRef.current?.offsetHeight ?? 0) + (translateRowRef.current?.offsetHeight ?? 0) + PAD_TOP;
    const transChrome = (transToolbarRef.current?.offsetHeight ?? 0) + PAD_TOP;
    setSrcMinH(Math.max(72, Math.round(paneAvail - srcChrome)));
    setTransMinH(Math.max(72, Math.round(paneAvail - transChrome)));
  }, []);

  useEffect(() => {
    // Defer to let layout settle (fonts, toolbars) before measuring.
    const raf = requestAnimationFrame(recomputePaneHeights);
    window.addEventListener('resize', recomputePaneHeights);
    window.addEventListener('orientationchange', recomputePaneHeights);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', recomputePaneHeights);
      window.removeEventListener('orientationchange', recomputePaneHeights);
    };
  }, [recomputePaneHeights]);

  // Re-measure when the chrome that sits below the panes may change height.
  useEffect(() => {
    recomputePaneHeights();
  }, [translation, culturalNote, isTranslating, error, recomputePaneHeights]);

  // Auto-grow the source textarea on mobile so the full text stays visible
  // (no internal scroll). Desktop clears the inline height (uses flex-1).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!isMobile()) {
      el.style.height = '';
      return;
    }
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [sourceText, srcMinH]);

  // Scroll anchors for the mobile skip pill (document/window coordinates):
  // source top → source bottom → translation top → translation bottom.
  const getSkipStops = useCallback(() => {
    if (typeof window === 'undefined') return { up: [], down: [] };
    const src = srcPaneRef.current;
    const trans = transPaneRef.current;
    const vh = window.innerHeight;
    const sy = window.scrollY;
    const up: number[] = [];
    const down: number[] = [];
    if (src) {
      const r = src.getBoundingClientRect();
      up.push(r.top + sy);
      down.push(r.bottom + sy - vh);
    }
    if (trans) {
      const r = trans.getBoundingClientRect();
      up.push(r.top + sy);
      down.push(r.bottom + sy - vh);
    }
    const clean = (arr: number[]) => Array.from(new Set(arr.map((n) => Math.max(0, Math.round(n))))).sort((a, b) => a - b);
    return { up: clean(up), down: clean(down) };
  }, []);

  const direction = settings?.direction ?? 'en-to-ua';
  const isEnToUa = direction === 'en-to-ua';
  const effectiveStyle = styleOverride ?? settings?.outputFormat ?? 'conversational';
  const effectiveFormat = formatOverride ?? settings?.messageFormat ?? 'general';
  const emojisOn = settings?.emojis === true;
  const isSpanish = (settings?.partnerLang ?? 'english') === 'spanish';
  const engFlag = partnerFlag(settings?.partnerLang, settings?.englishDialect, settings?.spanishDialect);
  const uaFlag = '🇺🇦';
  const partnerLabel = isSpanish ? t('common.spanish') : t('common.english');
  const partnerPlaceholder = isSpanish ? t('panel.placeholder.es') : t('panel.placeholder.en');

  const handleTranslate = useCallback(async (opts?: { style?: string; format?: string; emojis?: boolean }) => {
    const text = sourceText?.trim?.() ?? '';
    if (!text) return;

    const styleV = opts?.style ?? styleOverride ?? settings?.outputFormat ?? 'conversational';
    const formatV = opts?.format ?? formatOverride ?? settings?.messageFormat ?? 'general';
    const emojiV = typeof opts?.emojis === 'boolean' ? opts.emojis : (settings?.emojis === true);

    abortRef?.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsTranslating(true);
    setTranslation('');
    setCulturalNote(null);
    setError(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          direction: settings?.direction ?? 'en-to-ua',
          dialect: settings?.dialect ?? 'western',
          englishDialect: settings?.englishDialect ?? 'american',
          partnerLang: settings?.partnerLang ?? 'english',
          spanishDialect: settings?.spanishDialect ?? 'latam',
          speakerGender: settings?.speakerGender ?? 'male',
          addresseeGender: settings?.addresseeGender ?? 'female',
          formality: settings?.formality ?? 'informal',
          outputFormat: styleV,
          messageFormat: formatV,
          emojis: emojiV,
          mode: 'panel',
          uiLang: lang,
        }),
        signal: controller?.signal,
      });

      if (!response?.ok) {
        const errData = await response?.json?.().catch(() => ({ error: 'Translation failed' }));
        throw new Error(errData?.error ?? 'Translation failed');
      }

      const reader = response?.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let partialRead = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partialRead += decoder.decode(value, { stream: true });
        const lines = partialRead.split('\n');
        partialRead = lines?.pop() ?? '';

        for (const line of (lines ?? [])) {
          if (line?.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              if (parsed?.status === 'completed') {
                const trans = parsed?.result?.translation ?? '';
                const note = parsed?.result?.culturalNote ?? null;
                setTranslation(trans);
                setCulturalNote(note);
                setIsTranslating(false);
                onSaveHistory?.({
                  sourceText: text,
                  translation: trans,
                  culturalNote: note,
                  direction: settings?.direction ?? 'en-to-ua',
                  dialect: settings?.dialect ?? 'western',
                  englishDialect: settings?.englishDialect ?? 'american',
                  partnerLang: settings?.partnerLang ?? 'english',
                  spanishDialect: settings?.spanishDialect ?? 'latam',
                  formality: settings?.formality ?? 'informal',
                  outputFormat: styleV,
                  messageFormat: formatV,
                  mode: 'panel',
                });
                return;
              } else if (parsed?.status === 'error') {
                throw new Error(parsed?.message ?? 'Translation failed');
              }
            } catch (e: any) {
              if (e?.message && e.message !== 'Translation failed') {
                // skip JSON parse errors
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError(err?.message ?? 'Translation failed');
        toast?.error?.(err?.message ?? 'Translation failed');
      }
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, settings, onSaveHistory, lang, styleOverride, formatOverride]);

  const handleStyleChange = useCallback((v: string) => {
    setStyleOverride(v);
    if (translation || sourceText?.trim?.()) handleTranslate({ style: v });
  }, [handleTranslate, translation, sourceText]);

  const handleFormatChange = useCallback((v: string) => {
    setFormatOverride(v);
    if (translation || sourceText?.trim?.()) handleTranslate({ format: v });
  }, [handleTranslate, translation, sourceText]);

  const handleEmojiToggle = useCallback((next: boolean) => {
    onUpdate?.({ emojis: next });
    if (translation || sourceText?.trim?.()) handleTranslate({ emojis: next });
  }, [handleTranslate, onUpdate, translation, sourceText]);

  const saveStyleDefault = useCallback(() => {
    onUpdate?.({ outputFormat: effectiveStyle });
    setStyleOverride(null);
    toast?.success?.(t('panel.defaultSaved'));
  }, [onUpdate, effectiveStyle, t]);

  const saveFormatDefault = useCallback(() => {
    onUpdate?.({ messageFormat: effectiveFormat });
    setFormatOverride(null);
    toast?.success?.(t('panel.defaultSaved'));
  }, [onUpdate, effectiveFormat, t]);

  const handlePaste = useCallback(async () => {
    textareaRef?.current?.focus?.();
    try {
      const text = await navigator?.clipboard?.readText?.();
      if (text) setSourceText(text);
    } catch {
      toast?.error?.(t('panel.pasteBlocked'));
    }
  }, [t]);

  const handleCopy = useCallback(async () => {
    if (!translation) return;
    try {
      await navigator?.clipboard?.writeText?.(translation);
      setCopied(true);
      toast?.success?.(t('common.copiedToClipboard'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast?.error?.(t('common.failedToCopy'));
    }
  }, [translation]);

  const handleShare = useCallback(async () => {
    if (!translation) return;
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ text: translation });
      } catch {
        // user cancelled or share failed — no-op
      }
    } else {
      try {
        await navigator?.clipboard?.writeText?.(translation);
        toast?.success?.(t('common.copiedToClipboard'));
      } catch {
        toast?.error?.(t('common.failedToCopy'));
      }
    }
  }, [translation, t]);

  const handleCopySource = useCallback(async () => {
    if (!sourceText) return;
    try {
      await navigator?.clipboard?.writeText?.(sourceText);
      setSourceCopied(true);
      toast?.success?.(t('common.copiedToClipboard'));
      setTimeout(() => setSourceCopied(false), 2000);
    } catch {
      toast?.error?.(t('common.failedToCopy'));
    }
  }, [sourceText]);

  const handleClearSource = useCallback(() => {
    setSourceText('');
    setTranslation('');
    setCulturalNote(null);
    setError(null);
  }, []);

  const handleSwap = useCallback(() => {
    setSourceText(translation);
    setTranslation(sourceText);
    setCulturalNote(null);
    setError(null);
    onToggleDirection();
  }, [sourceText, translation, onToggleDirection]);

  const charCount = sourceText?.length ?? 0;

  /* ------------------------------------------------------------------ */
  /*  Shared icon-button builder (keeps the JSX below tidy)              */
  /* ------------------------------------------------------------------ */
  const iconBtn = (
    onClick: () => void,
    icon: React.ReactNode,
    label: string,
    extraClass = '',
  ) => (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`h-8 w-8 text-muted-foreground hover:text-foreground ${extraClass}`}
      aria-label={label}
      title={label}
    >
      {icon}
    </Button>
  );

  /* ------------------------------------------------------------------ */
  /*  Style & format popover (opens from the source-pane icon row)       */
  /* ------------------------------------------------------------------ */
  const settingsPopover = (triggerClassName = '') => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`text-muted-foreground hover:text-foreground ${triggerClassName}`}
          aria-label={t('panel.styleFormat')}
          title={t('panel.styleFormat')}
        >
          <TranslateSettingsIcon className="w-full h-full" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-4 space-y-4">
        <p className="text-sm font-semibold text-foreground">{t('panel.styleFormat')}</p>

        {/* Style */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('panel.style')}</span>
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer" title={t('panel.setDefault')}>
              <span>{t('panel.setDefault')}</span>
              <Switch
                checked={settings?.outputFormat === effectiveStyle}
                onCheckedChange={(c: boolean) => { if (c) saveStyleDefault(); }}
                className="scale-90"
              />
            </label>
          </div>
          <select
            value={effectiveStyle}
            onChange={(e) => handleStyleChange(e?.target?.value ?? 'conversational')}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            aria-label={t('panel.style')}
          >
            {STYLE_OPTIONS.map((o) => (
              <option key={o} value={o}>{t('settings.format.' + o)}</option>
            ))}
          </select>
        </div>

        {/* Format */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('panel.format')}</span>
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer" title={t('panel.setDefault')}>
              <span>{t('panel.setDefault')}</span>
              <Switch
                checked={settings?.messageFormat === effectiveFormat}
                onCheckedChange={(c: boolean) => { if (c) saveFormatDefault(); }}
                className="scale-90"
              />
            </label>
          </div>
          <select
            value={effectiveFormat}
            onChange={(e) => handleFormatChange(e?.target?.value ?? 'general')}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            aria-label={t('panel.format')}
          >
            {FORMAT_OPTIONS.map((o) => (
              <option key={o} value={o}>{t('settings.msgformat.' + o)}</option>
            ))}
          </select>
        </div>

        {/* Emojis */}
        <label className="flex items-center justify-between cursor-pointer pt-1">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Smile className="w-3.5 h-3.5" />
            {t('panel.emojis')}
          </span>
          <Switch
            checked={emojisOn}
            onCheckedChange={handleEmojiToggle}
            className="scale-90"
          />
        </label>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="md:h-full flex flex-col">
      {/* Language Direction Bar */}
      <div ref={langBarRef} className="flex items-center justify-center gap-3 py-3 px-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2 font-medium text-sm">
          <span className="text-lg">{isEnToUa ? engFlag : uaFlag}</span>
          <span>{isEnToUa ? partnerLabel : t('common.ukrainian')}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleSwap}
          className="rounded-full h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all duration-fast"
          aria-label={t('panel.swap')}
          title={t('panel.swap')}
        >
          <ArrowRightLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 font-medium text-sm">
          <span className="text-lg">{isEnToUa ? uaFlag : engFlag}</span>
          <span>{isEnToUa ? t('common.ukrainian') : partnerLabel}</span>
        </div>
      </div>

      {/* Panels */}
      <div className="flex flex-col md:grid md:grid-cols-2 md:grid-rows-1 md:flex-1 md:min-h-0 divide-y md:divide-y-0 md:divide-x divide-border/50 md:overflow-hidden">

        {/* ============================================================ */}
        {/* SOURCE PANEL                                                  */}
        {/* ============================================================ */}
        <div ref={srcPaneRef} className="flex flex-col md:min-h-0 md:overflow-hidden">
          {/* Desktop header — hidden on mobile */}
          <div className="hidden md:flex items-center justify-between px-6 pt-6 pb-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('panel.source')}
            </label>
            <div className="flex items-center gap-2">
              {settingsPopover('h-7 w-7 p-1')}
              <VoiceControls
                onTranscript={setSourceText}
                direction={direction}
                partnerLang={settings?.partnerLang}
                compact
              />
              {sourceText && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopySource}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    aria-label={t('panel.copySource')}
                    title={t('panel.copySource')}
                  >
                    {sourceCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearSource}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label={t('panel.clearSource')}
                    title={t('panel.clearSource')}
                  >
                    <Eraser className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
              <span className={`text-xs font-mono ${charCount > 3000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {t('panel.chars', { n: charCount?.toLocaleString?.('en-US') ?? '0' })}
              </span>
            </div>
          </div>

          {/* Text area */}
          <div className="relative flex flex-col md:flex-1 md:min-h-0 px-4 pt-4 md:px-6 md:pt-0">
            <textarea
              ref={textareaRef}
              value={sourceText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSourceText(e?.target?.value ?? '')}
              placeholder={isEnToUa ? partnerPlaceholder : t('panel.placeholder.uk')}
              style={{ minHeight: srcMinH }}
              className="md:flex-1 md:min-h-0 w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none overflow-hidden md:overflow-y-auto text-base leading-relaxed"
              onKeyDown={(e: React.KeyboardEvent) => {
                const useMod = (settings?.enterKeyTranslate ?? 'mod') === 'mod';
                if (e?.key === 'Enter') {
                  if (useMod ? (e?.metaKey || e?.ctrlKey) : !e?.shiftKey) {
                    e?.preventDefault?.();
                    handleTranslate();
                  }
                }
              }}
            />
            {!sourceText && (
              <button
                type="button"
                onClick={handlePaste}
                className="absolute top-12 md:top-8 left-4 md:left-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <ClipboardPaste className="w-4 h-4" />
                {t('panel.paste')}
              </button>
            )}
          </div>

          {/* Mobile source bottom toolbar — icon row */}
          <div ref={srcToolbarRef} className="flex md:hidden items-center justify-between px-4 py-2 border-t border-border/20">
            <div className="flex items-center gap-1">
              {settingsPopover('h-8 w-8 p-1.5')}
              <VoiceControls
                onTranscript={setSourceText}
                direction={direction}
                partnerLang={settings?.partnerLang}
                compact
              />
            </div>
            <div className="flex items-center gap-1">
              {sourceText && (
                <>
                  {iconBtn(handleCopySource,
                    sourceCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />,
                    t('panel.copySource'))}
                  {iconBtn(handleClearSource, <Eraser className="w-4 h-4" />, t('panel.clearSource'),
                    'hover:text-destructive')}
                </>
              )}
              <span className={`text-xs font-mono ml-1 ${charCount > 3000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {t('panel.chars', { n: charCount?.toLocaleString?.('en-US') ?? '0' })}
              </span>
            </div>
          </div>

          {/* Translate button */}
          <div ref={translateRowRef} className="flex items-center justify-between px-4 md:px-3 mt-1 md:mt-3 pt-3 pb-2 md:pb-3 border-t border-border/30 bg-background">
            <p className="text-xs text-muted-foreground hidden md:block">
              {t((settings?.enterKeyTranslate ?? 'mod') === 'mod' ? 'panel.hint.mod' : 'panel.hint.enter')}
            </p>
            <Button
              onClick={() => handleTranslate()}
              disabled={isTranslating || !sourceText?.trim?.()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 w-full md:w-auto"
            >
              {isTranslating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isTranslating ? t('panel.translating') : t('panel.translate')}
            </Button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* OUTPUT / TRANSLATION PANEL                                    */}
        {/* ============================================================ */}
        <div ref={transPaneRef} className="flex flex-col md:min-h-0 bg-muted/20 md:overflow-hidden">
          {/* Desktop header — hidden on mobile */}
          <div ref={outHeaderRef} className="hidden md:flex items-center justify-between px-6 pt-6 pb-2 gap-2 flex-nowrap overflow-hidden">
            <div className="flex items-center gap-2 shrink-0">
              {!outCompact && (
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {t('panel.translation')}
                </label>
              )}
              <VoiceControls
                onTranscript={() => {}}
                textToSpeak={translation}
                direction={direction}
                partnerLang={settings?.partnerLang}
                compact
              />
            </div>
            {translation && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const url = buildVerifyUrl(
                      translation,
                      settings?.direction ?? 'en-to-ua',
                      settings?.partnerLang ?? 'english',
                      (settings?.verifyProvider ?? 'deepl') as VerifyProvider,
                      settings?.customVerifyUrl,
                    );
                    if (url) window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="h-7 gap-1.5 text-xs text-primary hover:bg-primary hover:text-primary-foreground px-2"
                  title={t('verify.tooltip')}
                  aria-label={t('verify.button')}
                >
                  <VerifyTranslationIcon className="w-4 h-4" />
                  {!outCompact && <span className="whitespace-nowrap">{t('verify.button')}</span>}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 gap-1.5 text-xs px-2"
                  title={t('common.copy')}
                  aria-label={t('common.copy')}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {!outCompact && <span className="whitespace-nowrap">{copied ? t('common.copied') : t('common.copy')}</span>}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="h-7 gap-1.5 text-xs px-2"
                  title={t('common.share')}
                  aria-label={t('common.share')}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {!outCompact && <span className="whitespace-nowrap">{t('common.share')}</span>}
                </Button>
              </div>
            )}
          </div>

          {/* Translation content */}
          <div style={{ minHeight: transMinH }} className="md:flex-1 md:min-h-0 md:overflow-auto px-4 pt-4 md:px-6 md:pt-0">
            {isTranslating ? (
              <ProcessingStatus />
            ) : error ? (
              <div className="flex items-start gap-2 text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            ) : translation ? (
              <p className="text-base leading-relaxed whitespace-pre-wrap">{translation}</p>
            ) : (
              <p className="text-muted-foreground/50 text-sm italic">
                {t('panel.resultPlaceholder')}
              </p>
            )}
          </div>

          {/* Cultural note */}
          {culturalNote && (
            <div className="px-4 md:px-6 mt-3 pt-3 border-t border-border/30">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-accent mb-0.5">{t('panel.culturalNote')}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{culturalNote}</p>
                </div>
              </div>
            </div>
          )}

          {/* Mobile translation bottom toolbar — icon row, DeepL-style */}
          <div ref={transToolbarRef} className="flex md:hidden items-center justify-between px-4 py-2 md:mt-auto border-t border-border/20">
            <div className="flex items-center gap-1">
              <VoiceControls
                onTranscript={() => {}}
                textToSpeak={translation}
                direction={direction}
                partnerLang={settings?.partnerLang}
                compact
              />
            </div>
            {translation && (
              <div className="flex items-center gap-1">
                {iconBtn(() => {
                  const url = buildVerifyUrl(
                    translation,
                    settings?.direction ?? 'en-to-ua',
                    settings?.partnerLang ?? 'english',
                    (settings?.verifyProvider ?? 'deepl') as VerifyProvider,
                    settings?.customVerifyUrl,
                  );
                  if (url) window.open(url, '_blank', 'noopener,noreferrer');
                }, <VerifyTranslationIcon className="w-4 h-4" />, t('verify.button'),
                  'text-primary hover:text-primary')}
                {iconBtn(handleCopy,
                  copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />,
                  t('common.copy'))}
                {iconBtn(handleShare, <Share2 className="w-4 h-4" />, t('common.share'))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SkipNavPill getStops={getSkipStops} />
    </div>
  );
}