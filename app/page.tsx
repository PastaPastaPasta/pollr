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
import { RecordedPolls } from '@/components/poll/recorded-polls'
import { ExamplePoll } from '@/components/poll/example-poll'
import { selectHomePolls } from '@/lib/home-polls'
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
  onRetry: () => void
}

function PollListContent({ isReady, isLoading, polls, error, onRetry }: PollListContentProps) {
  if (!isReady) {
    return (
      <div className="dh-loading dh-loading--block">
        <Spinner size="lg" />
        <p className="mt-4 text-sm">Connecting to Dash Platform…</p>
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
      <div className="dh-error" role="alert">
        <p className="dh-error__title">Couldn’t load polls</p>
        <details><summary>Details</summary>{error}</details>
        <p className="text-sm text-[var(--dh-ink-2)]">Please check your connection and try again.</p>
        <Button variant="outline" className="mt-4" onClick={onRetry}>Try again</Button>
      </div>
    )
  }

  if (polls.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="dh-empty"
      >
        <BarChart3 className="h-12 w-12 text-[var(--dh-ink-2)] mx-auto mb-4" />
        <p className="text-[var(--dh-ink-2)] mb-2">Your community’s questions go here</p>
        <p className="text-sm text-[var(--dh-ink-2)]">
          There are no new community polls in this sample. The recorded polls above remain available to inspect.
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
  const { polls, isLoading, error, refetch } = usePolls(100)
  const [showAll, setShowAll] = useState(false)
  const [showPractice, setShowPractice] = useState(false)
  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search)
      setShowAll(params.get('view') === 'all')
      setShowPractice(params.get('practice') === '1')
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  const changeView = (all: boolean) => {
    setShowAll(all)
    const url = new URL(window.location.href)
    if (all) url.searchParams.set('view', 'all')
    else url.searchParams.delete('view')
    window.history.pushState(null, '', url)
  }
  const visiblePolls = selectHomePolls(polls, showAll, showAll && showPractice)

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="dh-page-header dh-page-header--home"
      >
        <div className="dh-page-header__row"><div className="dh-page-header__text"><h1 className="dh-page-header__title">
          Try a poll. Then ask your own question.
        </h1>
        <p className="dh-page-header__lede">
          Pollr is a Platform demo app: ask a question, share its link and record votes on Testnet. Reading is free. Creating or voting uses a Testnet identity; data may reset.
        </p>
        </div><div className="dh-page-header__actions"><Link href="/create">
          <Button variant="outline" className="gap-2">
            <Plus className="h-5 w-5" />
            Write your first poll
          </Button>
        </Link></div></div>
      </motion.div>

      <ExamplePoll />

      {/* Recent polls */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-[var(--dh-brand-ink)]" />
          <h2 className="dh-section__title text-[var(--dh-ink)] dark:text-white">
            Shared polls
          </h2>
        </div>

        <p className="text-sm text-[var(--dh-ink-2)] mb-3">Inspect the original polls and their recorded ballots. The archive shows all readable original polls. Automated and practice records stay hidden by default.</p>
        <div className="dh-seg mb-4" aria-label="Poll view"><button type="button" aria-pressed={!showAll} onClick={() => changeView(false)}>Community</button><button type="button" aria-pressed={showAll} onClick={() => changeView(true)}>Archive</button></div>
        {showAll && <label className="dh-check mb-4"><input type="checkbox" checked={showPractice} onChange={e => {
          setShowPractice(e.target.checked)
          const url = new URL(window.location.href)
          if (e.target.checked) url.searchParams.set('practice', '1')
          else url.searchParams.delete('practice')
          window.history.pushState(null, '', url)
        }} /> Include automated and practice records</label>}
        <RecordedPolls all={showAll} />
        {(isLoading || error || visiblePolls.length > 0 || (showAll && showPractice)) && <div className="mt-6"><PollListContent isReady={isReady} isLoading={isLoading} polls={visiblePolls} error={error} onRetry={() => { void refetch() }} /></div>}
      </div>
    </div>
  )
}
