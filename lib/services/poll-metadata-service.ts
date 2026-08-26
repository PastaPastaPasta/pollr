import { logger } from '@/lib/logger'
import { dpnsService } from './dpns-service'
import type { PollDocument } from './poll-service'
import { voteService } from './vote-service'

export interface EnrichedPoll {
  poll: PollDocument
  ownerUsername: string | null
  voteCounts: number[]
  totalVotes: number
  /** Option indices the viewing user has already voted for. Empty when they have not voted. */
  userChoices: number[]
}

interface PollVoteMetadata {
  voteCounts: number[]
  totalVotes: number
  userChoices: number[]
}

function emptyVoteMetadata(optionCount: number): PollVoteMetadata {
  return {
    voteCounts: new Array<number>(optionCount).fill(0),
    totalVotes: 0,
    userChoices: [],
  }
}

class PollMetadataService {
  async enrichPolls(polls: PollDocument[], userId?: string | null): Promise<EnrichedPoll[]> {
    if (polls.length === 0) {
      return []
    }

    const ownerIds = Array.from(new Set(polls.map((poll) => poll.$ownerId)))

    const [ownerUsernames, voteMetadata] = await Promise.all([
      dpnsService.resolveUsernamesBatch(ownerIds),
      Promise.all(
        polls.map(async (poll) => {
          try {
            // Tallies come from the contract's countable indices, so this stays O(1) per poll.
            const [tally, userChoices] = await Promise.all([
              voteService.getVoteTally(poll.$id, poll.options.length),
              userId ? voteService.getMyVotes(poll.$id, userId) : Promise.resolve<number[]>([]),
            ])

            return [poll.$id, {
              voteCounts: tally.counts,
              totalVotes: tally.total,
              userChoices,
            }] as const
          } catch (error) {
            logger.error(`PollMetadata: Failed to fetch vote totals for poll ${poll.$id}:`, error)
            return [poll.$id, emptyVoteMetadata(poll.options.length)] as const
          }
        })
      )
    ])

    const voteMetadataMap = new Map(voteMetadata)

    return polls.map((poll) => {
      const metadata = voteMetadataMap.get(poll.$id) ?? emptyVoteMetadata(poll.options.length)

      return {
        poll,
        ownerUsername: ownerUsernames.get(poll.$ownerId) ?? null,
        voteCounts: metadata.voteCounts,
        totalVotes: metadata.totalVotes,
        userChoices: metadata.userChoices
      }
    })
  }
}

export const pollMetadataService = new PollMetadataService()
