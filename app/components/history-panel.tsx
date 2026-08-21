'use client';

import { useState, useEffect, useCallback } from 'react';
import { History, Trash2, X, Loader2, ArrowRightLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useI18n } from '@/components/i18n-provider';
import { englishFlag } from '@/lib/utils';

interface HistoryEntry {
  id: string;
  sourceText: string;
  translation: string;
  culturalNote: string | null;
  direction: string;
  dialect: string;
  englishDialect?: string;
  formality: string;
  outputFormat: string;
  mode: string;
  createdAt: string;
}

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect?: (entry: HistoryEntry) => void;
}

export default function HistoryPanel({ open, onClose, onSelect }: HistoryPanelProps) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history?page=${p}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEntries(data.translations || []);
      setTotalPages(data.pages || 1);
    } catch {
      // Not authenticated or error
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchHistory(page);
  }, [open, page, fetchHistory]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
      setEntries(prev => prev.filter(e => e.id !== id));
      toast.success(t('history.removed'));
    } catch {
      toast.error(t('history.failedDelete'));
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    if (!confirm(t('history.confirmClear'))) return;
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setEntries([]);
      toast.success(t('history.cleared'));
    } catch {
      toast.error(t('history.failedClear'));
    }
  }, []);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border z-50 flex flex-col" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h2 className="font-display font-semibold text-base">{t('history.title')}</h2>
          </div>
          <div className="flex items-center gap-1">
            {entries.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-xs text-destructive hover:text-destructive">
                {t('common.clearAll')}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t('history.empty')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('history.emptyHint')}</p>
            </div>
          ) : (
            entries.map(entry => (
              <div
                key={entry.id}
                className="rounded-lg border border-border/50 p-3 space-y-2 hover:bg-muted/20 transition-colors cursor-pointer group"
                onClick={() => onSelect?.(entry)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{entry.direction === 'en-to-ua' ? `${englishFlag(entry.englishDialect)} → 🇺🇦` : `🇺🇦 → ${englishFlag(entry.englishDialect)}`}</span>
                    <span>·</span>
                    <span>{new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{entry.sourceText}</p>
                <p className="text-sm font-medium line-clamp-2">{entry.translation}</p>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
