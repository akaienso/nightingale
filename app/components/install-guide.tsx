'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Download,
  X,
  Monitor,
  Laptop,
  Smartphone,
  Share,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useI18n } from '@/components/i18n-provider';

type Platform = 'windows' | 'mac' | 'android' | 'ios';

const PLATFORMS: { value: Platform; icon: React.ElementType }[] = [
  { value: 'windows', icon: Monitor },
  { value: 'mac', icon: Laptop },
  { value: 'android', icon: Smartphone },
  { value: 'ios', icon: Share },
];

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'windows';
  const ua = navigator.userAgent || '';
  const platform = (navigator as any).platform || '';
  const maxTouch = navigator.maxTouchPoints || 0;
  // iPadOS 13+ reports as MacIntel with touch support.
  if (/iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && maxTouch > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Mac/.test(platform) || /Mac OS X/.test(ua)) return 'mac';
  return 'windows';
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Shared store for the browser's `beforeinstallprompt` event so we can offer a
// genuine one-tap install button on Chrome / Edge / Android.
// ---------------------------------------------------------------------------
let deferredPrompt: any = null;
const promptListeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    promptListeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    promptListeners.forEach((l) => l());
  });
}

function useInstallPrompt() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const l = () => setAvailable(!!deferredPrompt);
    promptListeners.add(l);
    l();
    return () => {
      promptListeners.delete(l);
    };
  }, []);
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    try {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // user dismissed or unsupported
    }
    deferredPrompt = null;
    promptListeners.forEach((l) => l());
    return true;
  }, []);
  return { available, promptInstall };
}

export function hasInstallPrompt(): boolean {
  return !!deferredPrompt;
}

// ---------------------------------------------------------------------------
// InstallInstructions — the reusable four-platform guide (used in the dialog
// and inline in both FAQs).
// ---------------------------------------------------------------------------
export function InstallInstructions() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Platform>('windows');
  const { available, promptInstall } = useInstallPrompt();

  useEffect(() => {
    setTab(detectPlatform());
  }, []);

  return (
    <div className="space-y-4">
      {available && (
        <Button
          onClick={promptInstall}
          className="w-full gap-2"
          size="sm"
        >
          <Download className="w-4 h-4" />
          {t('install.oneTap')}
        </Button>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Platform)} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          {PLATFORMS.map(({ value, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5 text-xs">
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t(`install.tab.${value}`)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {PLATFORMS.map(({ value }) => {
          const steps = t(`install.${value}.steps`).split('\n').filter(Boolean);
          return (
            <TabsContent key={value} value={value} className="mt-4">
              <ol className="space-y-3">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VerifyServiceGuide — inline FAQ answer explaining how to change / customise
// the translation verification service.
// ---------------------------------------------------------------------------
export function VerifyServiceGuide() {
  const { t } = useI18n();
  const paragraphs = t('verify.faq.body').split('\n').filter(Boolean);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <code className="block rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-xs text-foreground break-all">
        {t('verify.faq.exampleUrl')}
      </code>
      <p className="flex items-start gap-1.5">
        <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>{t('verify.faq.note')}</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InstallGuideDialog — the dialog wrapper opened from the toast / FAQ.
// ---------------------------------------------------------------------------
export function InstallGuideDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Download className="w-5 h-5 text-primary" />
            {t('install.dialog.title')}
          </DialogTitle>
          <DialogDescription>{t('install.dialog.subtitle')}</DialogDescription>
        </DialogHeader>
        <InstallInstructions />
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// InstallPrompt — first-visit toast + dialog host. Mount once, high in the app.
// ---------------------------------------------------------------------------
const SEEN_KEY = 'nightingale-install-hint-seen';

export function InstallPrompt({ active }: { active: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!active) return;
    if (isStandalone()) return;

    let seen = false;
    try {
      seen = localStorage?.getItem?.(SEEN_KEY) === 'true';
    } catch {
      // ignore
    }
    if (seen) return;

    const timer = setTimeout(() => {
      try {
        localStorage?.setItem?.(SEEN_KEY, 'true');
      } catch {
        // ignore
      }
      toast.custom(
        (id) => (
          <div className="relative w-full rounded-lg border border-border bg-background p-4 shadow-lg">
            <button
              onClick={() => toast.dismiss(id)}
              className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex gap-3">
              <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary">
                <Download className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <p className="font-display font-semibold text-sm text-foreground">
                  {t('install.toast.title')}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {t('install.toast.body')}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => {
                      setOpen(true);
                      toast.dismiss(id);
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t('install.toast.action')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-muted-foreground"
                    onClick={() => toast.dismiss(id)}
                  >
                    {t('install.toast.dismiss')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ),
        { duration: 15000 },
      );
    }, 2200);

    return () => clearTimeout(timer);
  }, [active, t]);

  return <InstallGuideDialog open={open} onOpenChange={setOpen} />;
}
