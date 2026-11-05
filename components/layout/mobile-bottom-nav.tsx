'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useLoginModal } from '@/hooks/use-login-modal'
import { Home, Plus, BarChart3, User } from 'lucide-react'

export function MobileBottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const loginModal = useLoginModal()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const navItems = [
    { href: '/', label: 'Polls', icon: Home },
    { href: '/create', label: 'Create', icon: Plus, highlight: true },
    { href: '/my-polls', label: 'My polls', icon: BarChart3 },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-effect glass-border md:hidden safe-area-inset-bottom">
      <div className="flex h-14 items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 ${
                active
                  ? 'text-[var(--dh-brand-ink)]'
                  : 'text-[var(--dh-ink-2)]'
              }`}
            >
              {item.highlight ? (
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-md ${
                    active
                      ? 'bg-[var(--dh-brand-soft)] text-[var(--dh-brand-ink)]'
                      : 'bg-[var(--dh-line)] text-[var(--dh-ink-2)] dark:text-[var(--dh-ink-2)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              ) : (
                <Icon className="h-5 w-5" />
              )}
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* Profile / Login */}
        {user ? (
          <Link
            href="/my-polls"
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 ${
              pathname === '/my-polls'
                ? 'text-[var(--dh-brand-ink)]'
                : 'text-[var(--dh-ink-2)]'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-medium">Profile</span>
          </Link>
        ) : (
          <button
            onClick={loginModal.open}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-[var(--dh-ink-2)]"
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-medium">Sign in</span>
          </button>
        )}
      </div>
    </nav>
  )
}
