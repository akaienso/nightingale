'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Scale, ChevronRight } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

const LEGAL_PAGES = [
  { href: '/privacy', titleKey: 'privacy.link', descKey: 'legal.privacy.desc' },
  { href: '/terms', titleKey: 'terms.link', descKey: 'legal.terms.desc' },
] as const;

export default function LegalPage() {
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
            {t('legal.backToApp')}
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
          <h1 className="font-display font-bold text-2xl sm:text-3xl">{t('legal.title')}</h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">{t('legal.subtitle')}</p>
        </div>

        {/* Legal page list */}
        <div className="space-y-3">
          {LEGAL_PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="group flex items-start gap-4 rounded-xl border border-border/70 bg-card/50 p-5 transition-colors hover:border-accent/50 hover:bg-accent/5"
            >
              <span className="mt-0.5 flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 text-accent shrink-0">
                <Scale className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="font-display font-semibold text-base group-hover:text-accent transition-colors">
                  {t(page.titleKey)}
                </span>
                <span className="block text-sm text-muted-foreground mt-1 leading-relaxed">
                  {t(page.descKey)}
                </span>
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 self-center" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
