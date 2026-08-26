import { logger } from '@/lib/logger'
import { dpnsService } from './dpns-service'
import type { PollDocument } from './poll-service'
import { voteService, type PollTally } from './vote-service'

export interface EnrichedPoll extends PollTally {
  poll: PollDocument
  ownerUsername: string | null
}

function emptyTally(optionCount: number): PollTally {
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
            const tally = await voteService.getPollTally(poll.$id, poll.options.length, userId)

            return [poll.$id, tally] as const
          } catch (error) {
            logger.error(`PollMetadata: Failed to fetch vote totals for poll ${poll.$id}:`, error)
            return [poll.$id, emptyTally(poll.options.length)] as const
          }
        })
      )
    ])

    const voteMetadataMap = new Map(voteMetadata)

    return polls.map((poll) => ({
      poll,
      ownerUsername: ownerUsernames.get(poll.$ownerId) ?? null,
      ...(voteMetadataMap.get(poll.$id) ?? emptyTally(poll.options.length))
    }))
  }
}

export const pollMetadataService = new PollMetadataService()
