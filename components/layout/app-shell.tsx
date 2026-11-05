'use client'

import { Header } from './header'
import { MobileBottomNav } from './mobile-bottom-nav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--dh-page)]">
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-4 md:pb-8">
        {children}
      </main>
      <div className="pb-20 md:pb-0">
        <dashhq-footer product="pollr" source="https://github.com/PastaPastaPasta/pollr" />
      </div>
      <MobileBottomNav />
    </div>
  )
}
