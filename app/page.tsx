'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PollCard } from '@/components/poll/poll-card'
import { PollSkeleton } from '@/components/poll/poll-skeleton'
import { usePolls } from '@/hooks/use-polls'
import { useSdk } from '@/contexts/sdk-context'
import { Spinner } from '@/components/ui/spinner'

export default function HomePage() {
  const { isReady } = useSdk()
  const { polls, isLoading } = usePolls()

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="text-gradient">Pollr</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Create and vote on decentralized polls. Powered by Dash Platform — no backend, fully on-chain.
        </p>
        <Link href="/create">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create a Poll
          </Button>
        </Link>
      </motion.div>

      {/* Recent Polls */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-pollr-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Polls
          </h2>
        </div>

        {!isReady ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Spinner size="lg" />
            <p className="mt-4 text-sm">Connecting to Dash Platform...</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <PollSkeleton />
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
            <p className="text-gray-500 dark:text-gray-400 mb-2">No polls yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Be the first to create one!
            </p>
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
    </div>
  )
}
