'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import LoadingOverlay from './loading-overlay';

interface LoadingContextValue {
  /** Show the branded overlay immediately (for form submits / async actions >200ms). */
  start: () => void;
  /** Hide the branded overlay. */
  stop: () => void;
}

const LoadingContext = createContext<LoadingContextValue>({
  start: () => {},
  stop: () => {},
});

const SAFETY_TIMEOUT_MS = 8000;

export function NavigationLoaderProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSafety = () => {
    if (safetyRef.current) {
      clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
  };

  const stop = useCallback(() => {
    clearSafety();
    setVisible(false);
  }, []);

  const start = useCallback(() => {
    setVisible(true);
    clearSafety();
    // Failsafe: never leave the overlay stuck on screen.
    safetyRef.current = setTimeout(() => setVisible(false), SAFETY_TIMEOUT_MS);
  }, []);

  // Hide as soon as the route actually changes (navigation completed).
  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Instantly acknowledge internal link navigations (e.g. tapping "Sign In").
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      const targetAttr = anchor.getAttribute('target');
      if (targetAttr && targetAttr !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      if (
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#')
      ) {
        return;
      }

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        // Same page — nothing to acknowledge.
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch {
        return;
      }

      start();
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [start]);

  // Clean up any pending timer on unmount.
  useEffect(() => clearSafety, []);

  return (
    <LoadingContext.Provider value={{ start, stop }}>
      {children}
      <LoadingOverlay show={visible} />
    </LoadingContext.Provider>
  );
}

export function useNavigationLoader() {
  return useContext(LoadingContext);
}
