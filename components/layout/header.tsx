'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useLoginModal } from '@/hooks/use-login-modal'
import { Button } from '@/components/ui/button'
import { BarChart3, LogOut, Plus, User } from 'lucide-react'

export function Header() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const loginModal = useLoginModal()
  const links = [
    { href: '/', label: 'Polls', icon: BarChart3 },
    { href: '/create', label: 'Create', icon: Plus },
    { href: '/my-polls', label: 'My polls', icon: User },
  ]

  return (
    <dashhq-bar product="pollr" network="testnet" phone-nav="tabs" sticky="">
      <span slot="logo"><BarChart3 className="h-5 w-5 text-[var(--dh-act)]" aria-hidden /></span>
      <nav slot="nav" aria-label="Pollr">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={(href === '/' ? pathname === '/' : pathname.startsWith(href)) ? 'page' : undefined}>
            <Icon className="dh-nav-icon" aria-hidden />{label}
          </Link>
        ))}
      </nav>
      <div slot="actions">
        {user ? (
          <Button variant="ghost" size="sm" onClick={() => { logout().catch(() => {}) }} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        ) : <Button variant="outline" size="sm" onClick={loginModal.open}>Sign in</Button>}
      </div>
    </dashhq-bar>
  )
}
