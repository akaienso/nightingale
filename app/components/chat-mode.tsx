'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Loader2, User, Sparkles, Plus, MessagesSquare, Trash2, Share2, Download, Copy, Mail, ChevronDown } from 'lucide-react';
import VerifyTranslationIcon from './verify-translation-icon';
import { buildVerifyUrl, VerifyProvider } from '@/lib/verify-translation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Image from 'next/image';
import VoiceControls from './voice-controls';
import { useI18n } from '@/components/i18n-provider';
import ProcessingStatus from './processing-status';
import SkipNavPill from './skip-nav-pill';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export default function ChatMode({ speakerGender, englishDialect, partnerLang, spanishDialect, emojis, enterKeyChat, direction, verifyProvider, customVerifyUrl }: { speakerGender?: string; englishDialect?: string; partnerLang?: string; spanishDialect?: string; emojis?: boolean; enterKeyChat?: string; direction?: string; verifyProvider?: string; customVerifyUrl?: string }) {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    scrollRef?.current?.scrollTo?.({ top: scrollRef?.current?.scrollHeight ?? 0, behavior: 'smooth' });
  }, [messages]);

  // Anchor to each reply so the single arrows step reply-by-reply. The double
  // arrows (handled inside the pill) still jump straight to the top/bottom.
  const getChatStops = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return { up: [], down: [] };
    const cRect = el.getBoundingClientRect();
    const rows = Array.from(el.querySelectorAll('[data-chat-msg]')) as HTMLElement[];
    const tops = rows.map((r) => {
      const rRect = r.getBoundingClientRect();
      return Math.max(0, Math.round(rRect.top - cRect.top + el.scrollTop - 8));
    });
    const uniq = Array.from(new Set(tops)).sort((a, b) => a - b);
    return { up: uniq, down: uniq };
  }, []);

  // Auto-grow the input textarea so the full message stays visible while editing.
  // Keyed on `input` so it also updates for voice input, prompt chips, and resets after sending.
  useEffect(() => {
    const el = inputRef?.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight ?? 40, 200) + 'px';
  }, [input]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/conversations');
      if (!res?.ok) return;
      const data = await res.json();
      setConversations(data?.conversations ?? []);
    } catch {
      // silent
    }
  }, []);

  // Load the conversation list on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setInput('');
    inputRef?.current?.focus?.();
  }, []);

  const openConversation = useCallback(async (id: string) => {
    if (isThinking) return;
    setLoadingConvId(id);
    try {
      const res = await fetch(`/api/chat/conversations/${id}`);
      if (!res?.ok) throw new Error('load failed');
      const data = await res.json();
      const loaded: ChatMessage[] = (data?.messages ?? []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      }));
      setMessages(loaded);
      setConversationId(data?.id ?? id);
    } catch {
      toast?.error?.(t('chat.loadFailed'));
    } finally {
      setLoadingConvId(null);
    }
  }, [isThinking, t]);

  const deleteConversation = useCallback(async (id: string) => {
    if (!confirm(t('chat.deleteConfirm'))) return;
    try {
      const res = await fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' });
      if (!res?.ok) throw new Error('delete failed');
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) startNewChat();
      toast?.success?.(t('chat.deleted'));
    } catch {
      toast?.error?.(t('chat.deleteFailed'));
    }
  }, [conversationId, startNewChat, t]);

  const handleSend = useCallback(async () => {
    const text = input?.trim?.() ?? '';
    if (!text || isThinking) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);

    let activeConvId = conversationId;

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          uiLang: lang,
          speakerGender: speakerGender ?? 'male',
          englishDialect: englishDialect ?? 'american',
          partnerLang: partnerLang ?? 'english',
          spanishDialect: spanishDialect ?? 'latam',
          emojis: emojis === true,
          conversationId: conversationId ?? undefined,
        }),
      });

      if (!response?.ok) {
        const errData = await response?.json?.().catch(() => ({ error: 'Chat failed' }));
        throw new Error(errData?.error ?? 'Chat failed');
      }

      const reader = response?.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let partialBuffer = '';
      const assistantId = `msg-${Date.now()}-assistant`;

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partialBuffer += decoder.decode(value, { stream: true });
        const lines = partialBuffer.split('\n');
        partialBuffer = lines?.pop() ?? '';

        for (const line of lines) {
          if (line?.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed?.conversationId) {
                activeConvId = parsed.conversationId;
                setConversationId(parsed.conversationId);
              }
              if (parsed?.text) {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.text }
                      : m
                  )
                );
              }
            } catch {
              // skip partial JSON
            }
          }
        }
      }
    } catch (err: any) {
      toast?.error?.(err?.message ?? t('chat.failed'));
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last?.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsThinking(false);
      inputRef?.current?.focus?.();
      // Refresh the saved-chats list so a new conversation appears / moves to top
      fetchConversations();
    }
  }, [input, isThinking, messages, lang, conversationId, t, fetchConversations]);

  // Build a plain-text transcript of the current conversation
  const buildTranscript = useCallback(() => {
    const you = lang === 'uk' ? 'Ви' : 'You';
    const olia = 'Olia';
    const header = `Nightingale — ${t('chat.title')}\n${new Date().toLocaleString(lang === 'uk' ? 'uk-UA' : 'en-US')}\n\n`;
    const body = messages
      .filter(m => m.content?.trim())
      .map(m => `${m.role === 'user' ? you : olia}:\n${m.content}`)
      .join('\n\n');
    return header + body;
  }, [messages, lang, t]);

  const hasContent = messages.some(m => m.content?.trim());

  const handleDownload = useCallback(() => {
    if (!hasContent) { toast?.error?.(t('chat.export.empty')); return; }
    const transcript = buildTranscript();
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `olia-chat-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast?.success?.(t('chat.exported.downloaded'));
  }, [hasContent, buildTranscript, t]);

  const handleCopy = useCallback(async () => {
    if (!hasContent) { toast?.error?.(t('chat.export.empty')); return; }
    try {
      await navigator.clipboard.writeText(buildTranscript());
      toast?.success?.(t('chat.exported.copied'));
    } catch {
      toast?.error?.(t('common.failedToCopy'));
    }
  }, [hasContent, buildTranscript, t]);

  const handleShare = useCallback(async () => {
    if (!hasContent) { toast?.error?.(t('chat.export.empty')); return; }
    const transcript = buildTranscript();
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: t('chat.emailSubject'), text: transcript });
      } catch {
        // user cancelled or share failed — no-op
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(transcript);
        toast?.success?.(t('chat.exported.copied'));
      } catch {
        toast?.error?.(t('common.failedToCopy'));
      }
    }
  }, [hasContent, buildTranscript, t]);

  const handleEmail = useCallback(() => {
    if (!hasContent) { toast?.error?.(t('chat.export.empty')); return; }
    const transcript = buildTranscript();
    // mailto bodies have practical length limits; cap and hint to download for the full copy
    const MAX = 1600;
    let body = transcript;
    if (body.length > MAX) {
      const note = lang === 'uk'
        ? '\n\n…(скорочено — використайте «Завантажити текст» для повної версії)'
        : '\n\n…(truncated — use “Download transcript” for the full copy)';
      body = body.slice(0, MAX) + note;
    }
    const href = `mailto:?subject=${encodeURIComponent(t('chat.emailSubject'))}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  }, [hasContent, buildTranscript, t, lang]);

  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      const lines = part.split('\n');
      return lines.map((line, j) => (
        <span key={`${i}-${j}`}>
          {j > 0 && <br />}
          {line}
        </span>
      ));
    });
  };

  const suggestionChips = [
    { key: 'greetings', label: t('chat.chip.greetings'), prompt: t('chat.chip.greetingsPrompt') },
    { key: 'culture', label: t('chat.chip.culture'), prompt: t('chat.chip.culturePrompt') },
    { key: 'idioms', label: t('chat.chip.idioms'), prompt: t('chat.chip.idiomsPrompt') },
    { key: 'practice', label: t('chat.chip.practice'), prompt: t('chat.chip.practicePrompt') },
  ];

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto">
      {/* Chat toolbar: saved chats, new chat, export */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-border/50 bg-background/60">
        <DropdownMenu onOpenChange={(open) => { if (open) fetchConversations(); }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2 text-sm">
              <MessagesSquare className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">{t('chat.conversations')}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 max-h-[60vh] overflow-y-auto">
            <DropdownMenuLabel>{t('chat.conversations')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {conversations.length === 0 ? (
              <div className="px-2 py-4 text-center">
                <p className="text-sm text-muted-foreground">{t('chat.noConversations')}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{t('chat.noConversationsHint')}</p>
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted/60 transition-colors ${conversationId === c.id ? 'bg-muted/40' : ''}`}
                  onClick={() => openConversation(c.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.messageCount} {t('chat.messagesCount')}</p>
                  </div>
                  {loadingConvId === c.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                  ) : (
                    <button
                      className="h-6 w-6 flex items-center justify-center rounded shrink-0 hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                      aria-label={t('chat.deleteConfirm')}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2 text-sm" onClick={startNewChat} disabled={isThinking}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('chat.newChat')}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2 text-sm" disabled={!hasContent}>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t('chat.export')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('chat.export')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" /> {t('chat.export.download')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare} className="gap-2">
                <Share2 className="w-4 h-4" /> {t('chat.export.share')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEmail} className="gap-2">
                <Mail className="w-4 h-4" /> {t('chat.export.email')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy} className="gap-2">
                <Copy className="w-4 h-4" /> {t('chat.export.copy')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
            <div className="relative w-16 h-16 rounded-full overflow-hidden mb-4 ring-2 ring-primary/20 shadow-md">
              <Image src="/olia-avatar.png" alt="Olia" fill className="object-cover" sizes="64px" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-1">{t('chat.title')}</h3>
            <p className="text-xs text-primary font-medium mb-2">{t('chat.subtitle')}</p>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
              {t('chat.welcome')}
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {suggestionChips.map(chip => (
                <button
                  key={chip.key}
                  onClick={() => {
                    setInput(chip.prompt);
                    inputRef?.current?.focus?.();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                >
                  <Sparkles className="w-3 h-3" />
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            data-chat-msg
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 mt-1 ring-1 ring-primary/20">
                <Image src="/olia-avatar.png" alt="Olia" fill className="object-cover" sizes="28px" />
              </div>
            )}
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.role === 'user' ? (
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5">
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              ) : (
                <>
                  <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-4 py-2.5" style={{ boxShadow: 'var(--shadow-sm)' }}>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{renderContent(msg.content)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = buildVerifyUrl(
                        msg.content,
                        direction ?? 'en-to-ua',
                        partnerLang ?? 'english',
                        (verifyProvider ?? 'deepl') as VerifyProvider,
                        customVerifyUrl,
                      );
                      if (url) window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="inline-flex items-center gap-1 mt-1 ml-1 px-1.5 py-0.5 rounded text-[11px] text-primary/70 hover:bg-primary hover:text-primary-foreground transition-colors"
                    title={t('verify.tooltip')}
                  >
                    <VerifyTranslationIcon className="w-3.5 h-3.5" />
                    <span>{t('verify.tooltip')}</span>
                  </button>
                </>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-primary" />
              </div>
            )}
          </div>
        ))}

        {isThinking && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3 justify-start">
            <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 ring-1 ring-primary/20">
              <Image src="/olia-avatar.png" alt="Olia" fill className="object-cover" sizes="28px" />
            </div>
            <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <ProcessingStatus />
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="border-t border-border/50 p-4 bg-background">
        <div className="flex items-end gap-2 bg-muted/40 rounded-xl p-2 border border-border/50">
          <VoiceControls
            onTranscript={setInput}
            direction="en-to-ua"
            partnerLang={partnerLang}
            compact
          />
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e?.target?.value ?? '')}
            placeholder={t('chat.placeholder')}
            className="flex-1 min-w-0 resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none min-h-[40px] max-h-[200px] overflow-y-auto py-2 px-2"
            rows={1}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e?.key !== 'Enter') return;
              const wantMod = (enterKeyChat ?? 'mod') === 'mod';
              const modPressed = e?.metaKey || e?.ctrlKey;
              if (wantMod) {
                // Ctrl/Cmd+Enter sends; plain Enter inserts a newline.
                if (modPressed) {
                  e?.preventDefault?.();
                  handleSend();
                }
              } else {
                // Enter sends; Shift+Enter inserts a newline.
                if (!e?.shiftKey) {
                  e?.preventDefault?.();
                  handleSend();
                }
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={isThinking || !(input?.trim?.())}
            size="icon"
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-9 w-9 shrink-0"
          >
            {isThinking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {t((enterKeyChat ?? 'mod') === 'mod' ? 'chat.hint.mod' : 'chat.hint.enter')}
        </p>
      </div>

      <SkipNavPill
        getStops={getChatStops}
        scrollTargetRef={scrollRef}
        variant="media"
        wrapperClassName="fixed left-1/2 -translate-x-1/2 bottom-24 z-40"
      />
    </div>
  );
}
