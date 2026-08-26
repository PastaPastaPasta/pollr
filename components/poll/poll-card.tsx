'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { PollTypeBadge } from './poll-type-badge'
import { PollOption } from './poll-option'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { isPollClosed, truncateId } from '@/lib/utils'
import { CheckCircle2, Lock } from 'lucide-react'
import type { PollDocument } from '@/lib/services/poll-service'

function voteCountLabel(totalVotes: number | null, isClosed: boolean, multiChoice: boolean): string {
  // Not a headcount we have and happens to be zero — a number we could not read.
  if (totalVotes === null) return 'Vote count unavailable'
  if (totalVotes > 0) {
    // A multi-choice poll stores one document per selection, so the total counts selections
    // rather than voters. Name it accordingly instead of implying a headcount.
    const noun = multiChoice ? 'selection' : 'vote'
    return `${totalVotes} ${noun}${totalVotes === 1 ? '' : 's'}`
  }
  return isClosed ? 'No votes' : 'Be the first to vote!'
}

interface PollCardProps {
  poll: PollDocument
  /** Per-option counts, or null when the tally could not be read. Null is not zero. */
  voteCounts: number[] | null
  /** Grand total, or null when the tally could not be read. */
  totalVotes: number | null
  /** Option indices the signed-in user has already voted for; null when the lookup failed. */
  userChoices?: number[] | null
  onVote?: (choices: number[]) => void
  isVoting?: boolean
  isInteractive?: boolean
  ownerUsername?: string | null
}

export function PollCard({
  poll,
  voteCounts,
  totalVotes,
  userChoices = [],
  onVote,
  isVoting = false,
  isInteractive = false,
  ownerUsername,
}: PollCardProps) {
  const [draftChoices, setDraftChoices] = useState<number[]>([])

  // null means "we could not find out", which is not the same as "none" — treat the ballot as
  // unknown rather than open, since on a single-choice poll Platform will reject a second one.
  const ownChoicesKnown = userChoices !== null
  const ownChoices = userChoices ?? []
  const resultsAvailable = voteCounts !== null

  const hasVoted = ownChoices.length > 0
  const isClosed = isPollClosed(poll)
  // A multi-choice ballot is a sequence of independent writes, so a voter can end up with only
  // some of their selections recorded. They stay able to add the rest until every option is in;
  // a single-choice voter is done after one. Re-submitting a recorded choice is idempotent
  // anyway — Platform rejects it as a duplicate — but there is no reason to invite it.
  const hasFullBallot = poll.multiChoice
    ? ownChoices.length >= poll.options.length
    : hasVoted
  const canVote = isInteractive && ownChoicesKnown && !hasFullBallot && !isClosed
  // Result bars need real numbers behind them; without a tally the options render plain.
  const showResults = resultsAvailable && ((totalVotes ?? 0) > 0 || hasVoted || isClosed)

  const handleOptionChange = (index: number, checked: boolean) => {
    if (!canVote || isVoting || ownChoices.includes(index)) return

    if (!poll.multiChoice) {
      // Single choice votes on click — there is nothing else to confirm.
      setDraftChoices([index])
      onVote?.([index])
      return
    }

    setDraftChoices((prev) =>
      checked ? [...prev, index] : prev.filter((i) => i !== index)
    )
  }

  // On a single-choice poll the recorded ballot is the whole truth once it exists. A duplicate
  // rejection reports the choice already on-chain, which need not be the one just clicked, so
  // the click must not stay highlighted next to it.
  const activeDrafts = !poll.multiChoice && hasVoted ? [] : draftChoices

  // Choices already on-chain stay in the draft after a partial ballot; sending them
  // again would just burn a state transition on a guaranteed duplicate rejection.
  const pendingDraftChoices = activeDrafts.filter((index) => !ownChoices.includes(index))

  const handleVote = () => {
    if (pendingDraftChoices.length > 0 && onVote) {
      onVote(pendingDraftChoices)
    }
  }

  const createdAt = poll.$createdAt
    ? formatDistanceToNow(new Date(poll.$createdAt), { addSuffix: true })
    : ''

  const endsLabel = poll.endsAt === undefined || isClosed
    ? null
    : `Closes ${formatDistanceToNow(new Date(poll.endsAt), { addSuffix: true })}`

  const displayName = ownerUsername || truncateId(poll.$ownerId)

  const cardContent = (
    <Card className={!isInteractive ? 'transition-shadow hover:shadow-md' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Avatar circle with first char */}
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pollr-100 text-sm font-semibold text-pollr-700 dark:bg-pollr-900 dark:text-pollr-300">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {createdAt}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            {isClosed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                <Lock className="h-3 w-3" />
                Closed
              </span>
            )}
            <PollTypeBadge multiChoice={poll.multiChoice} />
          </div>
        </div>
        <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">
          {poll.question}
        </h3>
      </CardHeader>

      <CardContent className="space-y-2">
        {poll.options.map((option, index) => (
          <PollOption
            key={index}
            index={index}
            text={option}
            voteCount={voteCounts?.[index] ?? 0}
            totalVotes={totalVotes ?? 0}
            isSelected={ownChoices.includes(index) || activeDrafts.includes(index)}
            isUserPick={ownChoices.includes(index)}
            showResults={showResults}
            // An option already on-chain shows checked but cannot be toggled; on a partially
            // recorded multi-choice ballot the remaining options stay selectable.
            disabled={!canVote || isVoting || ownChoices.includes(index)}
            multiChoice={poll.multiChoice}
            onChange={handleOptionChange}
          />
        ))}
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {voteCountLabel(totalVotes, isClosed, poll.multiChoice)}
          </span>
          {endsLabel && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {endsLabel}
            </span>
          )}
          {hasVoted && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-pollr-600 dark:text-pollr-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              You voted
            </span>
          )}
          {!ownChoicesKnown && !isClosed && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Couldn&apos;t check whether you&apos;ve already voted
            </span>
          )}
        </div>

        {canVote && poll.multiChoice && (
          <Button
            size="sm"
            onClick={handleVote}
            disabled={pendingDraftChoices.length === 0 || isVoting}
          >
            {isVoting ? (
              <span className="flex items-center gap-2">
                <Spinner size="xs" className="border-white" />
                Voting...
              </span>
            ) : (
              'Vote'
            )}
          </Button>
        )}

        {canVote && !poll.multiChoice && isVoting && (
          <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Spinner size="xs" />
            Voting...
          </span>
        )}
      </CardFooter>
    </Card>
  )

  const content = isInteractive ? (
    cardContent
  ) : (
    <Link href={`/poll?id=${poll.$id}`} className="block">
      {cardContent}
    </Link>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {content}
    </motion.div>
  )
}
