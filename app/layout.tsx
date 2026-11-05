import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from '@/components/providers'
import ErrorBoundary from '@/components/error-boundary'
import { AppShell } from '@/components/layout/app-shell'

const basePath = process.env.BASE_PATH || ''

export const metadata: Metadata = {
  title: 'Pollr · dashhq',
  description: 'Create and vote on polls, powered by Dash Platform. No backend, fully decentralized.',
  icons: {
    icon: `${basePath}/favicon.ico`,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Blocking external script sets the shared theme before first paint. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={`${basePath}/dashhq/dashhq-shell.js`} />
        <link rel="stylesheet" href={`${basePath}/dashhq/dashhq-tokens.css`} />
        <link rel="stylesheet" href={`${basePath}/dashhq/dashhq-shell.css`} />
        <link rel="stylesheet" href={`${basePath}/dashhq/dashhq-components.css`} />

        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self'; connect-src 'self' https: wss:; worker-src 'self' blob:; child-src 'self' blob:"
        />
      </head>
      <body className="font-sans h-full bg-[var(--dh-page)]">
        <ErrorBoundary level="app">
          <Providers>
            <AppShell>
              <ErrorBoundary level="page">
                {children}
              </ErrorBoundary>
            </AppShell>
          </Providers>
        </ErrorBoundary>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1f2937',
              color: '#fff',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  )
}
