'use client'

import { motion } from 'framer-motion'
import { BarChart3, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PollCard } from '@/components/poll/poll-card'
import { PollSkeleton } from '@/components/poll/poll-skeleton'
import { useMyPolls } from '@/hooks/use-my-polls'
import { useAuth, withAuth } from '@/contexts/auth-context'

function MyPollsPage() {
  const { user } = useAuth()
  const { polls, isLoading } = useMyPolls(user?.identityId || null)

  return (
    <div className="space-y-6">
      <header className="dh-page-header"><div className="dh-page-header__row">
        <h1 className="dh-page-header__title text-[var(--dh-ink)] dark:text-white">
          My polls
        </h1>
        <Link href="/create">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New poll
          </Button>
        </Link>
      </div></header>

      {isLoading ? (
        <div className="space-y-4">
          <PollSkeleton />
          <PollSkeleton />
        </div>
      ) : polls.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="dh-empty"
        >
          <BarChart3 className="h-12 w-12 text-[var(--dh-ink-2)] mx-auto mb-4" />
          <p className="text-[var(--dh-ink-2)] mb-2">
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
              key={poll.poll.$id}
              poll={poll.poll}
              ownerUsername={poll.ownerUsername}
              voteCounts={poll.voteCounts}
              totalVotes={poll.totalVotes}
              userChoices={poll.userChoices}
              isInteractive={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default withAuth(MyPollsPage)
