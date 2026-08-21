'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, ArrowDown, Loader2, User, Users, Volume2, RotateCcw, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Image from 'next/image';
import type { TranslationSettings } from './translator-app';
import { useI18n } from '@/components/i18n-provider';
import ProcessingStatus from './processing-status';
import { englishFlag } from '@/lib/utils';

interface ConversationMessage {
  id: string;
  speaker: 'A' | 'B';
  original: string;
  translation: string;
  culturalNote: string | null;
  timestamp: number;
}

interface LiveConversationModeProps {
  settings: TranslationSettings;
}

export default function LiveConversationMode({ settings }: LiveConversationModeProps) {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [swapped, setSwapped] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<'A' | 'B' | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [inputTextA, setInputTextA] = useState('');
  const [inputTextB, setInputTextB] = useState('');
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sttSupported, setSttSupported] = useState(false);
  const engFlag = englishFlag(settings?.englishDialect);

  useEffect(() => {
    const w = typeof window !== 'undefined' ? window : null;
    if (w) {
      const SR = (w as any).SpeechRecognition || (w as any).webkitSpeechRecognition;
      setSttSupported(!!SR);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const speakerALabel = t('live.speakerA');
  const speakerBLabel = t('live.speakerB');

  const translateAndAdd = useCallback(async (text: string, speaker: 'A' | 'B') => {
    if (!text.trim()) return;
    setIsTranslating(true);

    const direction = speaker === 'A' ? 'en-to-ua' : 'ua-to-en';

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          direction,
          dialect: settings.dialect,
          englishDialect: settings.englishDialect,
          speakerGender: settings.speakerGender,
          addresseeGender: settings.addresseeGender,
          formality: settings.formality,
          outputFormat: 'conversational',
          mode: 'panel',
          uiLang: lang,
        }),
      });

      if (!response.ok) throw new Error('Translation failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let partialRead = '';
      let result = { translation: '', culturalNote: null as string | null };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partialRead += decoder.decode(value, { stream: true });
        const lines = partialRead.split('\n');
        partialRead = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.status === 'completed') {
                result = parsed.result;
              }
            } catch {}
          }
        }
      }

      const msg: ConversationMessage = {
        id: `conv-${Date.now()}`,
        speaker,
        original: text,
        translation: result.translation || text,
        culturalNote: result.culturalNote,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, msg]);

      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(result.translation);
        utterance.lang = speaker === 'A' ? 'uk-UA' : 'en-US';
        utterance.rate = 0.9;
        const voices = window.speechSynthesis.getVoices();
        const targetLang = speaker === 'A' ? 'uk' : 'en';
        const voice = voices.find(v => v.lang.startsWith(targetLang));
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err: any) {
      toast.error(t('live.failed'));
    } finally {
      setIsTranslating(false);
    }
  }, [settings, lang, t]);

  const startListening = useCallback((speaker: 'A' | 'B') => {
    const w = typeof window !== 'undefined' ? window : null;
    if (!w) return;
    const SR = (w as any).SpeechRecognition || (w as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error(t('live.sttUnsupported'));
      return;
    }

    recognitionRef.current?.stop?.();

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speaker === 'A' ? 'en-US' : 'uk-UA';

    let finalTranscript = '';
    setCurrentTranscript('');
    setActiveSpeaker(speaker);

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + ' ';
        } else {
          interim += t;
        }
      }
      setCurrentTranscript((finalTranscript + interim).trim());
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') toast.error(t('live.speechError', { e: event.error }));
      setIsListening(false);
      setActiveSpeaker(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscript.trim()) {
        translateAndAdd(finalTranscript.trim(), speaker);
      }
      setCurrentTranscript('');
      setActiveSpeaker(null);
    };

    recognition.start();
    setIsListening(true);
  }, [translateAndAdd, t]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop?.();
  }, []);

  const handleTextSubmit = useCallback((speaker: 'A' | 'B') => {
    const text = speaker === 'A' ? inputTextA : inputTextB;
    if (!text.trim()) return;
    translateAndAdd(text.trim(), speaker);
    if (speaker === 'A') setInputTextA('');
    else setInputTextB('');
  }, [inputTextA, inputTextB, translateAndAdd]);

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      {/* Title bar */}
      <div className="flex items-center justify-center gap-3 py-3 px-4 border-b border-border/50 bg-muted/30">
        <div className="relative w-5 h-5 rounded-full overflow-hidden">
          <Image src="/nightingale-icon.png" alt="Nightingale" fill className="object-contain dark:hidden" sizes="20px" />
          <Image src="/nightingale-icon-light.png" alt="Nightingale" fill className="object-contain hidden dark:block" sizes="20px" />
        </div>
        <span className="font-medium text-sm">{t('live.title')}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSwapped(s => !s)}
          className="h-7 text-xs gap-1 text-muted-foreground"
          title={t('live.swap')}
          aria-label={t('live.swap')}
        >
          <ArrowRightLeft className="w-3 h-3" />
          <span className="hidden sm:inline">{t('live.swap')}</span>
        </Button>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessages([])}
            className="h-7 text-xs gap-1 text-muted-foreground"
          >
            <RotateCcw className="w-3 h-3" />
            {t('common.clear')}
          </Button>
        )}
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
            <div className="relative w-14 h-14 mb-4">
              <Image src="/nightingale-icon.png" alt="Nightingale" fill className="object-contain dark:hidden" sizes="56px" />
              <Image src="/nightingale-icon-light.png" alt="Nightingale" fill className="object-contain hidden dark:block" sizes="56px" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-1">{t('live.emptyTitle')}</h3>
            <p className="text-xs text-primary font-medium mb-2">{t('live.poweredBy')}</p>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              {t('live.description')}
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.speaker === 'A' ? 'justify-start' : 'justify-end'}`}>
            {msg.speaker === 'A' && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <span className="text-xs">{engFlag}</span>
              </div>
            )}
            <div className={`max-w-[75%] space-y-1.5`}>
              <div className={`rounded-2xl px-4 py-2.5 ${msg.speaker === 'A'
                ? 'bg-primary/10 border border-primary/20 rounded-tl-sm'
                : 'bg-secondary border border-secondary/80 rounded-tr-sm'}`}>
                <p className="text-xs text-muted-foreground mb-1">{msg.original}</p>
                <p className="text-sm font-medium">{msg.translation}</p>
              </div>
              {msg.culturalNote && (
                <p className="text-xs text-muted-foreground italic px-2">{msg.culturalNote}</p>
              )}
            </div>
            {msg.speaker === 'B' && (
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                <span className="text-xs">🇺🇦</span>
              </div>
            )}
          </div>
        ))}

        {(isTranslating || isListening) && (
          <div className="flex items-center justify-center gap-2 py-3">
            {isListening ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  {t('live.listening', { label: activeSpeaker === 'A' ? speakerALabel : speakerBLabel })}
                </span>
              </>
            ) : (
              <ProcessingStatus />
            )}
            {currentTranscript && (
              <span className="text-xs text-muted-foreground italic">"{currentTranscript}"</span>
            )}
          </div>
        )}
      </div>

      {/* Two speaker controls */}
      <div className="border-t border-border/50 bg-background">
        <div className="grid grid-cols-2 divide-x divide-border/50">
          {/* Speaker A - English */}
          <div className={`p-3 space-y-2 min-w-0 ${swapped ? 'order-2' : 'order-1'}`}>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span>{engFlag}</span>
              <span>{speakerALabel}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <input
                type="text"
                value={inputTextA}
                onChange={(e) => setInputTextA(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit('A'); } }}
                placeholder={t('live.placeholder.en')}
                className="flex-1 min-w-0 text-sm bg-muted/40 rounded-lg px-3 py-2 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                disabled={isTranslating || isListening}
              />
              {sttSupported && (
                <Button
                  variant={isListening && activeSpeaker === 'A' ? 'destructive' : 'outline'}
                  size="icon"
                  className="h-9 w-9 rounded-full shrink-0"
                  onClick={() => isListening && activeSpeaker === 'A' ? stopListening() : startListening('A')}
                  disabled={isTranslating || (isListening && activeSpeaker !== 'A')}
                >
                  {isListening && activeSpeaker === 'A' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>

          {/* Speaker B - Ukrainian */}
          <div className={`p-3 space-y-2 min-w-0 ${swapped ? 'order-1' : 'order-2'}`}>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span>🇺🇦</span>
              <span>{speakerBLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <input
                type="text"
                value={inputTextB}
                onChange={(e) => setInputTextB(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit('B'); } }}
                placeholder={t('live.placeholder.uk')}
                className="flex-1 min-w-0 text-sm bg-muted/40 rounded-lg px-3 py-2 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                disabled={isTranslating || isListening}
              />
              {sttSupported && (
                <Button
                  variant={isListening && activeSpeaker === 'B' ? 'destructive' : 'outline'}
                  size="icon"
                  className="h-9 w-9 rounded-full shrink-0"
                  onClick={() => isListening && activeSpeaker === 'B' ? stopListening() : startListening('B')}
                  disabled={isTranslating || (isListening && activeSpeaker !== 'B')}
                >
                  {isListening && activeSpeaker === 'B' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}