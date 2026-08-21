'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Shield } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

const SECTIONS = [
  'privacy.section1',
  'privacy.section2',
  'privacy.section3',
  'privacy.section4',
  'privacy.section5',
  'privacy.section6',
  'privacy.section7',
] as const;

export default function PrivacyPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('privacy.backToApp')}
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Title area */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="relative w-12 h-12 rounded-xl p-2 bg-gradient-to-br from-primary/5 via-secondary/30 to-accent/5 dark:from-primary/10 dark:via-secondary/20 dark:to-accent/10 ring-1 ring-border/30 shadow-sm">
              <div className="relative w-full h-full">
                <Image src="/nightingale-icon.png" alt="Nightingale" fill className="object-contain dark:hidden" sizes="32px" />
                <Image src="/nightingale-icon-light.png" alt="Nightingale" fill className="object-contain hidden dark:block" sizes="32px" />
              </div>
            </div>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl">{t('privacy.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('privacy.lastUpdated')}</p>
        </div>

        {/* Intro */}
        <p className="text-base leading-relaxed text-foreground/90">{t('privacy.intro')}</p>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map((s, i) => (
            <section key={s} className="space-y-2">
              <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold">
                  {i + 1}
                </span>
                {t(`${s}.title`)}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground pl-8">{t(`${s}.body`)}</p>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>Nightingale &mdash; {t('privacy.title')}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
