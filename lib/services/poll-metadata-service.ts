import { logger } from '@/lib/logger'
import { computeVoteCounts } from '@/lib/utils'
import { dpnsService } from './dpns-service'
import type { PollDocument } from './poll-service'
import { voteService } from './vote-service'

export interface PollDisplayMetadata {
  ownerUsername: string | null
  voteCounts: number[]
  totalVotes: number
}

export interface EnrichedPoll {
  poll: PollDocument
  ownerUsername: string | null
  voteCounts: number[]
  totalVotes: number
}

class PollMetadataService {
  async enrichPolls(polls: PollDocument[]): Promise<EnrichedPoll[]> {
    if (polls.length === 0) {
      return []
    }

    const ownerIds = Array.from(new Set(polls.map((poll) => poll.$ownerId)))

    const [ownerUsernames, voteMetadata] = await Promise.all([
      dpnsService.resolveUsernamesBatch(ownerIds),
      Promise.all(
        polls.map(async (poll) => {
          try {
            const votes = await voteService.getVotesForPoll(poll.$id)
            const { counts, total } = computeVoteCounts(votes, poll.options.length)

            return [poll.$id, { voteCounts: counts, totalVotes: total }] as const
          } catch (error) {
            logger.error(`PollMetadata: Failed to fetch vote totals for poll ${poll.$id}:`, error)

            return [poll.$id, {
              voteCounts: new Array(poll.options.length).fill(0),
              totalVotes: 0
            }] as const
          }
        })
      )
    ])

    const voteMetadataMap = new Map<string, Omit<PollDisplayMetadata, 'ownerUsername'>>(voteMetadata)

    return polls.map((poll) => {
      const metadata = voteMetadataMap.get(poll.$id) ?? {
        voteCounts: new Array(poll.options.length).fill(0),
        totalVotes: 0
      }

      return {
        poll,
        ownerUsername: ownerUsernames.get(poll.$ownerId) ?? null,
        voteCounts: metadata.voteCounts,
        totalVotes: metadata.totalVotes
      }
    })
  }
}

export const pollMetadataService = new PollMetadataService()
