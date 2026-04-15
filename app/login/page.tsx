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
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-24"
    >
      <h1 className="text-3xl font-bold mb-4">
        <span className="text-gradient">Pollr</span>
      </h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        Sign in to create and vote on polls
      </p>
    </motion.div>
  )
}
