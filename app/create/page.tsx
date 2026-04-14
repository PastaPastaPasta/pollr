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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Create a Poll
      </h1>
      <CreatePollForm />
    </motion.div>
  )
}

export default withAuth(CreatePollPage)
