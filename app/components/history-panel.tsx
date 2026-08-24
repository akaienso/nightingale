'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  History, Trash2, X, Loader2, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Copy, Check, CornerUpLeft,
} from 'lucide-react';
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

/**
 * How long a deleted entry can be brought back before the delete is committed
 * to the server. The row disappears immediately either way — this only governs
 * how long the undo is available.
 */
const UNDO_WINDOW_MS = 6000;

export default function HistoryPanel({ open, onClose, onSelect }: HistoryPanelProps) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Deletes are optimistic: the row goes immediately, the request fires when the
  // undo window closes. Held here so a panel close or unmount can flush them
  // rather than silently dropping a delete the user believes has happened.
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

  /**
   * Send the delete for one entry.
   *
   * NOTE: `DELETE /api/history` with no `id` clears the user's ENTIRE history —
   * see app/api/history/route.ts. An empty or undefined id here would therefore
   * be catastrophic rather than a no-op, so it is guarded explicitly.
   */
  const commitDelete = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/history?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
    } catch {
      toast.error(t('history.failedDelete'));
      // Put it back so the UI stops claiming something was deleted when it wasn't.
      fetchHistory(page);
    } finally {
      pendingDeletes.current.delete(id);
    }
  }, [t, fetchHistory, page]);

  /** Fire every deferred delete now — on close, unmount, or page change. */
  const flushPendingDeletes = useCallback(() => {
    pendingDeletes.current.forEach((timer, id) => {
      clearTimeout(timer);
      void commitDelete(id);
    });
  }, [commitDelete]);

  useEffect(() => {
    // Flush on unmount so a delete is never lost by navigating away.
    return () => {
      pendingDeletes.current.forEach((timer, id) => {
        clearTimeout(timer);
        void fetch(`/api/history?id=${encodeURIComponent(id)}`, { method: 'DELETE', keepalive: true });
      });
      pendingDeletes.current.clear();
    };
  }, []);

  const handleClose = useCallback(() => {
    flushPendingDeletes();
    onClose();
  }, [flushPendingDeletes, onClose]);

  const handleDelete = useCallback((entry: HistoryEntry) => {
    const index = entries.findIndex(e => e.id === entry.id);
    setEntries(prev => prev.filter(e => e.id !== entry.id));

    const timer = setTimeout(() => { void commitDelete(entry.id); }, UNDO_WINDOW_MS);
    pendingDeletes.current.set(entry.id, timer);

    toast.success(t('history.removed'), {
      action: {
        label: t('history.undo'),
        onClick: () => {
          const pending = pendingDeletes.current.get(entry.id);
          if (pending) clearTimeout(pending);
          pendingDeletes.current.delete(entry.id);
          // Restore in place rather than at the top, so the list doesn't reorder.
          setEntries(prev => {
            if (prev.some(e => e.id === entry.id)) return prev;
            const next = [...prev];
            next.splice(Math.max(0, index), 0, entry);
            return next;
          });
          toast.success(t('history.restored'));
        },
      },
      duration: UNDO_WINDOW_MS,
    });
  }, [entries, commitDelete, t]);

  const handleClearAll = useCallback(async () => {
    if (!confirm(t('history.confirmClear'))) return;
    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      if (!res.ok) throw new Error('clear failed');
      setEntries([]);
      toast.success(t('history.cleared'));
    } catch {
      toast.error(t('history.failedClear'));
    }
  }, [t]);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  /** Copy the FULL text, not the clamped preview shown in the collapsed card. */
  const handleCopy = useCallback(async (key: string, text: string, okMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(c => (c === key ? null : c)), 1500);
      toast.success(okMessage);
    } catch {
      toast.error(t('history.failedCopy'));
    }
  }, [t]);

  const handleSelect = useCallback((entry: HistoryEntry) => {
    onSelect?.(entry);
    toast.success(t('history.loaded'));
    handleClose();
  }, [onSelect, t, handleClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={handleClose} />
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
            <Button variant="ghost" size="icon" onClick={handleClose}>
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
            entries.map(entry => {
              const isOpen = expanded.has(entry.id);
              return (
                <div
                  key={entry.id}
                  className="rounded-lg border border-border/50 p-3 space-y-2 hover:bg-muted/20 transition-colors group"
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
                      aria-label={t('history.deleteEntry')}
                      title={t('history.deleteEntry')}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                      onClick={() => handleDelete(entry)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>

                  {/* Clicking the body loads the entry into the translator. */}
                  <button
                    type="button"
                    className="w-full text-left space-y-2 cursor-pointer"
                    title={t('history.load')}
                    onClick={() => handleSelect(entry)}
                  >
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{t('history.sourceLabel')}</p>
                      <p className={`text-xs text-muted-foreground whitespace-pre-wrap ${isOpen ? '' : 'line-clamp-2'}`}>
                        {entry.sourceText}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{t('history.translationLabel')}</p>
                      <p className={`text-sm font-medium whitespace-pre-wrap ${isOpen ? '' : 'line-clamp-2'}`}>
                        {entry.translation}
                      </p>
                    </div>
                    {isOpen && entry.culturalNote && (
                      <p className="text-xs text-muted-foreground/90 border-l-2 border-primary/40 pl-2 whitespace-pre-wrap">
                        {entry.culturalNote}
                      </p>
                    )}
                  </button>

                  <div className="flex items-center gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => toggleExpanded(entry.id)}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                      {isOpen ? t('history.showLess') : t('history.showMore')}
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t('history.copySource')}
                      title={t('history.copySource')}
                      onClick={() => handleCopy(`${entry.id}:src`, entry.sourceText, t('history.copiedSource'))}
                    >
                      {copiedKey === `${entry.id}:src`
                        ? <Check className="w-3 h-3 text-primary" />
                        : <CornerUpLeft className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t('history.copyTranslation')}
                      title={t('history.copyTranslation')}
                      onClick={() => handleCopy(`${entry.id}:tr`, entry.translation, t('history.copiedTranslation'))}
                    >
                      {copiedKey === `${entry.id}:tr`
                        ? <Check className="w-3 h-3 text-primary" />
                        : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => { flushPendingDeletes(); setPage(p => Math.max(1, p - 1)); }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => { flushPendingDeletes(); setPage(p => p + 1); }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
