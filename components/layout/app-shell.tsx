'use client'

import { Header } from './header'
import { MobileBottomNav } from './mobile-bottom-nav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-4 md:pb-8">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  )
}
