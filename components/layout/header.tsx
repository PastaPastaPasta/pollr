'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/auth-context'
import { useLoginModal } from '@/hooks/use-login-modal'
import { Button } from '@/components/ui/button'
import { Sun, Moon, LogOut, Plus, Home, BarChart3 } from 'lucide-react'

export function Header() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const loginModal = useLoginModal()

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/create', label: 'Create', icon: Plus },
    { href: '/my-polls', label: 'My Polls', icon: BarChart3 },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const handleLogout = () => {
    logout().catch(() => {
      // logout errors are non-critical
    })
  }

  return (
    <header className="sticky top-0 z-40 glass-effect glass-border safe-area-inset-top">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        {/* Left: Logo */}
        <Link href="/" className="text-xl font-bold text-gradient">
          Pollr
        </Link>

        {/* Center: Nav links (desktop only) */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-pollr-50 text-pollr-600 dark:bg-pollr-950 dark:text-pollr-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Right: Theme toggle + auth */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 sm:inline">
                {user.dpnsUsername || user.identityId.slice(0, 8) + '...'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={loginModal.open}>
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
