'use client';

import { X, HelpCircle, Mail, ArrowRight, ChevronDown, ChevronUp, RotateCcw, Compass, User, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';
import { APP_VERSION } from '@/lib/changelog';
import { useState } from 'react';

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  onShowWelcome: () => void;
  onStartTour: () => void;
}

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

export default function HelpPanel({ open, onClose, onShowWelcome, onStartTour }: HelpPanelProps) {
  const { t } = useI18n();
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right-full duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">{t('help.title')}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Guided tour action */}
          <section className="rounded-xl border border-border/60 p-4 space-y-2 bg-muted/30">
            <h3 className="font-display font-semibold text-sm">{t('help.tourSection')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('help.tourDesc')}</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 mt-1"
              onClick={onStartTour}
            >
              <Compass className="w-3.5 h-3.5" />
              {t('help.startTour')}
            </Button>
          </section>

          {/* Welcome screen action */}
          <section className="rounded-xl border border-border/60 p-4 space-y-2 bg-muted/30">
            <h3 className="font-display font-semibold text-sm">{t('help.welcomeSection')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('help.welcomeDesc')}</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 mt-1"
              onClick={() => {
                onShowWelcome();
                onClose();
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('help.showWelcome')}
            </Button>
          </section>

          {/* What's New / changelog */}
          <section className="rounded-xl border border-border/60 p-4 space-y-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold text-sm">{t('help.whatsNewSection')}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('help.whatsNewDesc')}</p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <Link
                href="/changelog"
                onClick={onClose}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {t('help.whatsNewLink')}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <span className="text-xs text-muted-foreground font-mono">v{APP_VERSION}</span>
            </div>
          </section>

          {/* FAQ */}
          <section className="space-y-3">
            <h3 className="font-display font-semibold text-sm">{t('help.faqTitle')}</h3>
            <div className="space-y-1.5">
              {FAQ_KEYS.map((key) => {
                const isOpen = expandedQ === key;
                return (
                  <div key={key} className="rounded-lg border border-border/50 overflow-hidden">
                    <button
                      onClick={() => setExpandedQ(isOpen ? null : key)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
                    >
                      <span>{t(`site.faq.${key}`)}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed">
                        {t(`site.faq.a${key.slice(1)}`)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Contact support */}
          <section className="rounded-xl border border-border/60 p-4 space-y-2 bg-muted/30">
            <h3 className="font-display font-semibold text-sm">{t('help.supportTitle')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('help.supportDesc')}</p>
            <a
              href="mailto:support@nightingale.im"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-1"
            >
              <Mail className="w-4 h-4" />
              support@nightingale.im
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </section>

          {/* About the developer */}
          <section className="rounded-xl border border-border/60 p-4 space-y-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold text-sm">{t('help.devSection')}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('help.devDesc')}</p>
            <Link
              href="/about-developer"
              onClick={onClose}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-1"
            >
              {t('help.devLink')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
