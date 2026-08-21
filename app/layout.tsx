import { DM_Sans, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'
import Providers from '@/components/providers'

export const dynamic = 'force-dynamic'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const jakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Nightingale \u2014 Natural Ukrainian for Every Conversation',
  description: 'Real, everyday Ukrainian ↔ English translation with cultural context — meet Olia, your AI language guide inspired by a real Ukrainian tutor.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Nightingale',
    url: '/',
    title: 'Nightingale \u2014 Natural Ukrainian for Every Conversation',
    description: 'Real, everyday Ukrainian ↔ English translation with cultural context — meet Olia, your AI language guide inspired by a real Ukrainian tutor.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Olia, the Nightingale language guide, with a nightingale perched on her shoulder',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nightingale \u2014 Natural Ukrainian for Every Conversation',
    description: 'Real, everyday Ukrainian ↔ English translation with cultural context — meet Olia, your AI language guide inspired by a real Ukrainian tutor.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#397A5B',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Preload the welcome-screen poster so it paints before the video downloads */}
        <link rel="preload" href="/olia-welcome.jpg" as="image" />
        <link rel="preload" href="/olia-welcome.mp4" as="video" type="video/mp4" />
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
        {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN && process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN !== 'placeholder' && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token":"${process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN}"}`}
          />
        )}
      </head>
      <body className={`${dmSans.variable} ${jakartaSans.variable} ${jetbrainsMono.variable} font-sans`}>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <ChunkLoadErrorHandler />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
