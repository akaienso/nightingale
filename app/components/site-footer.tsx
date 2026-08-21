'use client';

import Link from 'next/link';
import { useI18n } from '@/components/i18n-provider';
import { APP_VERSION } from '@/lib/changelog';

export default function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-24 md:pb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Nightingale
          <span className="text-muted-foreground/40"> · </span>
          <Link href="/changelog" className="hover:text-foreground transition-colors">
            v{APP_VERSION}
          </Link>
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link
            href="/stand-with-ukraine"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('footer.standWithUkraine')}
          </Link>
          <span className="text-xs text-muted-foreground/40">·</span>
          <Link
            href="/learn"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('learn.badge')}
          </Link>
          <span className="text-xs text-muted-foreground/40">·</span>
          <Link
            href="/legal"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('footer.legal')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
