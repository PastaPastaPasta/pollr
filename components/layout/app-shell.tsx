'use client'

import { usePathname } from 'next/navigation'
import { Header } from './header'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const narrow = pathname.startsWith('/create') || pathname.startsWith('/login')
  return (
    <div className="min-h-screen bg-[var(--dh-page)]">
      <Header />
      <main className="dh-container dh-page">
        <div className={narrow ? "dh-narrow" : undefined}>{children}</div>
      </main>
      <div>
        <dashhq-footer product="pollr" source="https://github.com/PastaPastaPasta/pollr" />
      </div>
    </div>
  )
}
