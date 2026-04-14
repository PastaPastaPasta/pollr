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
import { truncateId } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'
import type { PollDocument } from '@/lib/services/poll-service'
import type { VoteDocument } from '@/lib/services/vote-service'

interface PollCardProps {
  poll: PollDocument
  voteCounts: number[]
  totalVotes: number
  userVote?: VoteDocument | null
  onVote?: (selectedOptions: number[]) => void
  isVoting?: boolean
  isInteractive?: boolean
  ownerUsername?: string | null
}

export function PollCard({
  poll,
  voteCounts,
  totalVotes,
  userVote,
  onVote,
  isVoting = false,
  isInteractive = false,
  ownerUsername,
}: PollCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<number[]>([])
  const hasVoted = !!userVote
  const showResults = totalVotes > 0

  const handleOptionChange = (index: number, checked: boolean) => {
    if (hasVoted || isVoting) return

    if (poll.pollType === 0) {
      // Single choice: replace selection
      setSelectedOptions(checked ? [index] : [])
    } else {
      // Multiple choice: toggle selection
      setSelectedOptions((prev) =>
        checked ? [...prev, index] : prev.filter((i) => i !== index)
      )
    }
  }

  const handleVote = () => {
    if (selectedOptions.length > 0 && onVote) {
      onVote(selectedOptions)
    }
  }

  const createdAt = poll.$createdAt
    ? formatDistanceToNow(new Date(poll.$createdAt), { addSuffix: true })
    : ''

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
          <PollTypeBadge pollType={poll.pollType} />
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
            voteCount={voteCounts[index] || 0}
            totalVotes={totalVotes}
            isSelected={selectedOptions.includes(index)}
            isUserPick={userVote?.selectedOptions.includes(index) ?? false}
            showResults={showResults}
            disabled={hasVoted || isVoting || !isInteractive}
            pollType={poll.pollType}
            onChange={handleOptionChange}
          />
        ))}
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalVotes === 0
              ? 'Be the first to vote!'
              : `${totalVotes} vote${totalVotes === 1 ? '' : 's'}`}
          </span>
          {hasVoted && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-pollr-600 dark:text-pollr-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              You voted
            </span>
          )}
        </div>

        {isInteractive && !hasVoted && (
          <Button
            size="sm"
            onClick={handleVote}
            disabled={selectedOptions.length === 0 || isVoting}
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
      </CardFooter>
    </Card>
  )

  if (isInteractive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {cardContent}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/poll?id=${poll.$id}`} className="block">
        {cardContent}
      </Link>
    </motion.div>
  )
}
