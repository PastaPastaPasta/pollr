'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/auth-context'
import { useLoginModal } from '@/hooks/use-login-modal'
import { Spinner } from '@/components/ui/spinner'

export default function LoginPage() {
  const { user, isAuthRestoring } = useAuth()
  const router = useRouter()
  const { open: openLogin } = useLoginModal()

  useEffect(() => {
    if (!isAuthRestoring && user) {
      router.push('/')
    } else if (!isAuthRestoring && !user) {
      openLogin()
    }
  }, [user, isAuthRestoring, router, openLogin])

  if (isAuthRestoring) {
    return (
      <div className="dh-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="dh-narrow dh-page-header"
    >
      <h1 className="dh-page-header__title mb-4">
        <span className="text-[var(--dh-ink)]">Pollr</span>
      </h1>
      <p className="text-[var(--dh-ink-2)] text-sm">
        Sign in to create and vote on polls. Reading is free.
      </p>
      <button className="dh-btn mt-4" onClick={openLogin}>Open sign-in options</button>
    </motion.div>
  )
}
