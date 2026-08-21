'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Music,
  Feather,
  BookOpen,
  Palette,
  Heart,
  Quote,
} from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';

export default function WhyNightingalePage() {
  const { t } = useI18n();

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
            {t('why.back')}
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-muted overflow-hidden">
            <Image
              src="/why-nightingale/hero-nightingale.jpg"
              alt="A nightingale singing among lush green foliage"
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" aria-hidden />
          </div>
          <div className="max-w-3xl mx-auto px-4 -mt-20 sm:-mt-28 relative text-center space-y-4 pb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">
              <Feather className="w-3.5 h-3.5" />
              {t('why.badge')}
            </span>
            <h1 className="font-display font-bold text-3xl sm:text-5xl leading-tight">
              {t('why.title')}
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto">
              {t('why.subtitle')}
            </p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 py-12 space-y-16">
          {/* The nightingale's language */}
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                <Music className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl">{t('why.lang.title')}</h2>
            </div>
            <p className="text-base leading-relaxed text-foreground/90">{t('why.lang.body')}</p>
            <figure className="space-y-2">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-muted ring-1 ring-border/40">
                <Image
                  src="/why-nightingale/solovina.png"
                  alt="Artistic illustration of a singing nightingale with musical motifs in warm golden tones"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                />
              </div>
              <figcaption className="text-sm text-muted-foreground text-center italic">{t('why.lang.caption')}</figcaption>
            </figure>
          </section>

          {/* Folklore */}
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                <Feather className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl">{t('why.folklore.title')}</h2>
            </div>
            <p className="text-base leading-relaxed text-foreground/90">{t('why.folklore.body')}</p>
          </section>

          {/* Poetry */}
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl">{t('why.poetry.title')}</h2>
            </div>
            <p className="text-base leading-relaxed text-foreground/90">{t('why.poetry.body')}</p>
            <blockquote className="relative rounded-2xl bg-gradient-to-br from-primary/5 via-secondary/20 to-accent/5 dark:from-primary/10 dark:via-secondary/10 dark:to-accent/10 ring-1 ring-border/40 p-6 sm:p-8">
              <Quote className="w-7 h-7 text-primary/40 mb-3" />
              <p className="font-display text-xl sm:text-2xl leading-relaxed text-foreground italic">
                {t('why.poetry.quote')}
              </p>
              <footer className="mt-4 text-sm text-muted-foreground">{t('why.poetry.quoteSource')}</footer>
            </blockquote>
            <figure className="space-y-2">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-muted ring-1 ring-border/40">
                <Image
                  src="/why-nightingale/cherry-blossom.png"
                  alt="A nightingale perched among white and pink cherry blossoms"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                />
              </div>
              <figcaption className="text-sm text-muted-foreground text-center italic">{t('why.poetry.caption')}</figcaption>
            </figure>
          </section>

          {/* Art through the ages */}
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                <Palette className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl">{t('why.art.title')}</h2>
            </div>
            <p className="text-base leading-relaxed text-foreground/90">{t('why.art.body')}</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <figure className="space-y-2">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-muted ring-1 ring-border/40">
                  <Image
                    src="/why-nightingale/petrykivka.png"
                    alt="Ukrainian Petrykivka folk painting of a nightingale among flowers and vines"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 384px"
                  />
                </div>
                <figcaption className="text-sm text-muted-foreground text-center italic">{t('why.art.cap1')}</figcaption>
              </figure>
              <figure className="space-y-2">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-muted ring-1 ring-border/40">
                  <Image
                    src="/why-nightingale/vyshyvanka.jpg"
                    alt="Traditional Ukrainian vyshyvanka embroidery with birds in red and black thread"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 384px"
                  />
                </div>
                <figcaption className="text-sm text-muted-foreground text-center italic">{t('why.art.cap2')}</figcaption>
              </figure>
            </div>
          </section>

          {/* Why we chose the name */}
          <section className="space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-accent/15 p-2.5 text-accent">
                <Heart className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl">{t('why.name.title')}</h2>
            </div>
            <p className="text-base leading-relaxed text-foreground/90">{t('why.name.body')}</p>
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/">
                  {t('why.cta')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/learn">
                  <BookOpen className="w-4 h-4 mr-2" />
                  {t('why.ctaLearn')}
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
