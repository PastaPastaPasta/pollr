'use client'

import { motion } from 'framer-motion'
import { CreatePollForm } from '@/components/poll/create-poll-form'

function CreatePollPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <header className="dh-page-header"><h1 className="dh-page-header__title text-[var(--dh-ink)] dark:text-white mb-6">
        Write your first poll
      </h1>
      <p className="dh-page-header__lede">Draft and preview without signing in. Publishing uses your Testnet identity and credits; drafts stay on this page.</p></header>
      <CreatePollForm />
    </motion.div>
  )
}

export default CreatePollPage
