'use client';

import { Lightbulb, Flag } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

interface ReportDisclaimerProps {
  onReport: () => void;
}

/**
 * Slim, unobtrusive AI-disclaimer bar shown at the bottom of the AI-powered
 * screens (translate / chat / image). Includes a small "Report" call-to-action
 * that opens the report dialog.
 */
export default function ReportDisclaimer({ onReport }: ReportDisclaimerProps) {
  const { t } = useI18n();

  return (
    <div data-disclaimer className="shrink-0 border-t border-primary/30 bg-primary/10 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-1.5 flex items-center gap-2 sm:gap-3">
        <Lightbulb className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden="true" />
        <p className="flex-1 text-[11px] sm:text-xs leading-snug text-foreground/80">
          {t('report.disclaimer')}
        </p>
        <button
          type="button"
          onClick={onReport}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] sm:text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={t('report.cta')}
        >
          <Flag className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('report.cta')}</span>
        </button>
      </div>
    </div>
  );
}
