'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { CHANGELOG, APP_VERSION, type ChangeType } from '@/lib/changelog';

const SEEN_KEY = 'nightingale-seen-version';

const TYPE_STYLES: Record<ChangeType, string> = {
  new: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
  improved: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/20',
  fixed: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20',
};

function formatDate(iso: string, lang: string): string {
  // Deterministic across server/client: fixed locale + UTC timezone.
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function ChangelogPage() {
  const { t, lang } = useI18n();

  // Mark the latest release as seen once the user views this page.
  useEffect(() => {
    try {
      localStorage.setItem(SEEN_KEY, APP_VERSION);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const typeLabel = (type: ChangeType) => t(`changelog.type.${type}`);

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
            {t('changelog.backToApp')}
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
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
          <h1 className="font-display font-bold text-2xl sm:text-3xl">{t('changelog.title')}</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('changelog.subtitle')}</p>
        </div>

        {/* Releases timeline */}
        <div className="space-y-10">
          {CHANGELOG.map((release, idx) => (
            <section key={release.version} className="relative">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 font-display font-semibold text-lg">
                  {idx === 0 && <Sparkles className="w-4 h-4 text-primary" />}
                  v{release.version}
                </span>
                {idx === 0 && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 ring-1 ring-primary/20">
                    {t('changelog.latest')}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{formatDate(release.date, lang)}</span>
              </div>

              <ul className="mt-4 space-y-3">
                {release.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 shrink-0 inline-flex items-center rounded-md text-[11px] font-semibold px-2 py-0.5 ring-1 ${TYPE_STYLES[item.type]}`}
                    >
                      {typeLabel(item.type)}
                    </span>
                    <span className="text-sm leading-relaxed text-foreground/90">
                      {lang === 'uk' ? item.uk : item.en}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
