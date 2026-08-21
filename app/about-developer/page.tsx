'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Heart,
  Lightbulb,
  Wrench,
  Sparkles,
  Rocket,
  Check,
} from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';

export default function AboutDeveloperPage() {
  const { t } = useI18n();

  const features = [
    t('dev.feat.translate'),
    t('dev.feat.chat'),
    t('dev.feat.media'),
    t('dev.feat.voice'),
    t('dev.feat.history'),
    t('dev.feat.offline'),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('dev.back')}
          </Link>
        </div>
      </header>

      <main>
        {/* Hero / Bio */}
        <section className="max-w-3xl mx-auto px-4 pt-10 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-8">
            <div className="shrink-0 mx-auto sm:mx-0">
              <div className="relative w-40 h-52 sm:w-44 sm:h-56 rounded-2xl overflow-hidden bg-muted ring-1 ring-border/50 shadow-sm">
                <Image
                  src="/about/rob-moore.jpg"
                  alt="Rob Moore, the developer of Nightingale"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 160px, 176px"
                  priority
                />
              </div>
            </div>
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">
                <Heart className="w-3.5 h-3.5" />
                {t('dev.badge')}
              </span>
              <h1 className="font-display font-bold text-3xl sm:text-4xl">
                {t('dev.title')}
              </h1>
              <p className="text-muted-foreground text-base">
                {t('dev.subtitle')}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <Button asChild variant="outline" size="sm">
                  <a href="https://rmoore.dev" target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-1.5" />
                    {t('dev.links.personal')}
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href="https://uartf.org" target="_blank" rel="noopener noreferrer">
                    <Heart className="w-4 h-4 mr-1.5" />
                    {t('dev.links.org')}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-14">
          {/* Bio */}
          <section className="space-y-4">
            <h2 className="font-display font-bold text-2xl sm:text-3xl">
              {t('dev.bio.title')}
            </h2>
            <p className="text-base leading-relaxed text-foreground/90">
              {t('dev.bio.body')}
            </p>
          </section>

          {/* Case study divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('dev.cs.heading')}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* The spark */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                <Lightbulb className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl">
                {t('dev.spark.title')}
              </h2>
            </div>
            <p className="text-base leading-relaxed text-foreground/90">
              {t('dev.spark.body')}
            </p>
          </section>

          {/* How it was built */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                <Wrench className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl">
                {t('dev.build.title')}
              </h2>
            </div>
            <p className="text-base leading-relaxed text-foreground/90">
              {t('dev.build.body')}
            </p>
          </section>

          {/* What it does */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl">
                {t('dev.features.title')}
              </h2>
            </div>
            <p className="text-base leading-relaxed text-foreground/90">
              {t('dev.features.body')}
            </p>
            <ul className="space-y-2.5 pt-1">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 rounded-full bg-primary/10 p-1 text-primary">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-base leading-relaxed text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Future */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                <Rocket className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl">
                {t('dev.future.title')}
              </h2>
            </div>
            <p className="text-base leading-relaxed text-foreground/90">
              {t('dev.future.body')}
            </p>
          </section>

          {/* CTA */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-xl">Nightingale</h3>
              <p className="text-sm text-muted-foreground">{t('dev.subtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/">
                  {t('dev.cta')}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href="https://rmoore.dev" target="_blank" rel="noopener noreferrer">
                  {t('dev.ctaVisit')}
                </a>
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
