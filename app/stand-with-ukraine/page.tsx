'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ExternalLink, Heart } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

const ORGS = [
  {
    name: '1991 Charitable Foundation',
    url: 'https://1991fund.in.ua/en/',
    logo: '/partners/fund1991.png',
    descKey: 'ukraine.org.fund1991.desc',
  },
  {
    name: 'Voices of Children',
    url: 'https://voices.org.ua',
    logo: '/partners/voices.png',
    descKey: 'ukraine.org.voices.desc',
  },
  {
    name: 'Vesta Charitable Foundation',
    url: 'https://www.ngovesta.org',
    logo: '/partners/vesta.png',
    descKey: 'ukraine.org.vesta.desc',
  },
  {
    name: 'Ukrainian Relief Task Force',
    url: 'https://www.ukrainianrelieftaskforce.org',
    logo: '/partners/uartf.png',
    descKey: 'ukraine.org.uartf.desc',
  },
] as const;

export default function StandWithUkrainePage() {
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
            {t('ukraine.backToApp')}
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Title area */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#0057B7]/10 to-[#FFD700]/10 ring-1 ring-border/30 shadow-sm text-3xl">
              🇺🇦
            </div>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl">{t('ukraine.title')}</h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">{t('ukraine.subtitle')}</p>
        </div>

        {/* Org list */}
        <div className="space-y-4">
          {ORGS.map((org) => (
            <a
              key={org.url}
              href={org.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-xl border border-border/70 bg-card/50 p-5 transition-colors hover:border-accent/50 hover:bg-accent/5"
            >
              <span className="relative w-12 h-12 rounded-lg overflow-hidden bg-white ring-1 ring-border/40 shrink-0">
                <Image
                  src={org.logo}
                  alt={`${org.name} logo`}
                  fill
                  className="object-contain p-1"
                  sizes="48px"
                />
              </span>
              <span className="flex-1 min-w-0">
                <span className="font-display font-semibold text-base group-hover:text-accent transition-colors flex items-center gap-1.5">
                  {org.name}
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-accent transition-colors" />
                </span>
                <span className="block text-sm text-muted-foreground mt-1 leading-relaxed">
                  {t(org.descKey)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-accent/80 mt-2 group-hover:text-accent transition-colors">
                  {t('ukraine.visit')}
                </span>
              </span>
            </a>
          ))}
        </div>

        {/* Footer note */}
        <div className="pt-6 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Heart className="w-3.5 h-3.5 text-[#FFD700]" fill="currentColor" />
            <span>Nightingale &mdash; {t('ukraine.title')}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
