'use client';

import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';

interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  liveEnabled: boolean;
  onComplete: () => void;
}

type Step = {
  target?: string; // data-tour selector value
  titleKey: string;
  bodyKey: string;
};

const STEPS: Step[] = [
  { titleKey: 'tour.step1.title', bodyKey: 'tour.step1.body' },
  { target: 'settings', titleKey: 'tour.step2.title', bodyKey: 'tour.step2.body' },
  { target: 'modes', titleKey: 'tour.step3.title', bodyKey: 'tour.step3.body' },
  { target: 'history', titleKey: 'tour.step4.title', bodyKey: 'tour.step4.body' },
  { titleKey: 'tour.step5.title', bodyKey: 'tour.step5.body' },
];

const CARD_W = 340;
const GAP = 12;
const PAD = 12;

export default function OnboardingTour({ open, onClose, isAuthenticated, liveEnabled, onComplete }: OnboardingTourProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Reset to first step whenever the tour is (re)opened.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Track viewport size: coach-marks on tablet/desktop (>= 768px), modal on mobile.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  const current = STEPS[step];

  // Step 3 (modes) copy adapts to the viewer: guests only have Panel; signed-in
  // users see Chat + Image, and Live Conversation only where it's enabled
  // (it stays hidden in production until it's ready for release).
  const resolveBodyKey = (s: Step): string => {
    if (s.bodyKey === 'tour.step3.body') {
      if (!isAuthenticated) return 'tour.step3.body.guest';
      return liveEnabled ? 'tour.step3.body.authLive' : 'tour.step3.body.auth';
    }
    return s.bodyKey;
  };

  const measure = useCallback(() => {
    if (!open || !isDesktop || !current?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [open, isDesktop, current]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (!open) return;
    const handler = () => measure();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [open, measure]);

  // Lock body scroll while the tour is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const finish = useCallback((completed: boolean) => {
    try {
      localStorage?.setItem?.('nightingale-tour-done', 'true');
    } catch {
      /* ignore */
    }
    onClose();
    // When the user reaches the end of the tour, slide the Settings panel open
    // so they can immediately set their dialect & variety.
    if (completed) onComplete();
  }, [onClose, onComplete]);

  const next = useCallback(() => {
    setStep((s) => {
      if (s >= STEPS.length - 1) {
        finish(true);
        return s;
      }
      return s + 1;
    });
  }, [finish]);

  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  // Compute coach-mark card position relative to the highlighted element.
  let cardStyle: React.CSSProperties = {};
  const useCoach = isDesktop && rect;
  if (useCoach && rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom;
    const placeBelow = spaceBelow > 220 || spaceBelow > rect.top;
    let left = rect.left + rect.width / 2 - CARD_W / 2;
    left = Math.max(PAD, Math.min(left, vw - CARD_W - PAD));
    if (placeBelow) {
      cardStyle = { top: rect.bottom + GAP, left };
    } else {
      cardStyle = { bottom: vh - rect.top + GAP, left };
    }
  }

  const card = (
    <div
      className="pointer-events-auto w-[340px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-background shadow-2xl p-5 space-y-3"
      role="dialog"
      aria-modal="true"
      aria-label={t(current.titleKey)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <h3 className="font-display font-semibold text-base leading-tight">{t(current.titleKey)}</h3>
        </div>
        <button
          onClick={() => finish(false)}
          aria-label={t('tour.skip')}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 -mr-1 -mt-1 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{t(resolveBodyKey(current))}</p>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 pt-1">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground">
          {t('tour.stepLabel', { current: step + 1, total: STEPS.length })}
        </span>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button variant="ghost" size="sm" onClick={back} className="gap-1.5 h-8">
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('tour.back')}
            </Button>
          )}
          <Button size="sm" onClick={next} className="gap-1.5 h-8">
            {isLast ? t('tour.done') : t('tour.next')}
            {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90]">
      {useCoach && rect ? (
        <>
          {/* Spotlight cutout around the highlighted element */}
          <div
            className="absolute rounded-lg ring-2 ring-primary transition-all duration-200"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            }}
            onClick={() => finish(false)}
          />
          {/* Positioned coach-mark card */}
          <div className="absolute pointer-events-none" style={cardStyle}>
            {card}
          </div>
        </>
      ) : (
        <>
          {/* Centered modal (mobile, or steps without a target) */}
          <div className="absolute inset-0 bg-black/55" onClick={() => finish(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            {card}
          </div>
        </>
      )}
    </div>
  );
}
