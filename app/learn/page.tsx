'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Landmark,
  BookOpen,
  UtensilsCrossed,
  Music,
  Film,
  Check,
  Send,
  Loader2,
  Sparkles,
  GraduationCap,
  Globe2,
  UserCheck,
  Heart,
} from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EXPLORE: { key: string; icon: React.ElementType }[] = [
  { key: 'learn.explore1', icon: Landmark },
  { key: 'learn.explore2', icon: BookOpen },
  { key: 'learn.explore3', icon: UtensilsCrossed },
  { key: 'learn.explore4', icon: Music },
  { key: 'learn.explore5', icon: Film },
];

const POINTS = ['learn.point1', 'learn.point2', 'learn.point3'] as const;

export default function LearnPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // Pre-populate from the signed-in user's session (only if fields are empty).
  useEffect(() => {
    if (session?.user) {
      if (session.user.name) setName((prev) => prev || session.user!.name!);
      if (session.user.email) setEmail((prev) => prev || session.user!.email!);
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim()) {
      toast.error(t('learn.form.nameRequired'));
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      toast.error(t('learn.form.invalidEmail'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/tutoring-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setSent(true);
        toast.success(t('learn.form.success'));
      } else {
        toast.error(t('learn.form.error'));
      }
    } catch {
      toast.error(t('learn.form.error'));
    } finally {
      setSubmitting(false);
    }
  };

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
            {t('learn.backToApp')}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* Hero */}
        <section className="text-center space-y-5">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">
              <Sparkles className="w-3.5 h-3.5" />
              {t('learn.badge')}
            </span>
          </div>
          <div className="flex justify-center">
            <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-primary/15 shadow-lg">
              <Image src="/olia-avatar.png" alt="Olia" fill className="object-cover" sizes="112px" priority />
            </div>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-4xl leading-tight">
            {t('learn.title')} <span aria-hidden>🇺🇦</span>
          </h1>
          <p className="text-lg font-medium text-foreground/90">{t('learn.greeting')}</p>
          <p className="text-base leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            {t('learn.intro')}
          </p>
          <p className="text-base leading-relaxed text-foreground/90 max-w-2xl mx-auto italic">
            {t('learn.description')}
          </p>
          <div className="max-w-2xl mx-auto flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-left">
            <Heart className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed text-foreground/90">{t('learn.humanNote')}</p>
          </div>
        </section>

        {/* Explore */}
        <section className="space-y-4">
          <h2 className="font-display font-semibold text-xl text-center">{t('learn.exploreTitle')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {EXPLORE.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-4"
              >
                <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{t(key)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What lessons are like */}
        <section className="space-y-4 rounded-2xl bg-gradient-to-br from-primary/5 via-secondary/20 to-accent/5 dark:from-primary/10 dark:via-secondary/10 dark:to-accent/10 p-6 ring-1 ring-border/40">
          <h2 className="font-display font-semibold text-xl text-center">{t('learn.pointsTitle')}</h2>
          <ul className="space-y-3 max-w-2xl mx-auto">
            {POINTS.map((key) => (
              <li key={key} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm leading-relaxed text-foreground/90">{t(key)}</span>
              </li>
            ))}
          </ul>
          <p className="text-center text-base font-medium text-primary pt-2">{t('learn.cta')}</p>
        </section>

        {/* About your tutor */}
        <section className="space-y-4">
          <h2 className="font-display font-semibold text-xl text-center">{t('learn.credTitle')}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { key: 'learn.cred1', icon: GraduationCap },
              { key: 'learn.cred2', icon: UserCheck },
              { key: 'learn.cred3', icon: Globe2 },
            ].map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="flex flex-col items-center text-center gap-3 rounded-xl border border-border/60 bg-card/40 p-5"
              >
                <div className="shrink-0 rounded-full bg-primary/10 p-3 text-primary">
                  <Icon className="w-6 h-6" />
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{t(key)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Inquiry form */}
        <section id="contact" className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="text-center space-y-2 mb-6">
            <h2 className="font-display font-bold text-2xl">{t('learn.form.title')}</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('learn.form.subtitle')}</p>
          </div>

          {sent ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Check className="w-7 h-7" />
              </div>
              <p className="text-base font-medium text-foreground">{t('learn.form.success')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t('learn.form.name')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('learn.form.namePlaceholder')}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t('learn.form.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('learn.form.emailPlaceholder')}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">{t('learn.form.message')}</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('learn.form.messagePlaceholder')}
                  rows={4}
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
                    {t('learn.form.submitting')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t('learn.form.submit')}
                  </>
                )}
              </Button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
