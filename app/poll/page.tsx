'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Share2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PollCard } from '@/components/poll/poll-card'
import { PollSkeleton } from '@/components/poll/poll-skeleton'
import { Spinner } from '@/components/ui/spinner'
import { usePoll } from '@/hooks/use-poll'
import { useAuth } from '@/contexts/auth-context'
import { useSdk } from '@/contexts/sdk-context'
import { useLoginModal } from '@/hooks/use-login-modal'
import toast from 'react-hot-toast'
import { useState, useCallback, useEffect, useRef } from 'react'

function PollPageContent() {
  const searchParams = useSearchParams()
  const pollId = searchParams.get('id')
  const { isReady } = useSdk()
  const { user } = useAuth()
  const { open: openLogin } = useLoginModal()
  const [pendingVote, setPendingVote] = useState<number[] | null>(null)
  const submittingRef = useRef(false)

  const {
    poll,
    voteCounts,
    totalVotes,
    userVote,
    isLoading,
    error,
    castVote,
    isVoting,
  } = usePoll(pollId)

  const handleVote = useCallback(async (selectedOptions: number[]) => {
    if (!user) {
      setPendingVote(selectedOptions)
      openLogin()
      return
    }
    await castVote(selectedOptions)
  }, [user, castVote, openLogin])

  // Auto-submit pending vote after login
  useEffect(() => {
    if (!pendingVote || !user || submittingRef.current) return
    submittingRef.current = true
    castVote(pendingVote)
      .then((success) => { if (success) setPendingVote(null) })
      .catch(() => setPendingVote(null))
      .finally(() => { submittingRef.current = false })
  }, [pendingVote, user, castVote])

  const handleShare = useCallback(() => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Poll link copied to clipboard!')
    }).catch(() => {
      toast.error('Failed to copy link')
    })
  }, [])

  if (!pollId) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500">No poll ID provided</p>
        <Link href="/" className="text-pollr-500 hover:text-pollr-600 text-sm mt-2 inline-block">
          Back to polls
        </Link>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Spinner size="lg" />
        <p className="mt-4 text-sm">Connecting to Dash Platform...</p>
      </div>
    )
  }

  if (isLoading) {
    return <PollSkeleton />
  }

  if (error || !poll) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <AlertCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          {error || 'Poll not found'}
        </p>
        <Link href="/" className="text-pollr-500 hover:text-pollr-600 text-sm">
          Back to polls
        </Link>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to polls
        </Link>
        <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>

      {/* Poll */}
      <PollCard
        poll={poll}
        voteCounts={voteCounts}
        totalVotes={totalVotes}
        userVote={userVote}
        onVote={handleVote}
        isVoting={isVoting}
        isInteractive={true}
      />
    </div>
  )
}

export default function PollPage() {
  return (
    <Suspense fallback={<PollSkeleton />}>
      <PollPageContent />
    </Suspense>
  )
}
