'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useI18n } from '@/components/i18n-provider';

interface VoiceControlsProps {
  onTranscript: (text: string) => void;
  textToSpeak?: string;
  direction: string;
  compact?: boolean;
}

export default function VoiceControls({ onTranscript, textToSpeak, direction, compact }: VoiceControlsProps) {
  const { t } = useI18n();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const w = typeof window !== 'undefined' ? window : null;
    if (w) {
      const SpeechRecognition = (w as any).SpeechRecognition || (w as any).webkitSpeechRecognition;
      setSttSupported(!!SpeechRecognition);
      setTtsSupported(!!w.speechSynthesis);
    }
  }, []);

  const startListening = useCallback(() => {
    const w = typeof window !== 'undefined' ? window : null;
    if (!w) return;
    const SpeechRecognition = (w as any).SpeechRecognition || (w as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(t('voice.sttUnsupported'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;

    // Set language based on source direction
    const isEnToUa = direction === 'en-to-ua';
    recognition.lang = isEnToUa ? 'en-US' : 'uk-UA';

    let finalTranscript = '';

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
      onTranscript((finalTranscript + interim).trim());
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        toast.error(t('voice.sttError', { e: event.error }));
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  }, [direction, onTranscript, t]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop?.();
    setIsListening(false);
  }, []);

  const speak = useCallback(() => {
    if (!textToSpeak?.trim() || typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) {
      toast.error(t('voice.ttsUnsupported'));
      return;
    }

    if (synth.speaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const isEnToUa = direction === 'en-to-ua';
    // Output language is the target
    utterance.lang = isEnToUa ? 'uk-UA' : 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Try to find a matching voice
    const voices = synth.getVoices();
    const targetLang = isEnToUa ? 'uk' : 'en';
    const voice = voices.find(v => v.lang.startsWith(targetLang));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.speak(utterance);
  }, [textToSpeak, direction, t]);

  if (!sttSupported && !ttsSupported) return null;

  const btnSize = compact ? 'h-8 w-8' : 'h-9 w-9';
  const iconSize = compact ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-1">
      {sttSupported && (
        <Button
          variant={isListening ? 'destructive' : 'outline'}
          size="icon"
          onClick={isListening ? stopListening : startListening}
          className={`${btnSize} rounded-full transition-all ${isListening ? 'animate-pulse' : ''}`}
          title={isListening ? t('voice.stopListening') : t('voice.startInput')}
        >
          {isListening ? <MicOff className={iconSize} /> : <Mic className={iconSize} />}
        </Button>
      )}
      {ttsSupported && textToSpeak && (
        <Button
          variant="outline"
          size="icon"
          onClick={speak}
          className={`${btnSize} rounded-full`}
          title={isSpeaking ? t('voice.stopSpeaking') : t('voice.listen')}
        >
          {isSpeaking ? <VolumeX className={iconSize} /> : <Volume2 className={iconSize} />}
        </Button>
      )}
    </div>
  );
}
