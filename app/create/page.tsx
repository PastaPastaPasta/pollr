'use client'

import { motion } from 'framer-motion'
import { CreatePollForm } from '@/components/poll/create-poll-form'
import { withAuth } from '@/contexts/auth-context'

function CreatePollPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <header className="dh-page-header"><h1 className="dh-page-header__title text-[var(--dh-ink)] dark:text-white mb-6">
        Create a poll
      </h1></header>
      <CreatePollForm />
    </motion.div>
  )
}

export default withAuth(CreatePollPage)
