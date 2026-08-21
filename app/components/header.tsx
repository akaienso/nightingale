'use client';

import { MessageSquare, Columns2, Settings, X, Mic, ImageIcon, History, LogIn, LogOut, User, Menu, Lock, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TranslationMode } from './translator-app';
import { useI18n } from '@/components/i18n-provider';
import { useEffect, useState } from 'react';
import { APP_VERSION } from '@/lib/changelog';
import AuthPromptDialog from './auth-prompt-dialog';

const SEEN_VERSION_KEY = 'nightingale-seen-version';

interface HeaderProps {
  mode: TranslationMode;
  onModeChange: (mode: TranslationMode) => void;
  onSettingsToggle: () => void;
  onHistoryToggle: () => void;
  settingsOpen: boolean;
  isAuthenticated: boolean;
  liveEnabled: boolean;
  onHelpToggle: () => void;
  onOpenProfile?: () => void;
}

const modeConfig: Array<{ value: TranslationMode; labelKey: string; shortKey: string; icon: React.ElementType; authRequired: boolean }> = [
  { value: 'panel', labelKey: 'header.mode.panel', shortKey: 'header.mode.panelShort', icon: Columns2, authRequired: false },
  { value: 'chat', labelKey: 'header.mode.chat', shortKey: 'header.mode.chatShort', icon: MessageSquare, authRequired: true },
  { value: 'conversation', labelKey: 'header.mode.live', shortKey: 'header.mode.live', icon: Mic, authRequired: true },
  { value: 'image', labelKey: 'header.mode.image', shortKey: 'header.mode.image', icon: ImageIcon, authRequired: true },
];

export default function Header({ mode, onModeChange, onSettingsToggle, onHistoryToggle, settingsOpen, isAuthenticated, liveEnabled, onHelpToggle, onOpenProfile }: HeaderProps) {
  const { data: session } = useSession() || {};
  const { t } = useI18n();
  const router = useRouter();

  // Preferred display name (nickname) for the header. Falls back to the
  // account's full name, then the email. Refetched when the profile changes.
  const [preferredName, setPreferredName] = useState<string | null>(null);
  useEffect(() => {
    if (!isAuthenticated) { setPreferredName(null); return; }
    let cancelled = false;
    const load = () => {
      fetch('/api/account')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          setPreferredName(data.preferredName || data.name || null);
        })
        .catch(() => {});
    };
    load();
    const onProfileUpdated = () => load();
    window.addEventListener('nightingale:profile-updated', onProfileUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('nightingale:profile-updated', onProfileUpdated);
    };
  }, [isAuthenticated]);

  const displayName = preferredName || session?.user?.name || session?.user?.email || '';

  // Show a small dot on Help when the current release hasn't been seen yet.
  const [hasUnseenRelease, setHasUnseenRelease] = useState(false);
  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_VERSION_KEY);
      setHasUnseenRelease(seen !== APP_VERSION);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  // Live Conversation ("Talk") mode is decommissioned pending further
  // development — it must not appear anywhere, even grayed out. It is gated
  // behind liveEnabled, which is currently never enabled.
  const modes = modeConfig.filter((m) => m.value !== 'conversation' || liveEnabled);

  // Dialog shown when a signed-out visitor clicks a locked (members-only) tab.
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between gap-2 px-3 sm:px-4 h-14 sm:h-16">
          {/* Logo — links to the marketing/FAQ site. Theme-aware: color for light mode, light/cream for dark mode */}
          <Link href="/site" aria-label={t('header.homeLink')} title={t('header.homeLink')} className="flex items-center min-w-0 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            {/* Full wordmark on all screen sizes (matches the marketing site nav) */}
            <div className="relative h-8 w-[140px] sm:w-[160px] shrink-0">
              <Image src="/nightingale-wordmark.png" alt="Nightingale" fill className="object-contain object-left dark:hidden" sizes="160px" priority />
              <Image src="/nightingale-wordmark-light.png" alt="Nightingale" fill className="object-contain object-left hidden dark:block" sizes="160px" priority />
            </div>
          </Link>

          {/* Mode Tabs - desktop only */}
          <div data-tour="modes" className="hidden md:flex items-center gap-0.5 bg-muted rounded-lg p-1">
            {modes.map(({ value, labelKey, icon: Icon, authRequired }) => {
              const disabled = authRequired && !isAuthenticated;
              const label = t(labelKey);
              return (
                <button
                  key={value}
                  onClick={() => (disabled ? setAuthPromptOpen(true) : onModeChange(value))}
                  aria-disabled={disabled}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-fast whitespace-nowrap ${
                    mode === value
                      ? 'bg-background text-foreground shadow-sm'
                      : disabled
                      ? 'text-muted-foreground/50 hover:text-muted-foreground/80'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={disabled ? t('header.signInTooltip') : label}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  {disabled && <Lock className="w-3 h-3 opacity-60" />}
                </button>
              );
            })}
          </div>

          {/* Right Actions - desktop */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            {isAuthenticated && (
              <Button
                data-tour="history"
                variant="ghost"
                size="icon"
                onClick={onHistoryToggle}
                className="relative h-9 w-9"
                aria-label={t('header.history')}
                title={t('header.history')}
              >
                <History className="w-4 h-4" />
              </Button>
            )}
            <ThemeToggle />
            <Button
              data-tour="help"
              variant="ghost"
              size="icon"
              onClick={onHelpToggle}
              className="relative h-9 w-9"
              aria-label={t('help.title')}
              title={t('help.title')}
            >
              <HelpCircle className="w-4 h-4" />
              {hasUnseenRelease && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" aria-hidden="true" />
              )}
            </Button>
            <Button
              data-tour="settings"
              variant="ghost"
              size="icon"
              onClick={onSettingsToggle}
              className="relative h-9 w-9"
              aria-label={t('header.settings')}
              title={t('header.settings')}
            >
              {settingsOpen ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            </Button>

            {isAuthenticated ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpenProfile?.()}
                  className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted hover:bg-secondary transition-colors text-xs"
                  title={t('profile.title')}
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[100px] truncate">{displayName}</span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="h-9 w-9"
                  title={t('header.signOutTooltip')}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link href="/auth/login">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('header.signIn')}</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Right Actions - mobile: theme toggle + settings + hamburger */}
          <div className="flex md:hidden items-center gap-0.5 shrink-0">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsToggle}
              className="relative h-9 w-9"
              aria-label={t('header.settings')}
              title={t('header.settings')}
            >
              {settingsOpen ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9"
                  aria-label={t('header.menu')}
                >
                  <Menu className="w-5 h-5" />
                  {hasUnseenRelease && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" aria-hidden="true" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAuthenticated && (
                  <>
                    <DropdownMenuItem onSelect={() => onOpenProfile?.()} className="gap-2 cursor-pointer font-normal">
                      <User className="w-4 h-4 shrink-0" />
                      <span className="truncate">{displayName}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {isAuthenticated && (
                  <DropdownMenuItem onSelect={() => onHistoryToggle()} className="gap-2 cursor-pointer">
                    <History className="w-4 h-4" />
                    <span>{t('header.history')}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => onHelpToggle()} className="gap-2 cursor-pointer">
                  <HelpCircle className="w-4 h-4" />
                  <span>{t('help.title')}</span>
                  {hasUnseenRelease && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAuthenticated ? (
                  <DropdownMenuItem onSelect={() => signOut({ callbackUrl: '/' })} className="gap-2 cursor-pointer">
                    <LogOut className="w-4 h-4" />
                    <span>{t('header.signOutTooltip')}</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => router.push('/auth/login')} className="gap-2 cursor-pointer">
                    <LogIn className="w-4 h-4" />
                    <span>{t('header.signIn')}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Bottom Navigation - mobile only */}
      <nav data-mobile-tabbar className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-border/50 bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around">
          {modes.map(({ value, shortKey, icon: Icon, authRequired }) => {
            const disabled = authRequired && !isAuthenticated;
            const label = t(shortKey);
            const active = mode === value;
            return (
              <button
                key={value}
                onClick={() => (disabled ? setAuthPromptOpen(true) : onModeChange(value))}
                aria-disabled={disabled}
                aria-label={label}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors duration-fast ${
                  active
                    ? 'text-primary'
                    : disabled
                    ? 'text-muted-foreground/40'
                    : 'text-muted-foreground'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.25]' : ''}`} />
                  {disabled && <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-1 opacity-70" />}
                </div>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <AuthPromptDialog open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} />
    </>
  );
}
