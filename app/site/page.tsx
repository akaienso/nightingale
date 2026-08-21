'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Languages,
  MessageCircle,
  Mic,
  ScanText,
  Sparkles,
  GraduationCap,
  Check,
  Send,
  Loader2,
  ArrowRight,
  Globe,
  BookMarked,
  BookOpen,
  Volume2,
  LineChart,
  Rocket,
} from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { UiLang } from '@/lib/i18n';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const APP_URL = 'https://app.nightingale.im';

const FEATURES: { key: string; icon: React.ElementType }[] = [
  { key: 'translate', icon: Languages },
  { key: 'chat', icon: MessageCircle },
  { key: 'image', icon: ScanText },
];

// Live Conversation is not ready for release yet, so it lives in the roadmap /
// "coming soon" section rather than the available-features grid.
const ROADMAP: { key: string; icon: React.ElementType }[] = [
  { key: 'live', icon: Mic },
  { key: 'item1', icon: BookMarked },
  { key: 'item2', icon: BookOpen },
  { key: 'item3', icon: Volume2 },
  { key: 'item4', icon: LineChart },
];

const USAGE_FAQ = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
const TROUBLE_FAQ = ['q6', 'q7', 'q8', 'q9'] as const;

export default function SitePage() {
  const { t, lang, setLang } = useI18n();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim()) {
      toast.error(t('site.contact.nameRequired'));
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      toast.error(t('site.contact.invalidEmail'));
      return;
    }
    if (!message.trim()) {
      toast.error(t('site.contact.messageRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setSent(true);
        toast.success(t('site.contact.success'));
      } else {
        toast.error(t('site.contact.error'));
      }
    } catch {
      toast.error(t('site.contact.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ===== Sticky Nav ===== */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a href="#top" className="relative h-8 w-[150px] shrink-0" aria-label="Nightingale">
            <Image src="/nightingale-wordmark.png" alt="Nightingale" fill className="object-contain object-left dark:hidden" sizes="150px" priority />
            <Image src="/nightingale-wordmark-light.png" alt="Nightingale" fill className="object-contain object-left hidden dark:block" sizes="150px" priority />
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">{t('site.nav.features')}</a>
            <a href="#tutoring" className="hover:text-foreground transition-colors">{t('site.nav.tutoring')}</a>
            <a href="#roadmap" className="hover:text-foreground transition-colors">{t('site.nav.roadmap')}</a>
            <Link href="/why-nightingale" className="hover:text-foreground transition-colors">{t('why.link')}</Link>
            <a href="#faq" className="hover:text-foreground transition-colors">{t('site.nav.faq')}</a>
            <a href="#contact" className="hover:text-foreground transition-colors">{t('site.nav.contact')}</a>
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLang((lang === 'en' ? 'uk' : 'en') as UiLang)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === 'en' ? 'EN' : 'UK'}
            </button>
            <ThemeToggle />
            <Button asChild size="sm" className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground">
              <a href={APP_URL}>{t('site.nav.launch')}</a>
            </Button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ===== Hero ===== */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-secondary/25 to-accent/8 dark:from-primary/12 dark:via-secondary/10 dark:to-accent/10" aria-hidden />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center space-y-7">
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">
                <Sparkles className="w-3.5 h-3.5" />
                {t('site.hero.badge')}
              </span>
            </div>
            <h1 className="font-display font-bold text-4xl sm:text-6xl leading-[1.08] tracking-tight">
              {t('site.hero.title')}
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto">
              {t('site.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                <a href={APP_URL}>
                  {t('site.hero.cta')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/learn">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  {t('site.hero.ctaSecondary')}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ===== Features ===== */}
        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-20">
          <div className="text-center space-y-3 mb-12">
            <h2 className="font-display font-bold text-3xl sm:text-4xl">{t('site.features.title')}</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">{t('site.features.subtitle')}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="group rounded-2xl border border-border/60 bg-card p-6 sm:p-7 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="inline-flex rounded-xl bg-primary/10 p-3 text-primary mb-4 group-hover:scale-105 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-xl mb-2">{t(`site.features.${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(`site.features.${key}.desc`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Olia Tutoring ===== */}
        <section id="tutoring" className="max-w-6xl mx-auto px-4 sm:px-6 py-4 scroll-mt-20">
          <div className="rounded-3xl bg-gradient-to-br from-primary/5 via-secondary/20 to-accent/5 dark:from-primary/10 dark:via-secondary/10 dark:to-accent/10 ring-1 ring-border/40 p-8 sm:p-12">
            <div className="grid gap-8 md:grid-cols-[auto,1fr] md:items-center">
              <div className="flex justify-center md:justify-start">
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden ring-4 ring-primary/15 shadow-lg shrink-0">
                  <Image src="/olia-avatar.png" alt="Olia" fill className="object-cover" sizes="160px" />
                </div>
              </div>
              <div className="text-center md:text-left space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 text-accent text-xs font-medium px-3 py-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {t('site.tutoring.badge')}
                </span>
                <h2 className="font-display font-bold text-3xl sm:text-4xl">{t('site.tutoring.title')}</h2>
                <p className="text-base leading-relaxed text-muted-foreground max-w-2xl">{t('site.tutoring.desc')}</p>
                <div className="pt-1 flex justify-center md:justify-start">
                  <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href="/learn">
                      {t('site.tutoring.cta')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Roadmap ===== */}
        <section id="roadmap" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-20">
          <div className="text-center space-y-3 mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">
              <Rocket className="w-3.5 h-3.5" />
              {t('site.roadmap.badge')}
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl">{t('site.roadmap.title')}</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">{t('site.roadmap.subtitle')}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {ROADMAP.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="relative rounded-2xl border border-dashed border-border bg-card/50 p-6 sm:p-7"
              >
                <div className="flex items-start gap-4">
                  <div className="inline-flex rounded-xl bg-secondary text-secondary-foreground p-3 shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-semibold text-lg">{t(`site.roadmap.${key}.title`)}</h3>
                      <span className="rounded-full bg-accent/15 text-accent text-[11px] font-medium px-2 py-0.5">
                        {t('site.roadmap.planned')}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{t(`site.roadmap.${key}.desc`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-20 scroll-mt-20">
          <div className="text-center space-y-3 mb-10">
            <h2 className="font-display font-bold text-3xl sm:text-4xl">{t('site.faq.title')}</h2>
          </div>

          <div className="space-y-10">
            <div>
              <h3 className="font-display font-semibold text-lg text-primary mb-3">{t('site.faq.usageTitle')}</h3>
              <Accordion type="single" collapsible className="w-full">
                {USAGE_FAQ.map((q, i) => (
                  <AccordionItem key={q} value={`usage-${i}`}>
                    <AccordionTrigger className="text-left text-base font-medium">{t(`site.faq.${q}`)}</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {t(`site.faq.a${i + 1}`)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <div>
              <h3 className="font-display font-semibold text-lg text-primary mb-3">{t('site.faq.troubleTitle')}</h3>
              <Accordion type="single" collapsible className="w-full">
                {TROUBLE_FAQ.map((q, i) => (
                  <AccordionItem key={q} value={`trouble-${i}`}>
                    <AccordionTrigger className="text-left text-base font-medium">{t(`site.faq.${q}`)}</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {t(`site.faq.a${i + 6}`)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* ===== Contact ===== */}
        <section id="contact" className="max-w-3xl mx-auto px-4 sm:px-6 py-20 scroll-mt-20">
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-sm">
            <div className="text-center space-y-3 mb-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">
                <Send className="w-3.5 h-3.5" />
                {t('site.contact.badge')}
              </span>
              <h2 className="font-display font-bold text-3xl sm:text-4xl">{t('site.contact.title')}</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('site.contact.subtitle')}</p>
            </div>

            {sent ? (
              <div className="flex flex-col items-center text-center gap-3 py-8">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <Check className="w-7 h-7" />
                </div>
                <p className="text-base font-medium text-foreground">{t('site.contact.success')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
                <div className="space-y-1.5">
                  <Label htmlFor="c-name">{t('site.contact.name')}</Label>
                  <Input
                    id="c-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('site.contact.namePlaceholder')}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-email">{t('site.contact.email')}</Label>
                  <Input
                    id="c-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('site.contact.emailPlaceholder')}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-message">{t('site.contact.message')}</Label>
                  <Textarea
                    id="c-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('site.contact.messagePlaceholder')}
                    rows={5}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('site.contact.submitting')}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {t('site.contact.submit')}
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-border/60 bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative h-7 w-[130px]">
            <Image src="/nightingale-wordmark.png" alt="Nightingale" fill className="object-contain object-left dark:hidden" sizes="130px" />
            <Image src="/nightingale-wordmark-light.png" alt="Nightingale" fill className="object-contain object-left hidden dark:block" sizes="130px" />
          </div>
          <p className="text-sm text-muted-foreground text-center sm:text-right">{t('site.footer.tagline')}</p>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/learn" className="hover:text-foreground transition-colors">{t('site.nav.tutoring')}</Link>
            <Link href="/why-nightingale" className="hover:text-foreground transition-colors">{t('why.link')}</Link>
            <a href={APP_URL} className="hover:text-foreground transition-colors">{t('site.nav.launch')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
