import toast from 'react-hot-toast'
import type { CastVoteResult } from '@/lib/services/vote-service'

/**
 * Toast the outcome of a ballot.
 *
 * A multi-choice ballot is a sequence of independent writes, so it can land in part. Report what
 * failed and invite a retry rather than claiming a clean success — re-submitting is safe, since
 * Platform rejects an already-recorded choice as a duplicate.
 */
export function reportCastVote(result: CastVoteResult): void {
  const recorded = result.choices.length - result.alreadyVoted.length

  if (result.failed.length > 0) {
    toast.error(
      recorded > 0
        ? `Saved ${recorded} of your selections — ${result.failed.length} did not go through. Vote again to add the rest.`
        : 'Your selections could not be saved. Please try again.'
    )
    return
  }

  if (recorded === 0) {
    toast('You had already voted on this poll')
    return
  }

  toast.success('Vote submitted!')
}
