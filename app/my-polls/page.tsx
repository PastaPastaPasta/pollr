'use client'

import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PollCard } from '@/components/poll/poll-card'
import { PollSkeleton } from '@/components/poll/poll-skeleton'
import { useMyPolls } from '@/hooks/use-my-polls'
import { useAuth } from '@/contexts/auth-context'
import { withAuth } from '@/contexts/auth-context'
import { Plus } from 'lucide-react'

function MyPollsPage() {
  const { user } = useAuth()
  const { polls, isLoading } = useMyPolls(user?.identityId || null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Polls
        </h1>
        <Link href="/create">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Poll
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <PollSkeleton />
          <PollSkeleton />
        </div>
      ) : polls.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <BarChart3 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            You haven&apos;t created any polls yet
          </p>
          <Link href="/create">
            <Button variant="outline" size="sm" className="mt-2 gap-1.5">
              <Plus className="h-4 w-4" />
              Create your first poll
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <PollCard
              key={poll.$id}
              poll={poll}
              voteCounts={[]}
              totalVotes={0}
              isInteractive={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default withAuth(MyPollsPage)
