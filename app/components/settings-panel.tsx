'use client';

import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Globe, User, Users, BookOpen, FileText, Languages, Trash2, Shield, Loader2, UserCircle, Check, Smile, MessageSquare, CornerDownLeft, Mail, KeyRound, Link2 } from 'lucide-react';
import type { TranslationSettings } from './translator-app';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/components/i18n-provider';
import { UI_LANGS, UiLang } from '@/lib/i18n';
import { useSession, signIn, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import Link from 'next/link';

interface SettingsPanelProps {
  open: boolean;
  settings: TranslationSettings;
  onUpdate: (updates: Partial<TranslationSettings>) => void;
  onClose: () => void;
  scrollTarget?: string | null;
  onScrollHandled?: () => void;
}

function SettingGroup({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="w-4 h-4 text-accent" />
        {label}
      </div>
      {children}
    </div>
  );
}

function OptionButtons({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(options ?? []).map((opt: { value: string; label: string }) => (
        <button
          key={opt?.value}
          onClick={() => onChange?.(opt?.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-fast ${
            value === opt?.value
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          {opt?.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPanel({ open, settings, onUpdate, onClose, scrollTarget, onScrollHandled }: SettingsPanelProps) {
  const { t, lang, setLang } = useI18n();
  const { data: session } = useSession();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Profile editing state
  const [name, setName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Account security state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const hasGoogle = providers.includes('google');

  const reloadAccount = () => {
    fetch('/api/account')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setName(data.name ?? '');
        setPreferredName(data.preferredName ?? '');
        setBio(data.bio ?? '');
        setEmail(data.email ?? '');
        setHasPassword(!!data.hasPassword);
        setProviders(Array.isArray(data.providers) ? data.providers : []);
      })
      .catch(() => {});
  };

  // Preference buttons save automatically (locally for guests, to the account
  // when signed in). Show an instant, self-dismissing confirmation on change.
  const notifySaved = () => {
    toast.success(session?.user ? t('settings.savedAccount') : t('settings.savedLocal'), {
      id: 'settings-autosave',
      duration: 2000,
    });
  };

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    setProfileLoading(true);
    fetch('/api/account')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setName(data.name ?? '');
        setPreferredName(data.preferredName ?? '');
        setBio(data.bio ?? '');
        setEmail(data.email ?? '');
        setHasPassword(!!data.hasPassword);
        setProviders(Array.isArray(data.providers) ? data.providers : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  // When opened via the header name click, scroll the profile section into view.
  useEffect(() => {
    if (!open || scrollTarget !== 'profile') return;
    const timer = setTimeout(() => {
      profileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onScrollHandled?.();
    }, 120);
    return () => clearTimeout(timer);
  }, [open, scrollTarget, onScrollHandled]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(false);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, preferredName, bio }),
      });
      if (res.ok) {
        const data = await res.json();
        setName(data.name ?? '');
        setPreferredName(data.preferredName ?? '');
        setBio(data.bio ?? '');
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        // Notify the header so it can refresh the displayed name instantly.
        try { window.dispatchEvent(new CustomEvent('nightingale:profile-updated')); } catch {}
      } else {
        setSaveError(true);
      }
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error(t('profile.passwordFailed'));
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPassword || undefined, newPassword }),
      });
      if (res.ok) {
        toast.success(t('profile.passwordSaved'));
        setShowPasswordForm(false);
        setCurrentPassword('');
        setNewPassword('');
        reloadAccount();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || t('profile.passwordFailed'));
      }
    } catch {
      toast.error(t('profile.passwordFailed'));
    } finally {
      setPwSaving(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!hasPassword) {
      toast.error(t('profile.needPasswordFirst'));
      setShowPasswordForm(true);
      return;
    }
    setUnlinking(true);
    try {
      const res = await fetch('/api/account/unlink-google', { method: 'POST' });
      if (res.ok) {
        toast.success(t('profile.googleDisconnected'));
        reloadAccount();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || t('profile.disconnectFailed'));
      }
    } catch {
      toast.error(t('profile.disconnectFailed'));
    } finally {
      setUnlinking(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (res.ok) {
        signOut({ callbackUrl: '/' });
      } else {
        alert(t('account.deleteFailed'));
      }
    } catch {
      alert(t('account.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-30 lg:hidden"
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-14 sm:top-16 bottom-0 w-72 bg-card border-l border-border z-40 overflow-y-auto
          lg:static lg:top-0 lg:z-auto lg:border-l
          transition-transform duration-normal`}
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="p-4 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base tracking-tight">{t('settings.title')}</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <SettingGroup icon={Languages} label={t('settings.uiLanguage')}>
            <OptionButtons
              value={lang}
              options={UI_LANGS.map((l) => ({ value: l.value, label: l.label }))}
              onChange={(v: string) => { setLang(v as UiLang); notifySaved(); }}
            />
          </SettingGroup>

          <SettingGroup icon={MapPin} label={t('settings.dialect')}>
            <OptionButtons
              value={settings?.dialect ?? 'western'}
              options={[
                { value: 'western', label: t('settings.dialect.western') },
                { value: 'central', label: t('settings.dialect.central') },
                { value: 'eastern', label: t('settings.dialect.eastern') },
              ]}
              onChange={(v: string) => { onUpdate?.({ dialect: v }); notifySaved(); }}
            />
          </SettingGroup>

          <SettingGroup icon={Globe} label={t('settings.englishDialect')}>
            <OptionButtons
              value={settings?.englishDialect ?? 'american'}
              options={[
                { value: 'american', label: t('settings.englishDialect.american') },
                { value: 'british', label: t('settings.englishDialect.british') },
                { value: 'australian', label: t('settings.englishDialect.australian') },
                { value: 'canadian', label: t('settings.englishDialect.canadian') },
                { value: 'international', label: t('settings.englishDialect.international') },
              ]}
              onChange={(v: string) => { onUpdate?.({ englishDialect: v, englishVarietyChosen: true }); notifySaved(); }}
            />
          </SettingGroup>

          <SettingGroup icon={User} label={t('settings.speakerGender')}>
            <OptionButtons
              value={settings?.speakerGender ?? 'male'}
              options={[
                { value: 'male', label: t('settings.gender.male') },
                { value: 'female', label: t('settings.gender.female') },
              ]}
              onChange={(v: string) => { onUpdate?.({ speakerGender: v }); notifySaved(); }}
            />
          </SettingGroup>

          <SettingGroup icon={Users} label={t('settings.addresseeGender')}>
            <OptionButtons
              value={settings?.addresseeGender ?? 'female'}
              options={[
                { value: 'female', label: t('settings.gender.female') },
                { value: 'male', label: t('settings.gender.male') },
              ]}
              onChange={(v: string) => { onUpdate?.({ addresseeGender: v }); notifySaved(); }}
            />
          </SettingGroup>

          <SettingGroup icon={BookOpen} label={t('settings.formality')}>
            <OptionButtons
              value={settings?.formality ?? 'informal'}
              options={[
                { value: 'informal', label: t('settings.formality.informal') },
                { value: 'formal', label: t('settings.formality.formal') },
              ]}
              onChange={(v: string) => { onUpdate?.({ formality: v }); notifySaved(); }}
            />
          </SettingGroup>

          <SettingGroup icon={FileText} label={t('settings.outputFormat')}>
            <OptionButtons
              value={settings?.outputFormat ?? 'conversational'}
              options={[
                { value: 'conversational', label: t('settings.format.conversational') },
                { value: 'subtitles', label: t('settings.format.subtitles') },
                { value: 'voiceover', label: t('settings.format.voiceover') },
                { value: 'business', label: t('settings.format.business') },
              ]}
              onChange={(v: string) => { onUpdate?.({ outputFormat: v }); notifySaved(); }}
            />
          </SettingGroup>

          <SettingGroup icon={MessageSquare} label={t('settings.messageFormat')}>
            <p className="text-xs text-muted-foreground leading-relaxed -mt-1">{t('settings.messageFormat.desc')}</p>
            <OptionButtons
              value={settings?.messageFormat ?? 'general'}
              options={[
                { value: 'general', label: t('settings.msgformat.general') },
                { value: 'spoken', label: t('settings.msgformat.spoken') },
                { value: 'email', label: t('settings.msgformat.email') },
                { value: 'chat', label: t('settings.msgformat.chat') },
                { value: 'social', label: t('settings.msgformat.social') },
              ]}
              onChange={(v: string) => { onUpdate?.({ messageFormat: v }); notifySaved(); }}
            />
          </SettingGroup>

          <SettingGroup icon={Smile} label={t('settings.emojis')}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground leading-relaxed">{t('settings.emojis.desc')}</p>
              <Switch
                checked={settings?.emojis === true}
                onCheckedChange={(c: boolean) => { onUpdate?.({ emojis: c }); notifySaved(); }}
              />
            </div>
          </SettingGroup>

          <SettingGroup icon={CornerDownLeft} label={t('settings.enterKeyTranslate')}>
            <OptionButtons
              value={settings?.enterKeyTranslate ?? 'mod'}
              options={[
                { value: 'mod', label: t('settings.enterKey.mod') },
                { value: 'enter', label: t('settings.enterKey.enter') },
              ]}
              onChange={(v: string) => { onUpdate?.({ enterKeyTranslate: v }); notifySaved(); }}
            />
          </SettingGroup>

          <SettingGroup icon={CornerDownLeft} label={t('settings.enterKeyChat')}>
            <p className="text-xs text-muted-foreground leading-relaxed -mt-1">{t('settings.enterKey.desc')}</p>
            <OptionButtons
              value={settings?.enterKeyChat ?? 'mod'}
              options={[
                { value: 'mod', label: t('settings.enterKey.mod') },
                { value: 'enter', label: t('settings.enterKey.enter') },
              ]}
              onChange={(v: string) => { onUpdate?.({ enterKeyChat: v }); notifySaved(); }}
            />
          </SettingGroup>

          <div className="pt-2 border-t border-border space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('settings.footer')}
            </p>

            <div className="flex items-center gap-3">
              <Link
                href="/privacy"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                {t('privacy.link')}
              </Link>
              <span className="text-xs text-muted-foreground/40">·</span>
              <Link
                href="/terms"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                {t('terms.link')}
              </Link>
            </div>
          </div>

          {/* Your profile — only for authenticated users */}
          {session?.user && (
            <div ref={profileRef} className="pt-3 border-t border-border space-y-3 scroll-mt-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <UserCircle className="w-4 h-4 text-accent" />
                {t('profile.title')}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('profile.desc')}
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{t('profile.name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('profile.namePlaceholder')}
                  maxLength={120}
                  disabled={profileLoading || saving}
                  className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{t('profile.preferredName')}</label>
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder={t('profile.preferredNamePlaceholder')}
                  maxLength={60}
                  disabled={profileLoading || saving}
                  className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{t('profile.bio')}</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('profile.bioPlaceholder')}
                  maxLength={2000}
                  rows={4}
                  disabled={profileLoading || saving}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              <Button
                variant="default"
                size="sm"
                className="w-full"
                disabled={profileLoading || saving}
                onClick={handleSaveProfile}
              >
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />{t('profile.saving')}</>
                ) : saved ? (
                  <><Check className="w-3.5 h-3.5 mr-1.5" />{t('profile.saved')}</>
                ) : (
                  t('profile.save')
                )}
              </Button>
              {saveError && (
                <p className="text-xs text-destructive leading-relaxed">{t('profile.saveFailed')}</p>
              )}
            </div>
          )}

          {/* Account & sign-in — only for authenticated users */}
          {session?.user && (
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Shield className="w-4 h-4 text-accent" />
                {t('profile.accountSection')}
              </div>

              {/* Email (read-only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />{t('profile.email')}
                </label>
                <input
                  type="text"
                  value={email}
                  readOnly
                  className="w-full px-3 py-1.5 rounded-md border border-border bg-muted/40 text-muted-foreground text-sm focus:outline-none cursor-default"
                />
              </div>

              {/* Sign-in method */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{t('profile.signInMethod')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {hasGoogle && (
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-secondary text-foreground">{t('profile.method.google')}</span>
                  )}
                  {hasPassword && (
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-secondary text-foreground">{t('profile.method.password')}</span>
                  )}
                </div>
              </div>

              {/* Google connection */}
              {hasGoogle ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-500" />{t('profile.googleConnected')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={unlinking}
                    onClick={handleDisconnectGoogle}
                  >
                    {unlinking ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    {t('profile.disconnectGoogle')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => signIn('google')}
                  >
                    <Link2 className="w-3.5 h-3.5" />{t('profile.connectGoogle')}
                  </Button>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('profile.connectGoogleHint')}</p>
                </div>
              )}

              {/* Password set / change */}
              {!showPasswordForm ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => setShowPasswordForm(true)}
                >
                  <KeyRound className="w-3.5 h-3.5" />{hasPassword ? t('profile.changePassword') : t('profile.setPassword')}
                </Button>
              ) : (
                <div className="space-y-2 rounded-md border border-border p-3">
                  {hasPassword && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">{t('profile.currentPassword')}</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">{t('profile.newPassword')}</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setShowPasswordForm(false); setCurrentPassword(''); setNewPassword(''); }}
                    >
                      {t('profile.cancel')}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      disabled={pwSaving}
                      onClick={handleSavePassword}
                    >
                      {pwSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                      {t('profile.savePassword')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delete account — only for authenticated users */}
          {session?.user && (
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <Trash2 className="w-4 h-4" />
                {t('account.deleteTitle')}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('account.deleteDesc')}
              </p>
              {!showDeleteConfirm ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  {t('account.deleteBtn')}
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-destructive font-medium leading-relaxed">
                    {t('account.deleteConfirm')}
                  </p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-3 py-1.5 rounded-md border border-destructive/30 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      disabled={deleteInput !== 'DELETE' || deleting}
                      onClick={handleDeleteAccount}
                    >
                      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                      {t('account.deleteBtn')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
