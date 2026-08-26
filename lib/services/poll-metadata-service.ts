import { logger } from '@/lib/logger'
import { dpnsService } from './dpns-service'
import { mapWithConcurrency } from './pagination-utils'
import type { PollDocument } from './poll-service'
import { voteService, type PollTally } from './vote-service'

/** How many polls to tally at once. Each tally is one Platform round trip. */
const TALLY_CONCURRENCY = 4

export interface EnrichedPoll extends PollTally {
  poll: PollDocument
  ownerUsername: string | null
}

/**
 * The tally for a poll we could not read at all.
 *
 * Every field is null rather than zero: a feed card must say "unavailable", not assert that a
 * poll has no votes and that the viewer has not voted on it. The second half matters most - a
 * fabricated empty `userChoices` reopens the ballot for someone who already voted.
 */
function unknownTally(): PollTally {
  return { voteCounts: null, totalVotes: null, userChoices: null }
}

class PollMetadataService {
  async enrichPolls(polls: PollDocument[], userId?: string | null): Promise<EnrichedPoll[]> {
    if (polls.length === 0) {
      return []
    }

    const ownerIds = Array.from(new Set(polls.map((poll) => poll.$ownerId)))

    const [ownerUsernames, voteMetadata] = await Promise.all([
      dpnsService.resolveUsernamesBatch(ownerIds),
      mapWithConcurrency(polls, TALLY_CONCURRENCY, async (poll) => {
        try {
          // Tallies come from the contract's countable indices, so this stays O(1) per poll.
          // getPollTally already reports each half's failure as null rather than throwing;
          // this catch is for the unexpected.
          const tally = await voteService.getPollTally(poll, userId)

          return [poll.$id, tally] as const
        } catch (error) {
          logger.error(`PollMetadata: Failed to fetch vote totals for poll ${poll.$id}:`, error)
          return [poll.$id, unknownTally()] as const
        }
      })
    ])

    const voteMetadataMap = new Map(voteMetadata)

    return polls.map((poll) => ({
      poll,
      ownerUsername: ownerUsernames.get(poll.$ownerId) ?? null,
      ...(voteMetadataMap.get(poll.$id) ?? unknownTally())
    }))
  }
}

export const pollMetadataService = new PollMetadataService()
