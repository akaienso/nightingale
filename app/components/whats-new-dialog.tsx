'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft, Sparkles, Compass, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';
import { APP_VERSION, WHATS_NEW_OVERRIDE } from '@/lib/changelog';

interface WhatsNewDialogProps {
  open: boolean;
  onClose: () => void;
  /** Jump straight to Settings (used by the provider step CTA). */
  onOpenSettings?: () => void;
}

type Step = {
  icon: 'sparkles' | 'nav' | 'quality' | 'closing';
  titleKey: string;
  bodyKey: string;
};

// The mini feature tour for the current release (v1.13.3): the new navigation
// controls and the improved translation quality, wrapped with an intro and a
// closing panel that links to the full changelog.
const STEPS: Step[] = [
  { icon: 'sparkles', titleKey: 'whatsnew.intro.title', bodyKey: 'whatsnew.intro.body' },
  { icon: 'nav', titleKey: 'whatsnew.nav.title', bodyKey: 'whatsnew.nav.body' },
  { icon: 'quality', titleKey: 'whatsnew.quality.title', bodyKey: 'whatsnew.quality.body' },
  { icon: 'closing', titleKey: 'whatsnew.closing.title', bodyKey: 'whatsnew.closing.body' },
];

// Which version the modal reports — pinned by the manual override when set.
const DISPLAY_VERSION = WHATS_NEW_OVERRIDE?.featureVersion ?? APP_VERSION;

export default function WhatsNewDialog({ open, onClose, onOpenSettings }: WhatsNewDialogProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  // Reset to the first step each time the dialog is (re)opened.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const next = useCallback(() => {
    setStep((s) => {
      if (s >= STEPS.length - 1) {
        onClose();
        return s;
      }
      return s + 1;
    });
  }, [onClose]);

  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const renderIcon = () => {
    if (current.icon === 'nav') return <Compass className="w-7 h-7" />;
    if (current.icon === 'quality') return <Languages className="w-7 h-7" />;
    return <Sparkles className="w-7 h-7" />;
  };

  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="relative w-[380px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t('whatsnew.badge')}
        >
          {/* Close */}
          <button
            onClick={onClose}
            aria-label={t('tour.skip')}
            className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Illustrative header band: Olia + nightingale photo, faded behind a
              translucent green wash so the badge and icon stay legible. */}
          <div className="relative px-6 pt-6 pb-5 flex flex-col items-center text-center overflow-hidden">
            {/* Background photo */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ backgroundImage: 'url(/whatsnew-header.png)', backgroundSize: '115%', backgroundPosition: '-50px' }}
            />
            {/* Light green translucent overlay to fade the photo */}
            <div aria-hidden className="absolute inset-0 bg-primary/60" />
            {/* Content */}
            <span className="relative z-[1] inline-flex items-center gap-1.5 rounded-full bg-background/90 text-primary text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 mb-3 shadow-sm">
              <Sparkles className="w-3 h-3" />
              <span>
                {t('whatsnew.badge')} {t('whatsnew.badgeIn')}{' '}
                <a href="/changelog" onClick={onClose} className="underline underline-offset-2 hover:no-underline">
                  v{DISPLAY_VERSION}
                </a>
              </span>
            </span>
            <span className="relative z-[1] inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-background text-primary shadow-md">
              {renderIcon()}
            </span>
          </div>

          {/* Body */}
          <div className="px-6 pt-5 pb-6 space-y-4">
            <div className="space-y-2 text-center">
              <h3 className="font-display font-semibold text-lg leading-tight">{t(current.titleKey)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(current.bodyKey)}</p>
            </div>

            {/* Closing panel: prominent link to the full changelog history. */}
            {isLast && (
              <div className="text-center">
                <a
                  href="/changelog"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  {t('whatsnew.fullEvolution')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`}
                />
              ))}
            </div>

            {/* Controls */}
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
                  {isLast ? t('whatsnew.done') : t('tour.next')}
                  {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
