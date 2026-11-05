'use client'

import { Header } from './header'
import { MobileBottomNav } from './mobile-bottom-nav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--dh-page)]">
      <Header />
      <main className="dh-container dh-page pb-24 md:pb-8">
        <div className="dh-narrow">{children}</div>
      </main>
      <div className="pb-20 md:pb-0">
        <dashhq-footer product="pollr" source="https://github.com/PastaPastaPasta/pollr" />
      </div>
      <MobileBottomNav />
    </div>
  )
}
