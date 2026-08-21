'use client';

import { useEffect, useState, useCallback, RefObject } from 'react';
import { ChevronUp, ChevronDown, ChevronsUp, ChevronsDown } from 'lucide-react';

export interface SkipStops {
  up: number[];
  down: number[];
}

interface SkipNavPillProps {
  /**
   * Returns the scroll-position anchors, computed fresh on each call.
   * `up` / `down` are scrollTop targets (in the scroll container's coordinate
   * space) sorted ascending. `down` targets are the positions reached when
   * skipping forward; `up` targets when skipping backward.
   */
  getStops: () => SkipStops;
  /**
   * Optional internal scroll container. When provided, the pill drives that
   * element's scroll. When omitted, it drives the window/document scroll.
   */
  scrollTargetRef?: RefObject<HTMLElement | null>;
  /**
   * Positioning + visibility wrapper classes. Should include `md:hidden` so the
   * pill only appears on the mobile stacked view. Defaults to a viewport-fixed
   * bottom-center placement.
   */
  wrapperClassName?: string;
  /**
   * `simple` (default): a compact up/down pair that steps between anchors and
   * hides when travel isn't possible. `media`: a four-button media-style control
   * — double arrows jump straight to the top/bottom, single arrows step to the
   * previous/next anchor. In `media` mode the control stays visible whenever the
   * content overflows, disabling buttons at the extremes.
   */
  variant?: 'simple' | 'media';
}

const TH = 8; // px threshold to avoid jitter at the extremes

/**
 * A small horizontal pill that lets the user jump between logical content
 * anchors (top/bottom of panes, individual chat replies, conversation
 * start/end, etc.).
 */
export default function SkipNavPill({ getStops, scrollTargetRef, wrapperClassName, variant = 'simple' }: SkipNavPillProps) {
  const [overflow, setOverflow] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  const getMetrics = useCallback(() => {
    const el = scrollTargetRef?.current;
    if (el) {
      return { top: el.scrollTop, max: el.scrollHeight - el.clientHeight };
    }
    if (typeof window === 'undefined') return { top: 0, max: 0 };
    const doc = document.documentElement;
    return { top: window.scrollY, max: doc.scrollHeight - window.innerHeight };
  }, [scrollTargetRef]);

  const update = useCallback(() => {
    const { top, max } = getMetrics();
    if (max <= TH) {
      setOverflow(false);
      setAtTop(true);
      setAtBottom(true);
      setHasPrev(false);
      setHasNext(false);
      return;
    }
    const stops = getStops();
    const nextDown = stops.down.find((s) => s > top + TH);
    const nextUp = [...stops.up].reverse().find((s) => s < top - TH);
    setOverflow(true);
    setAtTop(top <= TH);
    setAtBottom(top >= max - TH);
    setHasNext(nextDown !== undefined && top < max - TH);
    setHasPrev(nextUp !== undefined && top > TH);
  }, [getMetrics, getStops]);

  useEffect(() => {
    const el = scrollTargetRef?.current;
    const target: Window | HTMLElement = el ?? window;
    update();
    target.addEventListener('scroll', update, { passive: true } as any);
    window.addEventListener('resize', update);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      if (el) ro.observe(el);
      if (typeof document !== 'undefined' && document.body) ro.observe(document.body);
    }
    // Catch content growth (streaming translations, new chat messages) that
    // doesn't trigger a scroll or a size change on the observed boxes.
    const id = window.setInterval(update, 400);
    return () => {
      target.removeEventListener('scroll', update as any);
      window.removeEventListener('resize', update);
      ro?.disconnect();
      window.clearInterval(id);
    };
  }, [update, scrollTargetRef]);

  const scrollTo = useCallback((y: number) => {
    const el = scrollTargetRef?.current;
    if (el) el.scrollTo({ top: y, behavior: 'smooth' });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }, [scrollTargetRef]);

  const onDown = useCallback(() => {
    const { top, max } = getMetrics();
    const stops = getStops();
    const next = stops.down.find((s) => s > top + TH);
    scrollTo(next !== undefined ? Math.min(next, max) : max);
  }, [getMetrics, getStops, scrollTo]);

  const onUp = useCallback(() => {
    const { top } = getMetrics();
    const stops = getStops();
    const next = [...stops.up].reverse().find((s) => s < top - TH);
    scrollTo(next !== undefined ? Math.max(next, 0) : 0);
  }, [getMetrics, getStops, scrollTo]);

  const onTop = useCallback(() => scrollTo(0), [scrollTo]);
  const onBottom = useCallback(() => {
    const { max } = getMetrics();
    scrollTo(max);
  }, [getMetrics, scrollTo]);

  const wrapper = wrapperClassName ?? 'md:hidden fixed left-1/2 -translate-x-1/2 bottom-20 z-40';
  const btnBase =
    'h-8 w-8 flex items-center justify-center rounded-full transition-colors';
  const btnActive = 'text-primary hover:bg-primary/10 active:bg-primary/20';
  const btnDisabled = 'text-muted-foreground/30 cursor-not-allowed';

  if (variant === 'media') {
    if (!overflow) return null;
    return (
      <div className={wrapper}>
        <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-background/90 backdrop-blur-sm shadow-lg px-1 py-1">
          <button
            type="button"
            onClick={onTop}
            disabled={atTop}
            aria-label="Jump to top"
            className={`${btnBase} ${atTop ? btnDisabled : btnActive}`}
          >
            <ChevronsUp className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onUp}
            disabled={!hasPrev}
            aria-label="Previous reply"
            className={`${btnBase} ${hasPrev ? btnActive : btnDisabled}`}
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <span className="h-4 w-px bg-border/60" aria-hidden="true" />
          <button
            type="button"
            onClick={onDown}
            disabled={!hasNext}
            aria-label="Next reply"
            className={`${btnBase} ${hasNext ? btnActive : btnDisabled}`}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onBottom}
            disabled={atBottom}
            aria-label="Jump to bottom"
            className={`${btnBase} ${atBottom ? btnDisabled : btnActive}`}
          >
            <ChevronsDown className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // simple variant
  if (!hasPrev && !hasNext) return null;
  return (
    <div className={wrapper}>
      <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-background/90 backdrop-blur-sm shadow-lg px-1 py-1">
        {hasPrev && (
          <button
            type="button"
            onClick={onUp}
            aria-label="Skip up"
            className={`${btnBase} ${btnActive}`}
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        )}
        {hasPrev && hasNext && <span className="h-4 w-px bg-border/60" aria-hidden="true" />}
        {hasNext && (
          <button
            type="button"
            onClick={onDown}
            aria-label="Skip down"
            className={`${btnBase} ${btnActive}`}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
