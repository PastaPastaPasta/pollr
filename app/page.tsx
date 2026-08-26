'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PollCard } from '@/components/poll/poll-card'
import { PollSkeleton } from '@/components/poll/poll-skeleton'
import { usePolls } from '@/hooks/use-polls'
import { useAuth } from '@/contexts/auth-context'
import { useSdk } from '@/contexts/sdk-context'
import { useVoteWithLogin } from '@/hooks/use-vote-with-login'
import { Spinner } from '@/components/ui/spinner'
import { voteService, applyCastVoteResult, type PollTally } from '@/lib/services/vote-service'
import { logger } from '@/lib/logger'
import { isPollClosed } from '@/lib/utils'
import { reportCastVote } from '@/lib/vote-feedback'
import toast from 'react-hot-toast'
import type { EnrichedPoll } from '@/lib/services/poll-metadata-service'

function HomePollCard({ enrichedPoll }: { enrichedPoll: EnrichedPoll }) {
  const { user } = useAuth()
  const [isVoting, setIsVoting] = useState(false)
  const isVotingRef = useRef(false)
  const [tally, setTally] = useState<PollTally>({
    voteCounts: enrichedPoll.voteCounts,
    totalVotes: enrichedPoll.totalVotes,
    userChoices: enrichedPoll.userChoices,
  })

  // Sync enriched data when it refreshes (e.g. after login triggers re-fetch).
  // Skipped mid-ballot: that refetch predates the vote and would erase the optimistic update.
  // A ref rather than a dependency, so finishing the vote does not re-run this with stale props.
  useEffect(() => {
    if (isVotingRef.current) return
    setTally((current) => {
      // A refetch started before a ballot can resolve after it. Votes are immutable in this
      // app, so a snapshot missing choices we already hold locally predates the last ballot —
      // applying it would erase the optimistic update and re-enable a recorded choice.
      // An incoming null is "couldn't read it this time", which is the same kind of regression
      // against choices we already know are on-chain.
      const known = current.userChoices
      const incoming = enrichedPoll.userChoices
      const regressed =
        known !== null && (incoming === null || known.some((choice) => !incoming.includes(choice)))
      if (regressed) return current
      return {
        voteCounts: enrichedPoll.voteCounts,
        totalVotes: enrichedPoll.totalVotes,
        userChoices: enrichedPoll.userChoices,
      }
    })
  }, [enrichedPoll.userChoices, enrichedPoll.voteCounts, enrichedPoll.totalVotes])

  /** Re-read this poll's tallies from Platform, e.g. after a partially applied ballot. */
  const resync = useCallback(async () => {
    const poll = enrichedPoll.poll
    try {
      setTally(await voteService.getPollTally(poll, user?.identityId))
    } catch (err) {
      logger.error(`Failed to resync poll ${poll.$id}:`, err)
    }
  }, [user, enrichedPoll.poll])

  const castVote = useCallback(async (choices: number[]) => {
    if (!user) return

    const poll = enrichedPoll.poll
    // The card hides the vote UI on a closed poll, but a tab left open past the deadline still
    // holds a stale render. Re-check against the clock at submit time.
    if (isPollClosed(poll)) {
      toast.error('This poll is closed')
      return
    }

    try {
      setIsVoting(true)
      isVotingRef.current = true
      const result = await voteService.castVote(user.identityId, poll, choices)

      // Optimistic update using a functional updater to avoid a stale closure.
      setTally(prev => applyCastVoteResult(prev, result))

      reportCastVote(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cast vote')
      logger.error('Error casting vote:', err)
      // Part of a multi-choice ballot may have landed before the failure — resync from Platform.
      await resync()
    } finally {
      setIsVoting(false)
      isVotingRef.current = false
    }
  }, [user, enrichedPoll.poll, resync])

  const handleVote = useVoteWithLogin(castVote)

  return (
    <PollCard
      poll={enrichedPoll.poll}
      ownerUsername={enrichedPoll.ownerUsername}
      voteCounts={tally.voteCounts}
      totalVotes={tally.totalVotes}
      userChoices={tally.userChoices}
      onVote={handleVote}
      isVoting={isVoting}
      isInteractive={true}
    />
  )
}

interface PollListContentProps {
  isReady: boolean
  isLoading: boolean
  polls: EnrichedPoll[]
  error: string | null
}

function PollListContent({ isReady, isLoading, polls, error }: PollListContentProps) {
  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Spinner size="lg" />
        <p className="mt-4 text-sm">Connecting to Dash Platform...</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PollSkeleton />
        <PollSkeleton />
        <PollSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 mb-2">{error}</p>
        <p className="text-sm text-gray-400">Please check your connection and try again.</p>
      </div>
    )
  }

  if (polls.length === 0) {
    return (
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
    )
  }

  return (
    <div className="space-y-4">
      {polls.map((poll) => (
        <HomePollCard key={poll.poll.$id} enrichedPoll={poll} />
      ))}
    </div>
  )
}

export default function HomePage() {
  const { isReady } = useSdk()
  const { polls, isLoading, error } = usePolls()

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

        <PollListContent isReady={isReady} isLoading={isLoading} polls={polls} error={error} />
      </div>
    </div>
  )
}
