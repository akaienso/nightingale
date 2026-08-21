'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Camera, CheckCircle2, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useI18n } from '@/components/i18n-provider';
import type { TranslationMode } from './translator-app';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  mode: TranslationMode;
  screenshot: string | null;
  capturing: boolean;
}

const CATEGORIES = ['bug', 'incorrect', 'inappropriate', 'unnatural', 'other'] as const;

export default function ReportDialog({ open, onClose, mode, screenshot, capturing }: ReportDialogProps) {
  const { t } = useI18n();
  const { data: session } = useSession() || {};
  const [category, setCategory] = useState<string>('incorrect');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Prefill the email field from the signed-in account (if any) each time the
  // dialog opens, and reset the transient form state.
  useEffect(() => {
    if (open) {
      setCategory('incorrect');
      setDescription('');
      setEmail(session?.user?.email ?? '');
      setIncludeScreenshot(true);
      setSubmitting(false);
    }
  }, [open, session?.user?.email]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error(t('report.descriptionRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description: description.trim(),
          email: email.trim(),
          mode,
          url: typeof window !== 'undefined' ? window.location.href : '',
          screenshotBase64: includeScreenshot && screenshot ? screenshot : '',
        }),
      });
      if (res.status === 429) {
        toast.error(t('report.rateLimited'));
        setSubmitting(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        toast.success(t('report.success'));
        onClose();
      } else {
        toast.error(t('report.error'));
      }
    } catch {
      toast.error(t('report.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('report.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('report.dialogDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Category */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('report.categoryLabel')}</Label>
            <RadioGroup value={category} onValueChange={setCategory} className="gap-2">
              {CATEGORIES.map((c) => (
                <label
                  key={c}
                  htmlFor={`report-cat-${c}`}
                  className="flex items-center gap-2.5 rounded-md border border-border/60 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <RadioGroupItem value={c} id={`report-cat-${c}`} />
                  <span className="text-sm">{t(`report.category.${c}`)}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="report-description" className="text-sm font-medium">
              {t('report.descriptionLabel')}
            </Label>
            <Textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('report.descriptionPlaceholder')}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="report-email" className="text-sm font-medium">
              {t('report.emailLabel')}
            </Label>
            <Input
              id="report-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('report.emailPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('report.emailHelp')}</p>
          </div>

          {/* Screenshot */}
          <div className="space-y-2 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="report-screenshot" className="text-sm font-medium cursor-pointer">
                  {t('report.screenshotLabel')}
                </Label>
              </div>
              <Switch
                id="report-screenshot"
                checked={includeScreenshot}
                onCheckedChange={setIncludeScreenshot}
                disabled={capturing || !screenshot}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('report.screenshotHelp')}</p>

            {capturing ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t('report.screenshotCapturing')}
              </div>
            ) : screenshot ? (
              includeScreenshot && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-primary">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('report.screenshotReady')}
                  </div>
                  <div className="relative w-full aspect-video rounded-md overflow-hidden border border-border/60 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screenshot}
                      alt={t('report.screenshotReady')}
                      className="absolute inset-0 w-full h-full object-contain object-top"
                    />
                  </div>
                </div>
              )
            ) : (
              <p className="text-xs text-muted-foreground/70 pt-1">{t('report.screenshotFailed')}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('report.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('report.submitting')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {t('report.submit')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
