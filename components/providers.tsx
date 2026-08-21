'use client';

import { SessionProvider } from 'next-auth/react';
import { I18nProvider } from '@/components/i18n-provider';
import { NavigationLoaderProvider } from '@/components/navigation-loader';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <NavigationLoaderProvider>{children}</NavigationLoaderProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
