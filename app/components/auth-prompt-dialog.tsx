'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare, ImageIcon, History, Sparkles, LogIn, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';

interface AuthPromptDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthPromptDialog({ open, onClose }: AuthPromptDialogProps) {
  const { t } = useI18n();
  const router = useRouter();

  const benefits = [
    { icon: MessageSquare, key: 'authPrompt.benefit.chat' },
    { icon: ImageIcon, key: 'authPrompt.benefit.upload' },
    { icon: History, key: 'authPrompt.benefit.history' },
    { icon: Sparkles, key: 'authPrompt.benefit.sync' },
  ];

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center font-display text-xl tracking-tight">
            {t('authPrompt.title')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t('authPrompt.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-2">
          {benefits.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-3.5 w-3.5 text-primary" />
              </span>
              <span className="flex items-center gap-2 text-sm text-foreground/90">
                <Icon className="h-4 w-4 shrink-0 text-primary/70" />
                {t(key)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 pt-1">
          <Button
            onClick={() => { onClose(); router.push('/auth/signup'); }}
            className="w-full gap-2 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
            {t('authPrompt.cta')}
          </Button>
          <Button
            variant="outline"
            onClick={() => { onClose(); router.push('/auth/login'); }}
            className="w-full gap-2"
          >
            <LogIn className="h-4 w-4" />
            {t('authPrompt.signin')}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('authPrompt.dismiss')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
