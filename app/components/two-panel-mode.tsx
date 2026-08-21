'use client';

import { useState, useRef, useCallback } from 'react';
import { ArrowRightLeft, Copy, Check, Loader2, Sparkles, AlertCircle, Info, Eraser, ClipboardPaste, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { TranslationSettings } from './translator-app';
import VoiceControls from './voice-controls';
import { useI18n } from '@/components/i18n-provider';
import ProcessingStatus from './processing-status';
import { englishFlag } from '@/lib/utils';

const STYLE_OPTIONS = ['conversational', 'subtitles', 'voiceover', 'business'];
const FORMAT_OPTIONS = ['general', 'spoken', 'email', 'chat', 'social'];

interface TwoPanelModeProps {
  settings: TranslationSettings;
  onToggleDirection: () => void;
  onSaveHistory?: (data: any) => void;
  onUpdate?: (updates: Partial<TranslationSettings>) => void;
}

export default function TwoPanelMode({ settings, onToggleDirection, onSaveHistory, onUpdate }: TwoPanelModeProps) {
  const { t, lang } = useI18n();
  const [sourceText, setSourceText] = useState('');
  const [translation, setTranslation] = useState('');
  const [culturalNote, setCulturalNote] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sourceCopied, setSourceCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per-pane, temporary overrides for the instant style/format toggles. `null`
  // means "use the saved app default". These let the user preview different
  // versions without changing their default until they opt to save it.
  const [styleOverride, setStyleOverride] = useState<string | null>(null);
  const [formatOverride, setFormatOverride] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const direction = settings?.direction ?? 'en-to-ua';
  const isEnToUa = direction === 'en-to-ua';
  const effectiveStyle = styleOverride ?? settings?.outputFormat ?? 'conversational';
  const effectiveFormat = formatOverride ?? settings?.messageFormat ?? 'general';
  const emojisOn = settings?.emojis === true;
  const engFlag = englishFlag(settings?.englishDialect);
  const uaFlag = '🇺🇦';

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
                // Save to history
                onSaveHistory?.({
                  sourceText: text,
                  translation: trans,
                  culturalNote: note,
                  direction: settings?.direction ?? 'en-to-ua',
                  dialect: settings?.dialect ?? 'western',
                  englishDialect: settings?.englishDialect ?? 'american',
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

  // Instant style/format toggles from the translation pane. They set a local
  // override and immediately re-run the translation so the user can compare
  // versions without touching their saved defaults.
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

  // Save the currently-previewed style/format as the app-wide default.
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
    // Keep the source field focused so that if the browser blocks programmatic
    // clipboard reads (a browser-level security policy), the user can paste
    // instantly with Ctrl/Cmd + V without an extra click.
    textareaRef?.current?.focus?.();
    try {
      const text = await navigator?.clipboard?.readText?.();
      if (text) setSourceText(text);
    } catch {
      // Read was blocked/denied by the browser. The field is already focused,
      // so guide the user to the native paste shortcut.
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
    // Keep the text the user is working on: move it to follow the language swap.
    setSourceText(translation);
    setTranslation(sourceText);
    setCulturalNote(null);
    setError(null);
    onToggleDirection();
  }, [sourceText, translation, onToggleDirection]);

  const charCount = sourceText?.length ?? 0;

  return (
    <div className="h-full flex flex-col">
      {/* Language Direction Bar */}
      <div className="flex items-center justify-center gap-3 py-3 px-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2 font-medium text-sm">
          <span className="text-lg">{isEnToUa ? engFlag : uaFlag}</span>
          <span>{isEnToUa ? t('common.english') : t('common.ukrainian')}</span>
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
          <span>{isEnToUa ? t('common.ukrainian') : t('common.english')}</span>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
        {/* Source Panel */}
        <div className="flex flex-col p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('panel.source')}
            </label>
            <div className="flex items-center gap-2">
              <VoiceControls
                onTranscript={setSourceText}
                direction={direction}
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
          <div className="relative flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              value={sourceText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSourceText(e?.target?.value ?? '')}
              placeholder={isEnToUa ? t('panel.placeholder.en') : t('panel.placeholder.uk')}
              className="flex-1 min-h-[200px] md:min-h-[300px] w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none text-base leading-relaxed"
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
                className="absolute top-8 left-0 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <ClipboardPaste className="w-4 h-4" />
                {t('panel.paste')}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 pb-1 border-t border-border/30 bg-background">
            <p className="text-xs text-muted-foreground hidden sm:block">
              {t((settings?.enterKeyTranslate ?? 'mod') === 'mod' ? 'panel.hint.mod' : 'panel.hint.enter')}
            </p>
            <Button
              onClick={() => handleTranslate()}
              disabled={isTranslating || !sourceText?.trim?.()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
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

        {/* Output Panel */}
        <div className="flex flex-col p-4 md:p-6 bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('panel.translation')}
            </label>
            <div className="flex items-center gap-2">
              <VoiceControls
                onTranscript={() => {}}
                textToSpeak={translation}
                direction={direction}
                compact
              />
              {translation && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 gap-1.5 text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? t('common.copied') : t('common.copy')}
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-[200px] md:min-h-[300px]">
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

          {culturalNote && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-accent mb-0.5">{t('panel.culturalNote')}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{culturalNote}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pane-pinned quick controls */}
      <div className="sticky bottom-0 z-20 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        {/* Style */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground font-medium">{t('panel.style')}</span>
          <select
            value={effectiveStyle}
            onChange={(e) => handleStyleChange(e?.target?.value ?? 'conversational')}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            aria-label={t('panel.style')}
          >
            {STYLE_OPTIONS.map((o) => (
              <option key={o} value={o}>{t('settings.format.' + o)}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-muted-foreground cursor-pointer" title={t('panel.setDefault')}>
            <Switch
              checked={settings?.outputFormat === effectiveStyle}
              onCheckedChange={(c: boolean) => { if (c) saveStyleDefault(); }}
              className="scale-90"
            />
            <span className="hidden lg:inline">{t('panel.setDefault')}</span>
          </label>
        </div>

        {/* Format */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground font-medium">{t('panel.format')}</span>
          <select
            value={effectiveFormat}
            onChange={(e) => handleFormatChange(e?.target?.value ?? 'general')}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            aria-label={t('panel.format')}
          >
            {FORMAT_OPTIONS.map((o) => (
              <option key={o} value={o}>{t('settings.msgformat.' + o)}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-muted-foreground cursor-pointer" title={t('panel.setDefault')}>
            <Switch
              checked={settings?.messageFormat === effectiveFormat}
              onCheckedChange={(c: boolean) => { if (c) saveFormatDefault(); }}
              className="scale-90"
            />
            <span className="hidden lg:inline">{t('panel.setDefault')}</span>
          </label>
        </div>

        {/* Emoji toggle — always available; applies to the current source content */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Smile className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground font-medium">{t('panel.emojis')}</span>
          <Switch
            checked={emojisOn}
            onCheckedChange={handleEmojiToggle}
            className="scale-90"
          />
        </label>
      </div>
    </div>
  );
}